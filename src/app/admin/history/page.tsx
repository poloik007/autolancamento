import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHistoryList } from './AdminHistoryList'
import type { SubmissionStatus } from '@/types/database'

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const sp = await searchParams
  const admin = createAdminClient()
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = admin
    .from('submissions')
    .select('*, companies(name), users!submissions_user_id_fkey(full_name, email)', { count: 'exact' })
  if (sp.status) query = query.eq('status', sp.status)

  const { data: submissions, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const statuses = ['pending', 'rejected', 'sent_to_tr', 'tr_failed']
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  const mapped = (submissions ?? []).map((s) => ({
    id: s.id,
    pdf_filename: s.pdf_filename,
    status: s.status as SubmissionStatus,
    created_at: s.created_at,
    users: s.users as { full_name: string | null; email: string } | null,
    companies: s.companies as { name: string } | null,
  }))

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

      <AdminHistoryList submissions={mapped} />

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
