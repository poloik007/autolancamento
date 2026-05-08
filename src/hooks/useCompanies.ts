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
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setCompanies(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { companies, loading }
}
