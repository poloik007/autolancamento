import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/roles'
import { createNotification } from '@/lib/notifications/create'
import { sendApprovalEmail } from '@/lib/notifications/email'
import { getTRClient } from '@/lib/thomson-reuters/client'
import type { DbUser } from '@/types/database'

const transactionSchema = z.object({
  id: z.string(),
  transaction_date: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  transaction_type: z.enum(['debit', 'credit']),
  balance: z.number().nullable().optional(),
  is_edited: z.boolean().optional(),
})

const schema = z.object({ transactions: z.array(transactionSchema) })

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

  const admin = createAdminClient()
  const { data: submission } = await admin
    .from('submissions')
    .select('*, companies(name, tr_company_id), users!submissions_user_id_fkey(email, full_name)')
    .eq('id', id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Not pending' }, { status: 400 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  // Update edited transactions
  const editedRows = parsed.data.transactions.filter((t) => t.is_edited && !t.id.startsWith('new-'))
  const newRows = parsed.data.transactions.filter((t) => t.id.startsWith('new-'))

  for (const t of editedRows) {
    await admin.from('submission_transactions').update({
      transaction_date: t.transaction_date,
      description: t.description,
      amount: t.amount,
      transaction_type: t.transaction_type,
      balance: t.balance ?? null,
      is_edited: true,
    }).eq('id', t.id)
  }

  if (newRows.length) {
    await admin.from('submission_transactions').insert(
      newRows.map((t, i) => ({
        submission_id: id,
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        transaction_type: t.transaction_type,
        balance: t.balance ?? null,
        is_edited: true,
        sort_order: parsed.data.transactions.length + i,
      }))
    )
  }

  // Send to Thomson Reuters
  const company = submission.companies as { name: string; tr_company_id: string } | null
  let trSuccess = false
  let trReferenceId: string | undefined

  try {
    const trClient = getTRClient()
    const trResult = await trClient.sendStatement({
      companyId: company?.tr_company_id ?? '',
      periodStart: submission.period_start ?? '',
      periodEnd: submission.period_end ?? '',
      statementType: 'checking',
      transactions: parsed.data.transactions.map((t) => ({
        date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        type: t.transaction_type === 'debit' ? 'D' : 'C',
      })),
    })
    trSuccess = trResult.success
    trReferenceId = trResult.referenceId
  } catch (err) {
    console.error('[TR] sendStatement failed:', err)
  }

  const newStatus = trSuccess ? 'sent_to_tr' : 'tr_failed'
  await admin.from('submissions').update({
    status: newStatus,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    tr_response: trReferenceId ? { referenceId: trReferenceId } : null,
    tr_sent_at: trSuccess ? new Date().toISOString() : null,
  }).eq('id', id)

  // Notify client
  const clientUser = submission.users as { email: string; full_name: string | null } | null
  if (clientUser) {
    await createNotification(admin, {
      user_id: submission.user_id,
      type: 'submission_approved',
      submission_id: id,
      message: `Sua submissão "${submission.pdf_filename}" foi aprovada e enviada ao TR.`,
    })
    await sendApprovalEmail(clientUser.email, submission.pdf_filename).catch(() => null)
  }

  // Audit
  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'submission.approved',
    entity_type: 'submission',
    entity_id: id,
    metadata: { tr_success: trSuccess, edited_rows: editedRows.length },
  })

  return NextResponse.json({ ok: true, status: newStatus })
}
