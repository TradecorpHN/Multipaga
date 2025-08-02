// src/presentation/hooks/useRefunds.ts
// Hook completo para gestión de reembolsos con Hyperswitch API
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/presentation/contexts/AuthContext'
import toast from 'react-hot-toast'
import { z } from 'zod'

// ======================================================================
// SCHEMAS DE VALIDACIÓN - Basados en documentación Hyperswitch
// ======================================================================

const RefundSchema = z.object({
  refund_id: z.string(),
  payment_id: z.string(),
  merchant_id: z.string().optional(),
  status: z.enum([
    'pending',
    'succeeded', 
    'failed',
    'review',
    'manual_review'
  ]),
  amount: z.number(),
  currency: z.string(),
  reason: z.enum([
    'duplicate',
    'fraudulent', 
    'requested_by_customer',
    'subscription_canceled',
    'product_unsatisfactory',
    'product_not_received',
    'unrecognized',
    'credit_not_processed',
    'general',
    'processing_error'
  ]).optional(),
  created: z.string(),
  updated: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  connector: z.string().optional(),
  connector_refund_id: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  profile_id: z.string().optional(),
  merchant_refund_id: z.string().optional(),
})

// Schema flexible para respuestas de listado
const RefundListResponseSchema = z.union([
  // Formato estándar de Hyperswitch
  z.object({
    data: z.array(RefundSchema),
    size: z.number().optional(),
    count: z.number().optional(),
    has_more: z.boolean().optional(),
    total_count: z.number().optional(),
  }),
  // Formato directo como array (fallback)
  z.array(RefundSchema),
]).transform((data) => {
  if (Array.isArray(data)) {
    return {
      data: data,
      size: data.length,
      count: data.length,
      has_more: false,
      total_count: data.length,
    }
  }
  
  return {
    data: data.data || [],
    size: data.size || data.data?.length || 0,
    count: data.count || data.data?.length || 0,
    has_more: data.has_more || false,
    total_count: data.total_count || data.count || data.data?.length || 0,
  }
})

const RefundCreateRequestSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  amount: z.number().int().min(1).optional(), // Si no se especifica, reembolso total
  reason: z.enum([
    'duplicate',
    'fraudulent', 
    'requested_by_customer',
    'subscription_canceled',
    'product_unsatisfactory',
    'product_not_received',
    'unrecognized',
    'credit_not_processed',
    'general',
    'processing_error'
  ]).optional(),
  refund_id: z.string().optional(), // ID personalizado del reembolso
  metadata: z.record(z.any()).optional(),
  merchant_refund_id: z.string().optional(),
})

const RefundListRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  payment_id: z.string().optional(),
  refund_id: z.string().optional(),
  profile_id: z.string().optional(),
  created: z.string().optional(),
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  status: z.enum([
    'pending',
    'succeeded', 
    'failed',
    'review',
    'manual_review'
  ]).optional(),
  currency: z.string().length(3).optional(),
  amount: z.number().int().optional(),
  connector: z.string().optional(),
  merchant_refund_id: z.string().optional(),
  // Ordenamiento
  sort_by: z.enum(['created_at', 'amount', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).passthrough()

// ======================================================================
// TIPOS EXPORTADOS
// ======================================================================

export type Refund = z.infer<typeof RefundSchema>
export type RefundListResponse = z.infer<typeof RefundListResponseSchema>
export type RefundCreateRequest = z.infer<typeof RefundCreateRequestSchema>
export type RefundListRequest = z.infer<typeof RefundListRequestSchema>
export type RefundUpdateRequest = Partial<Pick<RefundCreateRequest, 'metadata'>>

// ======================================================================
// ERROR HANDLING
// ======================================================================

export class RefundApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'RefundApiError'
  }

  static fromHyperswitchError(error: any): RefundApiError {
    return new RefundApiError(
      error.error?.code || error.error_code || 'UNKNOWN_ERROR',
      error.error?.message || error.error_message || error.message || 'Error desconocido',
      error.status || error.statusCode || 400,
      error
    )
  }

  static fromValidationError(error: z.ZodError): RefundApiError {
    const firstError = error.errors[0]
    return new RefundApiError(
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

interface UseRefundsReturn {
  // State
  refunds: Refund[]
  currentRefund: Refund | null
  isLoading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  
  // Actions
  createRefund: (data: RefundCreateRequest) => Promise<Refund>
  getRefund: (refundId: string) => Promise<Refund>
  updateRefund: (refundId: string, data: RefundUpdateRequest) => Promise<Refund>
  listRefunds: (params?: Partial<RefundListRequest>) => Promise<void>
  refreshRefunds: () => Promise<void>
  clearError: () => void
}

// ======================================================================
// HOOK PRINCIPAL
// ======================================================================

export function useRefunds(): UseRefundsReturn {
  const { authState } = useAuth()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [currentRefund, setCurrentRefund] = useState<Refund | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [lastListParams, setLastListParams] = useState<RefundListRequest>()

  // ======================================================================
  // API REQUEST HELPER
  // ======================================================================

  const makeApiRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // Validar autenticación
    if (!authState?.isAuthenticated || !authState?.merchantId || !authState?.profileId) {
      throw new RefundApiError('AUTH_REQUIRED', 'Autenticación requerida. Por favor inicie sesión.', 401)
    }

    // ✅ USAR PROXY: Como /api/refunds no existe, usar el proxy de Hyperswitch
    const url = `/api/hyperswitch/refunds${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
    
    // Headers de autenticación
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Merchant-Id': authState.merchantId,
      'X-Profile-Id': authState.profileId,
      // Skip Authorization header since apiKey is not available in authState
      ...options.headers,
    })

    try {
      console.log(`🚀 Making Refund API request to: ${url}`, {
        method: options.method || 'GET',
        headers: Object.fromEntries(headers.entries()),
      })

      const response = await fetch(url, {
        ...options,
        headers,
      })

      let responseData: any = {}
      const contentType = response.headers.get('content-type')
      
      try {
        if (contentType?.includes('application/json')) {
          responseData = await response.json()
        } else {
          const textData = await response.text()
          if (textData) {
            responseData = JSON.parse(textData)
          }
        }
      } catch (parseError) {
        console.warn('Error parsing refund response:', parseError)
        responseData = { message: `HTTP ${response.status}: ${response.statusText}` }
      }

      if (!response.ok) {
        console.error(`❌ Refund API Error ${response.status}:`, responseData)
        throw RefundApiError.fromHyperswitchError({
          ...responseData,
          status: response.status,
          statusCode: response.status
        })
      }

      console.log(`✅ Refund API Success:`, responseData)
      return responseData

    } catch (error) {
      if (error instanceof RefundApiError) {
        throw error
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new RefundApiError(
          'NETWORK_ERROR',
          'Error de conexión. Verifique su conexión a internet.',
          503
        )
      }

      throw new RefundApiError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Error desconocido',
        500,
        error
      )
    }
  }, [authState])

  // ======================================================================
  // REFUND OPERATIONS
  // ======================================================================

  const createRefund = useCallback(async (data: RefundCreateRequest): Promise<Refund> => {
    setIsLoading(true)
    setError(null)

    try {
      const validatedData = RefundCreateRequestSchema.parse({
        ...data,
        reason: data.reason || 'requested_by_customer',
      })

      const response = await makeApiRequest<Refund>('', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      })

      const refund = RefundSchema.parse(response)
      
      setRefunds(prev => [refund, ...prev])
      setCurrentRefund(refund)
      setTotalCount(prev => prev + 1)
      
      toast.success('Reembolso creado exitosamente')
      return refund
      
    } catch (error) {
      let errorMessage = 'Error al crear el reembolso'
      
      if (error instanceof z.ZodError) {
        const validationError = RefundApiError.fromValidationError(error)
        errorMessage = validationError.message
      } else if (error instanceof RefundApiError) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const getRefund = useCallback(async (refundId: string): Promise<Refund> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Refund>(`/${refundId}`)
      const refund = RefundSchema.parse(response)
      
      setCurrentRefund(refund)
      setRefunds(prev => prev.map(r => 
        r.refund_id === refundId ? refund : r
      ))
      
      return refund
      
    } catch (error) {
      const errorMessage = error instanceof RefundApiError 
        ? error.message 
        : 'Error al obtener el reembolso'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const updateRefund = useCallback(async (
    refundId: string, 
    data: RefundUpdateRequest
  ): Promise<Refund> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Refund>(`/${refundId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })

      const refund = RefundSchema.parse(response)
      
      setCurrentRefund(refund)
      setRefunds(prev => prev.map(r => 
        r.refund_id === refundId ? refund : r
      ))
      
      toast.success('Reembolso actualizado exitosamente')
      return refund
      
    } catch (error) {
      const errorMessage = error instanceof RefundApiError 
        ? error.message 
        : 'Error al actualizar el reembolso'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const listRefunds = useCallback(async (params: Partial<RefundListRequest> = {}): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Aplicar valores por defecto seguros
      const safeParams = {
        limit: 20,
        offset: 0,
        sort_by: 'created_at' as const,
        sort_order: 'desc' as const,
        ...params,
      }

      // Validar parámetros
      const validatedParams = RefundListRequestSchema.parse(safeParams)
      setLastListParams(validatedParams)

      // Construir query string
      const queryParams = new URLSearchParams()
      Object.entries(validatedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })

      console.log(`🔍 Fetching refunds with params:`, validatedParams)

      // Usar endpoint de listado según documentación de Hyperswitch
      const response = await makeApiRequest<any>(`/list?${queryParams.toString()}`, {
        method: 'GET',
      })

      // Parsear respuesta de manera flexible
      let refundList: RefundListResponse
      try {
        refundList = RefundListResponseSchema.parse(response)
      } catch (parseError) {
        console.warn('Error parsing refund list response:', parseError)
        // Fallback: intentar extraer datos manualmente
        const data = response.data || response.refunds || response || []
        refundList = {
          data: Array.isArray(data) ? data : [],
          size: data.length || 0,
          count: data.length || 0,
          has_more: false,
          total_count: data.length || 0,
        }
      }
      
      setRefunds(refundList.data)
      setTotalCount(refundList.total_count)
      setHasMore(refundList.has_more)
      
      console.log(`✅ Loaded ${refundList.data.length} refunds`)
      
    } catch (error) {
      let errorMessage = 'Error al cargar los reembolsos'
      
      if (error instanceof RefundApiError) {
        errorMessage = error.message
      } else if (error instanceof z.ZodError) {
        const validationError = RefundApiError.fromValidationError(error)
        errorMessage = validationError.message
      }
      
      setError(errorMessage)
      console.error('Error listing refunds:', error)
      
      // En caso de error, establecer estado vacío
      setRefunds([])
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  const refreshRefunds = useCallback(async (): Promise<void> => {
    if (lastListParams) {
      await listRefunds(lastListParams)
    } else {
      await listRefunds({ limit: 20 })
    }
  }, [listRefunds, lastListParams])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ======================================================================
  // EFFECTS
  // ======================================================================

  // Auto-load refunds on mount
  useEffect(() => {
    if (authState?.isAuthenticated && authState?.merchantId && authState?.profileId) {
      listRefunds({ limit: 20 })
    }
  }, [authState?.isAuthenticated, authState?.merchantId, authState?.profileId, listRefunds])

  return {
    // State
    refunds,
    currentRefund,
    isLoading,
    error,
    totalCount,
    hasMore,
    
    // Actions
    createRefund,
    getRefund,
    updateRefund,
    listRefunds,
    refreshRefunds,
    clearError,
  }
}