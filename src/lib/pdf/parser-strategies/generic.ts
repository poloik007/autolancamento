import type { ParserStrategy } from './index'
import type { RawTransaction } from '../normalizer'

// Regex patterns for common Brazilian bank statement formats
// Matches: DD/MM/YYYY  Description  1.234,56  D/C
const LINE_RE = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([DC]?)\s*$/

export const generic: ParserStrategy = {
  canHandle(_text: string): boolean {
    return true // fallback
  },

  parse(text: string): RawTransaction[] {
    const lines = text.split('\n')
    const results: RawTransaction[] = []

    for (const line of lines) {
      const match = line.trim().match(LINE_RE)
      if (!match) continue

      const [, rawDate, rawDescription, rawAmount, rawType] = match
      results.push({ rawDate, rawDescription, rawAmount, rawType })
    }

    return results
  },
}
