'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbSubmission } from '@/types/database'

interface SubmissionWithRelations extends DbSubmission {
  companies: { name: string; tr_company_id: string } | null
  users: { full_name: string | null; email: string } | null
}

export function useSubmissions(companyId?: string) {
  const [submissions, setSubmissions] = useState<SubmissionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('submissions')
        .select('*, companies(name, tr_company_id), users(full_name, email)')
        .order('created_at', { ascending: false })

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data } = await query
      setSubmissions((data as SubmissionWithRelations[]) ?? [])
      setLoading(false)
    }
    load()
  }, [companyId])

  return { submissions, loading, refresh: () => setLoading(true) }
}
