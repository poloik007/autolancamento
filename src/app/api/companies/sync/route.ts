import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/auth/roles'
import { getTRClient } from '@/lib/thomson-reuters/client'
import type { DbUser } from '@/types/database'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('role, is_active').eq('id', user.id).single()
  if (!isAdmin(dbUser as DbUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const trClient = getTRClient()
  const companies = await trClient.listCompanies()

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Upsert companies by tr_company_id
  const { error } = await admin.from('companies').upsert(
    companies.map((c) => ({
      tr_company_id: c.id,
      name: c.name,
      cnpj: c.cnpj ?? null,
      is_active: true,
      synced_at: now,
    })),
    { onConflict: 'tr_company_id' }
  )

  if (error) return NextResponse.json({ error: 'Sync failed' }, { status: 500 })

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'companies.synced',
    entity_type: 'companies',
    metadata: { count: companies.length },
  })

  return NextResponse.json({ ok: true, synced: companies.length })
}
