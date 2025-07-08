// src/presentation/hooks/useConnectors.ts
// ──────────────────────────────────────────────────────────────────────────────
// useConnectors Hook - Gestión de conectores de pago
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { internalApi, MultipagaApiError } from '../lib/axios-config'
import type {
  ConnectorInfo,
  ConnectorFilters,
  PaginationOptions,
  CreateConnectorParams,
  UpdateConnectorParams,
  ConnectorPerformanceStats,
  ConnectorRoutingConfig
} from '../../domain/repositories/IConnectorRepository'
import { ConnectorType } from '../../domain/value-objects/ConnectorType'

/**
 * Opciones para el hook useConnectors
 */
interface UseConnectorsOptions {
  merchantId: string
  filters?: ConnectorFilters
  pagination?: PaginationOptions
  enabled?: boolean
  refreshInterval?: number
}

/**
 * Estado del hook useConnectors
 */
interface UseConnectorsState {
  connectors: ConnectorInfo[]
  totalCount: number
  hasMore: boolean
  loading: boolean
  error: MultipagaApiError | null
  creating: boolean
  updating: boolean
  deleting: boolean
  testing: boolean
}

/**
 * Acciones del hook useConnectors
 */
interface UseConnectorsActions {
  // CRUD operations
  createConnector: (params: CreateConnectorParams) => Promise<ConnectorInfo | null>
  updateConnector: (params: UpdateConnectorParams) => Promise<ConnectorInfo | null>
  deleteConnector: (merchantConnectorId: string) => Promise<boolean>
  enableConnector: (merchantConnectorId: string) => Promise<boolean>
  disableConnector: (merchantConnectorId: string) => Promise<boolean>
  
  // Testing and validation
  testConnection: (merchantConnectorId: string) => Promise<boolean>
  validateCredentials: (connectorName: string, credentials: any) => Promise<boolean>
  
  // Configuration
  updateRoutingConfig: (config: ConnectorRoutingConfig[]) => Promise<boolean>
  syncConfiguration: (merchantConnectorId: string) => Promise<boolean>
  
  // Data fetching
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilters: (filters: ConnectorFilters) => void
  setPagination: (pagination: PaginationOptions) => void
}

/**
 * Tipo de retorno del hook
 */
type UseConnectorsReturn = UseConnectorsState & UseConnectorsActions

/**
 * Hook para gestionar conectores de pago
 */
