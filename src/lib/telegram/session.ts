import { createAdminClient } from '@/lib/supabase/admin'

type SessionState = 'awaiting_client_confirm' | 'awaiting_admin_action' | 'done'

export interface TelegramSession {
  id: string
  chat_id: string
  submission_id: string | null
  state: SessionState
}

export async function getActiveSession(chatId: string): Promise<TelegramSession | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('telegram_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .neq('state', 'done')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function upsertSession(chatId: string, submissionId: string, state: SessionState) {
  const admin = createAdminClient()
  await admin
    .from('telegram_sessions')
    .update({ state: 'done', updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('state', 'done')

  await admin.from('telegram_sessions').insert({
    chat_id: chatId,
    submission_id: submissionId,
    state,
    updated_at: new Date().toISOString(),
  })
}

export async function updateSessionState(chatId: string, state: SessionState) {
  const admin = createAdminClient()
  await admin
    .from('telegram_sessions')
    .update({ state, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('state', 'done')
}
