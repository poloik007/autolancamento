import type { ParserStrategy } from './index'
import type { RawTransaction } from '../normalizer'

// Bradesco extratos: "DD/MM/AAAA  Histórico  Documento  Débito  Crédito  Saldo"
const HEADER = /Banco\s+Bradesco|bradesco/i
const LINE_RE = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+)?\s+([\d.,]+|-)\s+([\d.,]+|-)?\s*([\d.,]+)?/

export const bradesco: ParserStrategy = {
  canHandle(text: string): boolean {
    return HEADER.test(text)
  },

  parse(text: string): RawTransaction[] {
    const lines = text.split('\n')
    const results: RawTransaction[] = []

    for (const line of lines) {
      const match = line.trim().match(LINE_RE)
      if (!match) continue

      const [, rawDate, rawDescription, rawDocNumber, debit, credit, rawBalance] = match

      const isDebit = debit && debit !== '-'
      const isCredit = credit && credit !== '-'
      if (!isDebit && !isCredit) continue

      results.push({
        rawDate,
        rawDescription,
        rawAmount: isDebit ? debit : credit!,
        rawType: isDebit ? 'D' : 'C',
        rawBalance: rawBalance ?? undefined,
        rawDocNumber: rawDocNumber ?? undefined,
      })
    }

    return results
  },
}
