import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/auth/roles'
import { generateOFX } from '@/lib/export/ofx'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { DbUser } from '@/types/database'

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!isAdmin(dbUser as DbUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const admin = createAdminClient()

  const { data: transactions } = await admin
    .from('submission_transactions')
    .select('*')
    .in('submission_id', parsed.data.ids)
    .order('transaction_date')
    .order('sort_order')

  if (!transactions?.length) {
    return NextResponse.json({ error: 'No transactions found' }, { status: 404 })
  }

  const dates = transactions.map((t) => t.transaction_date).sort()
  const dtStart = dates[0].replace(/-/g, '')
  const dtEnd = dates[dates.length - 1].replace(/-/g, '')

  const ofxTransactions = transactions.map((t) => ({
    fitId: t.id.replace(/-/g, '').slice(0, 36),
    type: t.transaction_type === 'debit' ? 'DEBIT' as const : 'CREDIT' as const,
    dtPosted: `${t.transaction_date.replace(/-/g, '')}120000`,
    amount: t.amount,
    memo: t.description,
  }))

  const ofx = generateOFX(ofxTransactions, { dtStart, dtEnd })

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `exportacao-${dateStr}-${parsed.data.ids.length}itens.ofx`

  return new Response(ofx, {
    headers: {
      'Content-Type': 'application/x-ofx',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
