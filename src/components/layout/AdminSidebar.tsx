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
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg, oklch(0.72 0.18 200), oklch(0.55 0.22 258))' }}>
            <span className="font-bold text-sm text-white">A</span>
          </div>
          <span className="font-semibold text-sm text-sidebar-accent-foreground">
            AutoLançamento
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
              pathname.startsWith(href)
                ? 'text-sidebar-primary font-medium bg-sidebar-accent'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && <NotificationBadge />}
          </Link>
        ))}
      </nav>

      {/* User / logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {userName && (
          <p className="px-3 text-xs text-sidebar-foreground/50 truncate mb-2">{userName}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
