import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDateTime } from '@/lib/utils/format'
import { FileText, ChevronRight } from 'lucide-react'

export default async function QueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: submissions } = await admin
    .from('submissions')
    .select('*, companies(name), users!submissions_user_id_fkey(full_name, email)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de revisão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {submissions?.length
            ? `${submissions.length} submissão(ões) aguardando revisão`
            : 'Nenhuma submissão pendente'}
        </p>
      </div>

      {submissions?.length ? (
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
          {submissions.map((s) => {
            const client = s.users as { full_name: string | null; email: string } | null
            const company = s.companies as { name: string } | null
            return (
              <Link
                key={s.id}
                href={`/admin/queue/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.pdf_filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {client?.full_name || client?.email} &middot; {company?.name} &middot;{' '}
                    {s.submitted_at ? formatDateTime(s.submitted_at) : '—'}
                  </p>
                </div>
                <SubmissionStatusBadge status={s.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Tudo em dia! Sem submissões pendentes.</p>
        </div>
      )}
    </div>
  )
}
