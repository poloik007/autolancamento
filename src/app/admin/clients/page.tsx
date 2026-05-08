import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, User } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">{clients?.length ?? 0} cliente(s) cadastrado(s)</p>
      </div>

      <div className="rounded-lg border bg-white divide-y">
        {clients?.length ? clients.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clients/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{c.full_name || c.email}</p>
              <p className="text-xs text-muted-foreground">{c.email} &middot; desde {formatDateTime(c.created_at)}</p>
            </div>
            <Badge variant={c.is_active ? 'default' : 'secondary'}>
              {c.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        )) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  )
}
