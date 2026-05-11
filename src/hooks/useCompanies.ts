'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbCompany } from '@/types/database'

export function useCompanies() {
  const [companies, setCompanies] = useState<DbCompany[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: accessData } = await supabase
        .from('client_company_access')
        .select('company_id')
        .eq('is_active', true)

      const companyIds = (accessData ?? []).map((a: any) => a.company_id)

      if (companyIds.length === 0) {
        setCompanies([])
        setLoading(false)
        return
      }

      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds)
        .eq('is_active', true)
        .order('name')

      setCompanies(companiesData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { companies, loading }
}
