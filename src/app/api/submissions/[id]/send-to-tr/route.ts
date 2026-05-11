import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/auth/roles'
import { getTRClient } from '@/lib/thomson-reuters/client'
import type { DbUser } from '@/types/database'

export async function POST(
  _request: Request,
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
    .select('*, companies(name, tr_company_id)')
    .eq('id', id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'tr_failed') return NextResponse.json({ error: 'Not eligible for resend' }, { status: 400 })

  const { data: transactions } = await admin
    .from('submission_transactions')
    .select('*')
    .eq('submission_id', id)
    .order('sort_order')

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
      transactions: (transactions ?? []).map((t) => ({
        date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        type: t.transaction_type === 'debit' ? 'D' : 'C',
      })),
    })
    trSuccess = trResult.success
    trReferenceId = trResult.referenceId
  } catch (err) {
    console.error('[TR] resend failed:', err)
  }

  if (trSuccess) {
    await admin.from('submissions').update({
      status: 'sent_to_tr',
      tr_response: trReferenceId ? { referenceId: trReferenceId } : null,
      tr_sent_at: new Date().toISOString(),
    }).eq('id', id)
  }

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'submission.resend_to_tr',
    entity_type: 'submission',
    entity_id: id,
    metadata: { tr_success: trSuccess },
  })

  return NextResponse.json({ ok: true, success: trSuccess })
}
