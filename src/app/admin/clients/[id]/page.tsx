import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { ClientEditor } from './ClientEditor'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: client }, { data: allCompanies }, { data: assignedAccess }] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).eq('role', 'client').single(),
    supabase.from('companies').select('*').eq('is_active', true).order('name'),
    supabase.from('client_company_access').select('company_id, is_active').eq('user_id', id),
  ])

  if (!client) notFound()

  const assignedIds = new Set(
    (assignedAccess ?? []).filter(a => a.is_active).map(a => a.company_id)
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{client.full_name || client.email}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
      </div>

      <ClientEditor
        client={client}
        allCompanies={allCompanies ?? []}
        assignedCompanyIds={Array.from(assignedIds)}
      />
    </div>
  )
}
