import { selectStrategy } from './parser-strategies'
import { normalize } from './normalizer'
import type { StandardTransaction, ExtractionWarning } from '@/types/submission'
import { ImageAnnotatorClient } from '@google-cloud/vision'

export interface OcrResult {
  transactions: StandardTransaction[]
  warnings: ExtractionWarning[]
}

export async function extractOcr(buffer: Buffer): Promise<OcrResult> {
  const warnings: ExtractionWarning[] = []
  let fullText = ''

  try {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS
      ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
      : undefined

    const client = new ImageAnnotatorClient({ credentials })

    // Send raw PDF buffer to Vision (works for single-page and simple PDFs)
    // For multi-page PDFs, install pdf2pic separately and add page-splitting logic here
    const pageBuffers: Buffer[] = [buffer]

    for (let i = 0; i < pageBuffers.length; i++) {
      try {
        const [result] = await client.textDetection({ image: { content: pageBuffers[i] } })
        const text = (result.fullTextAnnotation?.text as string) ?? ''

        if (!text.trim()) {
          warnings.push({
            pageNumber: i + 1,
            type: 'ocr_low_confidence',
            message: `Página ${i + 1} não produziu texto reconhecível.`,
          })
        }

        fullText += text + '\n'
      } catch (err) {
        warnings.push({
          pageNumber: i + 1,
          type: 'parse_failed',
          message: `Falha ao processar página ${i + 1}: ${err instanceof Error ? err.message : 'erro'}`,
        })
      }
    }
  } catch (err) {
    warnings.push({
      pageNumber: 0,
      type: 'parse_failed',
      message: `OCR não disponível: ${err instanceof Error ? err.message : 'erro'}. Configure GOOGLE_CLOUD_CREDENTIALS.`,
    })
  }

  const strategy = selectStrategy(fullText)
  const raw = strategy.parse(fullText)
  const transactions = normalize(raw)

  return { transactions, warnings }
}

async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (b: Buffer) => Promise<{ numpages: number }> = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.numpages
  } catch {
    return 1
  }
}
