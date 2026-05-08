import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types/database'

interface NotificationInput {
  user_id: string
  type: NotificationType
  submission_id?: string
  message: string
}

export async function createNotification(
  client: SupabaseClient,
  notification: NotificationInput
) {
  await client.from('notifications').insert(notification)
}
