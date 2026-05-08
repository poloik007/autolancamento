import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils/format'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import type { DbSubmissionTransaction } from '@/types/database'

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: submission } = await supabase
    .from('submissions')
    .select('*, companies(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!submission) notFound()

  const { data: transactions } = await supabase
    .from('submission_transactions')
    .select('*')
    .eq('submission_id', id)
    .order('sort_order')

  const totalDebit = (transactions ?? []).filter(t => t.transaction_type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
  const totalCredit = (transactions ?? []).filter(t => t.transaction_type === 'credit').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/history" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{submission.pdf_filename}</h1>
          <p className="text-sm text-muted-foreground">
            {(submission.companies as { name: string } | null)?.name} &middot; {formatDateTime(submission.created_at)}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      {submission.status === 'rejected' && submission.rejection_note && (
        <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Submissão rejeitada</p>
            <p className="mt-0.5">{submission.rejection_note}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Data</th>
              <th className="px-4 py-2 text-left font-medium">Descrição</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
              <th className="px-4 py-2 text-left font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(transactions ?? []).map((t: DbSubmissionTransaction) => (
              <tr key={t.id}>
                <td className="px-4 py-2 text-xs">{formatDate(t.transaction_date)}</td>
                <td className="px-4 py-2">{t.description}</td>
                <td className={`px-4 py-2 text-right font-medium ${t.transaction_type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Number(t.amount))}
                </td>
                <td className="px-4 py-2 text-xs capitalize">
                  {t.transaction_type === 'debit' ? 'Débito' : 'Crédito'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={2} className="px-4 py-2 text-sm font-medium">Total</td>
              <td className="px-4 py-2 text-right text-sm">
                <span className="text-red-600 mr-3">D: {formatCurrency(totalDebit)}</span>
                <span className="text-green-600">C: {formatCurrency(totalCredit)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
