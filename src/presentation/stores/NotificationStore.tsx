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
  // Notifications
  notifications: Notification[]
  unreadCount: number
  
  // UI State
  isOpen: boolean
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  togglePanel: () => void
  setOpen: (open: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  immer((set, get) => ({
    // Initial state
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    
    // Add notification
    addNotification: (notification) => set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
      }
      
      state.notifications.unshift(newNotification)
      state.unreadCount++
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    }),
    
    // Remove notification
    removeNotification: (id) => set((state) => {
      const index = state.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        const notification = state.notifications[index]
        if (!notification.read) {
          state.unreadCount--
        }
        state.notifications.splice(index, 1)
      }
    }),
    
    // Mark as read
    markAsRead: (id) => set((state) => {
      const notification = state.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount--
      }
    }),
    
    // Mark all as read
    markAllAsRead: () => set((state) => {
      state.notifications.forEach(n => {
        n.read = true
      })
      state.unreadCount = 0
    }),
    
    // Clear all notifications
    clearAll: () => set((state) => {
      state.notifications = []
      state.unreadCount = 0
    }),
    
    // Toggle panel
    togglePanel: () => set((state) => {
      state.isOpen = !state.isOpen
    }),
    
    // Set open state
    setOpen: (open) => set((state) => {
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
    const message = status === 'succeeded' 
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
    const message = status === 'succeeded' 
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