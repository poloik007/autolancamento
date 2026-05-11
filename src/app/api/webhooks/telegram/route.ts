import { NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/lib/telegram/webhook-handler'

export async function POST(request: Request) {
  let update: unknown
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await handleTelegramUpdate(update)
  } catch (err) {
    console.error('[telegram-webhook] unhandled error:', err)
  }

  return NextResponse.json({ ok: true })
}
