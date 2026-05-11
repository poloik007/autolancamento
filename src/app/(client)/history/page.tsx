import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionsList } from '@/components/submissions/SubmissionsList'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas as suas submissões</p>
      </div>

      <SubmissionsList showFilters />
    </div>
  )
}
