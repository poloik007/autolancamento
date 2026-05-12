import Groq from 'groq-sdk'
import type { ExtractionResult, ExtractionWarning } from '@/types/submission'

const PROMPT = `You are extracting bank transaction data from a Brazilian bank statement (extrato bancário or comprovante de pagamento).

Return ONLY a valid JSON object — no explanation, no markdown:
{ "transactions": [ ... ] }

Each transaction must have exactly these fields:
  transaction_date  — ISO date YYYY-MM-DD (required)
  description       — string max 200 chars (required)
  amount            — positive number, always positive even for debits (required)
  transaction_type  — "debit" for saídas/débitos/pagamentos, "credit" for entradas/créditos/depósitos (required)
  balance           — number or null (saldo after the transaction, if shown)
  transaction_time  — "HH:MM:SS" or null
  holder_name       — account holder full name or null
  account_number    — account number or null
  beneficiary       — recipient/beneficiary name or null

Rules:
- Extract ALL transactions visible in the document
- Skip header, footer, summary, and balance-only rows
- Dates must be in YYYY-MM-DD format
- Amounts must always be positive numbers
- If you cannot find any transactions, return { "transactions": [] }`

interface RawTransaction {
  transaction_date: string
  description: string
  amount: number
  transaction_type: 'debit' | 'credit'
  balance: number | null
  transaction_time: string | null
  holder_name: string | null
  account_number: string | null
  beneficiary: string | null
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d))
}

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getText()
  return result.text
}

export async function extractWithGroq(pdfBuffer: Buffer): Promise<ExtractionResult> {
  const warnings: ExtractionWarning[] = []

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'GROQ_API_KEY não configurado.' })
    return { transactions: [], warnings, pdfType: 'digital' }
  }

  let text: string
  try {
    text = await extractPdfText(pdfBuffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao extrair texto do PDF.'
    warnings.push({ pageNumber: 0, type: 'parse_failed', message })
    return { transactions: [], warnings, pdfType: 'digital' }
  }

  if (!text.trim()) {
    warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'PDF não contém texto extraível.' })
    return { transactions: [], warnings, pdfType: 'digital' }
  }

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `${PROMPT}\n\n---EXTRATO---\n${text.slice(0, 8000)}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    let parsed: { transactions: RawTransaction[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'Groq retornou JSON inválido.', rawText: raw.slice(0, 200) })
      return { transactions: [], warnings, pdfType: 'digital' }
    }

    const transactions = (parsed.transactions ?? [])
      .filter((t) => {
        if (!isValidDate(t.transaction_date)) return false
        if (typeof t.amount !== 'number' || t.amount <= 0) return false
        if (!t.description?.trim()) return false
        return true
      })
      .map((t) => ({
        transactionDate: t.transaction_date,
        description: t.description.slice(0, 200).trim(),
        amount: t.amount,
        transactionType: t.transaction_type === 'credit' ? 'credit' as const : 'debit' as const,
        balance: t.balance ?? undefined,
        transactionTime: t.transaction_time ?? undefined,
        holderName: t.holder_name ?? undefined,
        accountNumber: t.account_number ?? undefined,
        beneficiary: t.beneficiary ?? undefined,
        rawText: `${t.transaction_date} ${t.description} ${t.amount}`,
      }))

    return { transactions, warnings, pdfType: 'digital' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao chamar Groq.'
    warnings.push({ pageNumber: 0, type: 'parse_failed', message })
    return { transactions: [], warnings, pdfType: 'digital' }
  }
}
