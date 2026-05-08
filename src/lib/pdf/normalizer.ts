import { parseBrDate, parseBrCurrency } from '@/lib/utils/format'
import type { StandardTransaction } from '@/types/submission'

export interface RawTransaction {
  rawDate: string
  rawDescription: string
  rawAmount: string
  rawType?: string
  rawBalance?: string
  rawDocNumber?: string
  pageNumber?: number
}

export function normalize(raw: RawTransaction[]): StandardTransaction[] {
  const result: StandardTransaction[] = []

  for (const r of raw) {
    const date = parseBrDate(r.rawDate)
    if (!date) continue

    const amount = Math.abs(parseBrCurrency(r.rawAmount))
    if (isNaN(amount) || amount <= 0) continue

    const typeStr = (r.rawType ?? '').toUpperCase()
    const transactionType =
      typeStr.includes('C') && !typeStr.includes('D')
        ? 'credit'
        : 'debit'

    const isoDate = date.toISOString().split('T')[0]

    result.push({
      transactionDate: isoDate,
      description: r.rawDescription.trim().slice(0, 200),
      amount,
      transactionType,
      balance: r.rawBalance ? parseBrCurrency(r.rawBalance) : undefined,
      documentNumber: r.rawDocNumber?.trim() || undefined,
      rawText: `${r.rawDate} ${r.rawDescription} ${r.rawAmount}`,
    })
  }

  return result
}
