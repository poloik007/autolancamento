import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/roles'
import { createNotification } from '@/lib/notifications/create'
import { sendRejectionEmail } from '@/lib/notifications/email'
import type { DbUser } from '@/types/database'

const schema = z.object({ note: z.string().min(1).max(1000) })

export async function POST(
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
  if (!parsed.success) return NextResponse.json({ error: 'Invalid note' }, { status: 400 })

  const admin = createAdminClient()
  const { data: submission } = await admin
    .from('submissions')
    .select('*, users(email)')
    .eq('id', id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Not pending' }, { status: 400 })

  await admin.from('submissions').update({
    status: 'rejected',
    rejection_note: parsed.data.note,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  const clientUser = submission.users as { email: string } | null
  if (clientUser) {
    await createNotification(admin, {
      user_id: submission.user_id,
      type: 'submission_rejected',
      submission_id: id,
      message: `Sua submissão "${submission.pdf_filename}" foi rejeitada. Motivo: ${parsed.data.note}`,
    })
    await sendRejectionEmail(clientUser.email, parsed.data.note, submission.pdf_filename).catch(() => null)
  }

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'submission.rejected',
    entity_type: 'submission',
    entity_id: id,
    metadata: { note: parsed.data.note },
  })

  return NextResponse.json({ ok: true })
}
