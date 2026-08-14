"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher-client'
import useUser from '@/hooks/useUser'
import { playNotificationSound, shouldPlaySound } from '@/lib/notificationSound'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const { user } = useUser()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [newNotification, setNewNotification] = useState(null)
  const channelRef = useRef(null)
  const timerRef = useRef(null)

  // Fetch initial unread count
  const fetchCount = useCallback(async () => {
    if (!user?._id) return
    try {
      const res = await fetch('/api/notifications/count')
      if (res.ok) {
        const { count } = await res.json()
        setUnreadCount(count)
      }
    } catch (err) {
      console.error('[NotificationContext] Fetch count failed:', err)
    }
  }, [user?._id])

  useEffect(() => {
    if (!user?._id) return

    fetchCount()

    // Subscribe to Pusher private notifications channel
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-notifications-${user._id}`
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    // New notification arrives
    channel.bind('new-notification', (data) => {
      // Check if notification is for the chat the user is actively viewing
      const isGroupMessage = data.type === 'group_message' && data.groupId
      const isDMMessage = data.type === 'dm_message' && data.meta?.conversationId
      const isActiveChat =
        (isGroupMessage && pathname === `/chats/${data.groupId}`) ||
        (isDMMessage && pathname === `/chats/dm/${data.meta.conversationId}`)

      // Skip badge increment and bell shake if user is in the active chat
      if (!isActiveChat) {
        setUnreadCount(prev => Math.min(prev + 1, 99))
        setNewNotification(data)
      }

      // Play notification sound if:
      // 1. Tab is hidden OR not on notifications page OR not viewing the active chat
      // 2. Sound is enabled in settings (default: enabled)
      const isOnNotificationsPage = typeof window !== 'undefined' && window.location.pathname === '/notifications'
      const isTabHidden = typeof document !== 'undefined' && document.hidden

      if ((isTabHidden || !isOnNotificationsPage) && !isActiveChat && shouldPlaySound()) {
        playNotificationSound()
      }

      // Clear new notification state after a delay to allow UI to react
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNewNotification(null), 5000)
    })

    // Notification removed (unlike, unfollow)
    channel.bind('remove-notification', () => {
      fetchCount()
    })

    // Read status synced across tabs
    channel.bind('notifications-read', ({ notificationId }) => {
      if (notificationId === 'all') {
        setUnreadCount(0)
      } else {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (channelRef.current) {
        channelRef.current.unbind_all()
        pusher.unsubscribe(channelName)
        channelRef.current = null
      }
    }
  }, [user?._id, fetchCount])

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/read', { method: 'PATCH' })
      if (res.ok) {
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('[NotificationContext] Mark all read failed:', err)
    }
  }, [])

  const markOneRead = useCallback(async (notificationId) => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      if (res.ok) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('[NotificationContext] Mark one read failed:', err)
    }
  }, [])

  const value = {
    unreadCount,
    newNotification,
    markAllRead,
    markOneRead,
    refetchCount: fetchCount
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
