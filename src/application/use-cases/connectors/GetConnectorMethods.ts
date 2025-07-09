// src/application/use-cases/connectors/GetConnectorMethods.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: Get Connector Methods - Obtiene métodos de pago disponibles por conector
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'

/**
 * Schema de validación para el request
 */
export const GetConnectorMethodsRequestSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  merchant_connector_id: z.string().min(1, 'Merchant connector ID is required'),
  profile_id: z.string().optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  amount: z.number().min(1).optional(),
  payment_experience: z.enum(['redirect_to_url', 'invoke_sdk_client', 'one_click', 'link_wallet']).optional(),
  business_label: z.string().optional(),
  include_disabled: z.boolean().default(false),
  include_test_methods: z.boolean().default(false),
  filter_by_capability: z.array(z.enum(['payments', 'refunds', 'disputes', 'recurring', 'installments'])).optional(),
})

/**
 * Schema para límites de método de pago
 */
export const PaymentMethodLimitsSchema = z.object({
  minimum_amount: z.number().optional(),
  maximum_amount: z.number().optional(),
  currency: z.string(),
  daily_limit: z.number().optional(),
  monthly_limit: z.number().optional(),
  per_transaction_limit: z.number().optional(),
})

/**
 * Schema para configuración de método de pago
 */
export const PaymentMethodConfigSchema = z.object({
  capture_method: z.array(z.enum(['automatic', 'manual'])).optional(),
  authentication_type: z.array(z.enum(['three_ds', 'no_three_ds'])).optional(),
  supported_flows: z.array(z.enum(['standard', 'one_click', 'redirect'])).optional(),
  webhook_source_verification_call: z.boolean().optional(),
  session_expiry: z.number().optional(), // in seconds
  setup_future_usage: z.array(z.enum(['on_session', 'off_session'])).optional(),
})

/**
 * Schema para tipo de método de pago
 */
export const PaymentMethodTypeSchema = z.object({
  payment_method_type: z.string(),
  payment_experience: z.array(z.enum(['redirect_to_url', 'invoke_sdk_client', 'one_click', 'link_wallet'])),
  card_networks: z.array(z.string()).optional(),
  accepted_currencies: z.record(PaymentMethodLimitsSchema),
  accepted_countries: z.record(PaymentMethodLimitsSchema),
  minimum_amount: z.number().optional(),
  maximum_amount: z.number().optional(),
  recurring_enabled: z.boolean(),
  installment_payment_enabled: z.boolean(),
  payment_method_config: PaymentMethodConfigSchema.optional(),
  surcharge_details: z.object({
    surcharge: z.number().optional(),
    tax_on_surcharge: z.number().optional(),
    surcharge_type: z.enum(['fixed', 'rate']).optional(),
    display_surcharge_amount: z.boolean().optional(),
  }).optional(),
})

/**
 * Schema para método de pago principal
 */
export const PaymentMethodSchema = z.object({
  payment_method: z.string(),
  payment_method_types: z.array(PaymentMethodTypeSchema),
  supported_countries: z.array(z.string()),
  supported_currencies: z.array(z.string()),
  is_enabled: z.boolean(),
  is_test_mode: z.boolean().optional(),
  capabilities: z.array(z.enum(['payments', 'refunds', 'disputes', 'recurring', 'installments', 'payouts'])),
  provider_specific_config: z.record(z.any()).optional(),
})

/**
 * Schema principal para respuesta de métodos
 */
