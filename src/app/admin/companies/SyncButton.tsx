'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/companies/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Erro na sincronização')
      const { synced } = await res.json()
      toast.success(`${synced} empresa(s) sincronizada(s) com sucesso!`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Sincronizando...' : 'Sincronizar do TR'}
    </Button>
  )
}
