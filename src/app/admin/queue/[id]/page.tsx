import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminReviewPanel } from '@/components/submissions/AdminReviewPanel'
import { ResendToTRButton } from '@/components/submissions/ResendToTRButton'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDateTime } from '@/lib/utils/format'
import { ChevronLeft } from 'lucide-react'

export default async function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: submission } = await admin
    .from('submissions')
    .select('*, companies(name, tr_company_id), users!submissions_user_id_fkey(full_name, email)')
    .eq('id', id)
    .single()

  if (!submission) notFound()

  // Mark related pending notification as read when admin opens the submission
  await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('submission_id', id)
    .eq('user_id', user.id)
    .eq('is_read', false)

  const { data: transactions } = await admin
    .from('submission_transactions')
    .select('*')
    .eq('submission_id', id)
    .order('sort_order')

  const { data: signedUrl } = await admin.storage
    .from('submissions')
    .createSignedUrl(submission.pdf_path, 3600)

  const client = submission.users as { full_name: string | null; email: string } | null
  const company = submission.companies as { name: string; tr_company_id: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/queue" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{submission.pdf_filename}</h1>
          <p className="text-sm text-muted-foreground">
            {client?.full_name || client?.email} &middot; {company?.name} &middot;{' '}
            {submission.submitted_at ? formatDateTime(submission.submitted_at) : '—'}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {signedUrl?.signedUrl && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium">PDF original</h2>
            <iframe
              src={signedUrl.signedUrl}
              className="w-full h-[600px] rounded-lg border bg-white"
              title="PDF original"
            />
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Transações extraídas</h2>
          {submission.status === 'pending' ? (
            <AdminReviewPanel
              submissionId={id}
              initialTransactions={transactions ?? []}
            />
          ) : submission.status === 'tr_failed' ? (
            <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800">Falha ao enviar ao Thomson Reuters</p>
              <p className="text-xs text-amber-700">
                A submissão foi aprovada mas o envio ao TR falhou. As transações já estão salvas.
                Você pode tentar reenviar.
              </p>
              <ResendToTRButton submissionId={id} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {submission.status === 'sent_to_tr' ? 'Aprovada e enviada ao TR.' : 'Rejeitada.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
