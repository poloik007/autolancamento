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

export async function extractWithOpenRouter(pdfBuffer: Buffer): Promise<ExtractionResult> {
  const warnings: ExtractionWarning[] = []

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'OPENROUTER_API_KEY não configurado.' })
    return { transactions: [], warnings, pdfType: 'digital' }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      warnings.push({ pageNumber: 0, type: 'parse_failed', message: `OpenRouter error ${response.status}: ${err.slice(0, 200)}` })
      return { transactions: [], warnings, pdfType: 'digital' }
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[]
    }

    const raw = data.choices[0]?.message?.content ?? ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'Modelo não retornou JSON válido.', rawText: raw.slice(0, 200) })
      return { transactions: [], warnings, pdfType: 'digital' }
    }

    let parsed: { transactions: RawTransaction[] }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      warnings.push({ pageNumber: 0, type: 'parse_failed', message: 'JSON inválido na resposta do modelo.', rawText: raw.slice(0, 200) })
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
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao chamar OpenRouter.'
    warnings.push({ pageNumber: 0, type: 'parse_failed', message })
    return { transactions: [], warnings, pdfType: 'digital' }
  }
}
