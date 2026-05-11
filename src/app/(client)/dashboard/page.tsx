import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { SubmissionsList } from '@/components/submissions/SubmissionsList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Início</h1>
          <p className="text-sm text-muted-foreground mt-1">Faça o upload do extrato bancário</p>
        </div>
        <Link href="/upload" className={cn(buttonVariants(), 'gap-2')}>
          <Upload className="h-4 w-4" />
          Novo upload
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Submissões</h2>
        <SubmissionsList />
      </section>
    </div>
  )
}
