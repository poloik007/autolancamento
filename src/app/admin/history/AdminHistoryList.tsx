'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Download } from 'lucide-react'
import { SubmissionStatusBadge } from '@/components/submissions/SubmissionStatusBadge'
import { formatDateTime } from '@/lib/utils/format'
import type { SubmissionStatus } from '@/types/database'

interface Submission {
  id: string
  pdf_filename: string
  status: SubmissionStatus
  created_at: string
  users: { full_name: string | null; email: string } | null
  companies: { name: string } | null
}

export function AdminHistoryList({ submissions }: { submissions: Submission[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(
      selected.size === submissions.length
        ? new Set()
        : new Set(submissions.map((s) => s.id))
    )
  }

  async function handleBulkExport() {
    if (selected.size === 0 || exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/submissions/export-ofx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error('Erro ao exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exportacao-${new Date().toISOString().slice(0, 10)}-${selected.size}itens.ofx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao exportar. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  if (!submissions.length) {
    return (
      <div className="rounded-lg border bg-white px-4 py-12 text-center text-sm text-muted-foreground">
        Nenhuma submissão encontrada.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-white divide-y">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-t-lg">
          <input
            type="checkbox"
            checked={selected.size === submissions.length}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">Selecionar todos</span>
        </div>
        {submissions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 rounded border-gray-300 cursor-pointer shrink-0"
            />
            <Link href={`/admin/queue/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.pdf_filename}</p>
                <p className="text-xs text-muted-foreground">
                  {s.users?.full_name || s.users?.email} &middot; {s.companies?.name} &middot; {formatDateTime(s.created_at)}
                </p>
              </div>
              <SubmissionStatusBadge status={s.status} />
            </Link>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleBulkExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full shadow-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : `Exportar ${selected.size} selecionada${selected.size > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </>
  )
}
