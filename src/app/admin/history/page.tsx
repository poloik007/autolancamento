import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDateTime } from '@/lib/utils/format'
import { FileText } from 'lucide-react'

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('submissions')
    .select('*, companies(name), users(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (sp.status) query = query.eq('status', sp.status)

  const { data: submissions, count } = await query

  const statuses = ['pending', 'approved', 'rejected', 'sent_to_tr', 'tr_failed']
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">{count ?? 0} submissão(ões) no total</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/history"
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${!sp.status ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}
        >
          Todos
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/history?status=${s}`}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${sp.status === s ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-white divide-y">
        {submissions?.length ? submissions.map((s) => {
          const client = s.users as { full_name: string | null; email: string } | null
          const company = s.companies as { name: string } | null
          return (
            <Link
              key={s.id}
              href={`/admin/queue/${s.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.pdf_filename}</p>
                <p className="text-xs text-muted-foreground">
                  {client?.full_name || client?.email} &middot; {company?.name} &middot; {formatDateTime(s.created_at)}
                </p>
              </div>
              <SubmissionStatusBadge status={s.status} />
            </Link>
          )
        }) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhuma submissão encontrada.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/history?page=${p}${sp.status ? `&status=${sp.status}` : ''}`}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${p === page ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
