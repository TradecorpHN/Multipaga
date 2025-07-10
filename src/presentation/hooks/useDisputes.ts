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
  SubmitEvidenceParams
} from '../../domain/repositories/IDisputeRepository'
import type { DisputeData } from '../../domain/entities/Dispute'
import { DisputeStatus } from '../../domain/value-objects/DisputeStatus'
import { DateRange } from '../../domain/value-objects/DateRange'

interface UseDisputesOptions {
  merchantId: string
  filters?: DisputeFilters
  sortOptions?: DisputeSortOptions
  pagination?: PaginationOptions
  enabled?: boolean
  refreshInterval?: number
  autoRefresh?: boolean
}

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

interface UseDisputesActions {
  submitEvidence: (params: SubmitEvidenceParams) => Promise<boolean>
  acceptDispute: (disputeId: string, reason?: string) => Promise<boolean>
  markAsReviewed: (disputeId: string, internalNotes?: string) => Promise<boolean>
  exportDisputes: (format: 'csv' | 'excel') => Promise<string | null>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: DisputeFilters) => void
  setSortOptions: (sortOptions: DisputeSortOptions) => void
  setPagination: (pagination: PaginationOptions) => void
  searchDisputes: (query: string) => void
  clearSearch: () => void
}

// Utilidad para transformar filtros con rangos a la API
function transformRangeFilters(filters: any): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
      if (value.start) out[`${key}_start`] = value.start
      if (value.end) out[`${key}_end`] = value.end
    } else {
      out[key] = value
    }
  }
  return out
}

export function useDisputes(options: UseDisputesOptions): UseDisputesState & UseDisputesActions {
  const {
    merchantId,
    filters: initialFilters = {},
    sortOptions: initialSortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    pagination: initialPagination = { limit: 20, offset: 0 },
    enabled = true,
    refreshInterval = 0,
    autoRefresh = false
  } = options

  const [localFilters, setLocalFilters] = useState<DisputeFilters>(initialFilters)
  const [localSortOptions, setLocalSortOptions] = useState<DisputeSortOptions>(initialSortOptions)
  const [localPagination, setLocalPagination] = useState<PaginationOptions>(initialPagination)
  const [searchQuery, setSearchQuery] = useState('')

  const [submittingEvidence, setSubmittingEvidence] = useState(false)
  const [acceptingDispute, setAcceptingDispute] = useState(false)
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Debounce búsqueda
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Filtros finales, combinando filtros y búsqueda
  const finalFilters = useMemo(() => ({
    ...localFilters,
    ...(debouncedSearch && { search: debouncedSearch })
  }), [localFilters, debouncedSearch])

  // Generar clave SWR y filtros serializables (para SWR y para la API)
  const swrKey = useMemo(() => {
    if (!enabled || !merchantId) return null
    const filtersApi = transformRangeFilters(finalFilters)
    return [
      'disputes',
      merchantId,
      JSON.stringify(filtersApi),
      JSON.stringify(localSortOptions),
      JSON.stringify(localPagination),
    ]
  }, [enabled, merchantId, finalFilters, localSortOptions, localPagination])

  // Fetcher para SWR
  const fetcher = useCallback(async (key: any[]) => {
    const [, merchantId, filtersStr, sortStr, paginationStr] = key
    const parsedFilters = JSON.parse(filtersStr)
    const parsedSort = JSON.parse(sortStr) as DisputeSortOptions
    const parsedPagination = JSON.parse(paginationStr) as PaginationOptions

    const params = new URLSearchParams()
    // Añadir filtros, soportando arrays y rangos
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)))
        } else {
          params.append(key, String(value))
        }
      }
    })

    // Añadir ordenamiento
    if (parsedSort.sort_by) params.append('sort_by', parsedSort.sort_by)
    if (parsedSort.sort_order) params.append('sort_order', parsedSort.sort_order)
    // Paginación
    if (parsedPagination.limit) params.append('limit', String(parsedPagination.limit))
    if (parsedPagination.offset) params.append('offset', String(parsedPagination.offset))

    const response = await internalApi.get(`/disputes?${params.toString()}`, {
      headers: { 'X-Merchant-Id': merchantId }
    })

    return response.data
  }, [])

  // SWR
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

  // Datos retornados por la API
  const disputes: DisputeData[] = data?.disputes || []
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
      await internalApi.post(`/disputes/${disputeId}/accept`, { reason }, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      toast.success('Disputa aceptada')
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

  // Marcar como revisada
  const markAsReviewed = useCallback(async (disputeId: string, internalNotes?: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }
    setMarkingAsReviewed(true)
    try {
      await internalApi.patch(`/disputes/${disputeId}/review`, { internal_notes: internalNotes }, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      toast.success('Disputa marcada como revisada')
      await mutate()
      return true
    } catch (error) {
      console.error('Error marking as reviewed:', error)
      const message = error instanceof MultipagaApiError
        ? error.getUserMessage()
        : 'Error al marcar como revisada'
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
      const filtersApi = transformRangeFilters(finalFilters)
      const response = await internalApi.post('/disputes/export', {
        format,
        filters: filtersApi,
        sort_options: localSortOptions
      }, {
        headers: { 'X-Merchant-Id': merchantId }
      })
      const { download_url } = response.data
      toast.success('Exportación completada. Descarga disponible.')
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

  // Cargar más datos (paginación)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore) return
    const newPagination = {
      ...localPagination,
      offset: (localPagination.offset || 0) + (localPagination.limit || 20)
    }
    setLocalPagination(newPagination)
  }, [hasMore, localPagination])

  // Actualizar filtros
  const setFilters = useCallback((newFilters: DisputeFilters): void => {
    setLocalFilters(newFilters)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Actualizar ordenamiento
  const setSortOptions = useCallback((newSortOptions: DisputeSortOptions): void => {
    setLocalSortOptions(newSortOptions)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Actualizar paginación manualmente
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
    disputes,
    totalCount,
    hasMore,
    loading: isLoading || isValidating,
    error: error || null,
    submittingEvidence,
    acceptingDispute,
    markingAsReviewed,
    exporting,
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
    clearSearch,
  }
}
