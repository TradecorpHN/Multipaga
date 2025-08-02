// src/presentation/hooks/usePayments.ts
// HOOK CORREGIDO: usePayments con manejo robusto de errores y autenticación

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/presentation/contexts/AuthContext'
import toast from 'react-hot-toast'
import { z } from 'zod'

// ======================================================================
// SCHEMAS DE VALIDACIÓN
// ======================================================================

const PaymentSchema = z.object({
  payment_id: z.string(),
  merchant_id: z.string().optional(),
  status: z.enum([
    'requires_payment_method',
    'requires_confirmation', 
    'requires_capture',
    'processing',
    'requires_customer_action',
    'succeeded',
    'failed',
    'cancelled',
    'captured',
    'partially_captured',
    'partially_captured_and_capturable'
  ]),
  amount: z.number(),
  currency: z.string(),
  amount_capturable: z.number().optional(),
  amount_received: z.number().optional(),
  connector: z.string().optional(),
  client_secret: z.string().optional(),
  created: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  customer_id: z.string().optional(),
  connector_transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  cancellation_reason: z.string().optional(),
  capture_method: z.enum(['automatic', 'manual']).optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  profile_id: z.string().optional(),
  return_url: z.string().url().optional(),
  confirm: z.boolean().optional(),
})

const PaymentListResponseSchema = z.object({
  data: z.array(PaymentSchema).default([]),
  size: z.number().optional(),
  count: z.number().optional(),
  has_more: z.boolean().default(false),
  total_count: z.number().optional(),
})

const PaymentCreateRequestSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor: z.string().max(22).optional(),
  metadata: z.record(z.any()).optional(),
  return_url: z.string().url().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  profile_id: z.string().optional(),
  customer: z.object({
    name: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    phone_country_code: z.string().max(5).optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().max(100).optional(),
      line2: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
      state: z.string().max(50).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().max(50).optional(),
      last_name: z.string().max(50).optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
})

const PaymentListRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  customer_id: z.string().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  created: z.string().optional(),
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  status: z.string().optional(),
  connector: z.string().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
})

// ======================================================================
// TIPOS EXPORTADOS
// ======================================================================

export type Payment = z.infer<typeof PaymentSchema>
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>
export type PaymentCreateRequest = z.infer<typeof PaymentCreateRequestSchema>
export type PaymentListRequest = z.infer<typeof PaymentListRequestSchema>
export type PaymentUpdateRequest = Partial<Pick<PaymentCreateRequest, 'description' | 'metadata'>>
export type PaymentCaptureRequest = {
  amount_to_capture?: number
  reason?: string
  metadata?: Record<string, any>
}

// ======================================================================
// ERROR HANDLING
// ======================================================================

export class PaymentApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'PaymentApiError'
  }

  static fromApiError(error: any): PaymentApiError {
    if (error?.error) {
      return new PaymentApiError(
        error.error.code || 'API_ERROR',
        error.error.message || 'Error desconocido',
        error.status || 400,
        error.error.details
      )
    }
    
    return new PaymentApiError(
      'UNKNOWN_ERROR',
      error.message || 'Error desconocido',
      error.status || error.statusCode || 500,
      error
    )
  }

  static fromValidationError(error: z.ZodError): PaymentApiError {
    const firstError = error.errors[0]
    return new PaymentApiError(
      'VALIDATION_ERROR',
      `Error de validación en ${firstError.path.join('.')}: ${firstError.message}`,
      400,
      error.errors
    )
  }
}

// ======================================================================
// HOOK INTERFACE
// ======================================================================

interface UsePaymentsReturn {
  // State
  payments: Payment[]
  currentPayment: Payment | null
  isLoading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  
  // Actions
  createPayment: (data: PaymentCreateRequest) => Promise<Payment>
  getPayment: (paymentId: string) => Promise<Payment>
  updatePayment: (paymentId: string, data: PaymentUpdateRequest) => Promise<Payment>
  capturePayment: (paymentId: string, data?: PaymentCaptureRequest) => Promise<Payment>
  cancelPayment: (paymentId: string, reason?: string) => Promise<Payment>
  confirmPayment: (paymentId: string) => Promise<Payment>
  listPayments: (params?: Partial<PaymentListRequest>) => Promise<void>
  refreshPayments: () => Promise<void>
  clearError: () => void
}

