// src/presentation/hooks/useDisputes.ts
// ──────────────────────────────────────────────────────────────────────────────
// useDisputes Hook - Gestión de disputas de pagos
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { internalApi, MultipagaApiError } from '../lib/axios-config'
import { useDebounce } from './useDebounce'
import type {
  DisputeFilters,
  DisputeSortOptions,
  PaginationOptions,
  DisputeStatistics,
  DisputeSummary,
  DisputePerformanceMetrics,
  DisputeAlert,
  SubmitEvidenceParams
} from '../../domain/repositories/IDisputeRepository'
import type { DisputeData, DisputeEvidence } from '../../domain/entities/Dispute'
import { DisputeStatus } from '../../domain/value-objects/DisputeStatus'
import { DateRange } from '../../domain/value-objects/DateRange'

/**
 * Opciones para el hook useDisputes
 */
interface UseDisputesOptions {
  merchantId: string
  filters?: DisputeFilters
  sortOptions?: DisputeSortOptions
  pagination?: PaginationOptions
  enabled?: boolean
  refreshInterval?: number
  autoRefresh?: boolean
}

/**
 * Estado del hook useDisputes
 */
interface UseDisputesState {
  disputes: DisputeData[]
  totalCount: number
  hasMore: boolean
  loading: boolean
  error: MultipagaApiError | null
  submittingEvidence: boolean
  acceptingDispute: boolean
  markingAsReviewed: boolean
  exporting: boolean
}

/**
 * Acciones del hook useDisputes
 */
interface UseDisputesActions {
  // CRUD operations
  submitEvidence: (params: SubmitEvidenceParams) => Promise<boolean>
  acceptDispute: (disputeId: string, reason?: string) => Promise<boolean>
  markAsReviewed: (disputeIds: string[], reviewedBy: string) => Promise<boolean>
  
  // Data fetching
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: DisputeFilters) => void
  setSortOptions: (sortOptions: DisputeSortOptions) => void
  setPagination: (pagination: PaginationOptions) => void
  
  // Export
  exportDisputes: (format: 'csv' | 'excel') => Promise<string | null>
  
  // Search
  searchDisputes: (query: string) => void
  clearSearch: () => void
}

/**
 * Tipo de retorno del hook
 */
type UseDisputesReturn = UseDisputesState & UseDisputesActions

/**
 * Hook para gestionar disputas de pagos
 */
