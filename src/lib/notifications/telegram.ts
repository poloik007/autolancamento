function apiUrl(method: string) {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`
}

export async function sendTelegram(chatId: string | number, text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set, skipping')
    return
  }
  try {
    await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch (err) {
    console.error('[Telegram] sendMessage failed:', err)
  }
}

export async function sendAdminTelegram(text: string): Promise<void> {
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID
  if (!chatId) {
    console.warn('[Telegram] ADMIN_TELEGRAM_CHAT_ID not set, skipping')
    return
  }
  await sendTelegram(chatId, text)
}

export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set')

  const res = await fetch(apiUrl(`getFile?file_id=${fileId}`))
  const data = await res.json() as { result: { file_path: string } }
  const filePath = data.result.file_path

  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
  if (!fileRes.ok) throw new Error(`Failed to download Telegram file: ${fileRes.status}`)
  return Buffer.from(await fileRes.arrayBuffer())
}