export function useConnectors(options: UseConnectorsOptions): UseConnectorsReturn {
  const {
    merchantId,
    filters = {},
    pagination = { limit: 20, offset: 0 },
    enabled = true,
    refreshInterval = 30000 // 30 segundos
  } = options

  // Estado local
  const [localFilters, setLocalFilters] = useState<ConnectorFilters>(filters)
  const [localPagination, setLocalPagination] = useState<PaginationOptions>(pagination)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [testing, setTesting] = useState(false)

  // Clave para SWR
  const swrKey = useMemo(() => {
    if (!enabled || !merchantId) return null
    
    return [
      'connectors',
      merchantId,
      JSON.stringify(localFilters),
      JSON.stringify(localPagination)
    ]
  }, [enabled, merchantId, localFilters, localPagination])

  // Fetcher para SWR
  const fetcher = useCallback(async ([_, merchantId, filtersStr, paginationStr]: string[]) => {
    const parsedFilters = JSON.parse(filtersStr) as ConnectorFilters
    const parsedPagination = JSON.parse(paginationStr) as PaginationOptions

    const params = new URLSearchParams()
    
    // Añadir filtros
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)))
        } else {
          params.append(key, String(value))
        }
      }
    })

    // Añadir paginación
    if (parsedPagination.limit) params.append('limit', String(parsedPagination.limit))
    if (parsedPagination.offset) params.append('offset', String(parsedPagination.offset))
    if (parsedPagination.sort_by) params.append('sort_by', parsedPagination.sort_by)
    if (parsedPagination.sort_order) params.append('sort_order', parsedPagination.sort_order)

    const response = await internalApi.get(`/connectors?${params.toString()}`, {
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
    refreshInterval: enabled ? refreshInterval : 0,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    errorRetryCount: 3,
    onError: (error) => {
      console.error('Error fetching connectors:', error)
      if (error instanceof MultipagaApiError) {
        toast.error(`Error al cargar conectores: ${error.getUserMessage()}`)
      }
    }
  })

  // Extraer datos
  const connectors = data?.connectors || []
  const totalCount = data?.total_count || 0
  const hasMore = data?.has_more || false

  // Crear conector
  const createConnector = useCallback(async (params: CreateConnectorParams): Promise<ConnectorInfo | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setCreating(true)
    try {
      const response = await internalApi.post('/connectors', params, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      const newConnector = response.data
      toast.success(`Conector ${newConnector.connector_name} creado exitosamente`)
      
      // Actualizar cache
      await mutate()
      
      return newConnector
    } catch (error) {
      console.error('Error creating connector:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al crear conector'
      toast.error(message)
      return null
    } finally {
      setCreating(false)
    }
  }, [merchantId, mutate])

  // Actualizar conector
  const updateConnector = useCallback(async (params: UpdateConnectorParams): Promise<ConnectorInfo | null> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return null
    }

    setUpdating(true)
    try {
      const response = await internalApi.put(`/connectors/${params.merchant_connector_id}`, params, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      const updatedConnector = response.data
      toast.success('Conector actualizado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return updatedConnector
    } catch (error) {
      console.error('Error updating connector:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al actualizar conector'
      toast.error(message)
      return null
    } finally {
      setUpdating(false)
    }
  }, [merchantId, mutate])

  // Eliminar conector
  const deleteConnector = useCallback(async (merchantConnectorId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setDeleting(true)
    try {
      await internalApi.delete(`/connectors/${merchantConnectorId}`, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Conector eliminado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error deleting connector:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al eliminar conector'
      toast.error(message)
      return false
    } finally {
      setDeleting(false)
    }
  }, [merchantId, mutate])

  // Habilitar conector
  const enableConnector = useCallback(async (merchantConnectorId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.patch(`/connectors/${merchantConnectorId}/enable`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Conector habilitado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error enabling connector:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al habilitar conector'
      toast.error(message)
      return false
    }
  }, [merchantId, mutate])

  // Deshabilitar conector
  const disableConnector = useCallback(async (merchantConnectorId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.patch(`/connectors/${merchantConnectorId}/disable`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Conector deshabilitado exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error disabling connector:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al deshabilitar conector'
      toast.error(message)
      return false
    }
  }, [merchantId, mutate])

  // Probar conexión
  const testConnection = useCallback(async (merchantConnectorId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    setTesting(true)
    try {
      const response = await internalApi.post(`/connectors/${merchantConnectorId}/test`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      const result = response.data
      if (result.status === 'success') {
        toast.success(`Conexión exitosa (${result.response_time_ms}ms)`)
        return true
      } else {
        toast.error(`Conexión fallida: ${result.error_message}`)
        return false
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al probar conexión'
      toast.error(message)
      return false
    } finally {
      setTesting(false)
    }
  }, [merchantId])

  // Validar credenciales
  const validateCredentials = useCallback(async (connectorName: string, credentials: any): Promise<boolean> => {
    try {
      const response = await internalApi.post('/connectors/validate-credentials', {
        connector_name: connectorName,
        credentials
      })

      const result = response.data
      if (result.valid) {
        toast.success('Credenciales válidas')
        return true
      } else {
        toast.error(`Credenciales inválidas: ${result.error_message}`)
        return false
      }
    } catch (error) {
      console.error('Error validating credentials:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al validar credenciales'
      toast.error(message)
      return false
    }
  }, [])

  // Actualizar configuración de routing
  const updateRoutingConfig = useCallback(async (config: ConnectorRoutingConfig[]): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.put('/connectors/routing-config', { config }, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Configuración de routing actualizada')
      return true
    } catch (error) {
      console.error('Error updating routing config:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al actualizar configuración de routing'
      toast.error(message)
      return false
    }
  }, [merchantId])

  // Sincronizar configuración
  const syncConfiguration = useCallback(async (merchantConnectorId: string): Promise<boolean> => {
    if (!merchantId) {
      toast.error('ID de merchant requerido')
      return false
    }

    try {
      await internalApi.post(`/connectors/${merchantConnectorId}/sync`, {}, {
        headers: { 'X-Merchant-Id': merchantId }
      })

      toast.success('Configuración sincronizada exitosamente')
      
      // Actualizar cache
      await mutate()
      
      return true
    } catch (error) {
      console.error('Error syncing configuration:', error)
      const message = error instanceof MultipagaApiError 
        ? error.getUserMessage()
        : 'Error al sincronizar configuración'
      toast.error(message)
      return false
    }
  }, [merchantId, mutate])

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
  const setFilters = useCallback((newFilters: ConnectorFilters): void => {
    setLocalFilters(newFilters)
    setLocalPagination({ ...localPagination, offset: 0 })
  }, [localPagination])

  // Establecer paginación
  const setPagination = useCallback((newPagination: PaginationOptions): void => {
    setLocalPagination(newPagination)
  }, [])

  return {
    // Estado
    connectors,
    totalCount,
    hasMore,
    loading: isLoading || isValidating,
    error: error || null,
    creating,
    updating,
    deleting,
    testing,

    // Acciones
    createConnector,
    updateConnector,
    deleteConnector,
    enableConnector,
    disableConnector,
    testConnection,
    validateCredentials,
    updateRoutingConfig,
    syncConfiguration,
    refresh,
    loadMore,
    setFilters,
    setPagination
  }
}

/**
 * Hook especializado para obtener tipos de conectores disponibles
 */
export function useConnectorTypes() {
  const { data, error, isLoading } = useSWR(
    'connector-types',
    async () => {
      const response = await internalApi.get('/connectors/types')
      return response.data
    },
    {
      dedupingInterval: 3600000, // 1 hora - los tipos no cambian frecuentemente
      revalidateOnFocus: false
    }
  )

  return {
    types: data || ConnectorType.getAllTypes(),
    loading: isLoading,
    error
  }
}

/**
 * Hook para métricas de performance de conectores
 */
export function useConnectorPerformance(
  merchantId: string,
  startDate: Date,
  endDate: Date,
  enabled: boolean = true
) {
  const swrKey = enabled ? ['connector-performance', merchantId, startDate.toISOString(), endDate.toISOString()] : null

  const { data, error, isLoading } = useSWR(
    swrKey,
    async ([_, merchantId, start, end]) => {
      const response = await internalApi.get('/connectors/performance', {
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
    metrics: (data || []) as ConnectorPerformanceStats[],
    loading: isLoading,
    error
  }
}

export default useConnectors