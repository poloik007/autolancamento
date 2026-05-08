import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDateTime } from '@/lib/utils/format'
import { FileText } from 'lucide-react'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, companies(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas as suas submissões</p>
      </div>

      {submissions?.length ? (
        <div className="rounded-lg border bg-white divide-y">
          {submissions.map((s) => (
            <Link
              key={s.id}
              href={`/history/${s.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.pdf_filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {(s.companies as { name: string } | null)?.name} &middot; {formatDateTime(s.created_at)}
                  </p>
                </div>
              </div>
              <SubmissionStatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma submissão encontrada.</p>
        </div>
      )}
    </div>
  )
}
