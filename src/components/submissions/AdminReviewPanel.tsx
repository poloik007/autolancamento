'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/format'
import type { DbSubmissionTransaction } from '@/types/database'

interface AdminReviewPanelProps {
  submissionId: string
  initialTransactions: DbSubmissionTransaction[]
}

export function AdminReviewPanel({ submissionId, initialTransactions }: AdminReviewPanelProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialTransactions)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [loading, setLoading] = useState(false)

  const totalDebit = rows.filter(r => r.transaction_type === 'debit').reduce((s, r) => s + Number(r.amount), 0)
  const totalCredit = rows.filter(r => r.transaction_type === 'credit').reduce((s, r) => s + Number(r.amount), 0)

  function updateRow(index: number, field: string, value: string | number) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value, is_edited: true } : r))
  }

  function addRow() {
    setRows(prev => [...prev, {
      id: `new-${Date.now()}`,
      submission_id: submissionId,
      transaction_date: '',
      description: '',
      amount: 0,
      transaction_type: 'debit' as const,
      balance: null,
      document_number: null,
      raw_text: null,
      is_edited: true,
      sort_order: prev.length,
      created_at: new Date().toISOString(),
    }])
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: rows }),
      })
      if (!res.ok) throw new Error('Erro ao aprovar')
      toast.success('Submissão aprovada e enviada ao TR!')
      router.push('/admin/queue')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) { toast.error('Informe o motivo da rejeição'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      })
      if (!res.ok) throw new Error('Erro ao rejeitar')
      toast.success('Submissão rejeitada. Cliente será notificado.')
      router.push('/admin/queue')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
      setRejectOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium w-32">Data</th>
              <th className="px-3 py-2 text-left font-medium">Descrição</th>
              <th className="px-3 py-2 text-left font-medium w-28">Valor (R$)</th>
              <th className="px-3 py-2 text-left font-medium w-28">Tipo</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={row.id} className={row.is_edited ? 'bg-blue-50' : ''}>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.transaction_date}
                    onChange={(e) => updateRow(i, 'transaction_date', e.target.value)}
                    className="h-7 text-xs"
                    disabled={loading}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(i, 'description', e.target.value)}
                    className="h-7 text-xs"
                    disabled={loading}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateRow(i, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                    disabled={loading}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.transaction_type}
                    onChange={(e) => updateRow(i, 'transaction_type', e.target.value)}
                    className="h-7 text-xs rounded-md border border-input bg-background px-2 w-full"
                    disabled={loading}
                  >
                    <option value="debit">Débito</option>
                    <option value="credit">Crédito</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => removeRow(i)} disabled={loading}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={loading} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar linha
        </Button>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Débitos: <span className="font-medium text-red-600">{formatCurrency(totalDebit)}</span>
          </span>
          <span className="text-muted-foreground">
            Créditos: <span className="font-medium text-green-600">{formatCurrency(totalCredit)}</span>
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={loading} className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
          <X className="h-4 w-4" /> Rejeitar
        </Button>
        <Button onClick={handleApprove} disabled={loading} className="gap-1.5">
          <Check className="h-4 w-4" /> {loading ? 'Processando...' : 'Aprovar e enviar ao TR'}
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar submissão</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Descreva o motivo da rejeição para o cliente..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? 'Rejeitando...' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
