// src/application/use-cases/connectors/GetConnectorBalance.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: Get Connector Balance - Obtiene balance de fondos de un conector específico
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'

/**
 * Schema de validación para el request
 */
export const GetConnectorBalanceRequestSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  merchant_connector_id: z.string().min(1, 'Merchant connector ID is required'),
  connector_name: z.string().optional(),
  profile_id: z.string().optional(),
  currency: z.string().length(3).optional(),
  include_pending: z.boolean().default(true),
  include_reserves: z.boolean().default(true),
  include_fees: z.boolean().default(false),
  real_time: z.boolean().default(false),
})

/**
 * Schema para balance individual por moneda
 */
export const CurrencyBalanceSchema = z.object({
  currency: z.string(),
  available_balance: z.number(),
  pending_balance: z.number(),
  reserved_balance: z.number(),
  total_balance: z.number(),
  last_transaction_date: z.string().optional(),
  minimum_balance: z.number().optional(),
  credit_limit: z.number().optional(),
  holds_amount: z.number().optional(),
})

/**
 * Schema para información de payout
 */
export const PayoutInfoSchema = z.object({
  next_payout_date: z.string().optional(),
  next_payout_amount: z.number().optional(),
  payout_frequency: z.enum(['daily', 'weekly', 'monthly', 'on_demand']),
  payout_delay_days: z.number(),
  minimum_payout_amount: z.number().optional(),
  auto_payout_enabled: z.boolean(),
  last_payout_date: z.string().optional(),
  last_payout_amount: z.number().optional(),
})

/**
 * Schema para información de fees
 */
export const FeeInfoSchema = z.object({
  processing_fees: z.number(),
  platform_fees: z.number(),
  chargeback_fees: z.number(),
  dispute_fees: z.number(),
  refund_fees: z.number(),
  monthly_fees: z.number().optional(),
  setup_fees: z.number().optional(),
  fee_structure: z.object({
    percentage_fee: z.number().optional(),
    fixed_fee: z.number().optional(),
    tiered_fees: z.array(z.object({
      min_amount: z.number(),
      max_amount: z.number(),
      percentage: z.number(),
      fixed: z.number().optional(),
    })).optional(),
  }).optional(),
})

/**
 * Schema principal para respuesta de balance
 */
export const ConnectorBalanceResponseSchema = z.object({
  merchant_id: z.string(),
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  profile_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'error']),
  balances: z.array(CurrencyBalanceSchema),
  payout_info: PayoutInfoSchema.optional(),
  fee_info: FeeInfoSchema.optional(),
  account_info: z.object({
    account_id: z.string().optional(),
    account_status: z.string().optional(),
    account_type: z.string().optional(),
    country: z.string().optional(),
    business_type: z.string().optional(),
  }).optional(),
  limits: z.object({
    daily_processing_limit: z.number().optional(),
    monthly_processing_limit: z.number().optional(),
    per_transaction_limit: z.number().optional(),
    daily_payout_limit: z.number().optional(),
  }).optional(),
  last_updated: z.string(),
  data_freshness: z.enum(['real_time', 'cached', 'stale']),
  cache_expires_at: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type GetConnectorBalanceRequest = z.infer<typeof GetConnectorBalanceRequestSchema>
export type CurrencyBalance = z.infer<typeof CurrencyBalanceSchema>
export type PayoutInfo = z.infer<typeof PayoutInfoSchema>
export type FeeInfo = z.infer<typeof FeeInfoSchema>
export type ConnectorBalanceResponse = z.infer<typeof ConnectorBalanceResponseSchema>

/**
 * Resultado del use case
 */
export interface GetConnectorBalanceResult {
  success: boolean
  data?: ConnectorBalanceResponse
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata?: {
    cached: boolean
    responseTime: number
    dataAge: number
  }
}

/**
 * Errores específicos de balance
 */
