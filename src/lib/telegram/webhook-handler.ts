import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram, sendAdminTelegram, downloadTelegramFile } from '@/lib/notifications/telegram'
import { createNotification } from '@/lib/notifications/create'
import { extractWithGemini } from '@/lib/pdf/extractor-gemini'
import { getTRClient } from '@/lib/thomson-reuters/client'
import { getActiveSession, upsertSession, updateSessionState } from './session'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    document?: {
      file_id: string
      file_name?: string
      mime_type?: string
    }
  }
}

function formatCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function shortId(uuid: string) {
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export async function handleTelegramUpdate(payload: unknown) {
  const update = payload as TelegramUpdate
  const message = update.message
  if (!message) return

  const chatId = String(message.chat.id)
  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID

  if (message.document) {
    await handleDocument(chatId, message.document)
  } else if (message.text) {
    const text = message.text.trim()

    if (text === '/start') {
      await handleStart(chatId, message.from)
    } else if (adminChatId && chatId === adminChatId) {
      await handleAdminText(chatId, text)
    } else {
      await handleClientText(chatId, text)
    }
  }
}

// ---------- /start ----------

async function handleStart(chatId: string, from: { id: number; first_name: string }) {
  const admin = createAdminClient()
  const { data: user } = await admin
    .from('users')
    .select('full_name')
    .eq('telegram_chat_id', chatId)
    .single()

  if (user) {
    await sendTelegram(chatId, `Olá, ${user.full_name ?? 'cliente'}! Envie um PDF do extrato bancário para iniciar.`)
  } else {
    await sendTelegram(
      chatId,
      `Seu Telegram ainda não está vinculado ao sistema.\n\nInforme ao seu contador o seu ID: \`${chatId}\``
    )
  }
}

// ---------- Incoming PDF ----------

async function handleDocument(chatId: string, doc: { file_id: string; file_name?: string; mime_type?: string }) {
  if (!doc.mime_type?.includes('pdf')) {
    await sendTelegram(chatId, 'Por favor, envie um arquivo *PDF* do extrato bancário.')
    return
  }

  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('id, full_name')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true)
    .single()

  if (!user) {
    await sendTelegram(chatId, 'Seu Telegram não está vinculado. Informe ao seu contador seu ID: `' + chatId + '`')
    return
  }

  const { data: access } = await admin
    .from('client_company_access')
    .select('company_id, companies(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!access) {
    await sendTelegram(chatId, 'Nenhuma empresa associada à sua conta. Entre em contato com seu contador.')
    return
  }

  const company = access.companies as { name: string } | null

  await sendTelegram(chatId, '⏳ Processando seu extrato...')

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await downloadTelegramFile(doc.file_id)
  } catch {
    await sendTelegram(chatId, 'Não consegui baixar o arquivo. Tente novamente.')
    return
  }

  const filename = doc.file_name ?? `extrato_${Date.now()}.pdf`
  const storagePath = `${user.id}/${Date.now()}_${filename}`

  const { error: uploadError } = await admin.storage
    .from('submissions')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' })

  if (uploadError) {
    await sendTelegram(chatId, 'Erro ao salvar o arquivo. Tente novamente.')
    return
  }

  const { data: submission } = await admin
    .from('submissions')
    .insert({
      user_id: user.id,
      company_id: access.company_id,
      status: 'draft',
      source: 'telegram',
      pdf_path: storagePath,
      pdf_filename: filename,
    })
    .select('id')
    .single()

  if (!submission) {
    await sendTelegram(chatId, 'Erro ao criar submissão. Tente novamente.')
    return
  }

  const { transactions, warnings } = await extractWithGemini(pdfBuffer)

  if (transactions.length === 0) {
    const warningMsg = warnings[0]?.message ?? 'Nenhuma transação encontrada.'
    await sendTelegram(chatId, `❌ Não consegui extrair transações.\n${warningMsg}\n\nVerifique o arquivo e tente novamente.`)
    await admin.from('submissions').delete().eq('id', submission.id)
    await admin.storage.from('submissions').remove([storagePath])
    return
  }

  await admin.from('submission_transactions').insert(
    transactions.map((t, i) => ({
      submission_id: submission.id,
      transaction_date: t.transactionDate,
      description: t.description,
      amount: t.amount,
      transaction_type: t.transactionType,
      balance: t.balance ?? null,
      transaction_time: (t as { transactionTime?: string }).transactionTime ?? null,
      holder_name: (t as { holderName?: string }).holderName ?? null,
      account_number: (t as { accountNumber?: string }).accountNumber ?? null,
      beneficiary: (t as { beneficiary?: string }).beneficiary ?? null,
      raw_text: t.rawText,
      sort_order: i,
    }))
  )

  await upsertSession(chatId, submission.id, 'awaiting_client_confirm')

  const totalDebit = transactions.filter(t => t.transactionType === 'debit').reduce((s, t) => s + t.amount, 0)
  const totalCredit = transactions.filter(t => t.transactionType === 'credit').reduce((s, t) => s + t.amount, 0)

  await sendTelegram(
    chatId,
    `✅ Extrato recebido!\n` +
    `🏢 Empresa: *${company?.name ?? ''}*\n` +
    `📊 *${transactions.length}* transações encontradas\n` +
    `🔴 Débitos: ${formatCurrency(totalDebit)}\n` +
    `🟢 Créditos: ${formatCurrency(totalCredit)}\n\n` +
    `Responda *confirmar* para enviar para revisão, ou *cancelar* para descartar.`
  )
}

