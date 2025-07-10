import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { NotificationType } from '@/types/common'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: {
    label: string
    action: () => void
  }[]
  metadata?: Record<string, any>
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean

  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  togglePanel: () => void
  setOpen: (open: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  immer((set: (fn: (state: NotificationState) => void) => void, get: () => NotificationState) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    addNotification: (
      notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
    ) =>
      set((state: NotificationState) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          read: false,
        }
        state.notifications.unshift(newNotification)
        state.unreadCount++

        // Limitar a 50 notificaciones
        if (state.notifications.length > 50) {
          state.notifications = state.notifications.slice(0, 50)
        }
      }),

    removeNotification: (id: string) =>
      set((state: NotificationState) => {
        const index = state.notifications.findIndex((n: Notification) => n.id === id)
        if (index !== -1) {
          const notification = state.notifications[index]
          if (!notification.read) {
            state.unreadCount--
          }
          state.notifications.splice(index, 1)
        }
      }),

    markAsRead: (id: string) =>
      set((state: NotificationState) => {
        const notification = state.notifications.find((n: Notification) => n.id === id)
        if (notification && !notification.read) {
          notification.read = true
          state.unreadCount--
        }
      }),

    markAllAsRead: () =>
      set((state: NotificationState) => {
        state.notifications.forEach((n: Notification) => {
          n.read = true
        })
        state.unreadCount = 0
      }),

    clearAll: () =>
      set((state: NotificationState) => {
        state.notifications = []
        state.unreadCount = 0
      }),

    togglePanel: () =>
      set((state: NotificationState) => {
        state.isOpen = !state.isOpen
      }),

    setOpen: (open: boolean) =>
      set((state: NotificationState) => {
        state.isOpen = open
      }),
  }))
)

// Helper functions for common notifications
export const notify = {
  success: (title: string, message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
    })
  },

  error: (title: string, message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
    })
  },

  warning: (title: string, message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
    })
  },

  info: (title: string, message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
    })
  },

  payment: (paymentId: string, status: 'succeeded' | 'failed', amount: number, currency: string) => {
    const title = status === 'succeeded' ? 'Payment Successful' : 'Payment Failed'
    const message =
      status === 'succeeded'
        ? `Payment ${paymentId} for ${currency} ${(amount / 100).toFixed(2)} completed successfully`
        : `Payment ${paymentId} for ${currency} ${(amount / 100).toFixed(2)} failed`

    useNotificationStore.getState().addNotification({
      type: status === 'succeeded' ? 'success' : 'error',
      title,
      message,
      metadata: { paymentId, amount, currency, status },
    })
  },

  refund: (refundId: string, status: 'succeeded' | 'failed', amount: number, currency: string) => {
    const title = status === 'succeeded' ? 'Refund Processed' : 'Refund Failed'
    const message =
      status === 'succeeded'
        ? `Refund ${refundId} for ${currency} ${(amount / 100).toFixed(2)} processed successfully`
        : `Refund ${refundId} for ${currency} ${(amount / 100).toFixed(2)} failed`

    useNotificationStore.getState().addNotification({
      type: status === 'succeeded' ? 'success' : 'error',
      title,
      message,
      metadata: { refundId, amount, currency, status },
    })
  },

  dispute: (disputeId: string, stage: string, amount: number, currency: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: 'New Dispute',
      message: `Dispute ${disputeId} for ${currency} ${(amount / 100).toFixed(2)} requires your attention`,
      metadata: { disputeId, amount, currency, stage },
    })
  },
}
