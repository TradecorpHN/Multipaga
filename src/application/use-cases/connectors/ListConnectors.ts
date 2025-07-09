// src/application/use-cases/connectors/ListConnectors.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: List Connectors - Lista conectores disponibles con filtros y paginación
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'
import { ConnectorListFiltersDTO, ConnectorListResponseDTO } from '../../dtos/ConnectorListDTO'

/**
 * Schema de validación para el request de listado
 */
export const ListConnectorsRequestSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  profile_id: z.string().optional(),
  
  // Filtros de búsqueda
  connector_type: z.enum(['payment_processor', 'payment_vault', 'authentication_processor']).optional(),
  payment_method: z.string().optional(),
  status: z.enum(['active', 'inactive', 'integration_test']).optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
  disabled: z.boolean().optional(),
  test_mode: z.boolean().optional(),
  
  // Paginación
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  
  // Ordenamiento
  sort_by: z.enum(['created_at', 'modified_at', 'connector_name', 'status']).default('modified_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  
  // Opciones adicionales
  include_metrics: z.boolean().default(false),
  include_config: z.boolean().default(false),
  include_health: z.boolean().default(false),
  include_balance: z.boolean().default(false),
  
  // Filtros avanzados
  search: z.string().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  modified_after: z.string().optional(),
  modified_before: z.string().optional(),
})

/**
 * Schema para métricas de conector en listado
 */
export const ConnectorMetricsSummarySchema = z.object({
  merchant_connector_id: z.string(),
  total_payments_24h: z.number(),
  successful_payments_24h: z.number(),
  total_volume_24h: z.number(),
  success_rate_24h: z.number(),
  average_response_time: z.number(),
  last_transaction_at: z.string().optional(),
  uptime_percentage: z.number(),
  error_rate_24h: z.number(),
})

/**
 * Schema para información de salud del conector
 */
export const ConnectorHealthSummarySchema = z.object({
  merchant_connector_id: z.string(),
  status: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  last_check_at: z.string(),
  response_time_ms: z.number().optional(),
  issues: z.array(z.string()).optional(),
  uptime_24h: z.number(),
  availability_status: z.enum(['available', 'limited', 'unavailable']),
})

/**
 * Schema para resumen de balance del conector
 */
export const ConnectorBalanceSummarySchema = z.object({
  merchant_connector_id: z.string(),
  primary_currency: z.string(),
  available_balance: z.number(),
  total_balance: z.number(),
  currency_count: z.number(),
  last_updated: z.string(),
  status: z.enum(['active', 'insufficient_funds', 'error', 'unknown']),
})

/**
 * Schema para conector en listado (extendido)
 */
export const ConnectorListItemSchema = z.object({
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  connector_label: z.string().optional(),
  connector_type: z.enum(['payment_processor', 'payment_vault', 'authentication_processor']),
  status: z.enum(['active', 'inactive', 'integration_test']),
  disabled: z.boolean(),
  test_mode: z.boolean(),
  business_country: z.string(),
  business_label: z.string(),
  
  // Métodos de pago soportados (resumen)
  supported_payment_methods: z.array(z.string()),
  supported_currencies: z.array(z.string()),
  supported_countries: z.array(z.string()),
  
  // Fechas
  created_at: z.string(),
  modified_at: z.string(),
  
  // Información opcional enriquecida
  metrics: ConnectorMetricsSummarySchema.optional(),
  health: ConnectorHealthSummarySchema.optional(),
  balance: ConnectorBalanceSummarySchema.optional(),
  
  // Configuración resumida
  webhook_enabled: z.boolean().optional(),
  frm_enabled: z.boolean().optional(),
  routing_priority: z.number().optional(),
  
  // Metadatos adicionales
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  integration_complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
})

/**
 * Schema principal para respuesta de listado
 */
