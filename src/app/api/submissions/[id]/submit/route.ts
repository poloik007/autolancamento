import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendAdminTelegram } from '@/lib/notifications/telegram'
import { createNotification } from '@/lib/notifications/create'

const transactionSchema = z.object({
  transactionDate: z.string().min(1),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  transactionType: z.enum(['debit', 'credit']),
  balance: z.number().optional(),
  documentNumber: z.string().optional(),
  rawText: z.string().optional(),
})

const schema = z.object({
  transactions: z.array(transactionSchema).min(1),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status, company_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'draft') return NextResponse.json({ error: 'Cannot submit' }, { status: 400 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const admin = createAdminClient()

  // Insert transactions
  const rows = parsed.data.transactions.map((t, i) => ({
    submission_id: id,
    transaction_date: t.transactionDate,
    description: t.description,
    amount: t.amount,
    transaction_type: t.transactionType,
    balance: t.balance ?? null,
    document_number: t.documentNumber ?? null,
    raw_text: t.rawText ?? null,
    sort_order: i,
  }))

  await admin.from('submission_transactions').insert(rows)

  // Update submission status
  await admin
    .from('submissions')
    .update({ status: 'pending', submitted_at: new Date().toISOString() })
    .eq('id', id)

  // Get admin user ids for in-app notifications
  const { data: admins } = await admin
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  const { data: submitterUser } = await admin
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const submitterName = submitterUser?.full_name || submitterUser?.email || 'Um cliente'

  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', submission.company_id)
    .single()

  const message = `Nova submissão de ${submitterName} — ${company?.name ?? ''}`

  // Create in-app notifications for all admins
  for (const adminUser of (admins ?? [])) {
    await createNotification(admin, {
      user_id: adminUser.id,
      type: 'submission_pending',
      submission_id: id,
      message,
    })
  }

  // WhatsApp notification to admin
  await sendAdminTelegram(message).catch(() => null)

  // Audit log
  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'submission.submitted',
    entity_type: 'submission',
    entity_id: id,
    metadata: { transaction_count: rows.length },
  })

  return NextResponse.json({ ok: true })
}