export function useDisputes(options: UseDisputesOptions): UseDisputesReturn {
  const {
    merchantId,
    filters = {},
    sortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    pagination = { limit: 20, offset: 0 },
    enabled = true,
    refreshInterval = 60000, // 1 minuto
    autoRefresh = true
  } = options

  // Estado local
  const [localFilters, setLocalFilters] = useState<DisputeFilters>(filters)
  const [localSortOptions, setLocalSortOptions] = useState<DisputeSortOptions>(sortOptions)
  const [localPagination, setLocalPagination] = useState<PaginationOptions>(pagination)
  const [searchQuery, setSearchQuery] = useState('')
  const [submittingEvidence, setSubmittingEvidence] = useState(false)
  const [acceptingDispute, setAcceptingDispute] = useState(false)
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Combinar filtros con búsqueda
  const finalFilters = useMemo(() => {
    const filters = { ...localFilters }
    if (debouncedSearchQuery.trim()) {
      // La búsqueda se maneja en el endpoint backend
      return { ...filters, search: debouncedSearchQuery.trim() }
    }
    return filters
  }, [localFilters, debouncedSearchQuery])

  // Clave para SWR
  const swrKey = useMemo(() => {
    if (!enabled || !merchantId) return null
    
    return [
      'disputes',
      merchantId,
      JSON.stringify(finalFilters),
      JSON.stringify(localSortOptions),
      JSON.stringify(localPagination)
    ]
  }, [enabled, merchantId, finalFilters, localSortOptions, localPagination])

  // Fetcher para SWR
  const fetcher = useCallback(async ([_, merchantId, filtersStr, sortStr, paginationStr]: string[]) => {
    const parsedFilters = JSON.parse(filtersStr) as DisputeFilters & { search?: string }
    const parsedSort = JSON.parse(sortStr) as DisputeSortOptions
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

    const response = await internalApi.get(`/disputes?${params.toString()}`, {
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
      console.error('Error fetching disputes:', error)
      if (error instanceof MultipagaApiError) {
        toast.error(`Error al cargar disputas: ${error.getUserMessage()}`)
      }
    }
  })

  // Extraer datos
  const disputes = data?.disputes || []
  const totalCount = data?.total_count || 0
  const hasMore = data?.has_more || false

  // Enviar evidencia
  const submitEvidence = useCallback(async (params: SubmitEvidenceParams): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setSubmittingEvidence(true)
    try {
      await internalApi.post(`/disputes/${params.dispute_id}/evidence`, params, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Evidencia enviada exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error submitting evidence:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al enviar evidencia'
      toast.error(message)
      return false
    } finally {
      setSubmittingEvidence(false)
    }
  }, [merchantId, mutate])

  // Aceptar disputa
  const acceptDispute = useCallback(async (disputeId: string, reason?: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setAcceptingDispute(true)
    try {
      await internalApi.post(`/disputes/${disputeId}/accept`, 
        { reason }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      toast.success('Disputa aceptada exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error accepting dispute:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al aceptar disputa'
      toast.error(message)
      return false
    } finally {
      setAcceptingDispute(false)
    }
  }, [merchantId, mutate])

  // Marcar como revisado
  const markAsReviewed = useCallback(async (disputeIds: string[], reviewedBy: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setMarkingAsReviewed(true)
    try {
      await internalApi.patch('/disputes/mark-reviewed', 
        { dispute_ids: disputeIds, reviewed_by: reviewedBy }, 
        { headers: { 'X-Merchant-Id': merchantId } }
      )

      toast.success(`${disputeIds.length} disputa(s) marcada(s) como revisada(s)`)
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error marking as reviewed:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al marcar como revisado'
      toast.error(message)
      return false
    } finally {
      setMarkingAsReviewed(false)
    }
  }, [merchantId, mutate])

  // Exportar disputas
  const exportDisputes = useCallback(async (format: 'csv' | 'excel'): Promise<string | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setExporting(true)
    try {
      const response = await internalApi.post('/disputes/export', 
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
      console.error('Error exporting disputes:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al exportar disputas'
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
  const setFilters = useCallback((newFilters: DisputeFilters): void => {
    setLocalFilters(newFilters)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Establecer opciones de ordenamiento
  const setSortOptions = useCallback((newSortOptions: DisputeSortOptions): void => {
    setLocalSortOptions(newSortOptions)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Establecer paginación
  const setPagination = useCallback((newPagination: PaginationOptions): void => {
    setLocalPagination(newPagination)
  }, [])

  // Buscar disputas
  const searchDisputes = useCallback((query: string): void => {
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
    disputes,
    totalCount,
    hasMore,
    loading: isLoading || isValidating,
    error: error || null,
    submittingEvidence,
    acceptingDispute,
    markingAsReviewed,
    exporting,

    // Acciones
    submitEvidence,
    acceptDispute,
    markAsReviewed,
    exportDisputes,
    refresh,
    loadMore,
    setFilters,
    setSortOptions,
    setPagination,
    searchDisputes,
    clearSearch
  }
}

/**
 * Hook para disputas pendientes de acción
 */
export function usePendingDisputes(merchantId: string, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['disputes-pending', merchantId] : null,
    async ([_, merchantId]) => {
      const response = await internalApi.get('/disputes/pending', {
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
    pendingDisputes: (data || []) as DisputeSummary[],
    loading: isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook para disputas que expiran pronto
 */
export function useExpiringDisputes(
  merchantId: string,
  daysAhead: number = 7,
  enabled: boolean = true
) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['disputes-expiring', merchantId, daysAhead] : null,
    async ([_, merchantId, daysAhead]) => {
      const response = await internalApi.get('/disputes/expiring', {
        params: { days_ahead: daysAhead },
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 300000, // 5 minutos
      revalidateOnFocus: true
    }
  )

  return {
    expiringDisputes: (data || []) as DisputeSummary[],
    loading: isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook para estadísticas de disputas
 */
export function useDisputeStatistics(
  merchantId: string,
  dateRange: DateRange,
  connector?: string,
  enabled: boolean = true
) {
  const swrKey = enabled ? [
    'dispute-statistics',
    merchantId,
    dateRange.toISOStrings(),
    connector
  ] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, dateRangeStr, connector]) => {
      const { start, end } = JSON.parse(dateRangeStr)
      const response = await internalApi.get('/disputes/statistics', {
        params: {
          start_date: start,
          end_date: end,
          connector
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
    statistics: data as DisputeStatistics | null,
    loading: isLoading,
    error
  }
}

/**
 * Hook para métricas de performance de disputas
 */
export function useDisputePerformanceMetrics(
  merchantId: string,
  dateRange: DateRange,
  enabled: boolean = true
) {
  const swrKey = enabled ? [
    'dispute-performance',
    merchantId,
    dateRange.toISOStrings()
  ] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, dateRangeStr]) => {
      const { start, end } = JSON.parse(dateRangeStr)
      const response = await internalApi.get('/disputes/performance', {
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
    metrics: (data || []) as DisputePerformanceMetrics[],
    loading: isLoading,
    error
  }
}

/**
 * Hook para alertas de disputas
 */
export function useDisputeAlerts(merchantId: string, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['dispute-alerts', merchantId] : null,
    async ([_, merchantId]) => {
      const response = await internalApi.get('/disputes/alerts', {
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
      await internalApi.patch(`/disputes/alerts/${alertId}/acknowledge`, {
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
    alerts: (data || []) as DisputeAlert[],
    loading: isLoading,
    error,
    acknowledgeAlert,
    refresh: mutate
  }
}

/**
 * Hook para evidencia de una disputa específica
 */
export function useDisputeEvidence(
  merchantId: string,
  disputeId: string,
  enabled: boolean = true
) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled && disputeId ? ['dispute-evidence', merchantId, disputeId] : null,
    async ([_, merchantId, disputeId]) => {
      const response = await internalApi.get(`/disputes/${disputeId}/evidence`, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      revalidateOnFocus: false
    }
  )

  return {
    evidence: (data || []) as DisputeEvidence[],
    loading: isLoading,
    error,
    refresh: mutate
  }
}

export default useDisputes