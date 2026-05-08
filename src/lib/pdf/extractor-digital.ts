// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse')
import { selectStrategy } from './parser-strategies'
import { normalize } from './normalizer'
import type { StandardTransaction } from '@/types/submission'

export async function extractDigital(buffer: Buffer): Promise<StandardTransaction[]> {
  const data = await pdfParse(buffer)
  const strategy = selectStrategy(data.text)
  const raw = strategy.parse(data.text)
  return normalize(raw)
}
