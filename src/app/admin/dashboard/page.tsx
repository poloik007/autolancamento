import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ count: pending }, { count: total }, { count: clients }] = await Promise.all([
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
  ])

  const stats = [
    { label: 'Aguardando revisão', value: pending ?? 0, href: '/admin/queue', highlight: true },
    { label: 'Total de submissões', value: total ?? 0, href: '/admin/history' },
    { label: 'Clientes cadastrados', value: clients ?? 0, href: '/admin/clients' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href, highlight }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border bg-white p-5 hover:shadow-sm transition-shadow group"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${highlight && value > 0 ? 'text-red-600' : ''}`}>
              {value}
            </p>
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2">
              Ver <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {(pending ?? 0) > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-orange-800">
            {pending} submissão(ões) aguardando sua revisão
          </p>
          <Link href="/admin/queue" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Revisar agora
          </Link>
        </div>
      )}
    </div>
  )
}
