import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() ?? ''
  const date = searchParams.get('date')?.trim() ?? ''
  const cursor = searchParams.get('cursor') ?? null

  let query = supabase
    .from('submissions')
    .select('*, companies(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (search) query = query.ilike('pdf_filename', `%${search}%`)
  if (date) query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    submissions: data ?? [],
    hasMore: (data?.length ?? 0) === PAGE_SIZE,
    nextCursor: data?.length ? data[data.length - 1].created_at : null,
  })
}

const schema = z.object({
  company_id: z.string().uuid(),
  pdf_filename: z.string().min(1).max(255),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { company_id, pdf_filename } = parsed.data

  // Verify client has access to this company
  const { data: access } = await supabase
    .from('client_company_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_id', company_id)
    .eq('is_active', true)
    .single()

  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const path = `${user.id}/${Date.now()}_${pdf_filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Create submission record
  const { data: submission, error } = await admin
    .from('submissions')
    .insert({
      user_id: user.id,
      company_id,
      pdf_path: path,
      pdf_filename,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  // Create signed upload URL
  const { data: signed } = await admin.storage
    .from('submissions')
    .createSignedUploadUrl(path)

  return NextResponse.json({
    submissionId: submission.id,
    uploadUrl: signed?.signedUrl,
    path,
  })
}