export const ConnectorMethodsResponseSchema = z.object({
  merchant_id: z.string(),
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  profile_id: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  business_country: z.string(),
  business_label: z.string(),
  payment_methods: z.array(PaymentMethodSchema),
  connector_status: z.enum(['active', 'inactive', 'integration_test']),
  test_mode: z.boolean(),
  connector_metadata: z.object({
    connector_type: z.enum(['payment_processor', 'payment_vault', 'authentication_processor']),
    connector_label: z.string().optional(),
    version: z.string().optional(),
    supported_webhooks: z.array(z.string()).optional(),
    webhook_version: z.string().optional(),
    frm_configs: z.array(z.object({
      gateway: z.string(),
      payment_methods: z.array(z.string()),
    })).optional(),
  }).optional(),
  routing_algorithm: z.object({
    type: z.enum(['single', 'priority', 'volume_split', 'advanced']),
    priority: z.number().optional(),
    percentage: z.number().optional(),
  }).optional(),
  last_updated: z.string(),
  cache_expires_at: z.string().optional(),
  warnings: z.array(z.string()).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type GetConnectorMethodsRequest = z.infer<typeof GetConnectorMethodsRequestSchema>
export type PaymentMethodLimits = z.infer<typeof PaymentMethodLimitsSchema>
export type PaymentMethodConfig = z.infer<typeof PaymentMethodConfigSchema>
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type ConnectorMethodsResponse = z.infer<typeof ConnectorMethodsResponseSchema>

/**
 * Resultado del use case
 */
export interface GetConnectorMethodsResult {
  success: boolean
  data?: ConnectorMethodsResponse
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata?: {
    cached: boolean
    responseTime: number
    methodCount: number
    enabledMethodCount: number
  }
}

/**
 * Errores específicos de métodos de conector
 */
export class ConnectorMethodsError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ConnectorMethodsError'
  }

  static connectorNotFound(connectorId: string): ConnectorMethodsError {
    return new ConnectorMethodsError(
      'CONNECTOR_NOT_FOUND',
      `Connector ${connectorId} not found`,
      404,
      { connectorId }
    )
  }

  static methodsUnavailable(connectorId: string, reason?: string): ConnectorMethodsError {
    return new ConnectorMethodsError(
      'METHODS_UNAVAILABLE',
      `Payment methods unavailable for connector ${connectorId}${reason ? `: ${reason}` : ''}`,
      503,
      { connectorId, reason }
    )
  }

  static invalidConfiguration(connectorId: string, details?: any): ConnectorMethodsError {
    return new ConnectorMethodsError(
      'INVALID_CONFIGURATION',
      `Invalid connector configuration for ${connectorId}`,
      422,
      { connectorId, ...details }
    )
  }

  static insufficientPermissions(): ConnectorMethodsError {
    return new ConnectorMethodsError(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions to view payment methods',
      403
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: Get Connector Methods
 * 
 * Obtiene los métodos de pago disponibles para un conector específico,
 * incluyendo configuraciones, límites y capacidades.
 */
export class GetConnectorMethods {
  private readonly CACHE_PREFIX = 'connector:methods'
  private readonly METHODS_TTL = 600 // 10 minutos
  private readonly ENRICHED_TTL = 300 // 5 minutos para datos enriquecidos

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta la obtención de métodos del conector
   */
  async execute(request: GetConnectorMethodsRequest): Promise<GetConnectorMethodsResult> {
    const startTime = Date.now()
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      connectorId: request.merchant_connector_id,
      component: 'GetConnectorMethods',
    }

    this.logger.info('Starting connector methods retrieval', context)

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Verificar cache
      const cachedMethods = await this.getCachedMethods(validatedRequest)
      if (cachedMethods && this.isCacheValid(cachedMethods)) {
        this.logger.debug('Returning cached methods', context)
        return this.buildSuccessResponse(
          cachedMethods,
          { cached: true, responseTime: Date.now() - startTime }
        )
      }
      
      // 3. Obtener métodos desde Hyperswitch
      const methodsResponse = await this.fetchMethodsFromHyperswitch(validatedRequest, context)
      
      // 4. Filtrar métodos según criterios
      const filteredResponse = this.filterMethods(methodsResponse, validatedRequest)
      
      // 5. Enriquecer con información adicional
      const enrichedResponse = await this.enrichMethodsData(filteredResponse, validatedRequest, context)
      
      // 6. Validar y procesar respuesta
      const processedResponse = this.processMethodsResponse(enrichedResponse, validatedRequest)
      
      // 7. Guardar en cache
      await this.cacheMethods(processedResponse, validatedRequest)
      
      // 8. Registrar métricas
      await this.recordMetrics(processedResponse, Date.now() - startTime, context)
      
      this.logger.info('Connector methods retrieval completed', {
        ...context,
        methodCount: processedResponse.payment_methods.length,
        enabledCount: processedResponse.payment_methods.filter(m => m.is_enabled).length,
      })
      
      return this.buildSuccessResponse(
        processedResponse,
        { cached: false, responseTime: Date.now() - startTime }
      )

    } catch (error) {
      return this.handleError(error, request, context, Date.now() - startTime)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: GetConnectorMethodsRequest): GetConnectorMethodsRequest {
    try {
      return GetConnectorMethodsRequestSchema.parse(request)
    } catch (error) {
      throw new ConnectorMethodsError(
        'INVALID_REQUEST',
        'Invalid methods request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Obtiene métodos del cache
   */
  private async getCachedMethods(
    request: GetConnectorMethodsRequest
  ): Promise<ConnectorMethodsResponse | null> {
    const cacheKey = this.buildCacheKey(request)
    return await this.cache.get<ConnectorMethodsResponse>(cacheKey)
  }

  /**
   * Verifica si el cache sigue siendo válido
   */
  private isCacheValid(methods: ConnectorMethodsResponse): boolean {
    if (!methods.cache_expires_at) return false
    
    const expiresAt = new Date(methods.cache_expires_at)
    return expiresAt > new Date()
  }

  /**
   * Obtiene métodos desde Hyperswitch
   */
  private async fetchMethodsFromHyperswitch(
    request: GetConnectorMethodsRequest,
    context: Record<string, any>
  ): Promise<ConnectorMethodsResponse> {
    try {
      const queryParams: Record<string, any> = {}
      if (request.country) queryParams.country = request.country
      if (request.currency) queryParams.currency = request.currency
      if (request.amount) queryParams.amount = request.amount
      if (request.payment_experience) queryParams.payment_experience = request.payment_experience
      if (request.business_label) queryParams.business_label = request.business_label

      const response = await this.httpClient.get<ConnectorMethodsResponse>(
        `/account/${request.merchant_id}/connectors/${request.merchant_connector_id}/payment_methods`,
        {
          params: queryParams,
          headers: {
            'X-Correlation-ID': context.correlationId,
          },
          timeout: 15000,
        }
      )

      return ConnectorMethodsResponseSchema.parse(response.data)

    } catch (error: any) {
      if (error.status === 404) {
        throw ConnectorMethodsError.connectorNotFound(request.merchant_connector_id)
      } else if (error.status === 403) {
        throw ConnectorMethodsError.insufficientPermissions()
      } else if (error.status === 422) {
        throw ConnectorMethodsError.invalidConfiguration(
          request.merchant_connector_id,
          { originalError: error.message }
        )
      } else if (error.status >= 500) {
        throw ConnectorMethodsError.methodsUnavailable(
          request.merchant_connector_id,
          'Service temporarily unavailable'
        )
      }

      throw new ConnectorMethodsError(
        'METHODS_FETCH_FAILED',
        'Failed to fetch payment methods',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Filtra métodos según criterios del request
   */
  private filterMethods(
    response: ConnectorMethodsResponse,
    request: GetConnectorMethodsRequest
  ): ConnectorMethodsResponse {
    let filteredMethods = [...response.payment_methods]

    // Filtrar por estado habilitado
    if (!request.include_disabled) {
      filteredMethods = filteredMethods.filter(method => method.is_enabled)
    }

    // Filtrar métodos de test
    if (!request.include_test_methods) {
      filteredMethods = filteredMethods.filter(method => !method.is_test_mode)
    }

    // Filtrar por capacidades
    if (request.filter_by_capability?.length) {
      filteredMethods = filteredMethods.filter(method => 
        request.filter_by_capability!.some(capability => 
          method.capabilities.includes(capability)
        )
      )
    }

    // Filtrar por país si se especifica
    if (request.country) {
      filteredMethods = filteredMethods.filter(method => 
        method.supported_countries.includes(request.country!) ||
        method.supported_countries.includes('*') // Global support
      )
    }

    // Filtrar por moneda si se especifica
    if (request.currency) {
      filteredMethods = filteredMethods.filter(method => 
        method.supported_currencies.includes(request.currency!) ||
        method.supported_currencies.includes('*') // All currencies
      )
    }

    // Filtrar por monto si se especifica
    if (request.amount && request.currency) {
      filteredMethods = filteredMethods.filter(method => {
        return method.payment_method_types.some(type => {
          const currencyLimits = type.accepted_currencies[request.currency!]
          if (!currencyLimits) return false
          
          const minAmount = currencyLimits.minimum_amount || 0
          const maxAmount = currencyLimits.maximum_amount || Number.MAX_SAFE_INTEGER
          
          return request.amount! >= minAmount && request.amount! <= maxAmount
        })
      })
    }

    return {
      ...response,
      payment_methods: filteredMethods,
    }
  }

  /**
   * Enriquece los datos de métodos con información adicional
   */
  private async enrichMethodsData(
    response: ConnectorMethodsResponse,
    request: GetConnectorMethodsRequest,
    context: Record<string, any>
  ): Promise<ConnectorMethodsResponse> {
    try {
      // Ordenar métodos por prioridad y popularidad
      const sortedMethods = this.sortPaymentMethods(response.payment_methods)
      
      // Añadir warnings sobre configuraciones
      const warnings: string[] = []
      
      // Verificar métodos sin configuración de autenticación
      const methodsWithoutAuth = sortedMethods.filter(method => 
        method.payment_method_types.some(type => 
          !type.payment_method_config?.authentication_type
        )
      )
      
      if (methodsWithoutAuth.length > 0) {
        warnings.push(`${methodsWithoutAuth.length} payment methods without authentication configuration`)
      }

      // Verificar métodos con límites muy restrictivos
      const restrictiveMethods = sortedMethods.filter(method =>
        method.payment_method_types.some(type =>
          Object.values(type.accepted_currencies).some(limits =>
            limits.maximum_amount && limits.maximum_amount < 10000 // Less than $100
          )
        )
      )

      if (restrictiveMethods.length > 0) {
        warnings.push(`${restrictiveMethods.length} payment methods with restrictive limits`)
      }

      return {
        ...response,
        payment_methods: sortedMethods,
        warnings: warnings.length > 0 ? warnings : undefined,
      }

    } catch (error) {
      const errorMsg = (error && typeof error === 'object' && 'message' in error)
        ? (error as any).message
        : String(error)
      this.logger.warn('Failed to enrich methods data', { ...context, error: errorMsg })
      return response
    }
  }

  /**
   * Ordena métodos de pago por prioridad
   */
  private sortPaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
    const priorityOrder = [
      'card', 'wallet', 'bank_transfer', 'bank_debit', 
      'pay_later', 'crypto', 'voucher', 'gift_card'
    ]

    return methods.sort((a, b) => {
      // Primero por habilitado
      if (a.is_enabled !== b.is_enabled) {
        return a.is_enabled ? -1 : 1
      }

      // Luego por prioridad del tipo
      const aPriority = priorityOrder.indexOf(a.payment_method)
      const bPriority = priorityOrder.indexOf(b.payment_method)
      
      if (aPriority !== bPriority) {
        return aPriority === -1 ? 1 : bPriority === -1 ? -1 : aPriority - bPriority
      }

      // Finalmente por nombre
      return a.payment_method.localeCompare(b.payment_method)
    })
  }

  /**
   * Procesa y valida la respuesta de métodos
   */
  private processMethodsResponse(
    response: ConnectorMethodsResponse,
    request: GetConnectorMethodsRequest
  ): ConnectorMethodsResponse {
    const now = new Date()
    const cacheExpiresAt = new Date(now.getTime() + this.METHODS_TTL * 1000)

    return {
      ...response,
      last_updated: now.toISOString(),
      cache_expires_at: cacheExpiresAt.toISOString(),
    }
  }

  /**
   * Guarda métodos en cache
   */
  private async cacheMethods(
    methods: ConnectorMethodsResponse,
    request: GetConnectorMethodsRequest
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(request)
    
    await this.cache.set(cacheKey, methods, {
      ttl: this.METHODS_TTL,
      tags: ['connector', 'methods', request.merchant_id, request.merchant_connector_id],
    })
  }

/**
 * Registra métricas de la operación
 */
private async recordMetrics(
    methods: ConnectorMethodsResponse,
    responseTime: number,
    context: Record<string, any>
): Promise<void> {
    try {
        const enabledMethods = methods.payment_methods.filter(m => m.is_enabled)
        const capabilities = new Set<string>()
        
        methods.payment_methods.forEach(method => {
            method.capabilities.forEach(cap => capabilities.add(cap))
        })

        await this.eventBus.publish('connector.methods_retrieved', {
            merchantId: methods.merchant_id,
            connectorId: methods.merchant_connector_id,
            connectorName: methods.connector_name,
            totalMethods: methods.payment_methods.length,
            enabledMethods: enabledMethods.length,
            capabilities: Array.from(capabilities),
            connectorStatus: methods.connector_status,
            testMode: methods.test_mode,
            responseTime,
            timestamp: new Date().toISOString(),
        }, {
            priority: 'low',
            headers: {
                'X-Correlation-ID': context.correlationId,
            }
        })
    } catch (error: any) {
        this.logger.warn('Failed to record methods metrics', {
            ...context,
            error: error?.message ?? String(error),
        })
    }
}

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    methods: ConnectorMethodsResponse,
    metadata: { cached: boolean; responseTime: number }
  ): GetConnectorMethodsResult {
    const enabledMethods = methods.payment_methods.filter(m => m.is_enabled)

    return {
      success: true,
      data: methods,
      metadata: {
        ...metadata,
        methodCount: methods.payment_methods.length,
        enabledMethodCount: enabledMethods.length,
      },
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: GetConnectorMethodsRequest,
    context: Record<string, any>,
    responseTime: number
  ): Promise<GetConnectorMethodsResult> {
    // Emitir evento de error
    await this.emitErrorEvent(request, error, context)

    // Log del error
    this.logger.error('Connector methods retrieval failed', error, {
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
    request: GetConnectorMethodsRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('connector.methods_error', {
        merchantId: request.merchant_id,
        connectorId: request.merchant_connector_id,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
      }, {
        priority: 'high',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (eventError) {
      this.logger.warn('Failed to emit methods error event', {
        ...context,
        error: (eventError as Error)?.message ?? String(eventError),
      })
    }
  }

  /**
   * Construye clave de cache
   */
  private buildCacheKey(request: GetConnectorMethodsRequest): string {
    const parts = [
      this.CACHE_PREFIX,
      request.merchant_id,
      request.merchant_connector_id,
      request.country || 'global',
      request.currency || 'all',
      request.amount || 'no_amount',
      request.payment_experience || 'all',
      request.include_disabled ? 'with_disabled' : 'enabled_only',
      request.include_test_methods ? 'with_test' : 'live_only',
      request.filter_by_capability?.join(',') || 'all_caps',
    ]
    
    return parts.join(':')
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `methods_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createGetConnectorMethods(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): GetConnectorMethods {
  return new GetConnectorMethods(httpClient, cache, logger, eventBus)
}

export default GetConnectorMethods