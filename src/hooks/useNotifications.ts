'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbNotification } from '@/types/database'

export function useNotifications() {
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const supabase = createClient()

  const fetchUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data ?? [])
  }, [])

  useEffect(() => {
    fetchUnread()

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetchUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => fetchUnread())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchUnread])

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function markAllAsRead() {
    const ids = notifications.map((n) => n.id)
    if (!ids.length) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)

    setNotifications([])
  }

  return { notifications, unreadCount: notifications.length, markAsRead, markAllAsRead }
}