export const ListConnectorsResponseSchema = z.object({
  connectors: z.array(ConnectorListItemSchema),
  pagination: z.object({
    total_count: z.number(),
    limit: z.number(),
    offset: z.number(),
    has_more: z.boolean(),
    next_offset: z.number().optional(),
    previous_offset: z.number().optional(),
  }),
  filters_applied: z.record(z.any()),
  sort_applied: z.object({
    sort_by: z.string(),
    sort_order: z.string(),
  }),
  summary: z.object({
    total_connectors: z.number(),
    active_connectors: z.number(),
    inactive_connectors: z.number(),
    test_connectors: z.number(),
    by_type: z.record(z.number()),
    by_status: z.record(z.number()),
    by_country: z.record(z.number()),
  }),
  last_updated: z.string(),
  cache_expires_at: z.string().optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ListConnectorsRequest = z.infer<typeof ListConnectorsRequestSchema>
export type ConnectorMetricsSummary = z.infer<typeof ConnectorMetricsSummarySchema>
export type ConnectorHealthSummary = z.infer<typeof ConnectorHealthSummarySchema>
export type ConnectorBalanceSummary = z.infer<typeof ConnectorBalanceSummarySchema>
export type ConnectorListItem = z.infer<typeof ConnectorListItemSchema>
export type ListConnectorsResponse = z.infer<typeof ListConnectorsResponseSchema>

/**
 * Resultado del use case
 */
export interface ListConnectorsResult {
  success: boolean
  data?: ListConnectorsResponse
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata?: {
    cached: boolean
    responseTime: number
    queryComplexity: 'simple' | 'moderate' | 'complex'
  }
}

/**
 * Errores específicos de listado de conectores
 */
export class ListConnectorsError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ListConnectorsError'
  }

  static invalidFilters(details?: any): ListConnectorsError {
    return new ListConnectorsError(
      'INVALID_FILTERS',
      'Invalid filter parameters provided',
      400,
      details
    )
  }

  static invalidPagination(limit?: number, offset?: number): ListConnectorsError {
    return new ListConnectorsError(
      'INVALID_PAGINATION',
      'Invalid pagination parameters',
      400,
      { limit, offset }
    )
  }

  static merchantNotFound(merchantId: string): ListConnectorsError {
    return new ListConnectorsError(
      'MERCHANT_NOT_FOUND',
      `Merchant ${merchantId} not found`,
      404,
      { merchantId }
    )
  }

  static insufficientPermissions(): ListConnectorsError {
    return new ListConnectorsError(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions to list connectors',
      403
    )
  }

  static serviceUnavailable(): ListConnectorsError {
    return new ListConnectorsError(
      'SERVICE_UNAVAILABLE',
      'Connector service is temporarily unavailable',
      503
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: List Connectors
 * 
 * Lista conectores disponibles para un merchant con filtros avanzados,
 * paginación y información enriquecida opcional.
 */
export class ListConnectors {
  private readonly CACHE_PREFIX = 'connectors:list'
  private readonly LIST_TTL = 180 // 3 minutos
  private readonly ENRICHED_TTL = 60 // 1 minuto para datos enriquecidos
  private readonly MAX_CONCURRENT_ENRICHMENT = 5

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta el listado de conectores
   */
  async execute(request: ListConnectorsRequest): Promise<ListConnectorsResult> {
    const startTime = Date.now()
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      component: 'ListConnectors',
    }

    this.logger.info('Starting connectors listing', {
      ...context,
      filters: this.sanitizeFilters(request),
    })

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Determinar complejidad de la consulta
      const queryComplexity = this.determineQueryComplexity(validatedRequest)
      
      // 3. Verificar cache si la consulta es simple
      let cachedResponse: ListConnectorsResponse | null = null
      if (queryComplexity === 'simple') {
        cachedResponse = await this.getCachedResponse(validatedRequest)
        if (cachedResponse && this.isCacheValid(cachedResponse)) {
          this.logger.debug('Returning cached connectors list', context)
          return this.buildSuccessResponse(
            cachedResponse,
            { cached: true, responseTime: Date.now() - startTime, queryComplexity }
          )
        }
      }
      
      // 4. Obtener lista base desde Hyperswitch
      const baseResponse = await this.fetchConnectorsFromHyperswitch(validatedRequest, context)
      
      // 5. Aplicar filtros adicionales del lado cliente
      const filteredResponse = this.applyClientSideFilters(baseResponse, validatedRequest)
      
      // 6. Enriquecer con información adicional si se solicita
      const enrichedResponse = await this.enrichConnectorsData(
        filteredResponse,
        validatedRequest,
        context
      )
      
      // 7. Aplicar ordenamiento y paginación final
      const finalResponse = this.applyPaginationAndSorting(enrichedResponse, validatedRequest)
      
      // 8. Construir respuesta estructurada
      const structuredResponse = this.buildStructuredResponse(finalResponse, validatedRequest)
      
      // 9. Guardar en cache si corresponde
      if (queryComplexity === 'simple') {
        await this.cacheResponse(structuredResponse, validatedRequest)
      }
      
      // 10. Registrar métricas
      await this.recordMetrics(structuredResponse, Date.now() - startTime, context)
      
      this.logger.info('Connectors listing completed', {
        ...context,
        connectorCount: structuredResponse.connectors.length,
        totalCount: structuredResponse.pagination.total_count,
        queryComplexity,
      })
      
      return this.buildSuccessResponse(
        structuredResponse,
        { cached: false, responseTime: Date.now() - startTime, queryComplexity }
      )

    } catch (error) {
      return this.handleError(error, request, context, Date.now() - startTime)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: ListConnectorsRequest): ListConnectorsRequest {
    try {
      return ListConnectorsRequestSchema.parse(request)
    } catch (error) {
      throw new ListConnectorsError(
        'INVALID_REQUEST',
        'Invalid list request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Determina la complejidad de la consulta para optimización
   */
  private determineQueryComplexity(request: ListConnectorsRequest): 'simple' | 'moderate' | 'complex' {
    let complexity = 0

    // Factores que aumentan complejidad
    if (request.include_metrics) complexity += 2
    if (request.include_health) complexity += 2
    if (request.include_balance) complexity += 3
    if (request.include_config) complexity += 1
    if (request.search) complexity += 1
    if (request.created_after || request.created_before) complexity += 1
    if (request.modified_after || request.modified_before) complexity += 1

    if (complexity >= 5) return 'complex'
    if (complexity >= 2) return 'moderate'
    return 'simple'
  }

  /**
   * Obtiene respuesta del cache
   */
  private async getCachedResponse(
    request: ListConnectorsRequest
  ): Promise<ListConnectorsResponse | null> {
    const cacheKey = this.buildCacheKey(request)
    return await this.cache.get<ListConnectorsResponse>(cacheKey)
  }

  /**
   * Verifica si el cache sigue siendo válido
   */
  private isCacheValid(response: ListConnectorsResponse): boolean {
    if (!response.cache_expires_at) return false
    
    const expiresAt = new Date(response.cache_expires_at)
    return expiresAt > new Date()
  }

  /**
   * Obtiene lista base desde Hyperswitch
   */
  private async fetchConnectorsFromHyperswitch(
    request: ListConnectorsRequest,
    context: Record<string, any>
  ): Promise<ConnectorListResponseDTO> {
    try {
      const queryParams: Record<string, any> = {
        limit: Math.min(request.limit * 2, 100), // Solicitar más para filtros locales
        offset: request.offset,
      }

      // Añadir filtros básicos que soporta la API
      if (request.connector_type) queryParams.connector_type = request.connector_type
      if (request.status) queryParams.status = request.status
      if (request.business_country) queryParams.business_country = request.business_country
      if (request.business_label) queryParams.business_label = request.business_label
      if (request.disabled !== undefined) queryParams.disabled = request.disabled
      if (request.test_mode !== undefined) queryParams.test_mode = request.test_mode

      const response = await this.httpClient.get<ConnectorListResponseDTO>(
        `/account/${request.merchant_id}/connectors`,
        {
          params: queryParams,
          headers: {
            'X-Correlation-ID': context.correlationId,
          },
          timeout: 15000,
        }
      )

      return response.data

    } catch (error: any) {
      if (error.status === 404) {
        throw ListConnectorsError.merchantNotFound(request.merchant_id)
      } else if (error.status === 403) {
        throw ListConnectorsError.insufficientPermissions()
      } else if (error.status >= 500) {
        throw ListConnectorsError.serviceUnavailable()
      }

      throw new ListConnectorsError(
        'CONNECTORS_FETCH_FAILED',
        'Failed to fetch connectors list',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Aplica filtros adicionales del lado cliente
   */
  private applyClientSideFilters(
    response: ConnectorListResponseDTO,
    request: ListConnectorsRequest
  ): ConnectorListResponseDTO {
    let filteredConnectors = [...response.connectors]

    // Filtro por método de pago
    if (request.payment_method) {
      filteredConnectors = filteredConnectors.filter(connector =>
        connector.payment_methods_enabled?.some(pm =>
          pm.payment_method === request.payment_method ||
          pm.payment_method_types?.some(pmt => pmt.payment_method_type === request.payment_method)
        )
      )
    }

    // Filtro por búsqueda de texto
    if (request.search) {
      const searchTerm = request.search.toLowerCase()
      filteredConnectors = filteredConnectors.filter(connector =>
        connector.connector_name.toLowerCase().includes(searchTerm) ||
        connector.connector_label?.toLowerCase().includes(searchTerm) ||
        connector.business_label?.toLowerCase().includes(searchTerm)
      )
    }

    // Filtros por fecha
    if (request.created_after) {
      const afterDate = new Date(request.created_after)
      filteredConnectors = filteredConnectors.filter(connector =>
        new Date(connector.created_at) >= afterDate
      )
    }

    if (request.created_before) {
      const beforeDate = new Date(request.created_before)
      filteredConnectors = filteredConnectors.filter(connector =>
        new Date(connector.created_at) <= beforeDate
      )
    }

    if (request.modified_after) {
      const afterDate = new Date(request.modified_after)
      filteredConnectors = filteredConnectors.filter(connector =>
        new Date(connector.modified_at) >= afterDate
      )
    }

    if (request.modified_before) {
      const beforeDate = new Date(request.modified_before)
      filteredConnectors = filteredConnectors.filter(connector =>
        new Date(connector.modified_at) <= beforeDate
      )
    }

    return {
      ...response,
      connectors: filteredConnectors,
      total_count: filteredConnectors.length,
    }
  }

  /**
   * Enriquece conectores con información adicional
   */
  private async enrichConnectorsData(
    response: ConnectorListResponseDTO,
    request: ListConnectorsRequest,
    context: Record<string, any>
  ): Promise<ConnectorListItem[]> {
    const enrichedConnectors: ConnectorListItem[] = []

    // Procesar conectores en lotes para evitar sobrecarga
    const batchSize = this.MAX_CONCURRENT_ENRICHMENT
    for (let i = 0; i < response.connectors.length; i += batchSize) {
      const batch = response.connectors.slice(i, i + batchSize)
      
      const batchPromises = batch.map(connector =>
        this.enrichSingleConnector(connector, request, context)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enrichedConnectors.push(result.value)
        } else {
          this.logger.warn('Failed to enrich connector', {
            ...context,
            connectorId: batch[index].merchant_connector_id,
            error: result.reason,
          })
          // Usar datos base si el enriquecimiento falla
          enrichedConnectors.push(this.convertToListItem(batch[index]))
        }
      })
    }

    return enrichedConnectors
  }

  /**
   * Enriquece un conector individual
   */
  private async enrichSingleConnector(
    connector: any,
    request: ListConnectorsRequest,
    context: Record<string, any>
  ): Promise<ConnectorListItem> {
    const baseItem = this.convertToListItem(connector)

    try {
      const enrichmentPromises: Promise<any>[] = []

      // Métricas
      if (request.include_metrics) {
        enrichmentPromises.push(this.fetchConnectorMetrics(connector.merchant_connector_id))
      }

      // Salud
      if (request.include_health) {
        enrichmentPromises.push(this.fetchConnectorHealth(connector.merchant_connector_id))
      }

      // Balance
      if (request.include_balance) {
        enrichmentPromises.push(this.fetchConnectorBalance(connector.merchant_connector_id))
      }

      if (enrichmentPromises.length === 0) {
        return baseItem
      }

      const results = await Promise.allSettled(enrichmentPromises)
      let enrichedItem = { ...baseItem }

      let resultIndex = 0
      if (request.include_metrics && results[resultIndex]) {
        if (results[resultIndex].status === 'fulfilled') {
          enrichedItem.metrics = (results[resultIndex] as PromiseFulfilledResult<any>).value
        }
        resultIndex++
      }

      if (request.include_health && results[resultIndex]) {
        if (results[resultIndex].status === 'fulfilled') {
          enrichedItem.health = (results[resultIndex] as PromiseFulfilledResult<any>).value
        }
        resultIndex++
      }

      if (request.include_balance && results[resultIndex]) {
        if (results[resultIndex].status === 'fulfilled') {
          enrichedItem.balance = (results[resultIndex] as PromiseFulfilledResult<any>).value
        }
      }

      return enrichedItem

    } catch (error) {
      this.logger.warn('Enrichment failed for connector', {
        ...context,
        connectorId: connector.merchant_connector_id,
        error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error),
      })
      return baseItem
    }
  }

  /**
   * Convierte conector base a item de lista
   */
  private convertToListItem(connector: any): ConnectorListItem {
    return {
      merchant_connector_id: connector.merchant_connector_id,
      connector_name: connector.connector_name,
      connector_label: connector.connector_label,
      connector_type: connector.connector_type,
      status: connector.status,
      disabled: connector.disabled,
      test_mode: connector.test_mode,
      business_country: connector.business_country,
      business_label: connector.business_label,
      supported_payment_methods: this.extractPaymentMethods(connector),
      supported_currencies: this.extractCurrencies(connector),
      supported_countries: this.extractCountries(connector),
      created_at: connector.created_at,
      modified_at: connector.modified_at,
      webhook_enabled: !!connector.connector_webhook_details,
      frm_enabled: !!connector.frm_configs?.length,
    }
  }

  /**
   * Extrae métodos de pago del conector
   */
  private extractPaymentMethods(connector: any): string[] {
    if (!connector.payment_methods_enabled) return []
    
    return connector.payment_methods_enabled.map((pm: any) => pm.payment_method)
  }

  /**
   * Extrae monedas soportadas del conector
   */
  private extractCurrencies(connector: any): string[] {
    const currencies = new Set<string>()
    
    connector.payment_methods_enabled?.forEach((pm: any) => {
      pm.payment_method_types?.forEach((pmt: any) => {
        Object.keys(pmt.accepted_currencies || {}).forEach(currency => {
          currencies.add(currency)
        })
      })
    })
    
    return Array.from(currencies)
  }

  /**
   * Extrae países soportados del conector
   */
  private extractCountries(connector: any): string[] {
    const countries = new Set<string>()
    
    connector.payment_methods_enabled?.forEach((pm: any) => {
      pm.payment_method_types?.forEach((pmt: any) => {
        Object.keys(pmt.accepted_countries || {}).forEach(country => {
          countries.add(country)
        })
      })
    })
    
    return Array.from(countries)
  }

  /**
   * Obtiene métricas del conector (mock)
   */
  private async fetchConnectorMetrics(connectorId: string): Promise<ConnectorMetricsSummary> {
    // En implementación real, obtener desde servicio de métricas
    return {
      merchant_connector_id: connectorId,
      total_payments_24h: Math.floor(Math.random() * 1000),
      successful_payments_24h: Math.floor(Math.random() * 900),
      total_volume_24h: Math.floor(Math.random() * 100000),
      success_rate_24h: 95 + Math.random() * 5,
      average_response_time: 200 + Math.random() * 300,
      uptime_percentage: 99 + Math.random(),
      error_rate_24h: Math.random() * 2,
    }
  }

  /**
   * Obtiene salud del conector (mock)
   */
  private async fetchConnectorHealth(connectorId: string): Promise<ConnectorHealthSummary> {
    const statuses = ['healthy', 'degraded', 'down'] as const
    return {
      merchant_connector_id: connectorId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      last_check_at: new Date().toISOString(),
      response_time_ms: 100 + Math.random() * 500,
      uptime_24h: 95 + Math.random() * 5,
      availability_status: 'available',
    }
  }

  /**
   * Obtiene balance del conector (mock)
   */
  private async fetchConnectorBalance(connectorId: string): Promise<ConnectorBalanceSummary> {
    return {
      merchant_connector_id: connectorId,
      primary_currency: 'USD',
      available_balance: Math.floor(Math.random() * 100000),
      total_balance: Math.floor(Math.random() * 150000),
      currency_count: 1 + Math.floor(Math.random() * 5),
      last_updated: new Date().toISOString(),
      status: 'active',
    }
  }

  /**
   * Aplica paginación y ordenamiento final
   */
  private applyPaginationAndSorting(
    connectors: ConnectorListItem[],
    request: ListConnectorsRequest
  ): ConnectorListItem[] {
    // Ordenamiento
    const sortedConnectors = this.sortConnectors(connectors, request.sort_by, request.sort_order)
    
    // Paginación
    const start = request.offset
    const end = start + request.limit
    
    return sortedConnectors.slice(start, end)
  }

  /**
   * Ordena conectores según criterio especificado
   */
  private sortConnectors(
    connectors: ConnectorListItem[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): ConnectorListItem[] {
    return connectors.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'modified_at':
          comparison = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime()
          break
        case 'connector_name':
          comparison = a.connector_name.localeCompare(b.connector_name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  /**
   * Construye respuesta estructurada final
   */
  private buildStructuredResponse(
    connectors: ConnectorListItem[],
    request: ListConnectorsRequest
  ): ListConnectorsResponse {
    const totalCount = connectors.length
    const hasMore = request.offset + request.limit < totalCount
    
    // Calcular resumen
    const summary = this.calculateSummary(connectors)
    
    const now = new Date()
    const cacheExpiresAt = new Date(now.getTime() + this.LIST_TTL * 1000)

    return {
      connectors,
      pagination: {
        total_count: totalCount,
        limit: request.limit,
        offset: request.offset,
        has_more: hasMore,
        next_offset: hasMore ? request.offset + request.limit : undefined,
        previous_offset: request.offset > 0 ? Math.max(0, request.offset - request.limit) : undefined,
      },
      filters_applied: this.sanitizeFilters(request),
      sort_applied: {
        sort_by: request.sort_by,
        sort_order: request.sort_order,
      },
      summary,
      last_updated: now.toISOString(),
      cache_expires_at: cacheExpiresAt.toISOString(),
    }
  }

  /**
   * Calcula resumen estadístico
   */
  private calculateSummary(connectors: ConnectorListItem[]) {
    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const byCountry: Record<string, number> = {}

    let activeCount = 0
    let inactiveCount = 0
    let testCount = 0

    connectors.forEach(connector => {
      // Por tipo
      byType[connector.connector_type] = (byType[connector.connector_type] || 0) + 1
      
      // Por estado
      byStatus[connector.status] = (byStatus[connector.status] || 0) + 1
      
      // Por país
      byCountry[connector.business_country] = (byCountry[connector.business_country] || 0) + 1
      
      // Contadores específicos
      if (connector.status === 'active') activeCount++
      else if (connector.status === 'inactive') inactiveCount++
      
      if (connector.test_mode) testCount++
    })

    return {
      total_connectors: connectors.length,
      active_connectors: activeCount,
      inactive_connectors: inactiveCount,
      test_connectors: testCount,
      by_type: byType,
      by_status: byStatus,
      by_country: byCountry,
    }
  }

  /**
   * Guarda respuesta en cache
   */
  private async cacheResponse(
    response: ListConnectorsResponse,
    request: ListConnectorsRequest
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(request)
    
    await this.cache.set(cacheKey, response, {
      ttl: this.LIST_TTL,
      tags: ['connectors', 'list', request.merchant_id],
    })
  }

  /**
   * Registra métricas de la operación
   */
  private async recordMetrics(
    response: ListConnectorsResponse,
    responseTime: number,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('connectors.list_retrieved', {
        merchantId: context.merchantId,
        connectorCount: response.connectors.length,
        totalCount: response.pagination.total_count,
        summary: response.summary,
        responseTime,
        timestamp: new Date().toISOString(),
      }, {
        priority: 'low',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (error) {
      this.logger.warn('Failed to record list metrics', {
        ...context,
        error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error),
      })
    }
  }

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    response: ListConnectorsResponse,
    metadata: { cached: boolean; responseTime: number; queryComplexity: 'simple' | 'moderate' | 'complex' }
  ): ListConnectorsResult {
    return {
      success: true,
      data: response,
      metadata,
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: ListConnectorsRequest,
    context: Record<string, any>,
    responseTime: number
  ): Promise<ListConnectorsResult> {
    // Emitir evento de error
    await this.emitErrorEvent(request, error, context)

    // Log del error
    this.logger.error('Connectors listing failed', error, {
      ...context,
      errorCode: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      responseTime,
    })

    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      }
    }
  }

  /**
   * Emite evento de error
   */
  private async emitErrorEvent(
    request: ListConnectorsRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('connectors.list_error', {
        merchantId: request.merchant_id,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        filters: this.sanitizeFilters(request),
        timestamp: new Date().toISOString(),
      }, {
        priority: 'high',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (eventError) {
      this.logger.warn('Failed to emit list error event', {
        ...context,
        error: typeof eventError === 'object' && eventError !== null && 'message' in eventError ? (eventError as any).message : String(eventError),
      })
    }
  }

  /**
   * Sanitiza filtros para logging
   */
  private sanitizeFilters(request: ListConnectorsRequest): Record<string, any> {
    return {
      connector_type: request.connector_type,
      status: request.status,
      business_country: request.business_country,
      test_mode: request.test_mode,
      disabled: request.disabled,
      search: request.search ? '***' : undefined,
      include_metrics: request.include_metrics,
      include_health: request.include_health,
      include_balance: request.include_balance,
      pagination: {
        limit: request.limit,
        offset: request.offset,
      },
      sort: {
        sort_by: request.sort_by,
        sort_order: request.sort_order,
      },
    }
  }

  /**
   * Construye clave de cache
   */
  private buildCacheKey(request: ListConnectorsRequest): string {
    const parts = [
      this.CACHE_PREFIX,
      request.merchant_id,
      request.profile_id || 'default',
      request.connector_type || 'all',
      request.status || 'all',
      request.business_country || 'all',
      request.test_mode || 'all',
      request.disabled || 'all',
      request.limit,
      request.offset,
      request.sort_by,
      request.sort_order,
    ]
    
    return parts.join(':')
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `list_connectors_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createListConnectors(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): ListConnectors {
  return new ListConnectors(httpClient, cache, logger, eventBus)
}

export default ListConnectors