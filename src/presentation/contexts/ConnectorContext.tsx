import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { hyperswitchClient } from '@/infrastructure/api/clients/HyperswitchClient'
import { ConnectorAccount, ConnectorAccountSchema } from '@/domain/entities/Connector'
import { useAuth } from './AuthContext'
import { z } from 'zod'
import toast from 'react-hot-toast'

// Connector Context Interface
interface ConnectorContextValue {
  connectors: ConnectorAccount[]
  isLoading: boolean
  error: string | null
  fetchConnectors: () => Promise<void>
  getConnectorById: (id: string) => ConnectorAccount | undefined
  getActiveConnectors: () => ConnectorAccount[]
  refreshConnectors: () => Promise<void>
}

// Create Context
const ConnectorContext = createContext<ConnectorContextValue | undefined>(undefined)

// Connector Provider Component
export function ConnectorProvider({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth()
  const [connectors, setConnectors] = useState<ConnectorAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch connectors from API
  const fetchConnectors = useCallback(async () => {
    if (!authState?.merchantId || !authState?.profileId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch merchant connector accounts
      const response = await hyperswitchClient.get(
        `/account/${authState.merchantId}/connectors`
      )

      // Validate response data
      const connectorsArray = z.array(ConnectorAccountSchema).parse(response)
      
      // Filter connectors by profile if needed
      const profileConnectors = connectorsArray.filter(
        connector => !connector.profile_id || connector.profile_id === authState.profileId
      )

      setConnectors(profileConnectors)
      
      // Cache in session storage for performance
      sessionStorage.setItem(
        `connectors_${authState.merchantId}_${authState.profileId}`,
        JSON.stringify(profileConnectors)
      )
      
    } catch (error) {
      console.error('Failed to fetch connectors:', error)
      
      let errorMessage = 'Failed to load connectors'
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'No connectors found for this merchant'
        } else if (error.message.includes('401')) {
          errorMessage = 'Unauthorized to access connectors'
        }
      }
      
      setError(errorMessage)
      
      // Try to load from cache on error
      const cachedData = sessionStorage.getItem(
        `connectors_${authState.merchantId}_${authState.profileId}`
      )
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData)
          setConnectors(parsedCache)
          toast.error('Using cached connector data due to network error')
        } catch {
          // Invalid cache data
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [authState?.merchantId, authState?.profileId])

  // Get connector by ID
  const getConnectorById = useCallback((id: string): ConnectorAccount | undefined => {
    return connectors.find(connector => connector.merchant_connector_id === id)
  }, [connectors])

  // Get only active connectors
  const getActiveConnectors = useCallback((): ConnectorAccount[] => {
    return connectors.filter(connector => 
      connector.status === 'active' && !connector.disabled
    )
  }, [connectors])

  // Force refresh connectors
  const refreshConnectors = useCallback(async () => {
    // Clear cache
    if (authState?.merchantId && authState?.profileId) {
      sessionStorage.removeItem(
        `connectors_${authState.merchantId}_${authState.profileId}`
      )
    }
    
    // Fetch fresh data
    await fetchConnectors()
  }, [authState?.merchantId, authState?.profileId, fetchConnectors])

  // Auto-fetch connectors when auth state changes
  useEffect(() => {
    if (authState?.isAuthenticated) {
      // Check cache first
      const cachedData = sessionStorage.getItem(
        `connectors_${authState.merchantId}_${authState.profileId}`
      )
      
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData)
          setConnectors(parsedCache)
          // Still fetch fresh data in background
          fetchConnectors()
        } catch {
          // Invalid cache, fetch fresh
          fetchConnectors()
        }
      } else {
        fetchConnectors()
      }
    } else {
      // Clear connectors when logged out
      setConnectors([])
      setError(null)
    }
  }, [authState?.isAuthenticated, authState?.merchantId, authState?.profileId])

  const contextValue: ConnectorContextValue = {
    connectors,
    isLoading,
    error,
    fetchConnectors,
    getConnectorById,
    getActiveConnectors,
    refreshConnectors,
  }

  return (
    <ConnectorContext.Provider value={contextValue}>
      {children}
    </ConnectorContext.Provider>
  )
}

// Custom hook to use connector context
export function useConnectors() {
  const context = useContext(ConnectorContext)
  
  if (context === undefined) {
    throw new Error('useConnectors must be used within a ConnectorProvider')
  }
  
  return context
}

// Helper hook for payment method filtering
export function usePaymentMethods() {
  const { connectors } = useConnectors()
  
  const getAvailablePaymentMethods = useCallback(() => {
    const methodsSet = new Set<string>()
    
    connectors.forEach(connector => {
      if (connector.status === 'active' && !connector.disabled) {
        connector.payment_methods_enabled?.forEach(pm => {
          methodsSet.add(pm.payment_method)
        })
      }
    })
    
    return Array.from(methodsSet).sort()
  }, [connectors])
  
  const getConnectorsForPaymentMethod = useCallback((paymentMethod: string) => {
    return connectors.filter(connector => {
      if (connector.status !== 'active' || connector.disabled) return false
      
      return connector.payment_methods_enabled?.some(pm => 
        pm.payment_method === paymentMethod
      ) ?? false
    })
  }, [connectors])
  
  return {
    availablePaymentMethods: getAvailablePaymentMethods(),
    getConnectorsForPaymentMethod,
  }
}