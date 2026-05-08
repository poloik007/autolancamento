import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/auth/roles'
import { z } from 'zod'
import type { DbUser } from '@/types/database'

const schema = z.object({
  is_active: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!isAdmin(dbUser as DbUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('users').update(parsed.data).eq('id', id).eq('role', 'client')

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'client.updated',
    entity_type: 'user',
    entity_id: id,
    metadata: parsed.data,
  })

  return NextResponse.json({ ok: true })
}
