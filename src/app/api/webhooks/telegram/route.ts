import { NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/lib/telegram/webhook-handler'

export async function POST(request: Request) {
  let update: unknown
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Acknowledge immediately — Telegram expects a fast 200 response
  handleTelegramUpdate(update).catch((err) =>
    console.error('[telegram-webhook] unhandled error:', err)
  )

  return NextResponse.json({ ok: true })
}