export class ConnectorBalanceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ConnectorBalanceError'
  }

  static connectorNotFound(connectorId: string): ConnectorBalanceError {
    return new ConnectorBalanceError(
      'CONNECTOR_NOT_FOUND',
      `Connector ${connectorId} not found`,
      404,
      { connectorId }
    )
  }

  static balanceUnavailable(connectorId: string, reason?: string): ConnectorBalanceError {
    return new ConnectorBalanceError(
      'BALANCE_UNAVAILABLE',
      `Balance information unavailable for connector ${connectorId}${reason ? `: ${reason}` : ''}`,
      503,
      { connectorId, reason }
    )
  }

  static connectorSuspended(connectorId: string): ConnectorBalanceError {
    return new ConnectorBalanceError(
      'CONNECTOR_SUSPENDED',
      `Connector ${connectorId} is suspended`,
      403,
      { connectorId }
    )
  }

  static insufficientPermissions(): ConnectorBalanceError {
    return new ConnectorBalanceError(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions to view balance information',
      403
    )
  }

  static rateLimitExceeded(): ConnectorBalanceError {
    return new ConnectorBalanceError(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded for balance queries',
      429
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: Get Connector Balance
 * 
 * Obtiene información detallada del balance de fondos de un conector,
 * incluyendo balances por moneda, información de payouts y fees.
 */
export class GetConnectorBalance {
  private readonly CACHE_PREFIX = 'connector:balance'
  private readonly BALANCE_TTL = 300 // 5 minutos
  private readonly REAL_TIME_TTL = 30 // 30 segundos para real-time
  private readonly RATE_LIMIT_KEY = 'connector:balance:rate_limit'

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta la obtención del balance del conector
   */
  async execute(request: GetConnectorBalanceRequest): Promise<GetConnectorBalanceResult> {
    const startTime = Date.now()
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      connectorId: request.merchant_connector_id,
      component: 'GetConnectorBalance',
    }

    this.logger.info('Starting connector balance retrieval', context)

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Verificar rate limiting
      await this.checkRateLimit(validatedRequest.merchant_id, validatedRequest.merchant_connector_id)
      
      // 3. Verificar cache si no es real-time
      let cachedBalance: ConnectorBalanceResponse | null = null
      if (!validatedRequest.real_time) {
        cachedBalance = await this.getCachedBalance(validatedRequest)
        if (cachedBalance && this.isCacheValid(cachedBalance)) {
          this.logger.debug('Returning cached balance', context)
          return this.buildSuccessResponse(
            cachedBalance,
            { cached: true, responseTime: Date.now() - startTime, dataAge: this.calculateDataAge(cachedBalance) }
          )
        }
      }
      
      // 4. Obtener balance desde Hyperswitch
      const balanceResponse = await this.fetchBalanceFromHyperswitch(validatedRequest, context)
      
      // 5. Enriquecer con información adicional
      const enrichedResponse = await this.enrichBalanceData(balanceResponse, validatedRequest, context)
      
      // 6. Validar y procesar respuesta
      const processedResponse = this.processBalanceResponse(enrichedResponse, validatedRequest)
      
      // 7. Guardar en cache
      await this.cacheBalance(processedResponse, validatedRequest)
      
      // 8. Emitir eventos de alertas si es necesario
      await this.checkAndEmitAlerts(processedResponse, context)
      
      // 9. Registrar métricas
      await this.recordMetrics(processedResponse, Date.now() - startTime, context)
      
      this.logger.info('Connector balance retrieval completed', {
        ...context,
        currencies: processedResponse.balances.length,
        status: processedResponse.status,
      })
      
      return this.buildSuccessResponse(
        processedResponse,
        { cached: false, responseTime: Date.now() - startTime, dataAge: 0 }
      )

    } catch (error) {
      return this.handleError(error, request, context, Date.now() - startTime)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: GetConnectorBalanceRequest): GetConnectorBalanceRequest {
    try {
      return GetConnectorBalanceRequestSchema.parse(request)
    } catch (error) {
      throw new ConnectorBalanceError(
        'INVALID_REQUEST',
        'Invalid balance request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Verifica rate limiting
   */
  private async checkRateLimit(merchantId: string, connectorId: string): Promise<void> {
    const rateLimitKey = `${this.RATE_LIMIT_KEY}:${merchantId}:${connectorId}`
    const currentCount = await this.cache.get<number>(rateLimitKey) || 0
    
    const maxRequests = 100 // 100 requests per hour
    const windowMs = 3600 // 1 hour
    
    if (currentCount >= maxRequests) {
      throw ConnectorBalanceError.rateLimitExceeded()
    }
    
    await this.cache.increment(rateLimitKey, 1, { ttl: windowMs })
  }

  /**
   * Obtiene balance del cache
   */
  private async getCachedBalance(
    request: GetConnectorBalanceRequest
  ): Promise<ConnectorBalanceResponse | null> {
    const cacheKey = this.buildCacheKey(request)
    return await this.cache.get<ConnectorBalanceResponse>(cacheKey)
  }

  /**
   * Verifica si el cache sigue siendo válido
   */
  private isCacheValid(balance: ConnectorBalanceResponse): boolean {
    if (!balance.cache_expires_at) return false
    
    const expiresAt = new Date(balance.cache_expires_at)
    return expiresAt > new Date()
  }

  /**
   * Obtiene balance desde Hyperswitch
   */
  private async fetchBalanceFromHyperswitch(
    request: GetConnectorBalanceRequest,
    context: Record<string, any>
  ): Promise<ConnectorBalanceResponse> {
    try {
      const queryParams: Record<string, any> = {}
      if (request.currency) queryParams.currency = request.currency
      if (request.include_pending !== undefined) queryParams.include_pending = request.include_pending
      if (request.include_reserves !== undefined) queryParams.include_reserves = request.include_reserves
      if (request.include_fees !== undefined) queryParams.include_fees = request.include_fees

      const response = await this.httpClient.get<ConnectorBalanceResponse>(
        `/connectors/${request.merchant_connector_id}/balance`,
        {
          params: queryParams,
          headers: {
            'X-Correlation-ID': context.correlationId,
          },
          timeout: 15000,
        }
      )

      return ConnectorBalanceResponseSchema.parse(response.data)

    } catch (error: any) {
      if (error.status === 404) {
        throw ConnectorBalanceError.connectorNotFound(request.merchant_connector_id)
      } else if (error.status === 403) {
        throw ConnectorBalanceError.insufficientPermissions()
      } else if (error.status === 503) {
        throw ConnectorBalanceError.balanceUnavailable(
          request.merchant_connector_id,
          'Service temporarily unavailable'
        )
      }

      throw new ConnectorBalanceError(
        'BALANCE_FETCH_FAILED',
        'Failed to fetch balance information',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Enriquece los datos de balance con información adicional
   */
  private async enrichBalanceData(
    baseResponse: ConnectorBalanceResponse,
    request: GetConnectorBalanceRequest,
    context: Record<string, any>
  ): Promise<ConnectorBalanceResponse> {
    try {
      // Obtener información adicional del conector si no está presente
      if (!baseResponse.connector_name && request.connector_name) {
        baseResponse.connector_name = request.connector_name
      }

      // Calcular totales agregados si hay múltiples monedas
      baseResponse.balances = baseResponse.balances.map(balance => ({
        ...balance,
        total_balance: balance.available_balance + balance.pending_balance + balance.reserved_balance
      }))

      return baseResponse

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.warn('Failed to enrich balance data', { ...context, error: errorMessage })
      return baseResponse
    }
  }

  /**
   * Procesa y valida la respuesta de balance
   */
  private processBalanceResponse(
    response: ConnectorBalanceResponse,
    request: GetConnectorBalanceRequest
  ): ConnectorBalanceResponse {
    const now = new Date()
    const ttl = request.real_time ? this.REAL_TIME_TTL : this.BALANCE_TTL
    const cacheExpiresAt = new Date(now.getTime() + ttl * 1000)

    // Determinar frescura de los datos
    const dataFreshness: 'real_time' | 'cached' | 'stale' = 
      request.real_time ? 'real_time' : 
      response.data_freshness || 'cached'

    // Identificar warnings basados en los datos
    const warnings: string[] = []
    
    response.balances.forEach(balance => {
      if (balance.available_balance < 0) {
        warnings.push(`Negative balance detected for ${balance.currency}`)
      }
      if (balance.minimum_balance && balance.available_balance < balance.minimum_balance) {
        warnings.push(`Balance below minimum for ${balance.currency}`)
      }
    })

    return {
      ...response,
      last_updated: now.toISOString(),
      data_freshness: dataFreshness,
      cache_expires_at: cacheExpiresAt.toISOString(),
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Guarda balance en cache
   */
  private async cacheBalance(
    balance: ConnectorBalanceResponse,
    request: GetConnectorBalanceRequest
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(request)
    const ttl = request.real_time ? this.REAL_TIME_TTL : this.BALANCE_TTL
    
    await this.cache.set(cacheKey, balance, {
      ttl,
      tags: ['connector', 'balance', request.merchant_id, request.merchant_connector_id],
    })
  }

  /**
   * Verifica y emite alertas si es necesario
   */
  private async checkAndEmitAlerts(
    balance: ConnectorBalanceResponse,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const alerts: Array<{ type: string; message: string; severity: string }> = []

      // Verificar balances negativos
      balance.balances.forEach(currencyBalance => {
        if (currencyBalance.available_balance < 0) {
          alerts.push({
            type: 'negative_balance',
            message: `Negative balance detected: ${currencyBalance.currency}`,
            severity: 'high'
          })
        }

        // Verificar balances bajos
        if (currencyBalance.minimum_balance && 
            currencyBalance.available_balance < currencyBalance.minimum_balance) {
          alerts.push({
            type: 'low_balance',
            message: `Low balance warning: ${currencyBalance.currency}`,
            severity: 'medium'
          })
        }
      })

      // Verificar estado del conector
      if (balance.status === 'suspended') {
        alerts.push({
          type: 'connector_suspended',
          message: 'Connector is suspended',
          severity: 'critical'
        })
      }

      // Emitir alertas
      for (const alert of alerts) {
        await this.eventBus.publish('connector.balance_alert', {
          merchantId: balance.merchant_id,
          connectorId: balance.merchant_connector_id,
          connectorName: balance.connector_name,
          alertType: alert.type,
          message: alert.message,
          severity: alert.severity,
          balanceData: balance.balances,
          timestamp: new Date().toISOString(),
        }, {
          priority: alert.severity === 'critical' ? 'critical' : 'high',
          headers: {
            'X-Correlation-ID': context.correlationId,
          }
        })
      }

    } catch (error) {
      this.logger.warn('Failed to emit balance alerts', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Registra métricas de la operación
   */
  private async recordMetrics(
    balance: ConnectorBalanceResponse,
    responseTime: number,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('connector.balance_retrieved', {
        merchantId: balance.merchant_id,
        connectorId: balance.merchant_connector_id,
        connectorName: balance.connector_name,
        currencyCount: balance.balances.length,
        status: balance.status,
        dataFreshness: balance.data_freshness,
        responseTime,
        timestamp: new Date().toISOString(),
      }, {
        priority: 'low',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (error) {
      this.logger.warn('Failed to record balance metrics', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Calcula la edad de los datos en cache
   */
  private calculateDataAge(balance: ConnectorBalanceResponse): number {
    const lastUpdated = new Date(balance.last_updated)
    return Date.now() - lastUpdated.getTime()
  }

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    balance: ConnectorBalanceResponse,
    metadata: { cached: boolean; responseTime: number; dataAge: number }
  ): GetConnectorBalanceResult {
    return {
      success: true,
      data: balance,
      metadata,
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: GetConnectorBalanceRequest,
    context: Record<string, any>,
    responseTime: number
  ): Promise<GetConnectorBalanceResult> {
    // Emitir evento de error
    await this.emitErrorEvent(request, error, context)

    // Log del error
    this.logger.error('Connector balance retrieval failed', error, {
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
    request: GetConnectorBalanceRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('connector.balance_error', {
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
      this.logger.warn('Failed to emit balance error event', {
        ...context,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      })
    }
  }

  /**
   * Construye clave de cache
   */
  private buildCacheKey(request: GetConnectorBalanceRequest): string {
    const parts = [
      this.CACHE_PREFIX,
      request.merchant_id,
      request.merchant_connector_id,
      request.currency || 'all',
      request.include_pending ? 'pending' : 'no_pending',
      request.include_reserves ? 'reserves' : 'no_reserves',
      request.include_fees ? 'fees' : 'no_fees',
    ]
    
    return parts.join(':')
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `balance_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createGetConnectorBalance(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): GetConnectorBalance {
  return new GetConnectorBalance(httpClient, cache, logger, eventBus)
}

export default GetConnectorBalance