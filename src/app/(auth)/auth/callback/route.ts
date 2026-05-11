import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminEmails } from '@/lib/auth/roles'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  const adminEmails = getAdminEmails()
  const role = adminEmails.includes(user.email ?? '') ? 'admin' : 'client'

  // Upsert user record using service role (bypasses RLS on insert)
  const admin = createAdminClient()
  await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role,
      is_active: true,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  const destination = role === 'admin' ? '/admin/dashboard' : '/dashboard'
  return NextResponse.redirect(`${origin}${destination}`)
}
