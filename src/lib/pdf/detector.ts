// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse')

const CHARS_PER_PAGE_THRESHOLD = 200

export async function detectPdfType(buffer: Buffer): Promise<'digital' | 'scanned'> {
  try {
    const data = await pdfParse(buffer)
    const charsPerPage = data.numpages > 0 ? data.text.length / data.numpages : 0
    return charsPerPage >= CHARS_PER_PAGE_THRESHOLD ? 'digital' : 'scanned'
  } catch {
    return 'scanned'
  }
}
