'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PdfDropzone } from '@/components/upload/PdfDropzone'
import { ExtractionReview } from '@/components/upload/ExtractionReview'
import { CompanySelector } from '@/components/layout/CompanySelector'
import { createClient } from '@/lib/supabase/client'
import type { DbCompany } from '@/types/database'
import type { StandardTransaction, ExtractionWarning } from '@/types/submission'

type Step = 'select' | 'extracting' | 'review' | 'submitting'

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('select')
  const [company, setCompany] = useState<DbCompany | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<StandardTransaction[]>([])
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([])
  const [rows, setRows] = useState<StandardTransaction[]>([])

  async function handleFile(file: File) {
    if (!company) {
      toast.error('Selecione a empresa antes de fazer o upload.')
      return
    }

    setStep('extracting')

    try {
      // 1. Create draft submission + get signed upload URL
      const createRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, pdf_filename: file.name }),
      })
      if (!createRes.ok) throw new Error('Erro ao criar submissão')
      const { submissionId: sid, uploadUrl, path } = await createRes.json()
      setSubmissionId(sid)

      // 2. Upload PDF directly to Supabase Storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      })
      if (!uploadRes.ok) throw new Error('Erro ao enviar arquivo')

      // 3. Trigger extraction
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sid }),
      })
      if (!extractRes.ok) throw new Error('Erro na extração')
      const result = await extractRes.json()

      setTransactions(result.transactions)
      setWarnings(result.warnings)
      setRows(result.transactions)
      setStep('review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      setStep('select')
    }
  }

  async function handleSubmit() {
    if (!submissionId) return
    setStep('submitting')

    try {
      const res = await fetch(`/api/submissions/${submissionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: rows }),
      })
      if (!res.ok) throw new Error('Erro ao enviar')
      toast.success('Enviado para revisão do contador!')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
      setStep('review')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione a empresa e faça o upload do extrato bancário
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Empresa</label>
        <CompanySelector value={company} onChange={setCompany} />
      </div>

      {step === 'select' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Arquivo PDF</label>
          <PdfDropzone onFile={handleFile} disabled={!company} />
          {!company && (
            <p className="text-xs text-muted-foreground">Selecione a empresa primeiro.</p>
          )}
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Extraindo dados do PDF...</p>
            <p className="text-xs">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {(step === 'review' || step === 'submitting') && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Verifique os dados extraídos</label>
          <ExtractionReview
            transactions={transactions}
            warnings={warnings}
            onChange={setRows}
            onSubmit={handleSubmit}
            submitting={step === 'submitting'}
          />
        </div>
      )}
    </div>
  )
}
