import type { TransactionType } from './database'

export interface StandardTransaction {
  transactionDate: string
  description: string
  amount: number
  transactionType: TransactionType
  balance?: number
  documentNumber?: string
  rawText: string
  // campos extras (comprovantes BRB e similares)
  holderName?: string
  accountNumber?: string
  beneficiary?: string
  transactionTime?: string
}

export interface ExtractionWarning {
  pageNumber: number
  type: 'ocr_low_confidence' | 'parse_failed' | 'ocr_timeout'
  rawText?: string
  message: string
}

export interface ExtractionResult {
  transactions: StandardTransaction[]
  warnings: ExtractionWarning[]
  pdfType: 'digital' | 'scanned'
}
