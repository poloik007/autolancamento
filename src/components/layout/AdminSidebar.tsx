'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Users, Building2, History, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBadge } from './NotificationBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/queue', label: 'Fila de revisão', icon: ClipboardList, badge: true },
  { href: '/admin/clients', label: 'Clientes', icon: Users },
  { href: '/admin/companies', label: 'Empresas', icon: Building2 },
  { href: '/admin/history', label: 'Histórico', icon: History },
]

export function AdminSidebar({ userName }: { userName?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r bg-white">
      <div className="px-4 py-4 border-b">
        <p className="font-semibold text-sm tracking-tight">AutoLançamento</p>
        <p className="text-xs text-muted-foreground mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-gray-100 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && <NotificationBadge />}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t space-y-1">
        {userName && (
          <p className="px-3 text-xs text-muted-foreground truncate">{userName}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
