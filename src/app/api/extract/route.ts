import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectPdfType } from '@/lib/pdf/detector'
import { extractDigital } from '@/lib/pdf/extractor-digital'
import { extractOcr } from '@/lib/pdf/extractor-ocr'
import { z } from 'zod'

export const maxDuration = 60

const schema = z.object({ submissionId: z.string().uuid() })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { submissionId } = parsed.data

  // Verify ownership
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, pdf_path, status, user_id')
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'draft') return NextResponse.json({ error: 'Already processed' }, { status: 400 })

  const admin = createAdminClient()

  // Download PDF from storage
  const { data: fileData, error: downloadError } = await admin.storage
    .from('submissions')
    .download(submission.pdf_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const pdfType = await detectPdfType(buffer)

  let transactions: import('@/types/submission').StandardTransaction[]
  let warnings: import('@/types/submission').ExtractionWarning[]

  if (pdfType === 'digital') {
    transactions = await extractDigital(buffer)
    warnings = []
  } else {
    const result = await extractOcr(buffer)
    transactions = result.transactions
    warnings = result.warnings
  }

  // Persist pdf_type
  await admin
    .from('submissions')
    .update({ pdf_type: pdfType })
    .eq('id', submissionId)

  return NextResponse.json({ transactions, warnings, pdfType })
}
