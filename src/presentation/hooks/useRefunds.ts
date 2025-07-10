// src/presentation/hooks/useRefunds.ts
// ──────────────────────────────────────────────────────────────────────────────
// useRefunds Hook - Gestión avanzada de reembolsos para Multipaga (Enterprise Ready)
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
  RefundPolicyConfig
} from '../../domain/repositories/IRefundRepository'
import type { RefundData } from '../../domain/entities/Refund'

/** Utilidad universal: convierte rangos y objetos en filtros planos para queries */
function toApiFilters(filters: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (
      value &&
      typeof value === 'object' &&
      ('start' in value || 'end' in value)
    ) {
      if (value.start) out[`${key}_start`] = value.start
      if (value.end) out[`${key}_end`] = value.end
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out
}

interface UseRefundsOptions {
  merchantId: string
  filters?: RefundFilters
  sortOptions?: RefundSortOptions
  pagination?: PaginationOptions
  enabled?: boolean
  refreshInterval?: number
  autoRefresh?: boolean
}
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
interface UseRefundsActions {
  createRefund: (params: CreateRefundParams) => Promise<RefundData | null>
  updateRefund: (params: UpdateRefundParams) => Promise<RefundData | null>
  processRefund: (refundId: string) => Promise<boolean>
  cancelRefund: (refundId: string, reason: string) => Promise<boolean>
  retryRefund: (refundId: string) => Promise<boolean>
  bulkCancel: (refundIds: string[], reason: string) => Promise<{ success: number; failed: number }>
  bulkRetry: (refundIds: string[]) => Promise<{ success: number; failed: number }>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: RefundFilters) => void
  setSortOptions: (sortOptions: RefundSortOptions) => void
  setPagination: (pagination: PaginationOptions) => void
  exportRefunds: (format: 'csv' | 'excel') => Promise<string | null>
  searchRefunds: (query: string) => void
  clearSearch: () => void
}

