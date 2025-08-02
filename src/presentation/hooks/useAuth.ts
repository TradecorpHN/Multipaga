'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useContext, createContext } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'

interface SessionData {
  customerId: string
  customerName: string | null
  environment: 'sandbox' | 'production'
  merchantId: string
  profileId: string
  isAuthenticated: boolean
  expiresAt: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  merchant: SessionData | null
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (apiKey: string, merchantId?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
}

const AuthContextInstance = createContext<AuthContextType | null>(null)

const BASE_URL = process.env.NEXT_PUBLIC_HYPERSWITCH_URL || 'https://sandbox.hyperswitch.io'

const sessionFetcher = async ([url, apiKey]: [string, string | undefined]) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['api-key'] = apiKey
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NO_SESSION')
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Error verificando sesión: ${response.status}`)
  }

  const data = await response.json()
  return {
    success: true,
    merchant: {
      customerId: data.customer_id || '',
      customerName: data.customer_name || null,
      environment: data.environment || 'sandbox',
      merchantId: data.merchant_id || '',
      profileId: data.profile_id || '',
      isAuthenticated: true,
      expiresAt: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)

  const {
    data: sessionResponse,
    error: sessionError,
    isLoading,
    mutate: mutateSession,
  } = useSWR<
    { success: boolean; merchant: SessionData } | undefined,
    Error
  >(apiKey ? ['/account', apiKey] : null, sessionFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    dedupingInterval: 30000,
  })

  const isAuthenticated = !!(sessionResponse?.success && sessionResponse?.merchant)
  const merchant = sessionResponse?.merchant || null

  const login = useCallback(
    async (apiKey: string, merchantId?: string) => {
      try {
        setError(null)
        setApiKey(apiKey)

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            api_key: apiKey,
            merchant_id: merchantId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          const errorMessage =
            data.error ||
            (response.status === 401
              ? 'Clave API inválida'
              : `Error de autenticación: ${response.status}`)
          setError(errorMessage)
          setApiKey(null)
          return { success: false, error: errorMessage }
        }

        await mutateSession()
        toast.success('Sesión iniciada exitosamente')
        return { success: true }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error inesperado al iniciar sesión'
        setError(errorMessage)
        setApiKey(null)
        return { success: false, error: errorMessage }
      }
    },
    [mutateSession]
  )

  const logout = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Error al cerrar sesión: ${response.status}`)
      }

      setApiKey(null)
      await mutateSession(undefined, { revalidate: false })
      toast.success('Sesión cerrada exitosamente')
      router.push('/login')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cerrar sesión'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [mutateSession, router])

  const refreshSession = useCallback(async () => {
    try {
      setError(null)
      await mutateSession()
      toast.success('Sesión actualizada')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error refrescando sesión'
      setError(errorMessage)
      console.error('Error refreshing session:', error)
      toast.error(errorMessage)
    }
  }, [mutateSession])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    if (sessionError) {
      if (sessionError.message === 'NO_SESSION') {
        setError(null)
      } else {
        setError(sessionError.message)
        toast.error(sessionError.message)
      }
    }
  }, [sessionError])

  useEffect(() => {
    if (!isAuthenticated || !merchant || !apiKey) return

    const expiresAt = new Date(merchant.expiresAt)
    if (isNaN(expiresAt.getTime())) {
      console.warn('Invalid expiresAt date, setting default expiration')
      return
    }

    const now = new Date()
    const refreshTime = expiresAt.getTime() - now.getTime() - 5 * 60 * 1000

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshSession()
      }, refreshTime)
      return () => clearTimeout(timeoutId)
    } else if (expiresAt.getTime() <= now.getTime()) {
      logout()
    }
  }, [isAuthenticated, merchant, apiKey, refreshSession, logout])

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    merchant,
    error,
    login,
    logout,
    refreshSession,
    clearError,
  }

  return (
    React.createElement(AuthContextInstance.Provider, { value: contextValue }, children)
  )
}

export function useAuth() {
  const context = useContext(AuthContextInstance)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

export function useMerchant() {
  const { merchant, isAuthenticated } = useAuth()

  return {
    merchant,
    merchantId: merchant?.merchantId,
    profileId: merchant?.profileId,
    customerId: merchant?.customerId,
    customerName: merchant?.customerName,
    environment: merchant?.environment,
    isAuthenticated,
  }
}

export function usePermissions() {
  const { merchant, isAuthenticated } = useAuth()

  const hasPermission = useCallback(
    (permission: string) => {
      if (!isAuthenticated || !merchant) return false

      const profilePermissions: Record<string, string[]> = {
        admin_profile: [
          'disputes:read',
          'disputes:challenge',
          'payments:create',
          'payments:refund',
          'connectors:manage',
          'analytics:read',
          'webhooks:manage',
        ],
        viewer_profile: ['disputes:read', 'analytics:read'],
      }

      const permissions = profilePermissions[merchant.profileId] || []
      return permissions.includes(permission)
    },
    [isAuthenticated, merchant]
  )

  return {
    hasPermission,
    canAccessDisputes: hasPermission('disputes:read'),
    canChallengeDisputes: hasPermission('disputes:challenge'),
    canCreatePayments: hasPermission('payments:create'),
    canRefundPayments: hasPermission('payments:refund'),
    canManageConnectors: hasPermission('connectors:manage'),
    canViewAnalytics: hasPermission('analytics:read'),
    canManageWebhooks: hasPermission('webhooks:manage'),
  }
}