// ---------- Client text ----------

async function handleClientText(chatId: string, message: string) {
  const session = await getActiveSession(chatId)

  if (!session?.submission_id) {
    await sendTelegram(chatId, 'Envie um PDF do extrato bancário para iniciar.')
    return
  }

  const lower = message.toLowerCase()

  if (lower === 'confirmar') {
    const admin = createAdminClient()

    await admin
      .from('submissions')
      .update({ status: 'pending', submitted_at: new Date().toISOString() })
      .eq('id', session.submission_id)

    const { data: admins } = await admin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    const { data: sub } = await admin
      .from('submissions')
      .select('pdf_filename, companies(name)')
      .eq('id', session.submission_id)
      .single()

    const company = sub?.companies as { name: string } | null
    const sid = shortId(session.submission_id)
    const msg = `📄 Nova submissão via Telegram\n🏢 ${company?.name ?? ''}\n📎 ${sub?.pdf_filename ?? ''}\n\nAprovar: \`aprovar ${sid}\`\nRejeitar: \`rejeitar ${sid}: motivo\``

    for (const adminUser of (admins ?? [])) {
      await createNotification(admin, {
        user_id: adminUser.id,
        type: 'submission_pending',
        submission_id: session.submission_id,
        message: `Nova submissão via Telegram — ${company?.name ?? ''} (${sub?.pdf_filename ?? ''})`,
      })
    }

    await sendAdminTelegram(msg)
    await updateSessionState(chatId, 'done')
    await sendTelegram(chatId, '✅ Enviado para revisão! Você será notificado quando o contador revisar.')

  } else if (lower === 'cancelar') {
    const admin = createAdminClient()
    const { data: sub } = await admin
      .from('submissions')
      .select('pdf_path')
      .eq('id', session.submission_id)
      .single()

    if (sub?.pdf_path) {
      await admin.storage.from('submissions').remove([sub.pdf_path])
    }
    await admin.from('submissions').delete().eq('id', session.submission_id)
    await updateSessionState(chatId, 'done')
    await sendTelegram(chatId, 'Rascunho descartado.')

  } else {
    await sendTelegram(chatId, 'Responda *confirmar* para enviar para revisão, ou *cancelar* para descartar.')
  }
}

// ---------- Admin text ----------

