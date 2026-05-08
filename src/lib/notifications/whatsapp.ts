export interface IWhatsAppProvider {
  sendMessage(to: string, message: string): Promise<void>
}

function getProvider(): IWhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER ?? 'zapi'
  if (provider === 'zapi') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./whatsapp-zapi').zapiProvider
  }
  throw new Error(`Unknown WhatsApp provider: ${provider}`)
}

export async function sendWhatsApp(message: string): Promise<void> {
  const to = process.env.ADMIN_WHATSAPP_NUMBER
  if (!to) {
    console.warn('[WhatsApp] ADMIN_WHATSAPP_NUMBER not set, skipping')
    return
  }
  try {
    await getProvider().sendMessage(to, message)
  } catch (err) {
    console.error('[WhatsApp] Failed to send message:', err)
  }
}
