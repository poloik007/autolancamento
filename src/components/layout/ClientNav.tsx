'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, History, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: Upload },
  { href: '/history', label: 'Histórico', icon: History },
]

export function ClientNav({ userName }: { userName?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, oklch(0.72 0.18 200), oklch(0.55 0.22 258))' }}>
              <span className="font-bold text-xs text-white">A</span>
            </div>
            <span className="font-semibold text-sm text-foreground">AutoLançamento</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150',
                  pathname.startsWith(href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-muted-foreground hidden sm:block">{userName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}
