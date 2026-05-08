import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientNav } from '@/components/layout/ClientNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single()

  if (!dbUser?.is_active) redirect('/login?error=account_disabled')
  if (dbUser?.role === 'admin') redirect('/admin/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <ClientNav userName={dbUser?.full_name} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
