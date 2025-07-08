// src/presentation/hooks/useRefunds.ts
// ──────────────────────────────────────────────────────────────────────────────
// useRefunds Hook - Gestión de reembolsos
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { internalApi, MultipagaApiError } from '../lib/axios-config'
import { useDebounce } from './useDebounce'
import type {
  RefundFilters,
  RefundSortOptions,
  PaginationOptions,
  CreateRefundParams,
  UpdateRefundParams,
  RefundStatistics,
  RefundSummary,
  RefundPerformanceMetrics,
  RefundAlert,
  RefundPolicyConfig,
  RefundTrendAnalysis
} from '../../domain/repositories/IRefundRepository'
import type { RefundData } from '../../domain/entities/Refund'
import { RefundStatus } from '../../domain/value-objects/RefundStatus'
import { DateRange } from '../../domain/value-objects/DateRange'

/**
 * Opciones para el hook useRefunds
 */
interface UseRefundsOptions {
  merchantId: string
  filters?: RefundFilters
  sortOptions?: RefundSortOptions
  pagination?: PaginationOptions
  enabled?: boolean
  refreshInterval?: number
  autoRefresh?: boolean
}

/**
 * Estado del hook useRefunds
 */
interface UseRefundsState {
  refunds: RefundData[]
  totalCount: number
  hasMore: boolean
  loading: boolean
  error: MultipagaApiError | null
  creating: boolean
  updating: boolean
  processing: boolean
  cancelling: boolean
  retrying: boolean
  exporting: boolean
}

/**
 * Acciones del hook useRefunds
 */
interface UseRefundsActions {
  // CRUD operations
  createRefund: (params: CreateRefundParams) => Promise<RefundData | null>
  updateRefund: (params: UpdateRefundParams) => Promise<RefundData | null>
  processRefund: (refundId: string) => Promise<boolean>
  cancelRefund: (refundId: string, reason: string) => Promise<boolean>
  retryRefund: (refundId: string) => Promise<boolean>
  
  // Data fetching
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: RefundFilters) => void
  setSortOptions: (sortOptions: RefundSortOptions) => void
  setPagination: (pagination: PaginationOptions) => void
  
  // Export
  exportRefunds: (format: 'csv' | 'excel') => Promise<string | null>
  
  // Search
  searchRefunds: (query: string) => void
  clearSearch: () => void
  
  // Bulk operations
  bulkCancel: (refundIds: string[], reason: string) => Promise<boolean>
  bulkRetry: (refundIds: string[]) => Promise<boolean>
}

/**
 * Tipo de retorno del hook
 */
type UseRefundsReturn = UseRefundsState & UseRefundsActions

/**
 * Hook principal para gestionar reembolsos
 */
