import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils/format'
import { SyncButton } from './SyncButton'
import { Building2 } from 'lucide-react'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('name')

  const lastSync = companies?.[0]?.synced_at

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {companies?.length ?? 0} empresa(s) sincronizada(s)
            {lastSync && ` — última sync ${formatDateTime(lastSync)}`}
          </p>
        </div>
        <SyncButton />
      </div>

      <div className="rounded-lg border bg-white divide-y">
        {companies?.length ? companies.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.cnpj && `${c.cnpj} · `}ID TR: {c.tr_company_id}
              </p>
            </div>
          </div>
        )) : (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma empresa sincronizada.</p>
            <p className="text-xs mt-1">Clique em &quot;Sincronizar do TR&quot; para importar as empresas.</p>
          </div>
        )}
      </div>
    </div>
  )
}
