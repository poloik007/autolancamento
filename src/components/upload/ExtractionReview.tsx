'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import type { StandardTransaction } from '@/types/submission'
import type { ExtractionWarning } from '@/types/submission'

interface ExtractionReviewProps {
  transactions: StandardTransaction[]
  warnings: ExtractionWarning[]
  onChange: (rows: StandardTransaction[]) => void
  onSubmit: () => void
  submitting: boolean
}

export function ExtractionReview({
  transactions,
  warnings,
  onChange,
  onSubmit,
  submitting,
}: ExtractionReviewProps) {
  const [rows, setRows] = useState<StandardTransaction[]>(transactions)

  const totalDebit = rows.filter(r => r.transactionType === 'debit').reduce((s, r) => s + r.amount, 0)
  const totalCredit = rows.filter(r => r.transactionType === 'credit').reduce((s, r) => s + r.amount, 0)

  function update(index: number, field: keyof StandardTransaction, value: string | number) {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    setRows(next)
    onChange(next)
  }

  function addRow() {
    const next = [
      ...rows,
      { transactionDate: '', description: '', amount: 0, transactionType: 'debit' as const, rawText: '' },
    ]
    setRows(next)
    onChange(next)
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index)
    setRows(next)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="flex gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Atenção: extração incompleta em {warnings.length} página(s)</p>
            <p className="text-xs mt-0.5">Revise as linhas destacadas e corrija manualmente se necessário.</p>
          </div>
        </div>
      )}

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
              <tr key={i} className={warnings.some(w => row.rawText?.includes('page:' + w.pageNumber)) ? 'bg-yellow-50' : ''}>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.transactionDate}
                    onChange={(e) => update(i, 'transactionDate', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="h-7 text-xs"
                    disabled={submitting}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.description}
                    onChange={(e) => update(i, 'description', e.target.value)}
                    className="h-7 text-xs"
                    disabled={submitting}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => update(i, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                    disabled={submitting}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.transactionType}
                    onChange={(e) => update(i, 'transactionType', e.target.value)}
                    className="h-7 text-xs rounded-md border border-input bg-background px-2 w-full"
                    disabled={submitting}
                  >
                    <option value="debit">Débito</option>
                    <option value="credit">Crédito</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={submitting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Adicionar linha
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

      <div className="flex justify-end pt-2">
        <Button onClick={onSubmit} disabled={submitting || rows.length === 0}>
          {submitting ? 'Enviando...' : 'Enviar para revisão'}
        </Button>
      </div>
    </div>
  )
}