// ======================================================================
// HOOK PRINCIPAL
// ======================================================================

export function usePayments(): UsePaymentsReturn {
  const { authState } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [lastListParams, setLastListParams] = useState<PaymentListRequest>()

  // ======================================================================
  // API REQUEST HELPER
  // ======================================================================

  const makeApiRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // Validar autenticación
    if (!authState?.isAuthenticated || !authState?.merchantId || !authState?.profileId) {
      throw new PaymentApiError('AUTH_REQUIRED', 'Autenticación requerida. Por favor inicie sesión.', 401)
    }

    // Construir URL usando el proxy de Hyperswitch
    const url = `/api/hyperswitch/${endpoint}`
    
    // Headers requeridos para el proxy
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Skip Authorization header since apiKey is not available in authState
      // Authorization will be handled by the proxy layer
      'X-Merchant-Id': authState.merchantId,
      'X-Profile-Id': authState.profileId,
      ...options.headers,
    })

    try {
      console.log(`🚀 Making API request to: ${url}`, {
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body as string) : undefined,
      })

      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30s timeout
      })

      // Obtener respuesta como texto primero para manejo robusto
      const responseText = await response.text()
      let responseData: any

      try {
        responseData = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        console.error('❌ Failed to parse API response:', responseText.substring(0, 200))
        throw new PaymentApiError(
          'PARSE_ERROR',
          'Respuesta inválida del servidor',
          502,
          { responseText: responseText.substring(0, 500) }
        )
      }

      if (!response.ok) {
        console.error(`❌ API Error ${response.status}:`, responseData)
        throw PaymentApiError.fromApiError({
          ...responseData,
          status: response.status,
          statusCode: response.status
        })
      }

      console.log(`✅ API Success:`, {
        status: response.status,
        dataType: Array.isArray(responseData) ? 'array' : typeof responseData,
        dataSize: JSON.stringify(responseData).length,
      })

      return responseData

    } catch (error) {
      if (error instanceof PaymentApiError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new PaymentApiError(
            'TIMEOUT_ERROR',
            'La petición tardó demasiado tiempo',
            408
          )
        }
        
        if (error.message.includes('fetch')) {
          throw new PaymentApiError(
            'NETWORK_ERROR',
            'Error de conexión. Verifique su conexión a internet.',
            503
          )
        }
      }

      throw new PaymentApiError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Error desconocido',
        500,
        error
      )
    }
  }, [authState])

  // ======================================================================
  // PAYMENT OPERATIONS
  // ======================================================================

  const createPayment = useCallback(async (data: PaymentCreateRequest): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const validatedData = PaymentCreateRequestSchema.parse({
        ...data,
        business_country: data.business_country || 'HN',
        business_label: data.business_label || 'Multipaga',
        profile_id: data.profile_id || authState?.profileId,
      })

      const response = await makeApiRequest<Payment>('payments', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      })

      const payment = PaymentSchema.parse(response)
      
      setPayments(prev => [payment, ...prev])
      setCurrentPayment(payment)
      setTotalCount(prev => prev + 1)
      
      toast.success('Pago creado exitosamente')
      return payment
      
    } catch (error) {
      let errorMessage = 'Error al crear el pago'
      
      if (error instanceof z.ZodError) {
        const validationError = PaymentApiError.fromValidationError(error)
        errorMessage = validationError.message
      } else if (error instanceof PaymentApiError) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [authState?.profileId, makeApiRequest])

  const getPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Payment>(`payments/${paymentId}`)
      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof PaymentApiError 
        ? error.message 
        : 'Error al obtener el pago'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const updatePayment = useCallback(async (
    paymentId: string, 
    data: PaymentUpdateRequest
  ): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Payment>(`payments/${paymentId}`, {
        method: 'POST', // Hyperswitch usa POST para updates
        body: JSON.stringify(data),
      })

      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Pago actualizado exitosamente')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof PaymentApiError 
        ? error.message 
        : 'Error al actualizar el pago'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const capturePayment = useCallback(async (
    paymentId: string, 
    data?: PaymentCaptureRequest
  ): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Payment>(`payments/${paymentId}/capture`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      })

      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Pago capturado exitosamente')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof PaymentApiError 
        ? error.message 
        : 'Error al capturar el pago'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const cancelPayment = useCallback(async (paymentId: string, reason?: string): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const body = reason ? { cancellation_reason: reason } : {}
      const response = await makeApiRequest<Payment>(`payments/${paymentId}/cancel`, {
        method: 'POST',
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Pago cancelado exitosamente')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof PaymentApiError 
        ? error.message 
        : 'Error al cancelar el pago'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const confirmPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Payment>(`payments/${paymentId}/confirm`, {
        method: 'POST',
      })

      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Pago confirmado exitosamente')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof PaymentApiError 
        ? error.message 
        : 'Error al confirmar el pago'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // ======================================================================
  // LIST PAYMENTS - CORREGIDO PARA USAR PROXY
  // ======================================================================

  const listPayments = useCallback(async (params: Partial<PaymentListRequest> = {}): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const safeParams = {
        limit: 20,
        offset: 0,
        ...params,
      }

      const validatedParams = PaymentListRequestSchema.parse(safeParams)
      setLastListParams(validatedParams)

      console.log(`🔍 Fetching payments with params:`, validatedParams)

      // CORREGIDO: Usar el endpoint de listado con POST según Hyperswitch
      const response = await makeApiRequest<any>('payments/list', {
        method: 'POST',
        body: JSON.stringify(validatedParams),
      })

      // Parsear respuesta de manera flexible
      let paymentList: PaymentListResponse
      try {
        // Si la respuesta ya tiene el formato correcto
        if (response.data || Array.isArray(response)) {
          paymentList = PaymentListResponseSchema.parse(response)
        } else {
          // Fallback: asumir que response es el array directo
          paymentList = {
            data: Array.isArray(response) ? response : [],
            count: Array.isArray(response) ? response.length : 0,
            has_more: false,
            total_count: Array.isArray(response) ? response.length : 0,
          }
        }
      } catch (parseError) {
        console.warn('Error parsing payment list response:', parseError)
        paymentList = {
          data: [],
          count: 0,
          has_more: false,
          total_count: 0,
        }
      }
      
      setPayments(paymentList.data)
      setTotalCount(paymentList.total_count || paymentList.count || 0)
      setHasMore(paymentList.has_more)
      
      console.log(`✅ Loaded ${paymentList.data.length} payments`)
      
    } catch (error) {
      let errorMessage = 'Error al cargar los pagos'
      
      if (error instanceof PaymentApiError) {
        errorMessage = error.message
      } else if (error instanceof z.ZodError) {
        const validationError = PaymentApiError.fromValidationError(error)
        errorMessage = validationError.message
      }
      
      setError(errorMessage)
      console.error('Error listing payments:', error)
      
      // En caso de error, establecer estado vacío
      setPayments([])
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const refreshPayments = useCallback(async (): Promise<void> => {
    if (lastListParams) {
      await listPayments(lastListParams)
    } else {
      await listPayments({ limit: 20 })
    }
  }, [listPayments, lastListParams])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ======================================================================
  // EFFECTS
  // ======================================================================

  // Auto-load payments on mount
  useEffect(() => {
    if (authState?.isAuthenticated && authState?.merchantId && authState?.profileId) {
      listPayments({ limit: 20 })
    }
  }, [authState?.isAuthenticated, authState?.merchantId, authState?.profileId, listPayments])

  return {
    // State
    payments,
    currentPayment,
    isLoading,
    error,
    totalCount,
    hasMore,
    
    // Actions
    createPayment,
    getPayment,
    updatePayment,
    capturePayment,
    cancelPayment,
    confirmPayment,
    listPayments,
    refreshPayments,
    clearError,
  }
}