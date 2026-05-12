import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/auth/roles'
import { generateOFX } from '@/lib/export/ofx'
import { NextResponse } from 'next/server'
import type { DbUser } from '@/types/database'

export async function GET(
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
    .select('*, companies(name)')
    .eq('id', id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: transactions } = await admin
    .from('submission_transactions')
    .select('*')
    .eq('submission_id', id)
    .order('sort_order')

  const dates = (transactions ?? []).map((t) => t.transaction_date).sort()
  const dateStr = new Date(submission.created_at).toISOString().slice(0, 10).replace(/-/g, '')
  const dtStart = dates[0]?.replace(/-/g, '') ?? dateStr
  const dtEnd = dates[dates.length - 1]?.replace(/-/g, '') ?? dateStr

  const ofxTransactions = (transactions ?? []).map((t) => ({
    fitId: t.id.replace(/-/g, '').slice(0, 36),
    type: t.transaction_type === 'debit' ? 'DEBIT' as const : 'CREDIT' as const,
    dtPosted: `${t.transaction_date.replace(/-/g, '')}120000`,
    amount: t.amount,
    memo: t.description,
  }))

  const company = submission.companies as { name: string } | null
  const companySlug = (company?.name ?? 'extrato').replace(/\s+/g, '-').toLowerCase().slice(0, 30)
  const filename = `${companySlug}-${dateStr}.ofx`

  const ofx = generateOFX(ofxTransactions, { dtStart, dtEnd })

  return new Response(ofx, {
    headers: {
      'Content-Type': 'application/x-ofx',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
