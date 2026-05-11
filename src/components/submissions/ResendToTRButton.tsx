'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ResendToTRButton({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/send-to-tr`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao reenviar')
      if (data.success) {
        toast.success('Enviado ao TR com sucesso!')
        router.refresh()
      } else {
        toast.error('TR retornou falha novamente. Tente mais tarde.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleResend} disabled={loading} className="gap-1.5">
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Reenviando...' : 'Reenviar ao TR'}
    </Button>
  )
}
