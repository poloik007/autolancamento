import type { IWhatsAppProvider } from './whatsapp'

export const zapiProvider: IWhatsAppProvider = {
  async sendMessage(to: string, message: string): Promise<void> {
    const instanceId = process.env.ZAPI_INSTANCE_ID
    const token = process.env.ZAPI_TOKEN
    const securityToken = process.env.ZAPI_SECURITY_TOKEN

    if (!instanceId || !token) {
      console.warn('[Z-API] Missing credentials, skipping WhatsApp notification')
      return
    }

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(securityToken ? { 'Client-Token': securityToken } : {}),
      },
      body: JSON.stringify({ phone: to, message }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Z-API error ${res.status}: ${text}`)
    }
  },
}