async function handleAdminText(chatId: string, message: string) {
  const admin = createAdminClient()

  const approveMatch = message.match(/^aprovar\s+([A-Z0-9]{8})/i)
  const rejectMatch = message.match(/^rejeitar\s+([A-Z0-9]{8})[:\s]+(.+)/i)

  if (approveMatch) {
    const sid = approveMatch[1].toUpperCase()

    const { data: submission } = await admin
      .from('submissions')
      .select('id, status, user_id, pdf_filename, companies(name, tr_company_id), period_start, period_end')
      .ilike('id', `${sid.toLowerCase()}%`)
      .eq('status', 'pending')
      .single()

    if (!submission) {
      await sendTelegram(chatId, `❌ Submissão \`${sid}\` não encontrada ou não está pendente.`)
      return
    }

    const { data: transactions } = await admin
      .from('submission_transactions')
      .select('*')
      .eq('submission_id', submission.id)
      .order('sort_order')

    const company = submission.companies as { name: string; tr_company_id: string } | null
    let trSuccess = false
    let trReferenceId: string | undefined

    try {
      const trClient = getTRClient()
      const trResult = await trClient.sendStatement({
        companyId: company?.tr_company_id ?? '',
        periodStart: (submission as { period_start?: string }).period_start ?? '',
        periodEnd: (submission as { period_end?: string }).period_end ?? '',
        statementType: 'checking',
        transactions: (transactions ?? []).map((t) => ({
          date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          type: t.transaction_type === 'debit' ? 'D' : 'C',
        })),
      })
      trSuccess = trResult.success
      trReferenceId = trResult.referenceId
    } catch (err) {
      console.error('[TR] sendStatement failed:', err)
    }

    const newStatus = trSuccess ? 'sent_to_tr' : 'tr_failed'
    await admin.from('submissions').update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      tr_response: trReferenceId ? { referenceId: trReferenceId } : null,
      tr_sent_at: trSuccess ? new Date().toISOString() : null,
    }).eq('id', submission.id)

    // Notify client via Telegram
    const { data: clientUser } = await admin
      .from('users')
      .select('telegram_chat_id')
      .eq('id', submission.user_id)
      .single()

    if (clientUser?.telegram_chat_id) {
      const clientMsg = trSuccess
        ? `✅ Sua submissão *${submission.pdf_filename}* foi aprovada e enviada ao Thomson Reuters.`
        : `⚠️ Sua submissão *${submission.pdf_filename}* foi aprovada, mas houve uma falha ao enviar ao TR. Seu contador verificará em breve.`
      await sendTelegram(clientUser.telegram_chat_id, clientMsg)
    }

    await createNotification(admin, {
      user_id: submission.user_id,
      type: 'submission_approved',
      submission_id: submission.id,
      message: `Sua submissão "${submission.pdf_filename}" foi aprovada.`,
    })

    await admin.from('audit_log').insert({
      action: 'submission.approved',
      entity_type: 'submission',
      entity_id: submission.id,
      metadata: { channel: 'telegram', tr_success: trSuccess },
    })

    await sendTelegram(chatId, trSuccess
      ? `✅ Submissão \`${sid}\` aprovada e enviada ao TR.`
      : `⚠️ Submissão \`${sid}\` aprovada, mas falha no TR.`
    )

  } else if (rejectMatch) {
    const sid = rejectMatch[1].toUpperCase()
    const note = rejectMatch[2].trim()

    const { data: submission } = await admin
      .from('submissions')
      .select('id, user_id, pdf_filename')
      .ilike('id', `${sid.toLowerCase()}%`)
      .eq('status', 'pending')
      .single()

    if (!submission) {
      await sendTelegram(chatId, `❌ Submissão \`${sid}\` não encontrada ou não está pendente.`)
      return
    }

    await admin.from('submissions').update({
      status: 'rejected',
      rejection_note: note,
      reviewed_at: new Date().toISOString(),
    }).eq('id', submission.id)

    const { data: clientUser } = await admin
      .from('users')
      .select('telegram_chat_id')
      .eq('id', submission.user_id)
      .single()

    if (clientUser?.telegram_chat_id) {
      await sendTelegram(
        clientUser.telegram_chat_id,
        `❌ Sua submissão *${submission.pdf_filename}* foi rejeitada.\n\n*Motivo:* ${note}\n\nEnvie um novo extrato corrigido quando estiver pronto.`
      )
    }

    await createNotification(admin, {
      user_id: submission.user_id,
      type: 'submission_rejected',
      submission_id: submission.id,
      message: `Sua submissão "${submission.pdf_filename}" foi rejeitada. Motivo: ${note}`,
    })

    await admin.from('audit_log').insert({
      action: 'submission.rejected',
      entity_type: 'submission',
      entity_id: submission.id,
      metadata: { channel: 'telegram', note },
    })

    await sendTelegram(chatId, `✅ Submissão \`${sid}\` rejeitada.`)

  } else {
    await sendTelegram(
      chatId,
      'Comandos disponíveis:\n`aprovar ABCDEF12`\n`rejeitar ABCDEF12: motivo`'
    )
  }
}