export function useRefunds(options: UseRefundsOptions): UseRefundsReturn {
  const {
    merchantId,
    filters = {},
    sortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    pagination = { limit: 20, offset: 0 },
    enabled = true,
    refreshInterval = 30000, // 30 segundos
    autoRefresh = true
  } = options

  // Estado local
  const [localFilters, setLocalFilters] = useState<RefundFilters>(filters)
  const [localSortOptions, setLocalSortOptions] = useState<RefundSortOptions>(sortOptions)
  const [localPagination, setLocalPagination] = useState<PaginationOptions>(pagination)
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Combinar filtros con búsqueda
  const finalFilters = useMemo(() => {
    const filters = { ...localFilters }
    if (debouncedSearchQuery.trim()) {
      return { ...filters, search: debouncedSearchQuery.trim() }
    }
    return filters
  }, [localFilters, debouncedSearchQuery])

  // Clave para SWR
  const swrKey = useMemo(() => {
    if (!enabled || !merchantId) return null
    
    return [
      'refunds',
      merchantId,
      JSON.stringify(finalFilters),
      JSON.stringify(localSortOptions),
      JSON.stringify(localPagination)
    ]
  }, [enabled, merchantId, finalFilters, localSortOptions, localPagination])

  // Fetcher para SWR
  const fetcher = useCallback(async ([_, merchantId, filtersStr, sortStr, paginationStr]: string[]) => {
    const parsedFilters = JSON.parse(filtersStr) as RefundFilters & { search?: string }
    const parsedSort = JSON.parse(sortStr) as RefundSortOptions
    const parsedPagination = JSON.parse(paginationStr) as PaginationOptions

    const params = new URLSearchParams()
    
    // Añadir filtros
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)))
        } else if (value instanceof DateRange) {
          const { start, end } = value.toISOStrings()
          params.append(`${key}_start`, start)
          params.append(`${key}_end`, end)
        } else {
          params.append(key, String(value))
        }
      }
    })

    // Añadir ordenamiento
    if (parsedSort.sort_by) params.append('sort_by', parsedSort.sort_by)
    if (parsedSort.sort_order) params.append('sort_order', parsedSort.sort_order)

    // Añadir paginación
    if (parsedPagination.limit) params.append('limit', String(parsedPagination.limit))
    if (parsedPagination.offset) params.append('offset', String(parsedPagination.offset))

    const response = await internalApi.get(`/refunds?${params.toString()}`, {
      headers: { 'X-Merchant-Id': merchantId }
    })

    return response.data
  }, [])

  // Hook SWR
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(swrKey, fetcher, {
    refreshInterval: enabled && autoRefresh ? refreshInterval : 0,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    errorRetryCount: 3,
    onError: (error) => {
      console.error('Error fetching refunds:', error)
      if (error instanceof MultipagaApiError) {
        toast.error(`Error al cargar reembolsos: ${error.getUserMessage()}`)
      }
    }
  })

  // Extraer datos
  const refunds = data?.refunds || []
  const totalCount = data?.total_count || 0
  const hasMore = data?.has_more || false

  // Crear reembolso
  const createRefund = useCallback(async (params: CreateRefundParams): Promise<RefundData | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setCreating(true)
    try {
      const response = await internalApi.post('/refunds', params, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      const newRefund = response.data
      toast.success(`Reembolso creado exitosamente: ${newRefund.refund_id}`)
      
      // Actualizar cache
      await mutate()
      
      return newRefund
    } catch (error) {
      console.error('Error creating refund:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al crear reembolso'
      toast.error(message)
      return null
    } finally {
      setCreating(false)
    }
  }, [merchantId, mutate])

  // Actualizar reembolso
  const updateRefund = useCallback(async (params: UpdateRefundParams): Promise<RefundData | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setUpdating(true)
    try {
      const response = await internalApi.put(`/refunds/${params.refund_id}`, params, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      const updatedRefund = response.data
      toast.success('Reembolso actualizado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return updatedRefund
    } catch (error) {
      console.error('Error updating refund:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al actualizar reembolso'
      toast.error(message)
      return null
    } finally {
      setUpdating(false)
    }
  }, [merchantId, mutate])

  // Procesar reembolso
  const processRefund = useCallback(async (refundId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setProcessing(true)
    try {
      await internalApi.post(`/refunds/${refundId}/process`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Reembolso procesado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error processing refund:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al procesar reembolso'
      toast.error(message)
      return false
    } finally {
      setProcessing(false)
    }
  }, [merchantId, mutate])

  // Cancelar reembolso
  const cancelRefund = useCallback(async (refundId: string, reason: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setCancelling(true)
    try {
      await internalApi.post(`/refunds/${refundId}/cancel`, 
        { reason }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      toast.success('Reembolso cancelado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error cancelling refund:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al cancelar reembolso'
      toast.error(message)
      return false
    } finally {
      setCancelling(false)
    }
  }, [merchantId, mutate])

  // Reintentar reembolso
  const retryRefund = useCallback(async (refundId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setRetrying(true)
    try {
      await internalApi.post(`/refunds/${refundId}/retry`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Reembolso reintentado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error retrying refund:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al reintentar reembolso'
      toast.error(message)
      return false
    } finally {
      setRetrying(false)
    }
  }, [merchantId, mutate])

  // Operaciones en lote - cancelar múltiples
  const bulkCancel = useCallback(async (refundIds: string[], reason: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.post('/refunds/bulk-cancel', 
        { refund_ids: refundIds, reason }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      toast.success(`${refundIds.length} reembolso(s) cancelado(s) exitosamente`)
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error bulk cancelling refunds:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al cancelar reembolsos'
      toast.error(message)
      return false
    }
  }, [merchantId, mutate])

  // Operaciones en lote - reintentar múltiples
  const bulkRetry = useCallback(async (refundIds: string[]): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.post('/refunds/bulk-retry', 
        { refund_ids: refundIds }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      toast.success(`${refundIds.length} reembolso(s) reintentado(s) exitosamente`)
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error bulk retrying refunds:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al reintentar reembolsos'
      toast.error(message)
      return false
    }
  }, [merchantId, mutate])

  // Exportar reembolsos
  const exportRefunds = useCallback(async (format: 'csv' | 'excel'): Promise<string | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setExporting(true)
    try {
      const response = await internalApi.post('/refunds/export', 
        { 
          format,
          filters: finalFilters,
          sort_options: localSortOptions
        }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      const { download_url } = response.data
      toast.success('Exportación iniciada. Descarga disponible.')
      
      return download_url
    } catch (error) {
      console.error('Error exporting refunds:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al exportar reembolsos'
      toast.error(message)
      return null
    } finally {
      setExporting(false)
    }
  }, [merchantId, finalFilters, localSortOptions])

  // Refrescar datos
  const refresh = useCallback(async (): Promise<void> => {
    await mutate()
  }, [mutate])

  // Cargar más datos
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore) return

    const newPagination = {
      ...localPagination,
      offset: (localPagination.offset || 0) + (localPagination.limit || 20)
    }

    setLocalPagination(newPagination)
  }, [hasMore, localPagination])

  // Establecer filtros
  const setFilters = useCallback((newFilters: RefundFilters): void => {
    setLocalFilters(newFilters)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Establecer opciones de ordenamiento
  const setSortOptions = useCallback((newSortOptions: RefundSortOptions): void => {
    setLocalSortOptions(newSortOptions)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Establecer paginación
  const setPagination = useCallback((newPagination: PaginationOptions): void => {
    setLocalPagination(newPagination)
  }, [])

  // Buscar reembolsos
  const searchRefunds = useCallback((query: string): void => {
    setSearchQuery(query)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Limpiar búsqueda
  const clearSearch = useCallback((): void => {
    setSearchQuery('')
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  return {
    // Estado
    refunds,
    totalCount,
    hasMore,
    loading: isLoading || isValidating,
    error: error || null,
    creating,
    updating,
    processing,
    cancelling,
    retrying,
    exporting,

    // Acciones
    createRefund,
    updateRefund,
    processRefund,
    cancelRefund,
    retryRefund,
    bulkCancel,
    bulkRetry,
    exportRefunds,
    refresh,
    loadMore,
    setFilters,
    setSortOptions,
    setPagination,
    searchRefunds,
    clearSearch
  }
}

/**
 * Hook para reembolsos pendientes
 */
export function usePendingRefunds(merchantId: string, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['refunds-pending', merchantId] : null,
    async ([_, merchantId]) => {
      const response = await internalApi.get('/refunds/pending', {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 30000, // 30 segundos
      revalidateOnFocus: true
    }
  )

  return {
    pendingRefunds: (data || []) as RefundSummary[],
    loading: isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook para estadísticas de reembolsos
 */
export function useRefundStatistics(
  merchantId: string,
  dateRange: DateRange,
  filters?: Partial<RefundFilters>,
  enabled: boolean = true
) {
  const swrKey = enabled ? [
    'refund-statistics',
    merchantId,
    dateRange.toISOStrings(),
    JSON.stringify(filters || {})
  ] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, dateRangeStr, filtersStr]) => {
      const { start, end } = JSON.parse(dateRangeStr)
      const parsedFilters = JSON.parse(filtersStr)
      
      const response = await internalApi.get('/refunds/statistics', {
        params: {
          start_date: start,
          end_date: end,
          ...parsedFilters
        },
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 300000, // 5 minutos
      revalidateOnFocus: false
    }
  )

  return {
    statistics: data as RefundStatistics | null,
    loading: isLoading,
    error
  }
}

/**
 * Hook para métricas de performance de reembolsos
 */
export function useRefundPerformanceMetrics(
  merchantId: string,
  dateRange: DateRange,
  enabled: boolean = true
) {
  const swrKey = enabled ? [
    'refund-performance',
    merchantId,
    dateRange.toISOStrings()
  ] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, dateRangeStr]) => {
      const { start, end } = JSON.parse(dateRangeStr)
      const response = await internalApi.get('/refunds/performance', {
        params: {
          start_date: start,
          end_date: end
        },
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 300000, // 5 minutos
      revalidateOnFocus: false
    }
  )

  return {
    metrics: (data || []) as RefundPerformanceMetrics[],
    loading: isLoading,
    error
  }
}

/**
 * Hook para verificar elegibilidad de reembolso
 */
export function useRefundEligibility(
  merchantId: string,
  paymentId: string,
  requestedAmount?: number,
  enabled: boolean = true
) {
  const swrKey = enabled && paymentId ? [
    'refund-eligibility',
    merchantId,
    paymentId,
    requestedAmount
  ] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, paymentId, requestedAmount]) => {
      const response = await internalApi.get(`/refunds/eligibility/${paymentId}`, {
        params: requestedAmount ? { requested_amount: requestedAmount } : {},
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      revalidateOnFocus: false
    }
  )

  return {
    eligibility: data || null,
    loading: isLoading,
    error
  }
}

/**
 * Hook para políticas de reembolso
 */
export function useRefundPolicyConfig(merchantId: string, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['refund-policy', merchantId] : null,
    async ([_, merchantId]) => {
      const response = await internalApi.get('/refunds/policy', {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      revalidateOnFocus: false
    }
  )

  const updatePolicy = useCallback(async (config: Partial<RefundPolicyConfig>): Promise<boolean> => {
    try {
      await internalApi.put('/refunds/policy', config, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      
      toast.success('Política de reembolsos actualizada')
      await mutate()
      return true
    } catch (error) {
      console.error('Error updating refund policy:', error)
      toast.error('Error al actualizar política de reembolsos')
      return false
    }
  }, [merchantId, mutate])

  return {
    policy: data as RefundPolicyConfig | null,
    loading: isLoading,
    error,
    updatePolicy,
    refresh: mutate
  }
}

/**
 * Hook para alertas de reembolsos
 */
export function useRefundAlerts(merchantId: string, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['refund-alerts', merchantId] : null,
    async ([_, merchantId]) => {
      const response = await internalApi.get('/refunds/alerts', {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 60000, // 1 minuto
      revalidateOnFocus: true
    }
  )

  const acknowledgeAlert = useCallback(async (alertId: string, acknowledgedBy: string): Promise<boolean> => {
    try {
      await internalApi.patch(`/refunds/alerts/${alertId}/acknowledge`, {
        acknowledged_by: acknowledgedBy
      })
      
      toast.success('Alerta reconocida')
      await mutate()
      return true
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      toast.error('Error al reconocer alerta')
      return false
    }
  }, [mutate])

  return {
    alerts: (data || []) as RefundAlert[],
    loading: isLoading,
    error,
    acknowledgeAlert,
    refresh: mutate
  }
}

export default useRefunds