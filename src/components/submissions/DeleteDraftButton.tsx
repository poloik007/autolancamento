'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  submissionId: string
  onDelete?: () => void
}

export function DeleteDraftButton({ submissionId, onDelete }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Excluir este rascunho?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      toast.success('Rascunho excluído')
      if (onDelete) onDelete()
      else window.location.reload()
    } catch {
      toast.error('Erro ao excluir rascunho')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
      title="Excluir rascunho"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
