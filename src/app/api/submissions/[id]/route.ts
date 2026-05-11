import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission } = await supabase
    .from('submissions')
    .select('id, status, pdf_path, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'draft') return NextResponse.json({ error: 'Only drafts can be deleted' }, { status: 400 })

  const admin = createAdminClient()

  // Delete file from storage
  await admin.storage.from('submissions').remove([submission.pdf_path])

  // Delete submission (cascades to transactions/notifications)
  await admin.from('submissions').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
