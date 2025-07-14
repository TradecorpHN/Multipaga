'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, any>
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: any
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch notifications')
  }
  
  return response.json()
}

export function useNotifications(): UseNotificationsReturn {
  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR<{ notifications: Notification[] }>('/api/notifications', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  const notifications = data?.notifications || []
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      })
      
      // Optimistically update the cache
      mutate((current) => ({
        notifications: current?.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ) || []
      }), false)
      
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [mutate])

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      })
      
      // Optimistically update the cache
      mutate((current) => ({
        notifications: current?.notifications.map(n => ({ ...n, read: true })) || []
      }), false)
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [mutate])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      // Optimistically update the cache
      mutate((current) => ({
        notifications: current?.notifications.filter(n => n.id !== notificationId) || []
      }), false)
      
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [mutate])

  const refreshNotifications = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  }
}