export function useRefunds(options: UseRefundsOptions): UseRefundsState & UseRefundsActions {
  const {
    merchantId,
    filters: initialFilters = {},
    sortOptions: initialSortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    pagination: initialPagination = { limit: 20, offset: 0 },
    enabled = true,
    refreshInterval = 0,
    autoRefresh = false
  } = options

  const [localFilters, setLocalFilters] = useState<RefundFilters>(initialFilters)
  const [localSortOptions, setLocalSortOptions] = useState<RefundSortOptions>(initialSortOptions)
  const [localPagination, setLocalPagination] = useState<PaginationOptions>(initialPagination)
  const [searchQuery, setSearchQuery] = useState('')

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [exporting, setExporting] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 500)
  const finalFilters = useMemo(
    () => ({
      ...localFilters,
      ...(debouncedSearch && { search: debouncedSearch })
    }),
    [localFilters, debouncedSearch]
  )

  const swrKey = useMemo(() => {
    if (!enabled || !merchantId) return null
    const filtersApi = toApiFilters(finalFilters)
    return [
      'refunds',
      merchantId,
      JSON.stringify(filtersApi),
      JSON.stringify(localSortOptions),
      JSON.stringify(localPagination)
    ]
  }, [enabled, merchantId, finalFilters, localSortOptions, localPagination])

  const fetcher = useCallback(async (key: any[]) => {
    const [, merchantId, filtersStr, sortStr, paginationStr] = key
    const parsedFilters = JSON.parse(filtersStr)
    const parsedSort = JSON.parse(sortStr) as RefundSortOptions
    const parsedPagination = JSON.parse(paginationStr) as PaginationOptions

    const params = new URLSearchParams()
    Object.entries(parsedFilters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) v.forEach(val => params.append(k, String(val)))
        else params.append(k, String(v))
      }
    })

    if (parsedSort.sort_by) params.append('sort_by', parsedSort.sort_by)
    if (parsedSort.sort_order) params.append('sort_order', parsedSort.sort_order)
    if (parsedPagination.limit) params.append('limit', String(parsedPagination.limit))
    if (parsedPagination.offset) params.append('offset', String(parsedPagination.offset))

    const response = await internalApi.get(`/refunds?${params.toString()}`, {
      headers: { 'X-Merchant-Id': merchantId }
    })
    return response.data
  }, [])

  const { data, error, isLoading, isValidating, mutate } = useSWR(swrKey, fetcher, {
    refreshInterval: enabled && autoRefresh ? refreshInterval : 0,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    errorRetryCount: 3,
    onError: err => {
      if (err instanceof MultipagaApiError) {
        toast.error(`Error al cargar reembolsos: ${err.getUserMessage()}`)
      }
    }
  })

  const refunds: RefundData[] = data?.refunds || []
  const totalCount = data?.total_count || 0
  const hasMore = data?.has_more || false

  const createRefund = useCallback(
    async (params: CreateRefundParams): Promise<RefundData | null> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return null
      }
      setCreating(true)
      try {
        const response = await internalApi.post('/refunds', params, {
          headers: { 'X-Merchant-Id': merchantId }
        })
        toast.success('Reembolso creado exitosamente')
        await mutate()
        return response.data
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al crear reembolso'
        )
        return null
      } finally {
        setCreating(false)
      }
    },
    [merchantId, mutate]
  )

  const updateRefund = useCallback(
    async (params: UpdateRefundParams): Promise<RefundData | null> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return null
      }
      setUpdating(true)
      try {
        const response = await internalApi.put(`/refunds/${params.refund_id}`, params, {
          headers: { 'X-Merchant-Id': merchantId }
        })
        toast.success('Reembolso actualizado exitosamente')
        await mutate()
        return response.data
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al actualizar reembolso'
        )
        return null
      } finally {
        setUpdating(false)
      }
    },
    [merchantId, mutate]
  )

  const processRefund = useCallback(
    async (refundId: string): Promise<boolean> => {
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
        await mutate()
        return true
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al procesar reembolso'
        )
        return false
      } finally {
        setProcessing(false)
      }
    },
    [merchantId, mutate]
  )

  const cancelRefund = useCallback(
    async (refundId: string, reason: string): Promise<boolean> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return false
      }
      setCancelling(true)
      try {
        await internalApi.post(`/refunds/${refundId}/cancel`, { reason }, {
          headers: { 'X-Merchant-Id': merchantId }
        })
        toast.success('Reembolso cancelado')
        await mutate()
        return true
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al cancelar reembolso'
        )
        return false
      } finally {
        setCancelling(false)
      }
    },
    [merchantId, mutate]
  )

  const retryRefund = useCallback(
    async (refundId: string): Promise<boolean> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return false
      }
      setRetrying(true)
      try {
        await internalApi.post(`/refunds/${refundId}/retry`, {}, {
          headers: { 'X-Merchant-Id': merchantId }
        })
        toast.success('Reintento de reembolso iniciado')
        await mutate()
        return true
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al reintentar reembolso'
        )
        return false
      } finally {
        setRetrying(false)
      }
    },
    [merchantId, mutate]
  )

  const bulkCancel = useCallback(
    async (refundIds: string[], reason: string): Promise<{ success: number; failed: number }> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return { success: 0, failed: refundIds.length }
      }
      try {
        const response = await internalApi.post(
          '/refunds/bulk-cancel',
          { refund_ids: refundIds, reason },
          { headers: { 'X-Merchant-Id': merchantId } }
        )
        const result = response.data
        if (result.success > 0) toast.success(`${result.success} reembolsos cancelados exitosamente`)
        if (result.failed > 0) toast.error(`${result.failed} reembolsos no pudieron ser cancelados`)
        await mutate()
        return result
      } catch {
        toast.error('Error al cancelar reembolsos')
        return { success: 0, failed: refundIds.length }
      }
    },
    [merchantId, mutate]
  )

  const bulkRetry = useCallback(
    async (refundIds: string[]): Promise<{ success: number; failed: number }> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return { success: 0, failed: refundIds.length }
      }
      try {
        const response = await internalApi.post(
          '/refunds/bulk-retry',
          { refund_ids: refundIds },
          { headers: { 'X-Merchant-Id': merchantId } }
        )
        const result = response.data
        if (result.success > 0) toast.success(`${result.success} reembolsos reintentados exitosamente`)
        if (result.failed > 0) toast.error(`${result.failed} reembolsos no pudieron ser reintentados`)
        await mutate()
        return result
      } catch {
        toast.error('Error al reintentar reembolsos')
        return { success: 0, failed: refundIds.length }
      }
    },
    [merchantId, mutate]
  )

  const exportRefunds = useCallback(
    async (format: 'csv' | 'excel'): Promise<string | null> => {
      if (!merchantId) {
        toast.error('ID de merchant requerido')
        return null
      }
      setExporting(true)
      try {
        const filtersApi = toApiFilters(finalFilters)
        const response = await internalApi.post(
          '/refunds/export',
          {
            format,
            filters: filtersApi,
            sort_options: localSortOptions
          },
          { headers: { 'X-Merchant-Id': merchantId } }
        )
        toast.success('Exportación completada. Descarga disponible.')
        return response.data.download_url
      } catch (error) {
        toast.error(
          error instanceof MultipagaApiError
            ? error.getUserMessage()
            : 'Error al exportar reembolsos'
        )
        return null
      } finally {
        setExporting(false)
      }
    },
    [merchantId, finalFilters, localSortOptions]
  )

  const refresh = useCallback(async () => { await mutate() }, [mutate])
  const loadMore = useCallback(async () => {
    if (!hasMore) return
    setLocalPagination({
      ...localPagination,
      offset: (localPagination.offset || 0) + (localPagination.limit || 20)
    })
  }, [hasMore, localPagination])
  const setFilters = useCallback((newFilters: RefundFilters) => {
    setLocalFilters(newFilters)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])
  const setSortOptions = useCallback((newSortOptions: RefundSortOptions) => {
    setLocalSortOptions(newSortOptions)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])
  const setPagination = useCallback((newPagination: PaginationOptions) => {
    setLocalPagination(newPagination)
  }, [])
  const searchRefunds = useCallback((query: string) => {
    setSearchQuery(query)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  return {
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
    enabled ? ['pending-refunds', merchantId] : null,
    async () => {
      const response = await internalApi.get('/refunds/pending', {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      refreshInterval: 60000, // 1 min
      dedupingInterval: 30000
    }
  )
  return {
    pendingRefunds: data?.refunds || [],
    count: data?.count || 0,
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
  dateRange?: { start: Date; end: Date },
  enabled: boolean = true
) {
  const swrKey = enabled
    ? ['refund-statistics', merchantId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const params = new URLSearchParams()
      if (dateRange) {
        params.append('start_date', dateRange.start.toISOString())
        params.append('end_date', dateRange.end.toISOString())
      }
      const response = await internalApi.get(`/refunds/statistics?${params.toString()}`, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      dedupingInterval: 300000 // 5 minutos
    }
  )

  return {
    statistics: data as RefundStatistics | undefined,
    loading: isLoading,
    error,
    refresh: mutate
  }
}

/**
 * Hook para políticas de reembolso
 */
export function useRefundPolicy(
  merchantId: string,
  profileId?: string,
  enabled: boolean = true
) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['refund-policy', merchantId, profileId] : null,
    async () => {
      const params = new URLSearchParams()
      if (profileId) params.append('profile_id', profileId)
      const response = await internalApi.get(`/refunds/policy?${params.toString()}`, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      return response.data
    },
    {
      dedupingInterval: 3600000 // 1 hora
    }
  )

  const updatePolicy = useCallback(async (policy: RefundPolicyConfig): Promise<boolean> => {
    try {
      await internalApi.put('/refunds/policy', policy, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      toast.success('Política de reembolso actualizada')
      await mutate()
      return true
    } catch (error) {
      toast.error('Error al actualizar política de reembolso')
      return false
    }
  }, [merchantId, mutate])

  return {
    policy: data as RefundPolicyConfig | undefined,
    loading: isLoading,
    error,
    updatePolicy,
    refresh: mutate
  }
}
