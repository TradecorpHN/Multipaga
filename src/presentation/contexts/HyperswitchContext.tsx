// src/presentation/contexts/HyperswitchContext.tsx
'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

// =============== TYPES ===============

interface HyperswitchConfig {
  publishableKey: string
  merchantId: string
  environment: 'sandbox' | 'production'
  baseUrl: string
}

interface PaymentIntent {
  client_secret?: string
  payment_id: string
  amount: number
  currency: string
  status: string
}

interface PaymentMethodsResponse {
  payment_methods: Array<{
    payment_method: string
    payment_method_types: string[]
    supported_currencies: string[]
    supported_countries: string[]
  }>
}

interface HyperswitchContextValue {
  // Estado
  config: HyperswitchConfig | null
  isLoading: boolean
  error: string | null
  
  // Funciones
  initializeClient: () => Promise<void>
  getPaymentMethods: (params?: {
    currency?: string
    country?: string
    amount?: number
    customer_id?: string
  }) => Promise<PaymentMethodsResponse>
  createPaymentIntent: (paymentData: {
    amount: number
    currency: string
    description?: string
    customer_id?: string
    return_url?: string
    metadata?: Record<string, any>
  }) => Promise<PaymentIntent>
  confirmPayment: (paymentId: string, paymentMethodData?: any) => Promise<any>
  
  // Helpers
  getPublishableKey: () => string | null
  isInitialized: () => boolean
}

// =============== CONTEXT ===============

const HyperswitchContext = createContext<HyperswitchContextValue | undefined>(undefined)

// =============== PROVIDER ===============

export function HyperswitchProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  
  const [config, setConfig] = useState<HyperswitchConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============== INICIALIZAR CLIENTE ===============

  const initializeClient = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Usuario no autenticado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Obtener publishable key desde el API
      const response = await fetch('/api/auth/publishable-key', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get publishable key')
      }

      const data = await response.json()

      const newConfig: HyperswitchConfig = {
        publishableKey: data.publishable_key,
        merchantId: data.merchant_id,
        environment: data.environment,
        baseUrl: data.environment === 'production' 
          ? 'https://api.hyperswitch.io'
          : 'https://sandbox.hyperswitch.io',
      }

      setConfig(newConfig)
      console.log('Hyperswitch client initialized:', {
        merchantId: newConfig.merchantId,
        environment: newConfig.environment,
        hasPublishableKey: !!newConfig.publishableKey
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Hyperswitch client'
      setError(errorMessage)
      console.error('Error initializing Hyperswitch client:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // =============== OBTENER MÉTODOS DE PAGO ===============

  const getPaymentMethods = useCallback(async (params?: {
    currency?: string
    country?: string
    amount?: number
    customer_id?: string
  }): Promise<PaymentMethodsResponse> => {
    if (!config) {
      throw new Error('Hyperswitch client not initialized')
    }

    const queryParams = new URLSearchParams()
    if (params?.currency) queryParams.append('currency', params.currency)
    if (params?.country) queryParams.append('country', params.country)
    if (params?.amount) queryParams.append('amount', params.amount.toString())
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id)

    const response = await fetch(`/api/payment-methods?${queryParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch payment methods')
    }

    return response.json()
  }, [config])

  // =============== CREAR PAYMENT INTENT ===============

  const createPaymentIntent = useCallback(async (paymentData: {
    amount: number
    currency: string
    description?: string
    customer_id?: string
    return_url?: string
    metadata?: Record<string, any>
  }): Promise<PaymentIntent> => {
    if (!config) {
      throw new Error('Hyperswitch client not initialized')
    }

    // Este endpoint debe ser creado en el servidor para manejar la API privada
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...paymentData,
        confirm: false, // No confirmar automáticamente, permitir confirmación en cliente
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create payment intent')
    }

    const result = await response.json()
    return result.data
  }, [config])

  // =============== CONFIRMAR PAGO ===============

  const confirmPayment = useCallback(async (paymentId: string, paymentMethodData?: any) => {
    if (!config) {
      throw new Error('Hyperswitch client not initialized')
    }

    // Usar publishable key para confirmar el pago del lado del cliente
    const response = await fetch(`${config.baseUrl}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.publishableKey, // Usar publishable key
      },
      body: JSON.stringify({
        payment_method_data: paymentMethodData,
        client_secret: paymentMethodData?.client_secret,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to confirm payment')
    }

    return response.json()
  }, [config])

  // =============== HELPERS ===============

  const getPublishableKey = useCallback(() => {
    return config?.publishableKey || null
  }, [config])

  const isInitialized = useCallback(() => {
    return !!config && !!config.publishableKey
  }, [config])

  // =============== EFFECTS ===============

  // Auto-inicializar cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && !config) {
      initializeClient()
    } else if (!isAuthenticated) {
      setConfig(null)
      setError(null)
    }
  }, [isAuthenticated, config, initializeClient])

  // =============== CONTEXT VALUE ===============

  const contextValue: HyperswitchContextValue = {
    config,
    isLoading,
    error,
    initializeClient,
    getPaymentMethods,
    createPaymentIntent,
    confirmPayment,
    getPublishableKey,
    isInitialized,
  }

  return (
    <HyperswitchContext.Provider value={contextValue}>
      {children}
    </HyperswitchContext.Provider>
  )
}

// =============== HOOKS ===============

export function useHyperswitch() {
  const context = useContext(HyperswitchContext)
  
  if (context === undefined) {
    throw new Error('useHyperswitch debe ser usado dentro de HyperswitchProvider')
  }
  
  return context
}

// Hook especializado para pagos
export function usePayments() {
  const { 
    getPaymentMethods, 
    createPaymentIntent, 
    confirmPayment, 
    isInitialized,
    error 
  } = useHyperswitch()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const processPayment = useCallback(async (paymentData: {
    amount: number
    currency: string
    description?: string
    customer_id?: string
    payment_method_data?: any
    return_url?: string
    metadata?: Record<string, any>
  }) => {
    if (!isInitialized()) {
      throw new Error('Hyperswitch not initialized')
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      // 1. Crear payment intent
      const paymentIntent = await createPaymentIntent({
        amount: paymentData.amount,
        currency: paymentData.currency,
        description: paymentData.description,
        customer_id: paymentData.customer_id,
        return_url: paymentData.return_url,
        metadata: paymentData.metadata,
      })

      // 2. Confirmar pago si se proporciona método de pago
      if (paymentData.payment_method_data) {
        const confirmedPayment = await confirmPayment(
          paymentIntent.payment_id, 
          {
            ...paymentData.payment_method_data,
            client_secret: paymentIntent.client_secret,
          }
        )
        
        return confirmedPayment
      }

      return paymentIntent
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
      setPaymentError(errorMessage)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [createPaymentIntent, confirmPayment, isInitialized])

  return {
    getPaymentMethods,
    processPayment,
    isProcessing,
    paymentError,
    isInitialized: isInitialized(),
    hyperswitchError: error,
  }
}