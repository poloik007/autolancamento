export async function sendRejectionEmail(to: string, note: string, filename: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@autolancamento.com.br',
    to,
    subject: 'Sua submissão foi rejeitada',
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Submissão rejeitada</h2>
        <p>O arquivo <strong>${filename}</strong> foi revisado pelo contador e não foi aprovado.</p>
        <div style="padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${note}</p>
        </div>
        <p>Por favor, corrija o arquivo e faça um novo upload no sistema.</p>
      </div>
    `,
  })
}

export async function sendApprovalEmail(to: string, filename: string) {
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@autolancamento.com.br',
    to,
    subject: 'Sua submissão foi aprovada',
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Submissão aprovada</h2>
        <p>O arquivo <strong>${filename}</strong> foi aprovado pelo contador e enviado ao sistema.</p>
      </div>
    `,
  })
}
