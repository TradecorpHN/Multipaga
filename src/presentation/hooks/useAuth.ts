'use client'

import { useState, useEffect, useCallback, useContext, createContext } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { SessionData } from '@/types/common'

// Tipos para el contexto de autenticación
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

// Crear contexto
const AuthContext = createContext<AuthContextType | null>(null)

// Fetcher para verificar sesión
const sessionFetcher = async (url: string) => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NO_SESSION')
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Error verificando sesión')
  }

  return response.json()
}

// Provider del contexto de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // SWR para manejar el estado de la sesión
  const {
    data: sessionResponse,
    error: sessionError,
    isLoading,
    mutate: mutateSession
  } = useSWR('/api/auth/session', sessionFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
    errorRetryCount: 1,
    dedupingInterval: 30000, // 30 segundos
  })

  // Determinar estado de autenticación
  const isAuthenticated = !!(sessionResponse?.success && sessionResponse?.merchant)
  const merchant = sessionResponse?.merchant || null

  // Función de login
  const login = useCallback(async (apiKey: string, merchantId?: string) => {
    try {
      setError(null)

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
        const errorMessage = data.error || 'Error de autenticación'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      // Revalidar sesión después del login exitoso
      await mutateSession()

      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [mutateSession])

  // Función de logout
  const logout = useCallback(async () => {
    try {
      setError(null)

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Limpiar datos de sesión localmente
      await mutateSession(undefined, false)

      // Redirigir al login
      router.push('/login')

    } catch (error) {
      console.error('Error durante logout:', error)
      // Incluso si hay error, limpiar sesión local y redirigir
      await mutateSession(undefined, false)
      router.push('/login')
    }
  }, [mutateSession, router])

  // Función para refrescar sesión
  const refreshSession = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          // Token expirado o inválido, redirigir al login
          await logout()
          return
        }
        
        throw new Error(errorData.error || 'Error refrescando sesión')
      }

      // Revalidar sesión después del refresh exitoso
      await mutateSession()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error refrescando sesión'
      setError(errorMessage)
      console.error('Error refreshing session:', error)
    }
  }, [mutateSession, logout])

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Manejar errores de sesión
  useEffect(() => {
    if (sessionError) {
      if (sessionError.message === 'NO_SESSION') {
        // No hay sesión, esto es normal para usuarios no autenticados
        setError(null)
      } else {
        setError(sessionError.message)
      }
    }
  }, [sessionError])

  // Auto-refresh de la sesión
  useEffect(() => {
    if (!isAuthenticated || !merchant) return

    // Configurar auto-refresh 5 minutos antes de la expiración
    const expiresAt = new Date(merchant.expires_at)
    const now = new Date()
    const refreshTime = expiresAt.getTime() - now.getTime() - (5 * 60 * 1000) // 5 minutos antes

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshSession()
      }, refreshTime)

      return () => clearTimeout(timeoutId)
    }
  }, [isAuthenticated, merchant, refreshSession])

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
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook principal de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  
  return context
}

// Hook para requerir autenticación
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

// Hook para datos del merchant
export function useMerchant() {
  const { merchant, isAuthenticated } = useAuth()
  
  return {
    merchant,
    merchantId: merchant?.merchant_id,
    profileId: merchant?.profile_id,
    businessProfile: merchant?.business_profile,
    isAuthenticated,
  }
}

// Hook para verificar permisos (ejemplo básico)
export function usePermissions() {
  const { merchant, isAuthenticated } = useAuth()
  
  const hasPermission = useCallback((permission: string) => {
    if (!isAuthenticated || !merchant) return false
    
    // Implementar lógica de permisos según tu modelo de negocio
    // Por ahora, todos los merchants autenticados tienen todos los permisos
    return true
  }, [isAuthenticated, merchant])
  
  const canAccessDisputes = hasPermission('disputes:read')
  const canChallengeDisputes = hasPermission('disputes:challenge')
  const canCreatePayments = hasPermission('payments:create')
  const canRefundPayments = hasPermission('payments:refund')