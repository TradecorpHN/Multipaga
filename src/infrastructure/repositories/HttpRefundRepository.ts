// src/infrastructure/repositories/HttpRefundRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// Repositorio HTTP para gestión de reembolsos con Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'
import type { MemoryCache } from '../cache/MemoryCache'
import { CacheKeys } from '../cache/CacheKeys'
import { RefundEndpoints, type RefundCreateData, type RefundListParams, type RefundUpdateData } from '../api/endpoints/RefundEndpoints'

// Interfaces del dominio (basadas en Hyperswitch)
export interface RefundResponse {
  refund_id: string
  payment_id: string
  merchant_id: string
  connector_transaction_id: string
  connector: string
  connector_refund_id?: string
  external_reference_id?: string
  refund_type: 'instant' | 'regular'
  total_amount: number
  currency: string
  refund_amount: number
  refund_status: 'failure' | 'manual_review' | 'pending' | 'success'
  sent_to_gateway: boolean
  refund_reason?: string
  failure_reason?: string
  metadata?: Record<string, any>
  error_message?: string
  error_code?: string
  created_at: string
  updated_at: string
  description?: string
  attempt_id: string
  refund_arn?: string
  charges?: RefundCharges
  profile_id?: string
  merchant_connector_id?: string
}

export interface RefundCharges {
  charge_id?: string
  charge_type?: string
  application_fees?: ApplicationFee[]
  surcharge_details?: SurchargeDetails
  tax_details?: TaxDetails
}

export interface ApplicationFee {
  account_id: string
  fee_type: string
  fee_amount: number
}

export interface SurchargeDetails {
  original_amount?: number
  surcharge?: number
  tax_on_surcharge?: number
  surcharge_amount?: number
  total_tax_on_surcharge?: number
}

export interface TaxDetails {
  payment_method_type?: string
  charge_type?: string
  tax_rate?: number
  tax_amount?: number
}

export interface RefundListResponse {
  refunds: RefundResponse[]
  total_count: number
  has_more: boolean
}

export interface RefundStatistics {
  total_refunds: number
  successful_refunds: number
  failed_refunds: number
  pending_refunds: number
  total_amount: number
  average_amount: number
  success_rate: number
  refund_reasons: Record<string, number>
  refund_types: Record<string, number>
  connectors: Record<string, number>
  monthly_trend: Array<{
    month: string
    count: number
    amount: number
    success_rate: number
  }>
  processing_times: {
    average_instant: number // en minutos
    average_regular: number // en días
    percentiles: {
      p50: number
      p95: number
      p99: number
    }
  }
}

export interface RefundValidationResult {
  valid: boolean
  errors: string[]
  maxRefundable: number
  alreadyRefunded: number
}

// Schemas de validación
const RefundResponseSchema = z.object({
  refund_id: z.string(),
  payment_id: z.string(),
  merchant_id: z.string(),
  connector_transaction_id: z.string(),
  connector: z.string(),
  connector_refund_id: z.string().optional(),
  external_reference_id: z.string().optional(),
  refund_type: z.enum(['instant', 'regular']),
  total_amount: z.number(),
  currency: z.string(),
  refund_amount: z.number(),
  refund_status: z.enum(['failure', 'manual_review', 'pending', 'success']),
  sent_to_gateway: z.boolean(),
  refund_reason: z.string().optional(),
  failure_reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  error_message: z.string().optional(),
  error_code: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  description: z.string().optional(),
  attempt_id: z.string(),
  refund_arn: z.string().optional(),
  charges: z.any().optional(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
})

// Interfaz del repositorio
export interface IRefundRepository {
  create(request: RefundCreateData): Promise<RefundResponse>
  getById(refundId: string): Promise<RefundResponse | null>
  list(merchantId: string, profileId: string, params?: RefundListParams): Promise<RefundListResponse>
  update(refundId: string, request: RefundUpdateData): Promise<RefundResponse>
  sync(refundId: string): Promise<RefundResponse>
  getByPaymentId(paymentId: string): Promise<RefundResponse[]>
  getStatistics(merchantId: string, profileId: string, dateRange?: { from: string; to: string }): Promise<RefundStatistics>
  validateRefund(paymentId: string, amount?: number): Promise<RefundValidationResult>
  retry(refundId: string): Promise<RefundResponse>
}

// Configuración del repositorio
interface HttpRefundRepositoryConfig {
  baseUrl: string
  timeout: number
  retries: number
  enableCache: boolean
  enableLogging: boolean
}

// Implementación del repositorio HTTP
export class HttpRefundRepository implements IRefundRepository {
  private config: HttpRefundRepositoryConfig
  private logger: StructuredLogger
  private cache?: MemoryCache<any>

  constructor(
    config: HttpRefundRepositoryConfig,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ) {
    this.config = config
    this.logger = logger.child({ repository: 'HttpRefundRepository' })
    this.cache = cache
  }

  /**
   * Crea un nuevo reembolso
   */
  async create(request: RefundCreateData): Promise<RefundResponse> {
    const startTime = Date.now()
    this.logger.info('Creating refund', { 
      paymentId: request.payment_id,
      amount: request.amount,
      refundType: request.refund_type 
    })

    try {
      // Validar request
      const validatedRequest = RefundEndpoints.createRefund.validateBody(request)

      // Construir URL
      const url = RefundEndpoints.createRefund.buildUrl(this.config.baseUrl)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const refund = RefundResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.refund(refund.refund_id)
        await this.cache.set(cacheKey.key, refund, cacheKey.ttl)
      }

      // Invalidar caché de pagos relacionados
      if (this.cache) {
        await this.invalidatePaymentRefundsCache(refund.payment_id)
      }

      this.logger.info('Refund created successfully', {
        refundId: refund.refund_id,
        paymentId: refund.payment_id,
        status: refund.refund_status,
        amount: refund.refund_amount,
        refundType: refund.refund_type,
        duration: Date.now() - startTime,
      })

      return refund

    } catch (error) {
      this.logger.error('Failed to create refund', {
        paymentId: request.payment_id,
        amount: request.amount,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene un reembolso por ID
   */
  async getById(refundId: string): Promise<RefundResponse | null> {
    const startTime = Date.now()
    this.logger.debug('Getting refund by ID', { refundId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.refund(refundId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Refund found in cache', { refundId })
          return cached
        }
      }

      // Construir URL
      const url = RefundEndpoints.getRefund.buildUrl(this.config.baseUrl, refundId)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse>('GET', url)

      // Validar response
      const refund = RefundResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.refund(refundId)
        await this.cache.set(cacheKey.key, refund, cacheKey.ttl)
      }

      this.logger.debug('Refund retrieved successfully', {
        refundId,
        paymentId: refund.payment_id,
        status: refund.refund_status,
        amount: refund.refund_amount,
        duration: Date.now() - startTime,
      })

      return refund

    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.debug('Refund not found', { refundId })
        return null
      }

      this.logger.error('Failed to get refund', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Lista reembolsos con filtros
   */
async list(merchantId: string, profileId: string, params: RefundListParams = { offset: 0, limit: 20 }): Promise<RefundListResponse> {    const startTime = Date.now()
    this.logger.debug('Listing refunds', { merchantId, profileId, params })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.refundsList({ merchantId, profileId, ...params })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Refunds list found in cache', { merchantId, profileId })
          return cached
        }
      }

      // Construir URL
      const url = RefundEndpoints.listRefunds.buildUrl(this.config.baseUrl, params)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse[]>('GET', url, {
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Profile-Id': profileId,
        },
      })

      // Validar response
      const refunds = z.array(RefundResponseSchema).parse(response)

      const result: RefundListResponse = {
        refunds,
        total_count: refunds.length,
        has_more: refunds.length === (params.limit || 20),
      }

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.refundsList({ merchantId, profileId, ...params })
        await this.cache.set(cacheKey.key, result, cacheKey.ttl)

        // Cachear reembolsos individuales
        for (const refund of refunds) {
          const refundCacheKey = CacheKeys.refund(refund.refund_id)
          await this.cache.set(refundCacheKey.key, refund, refundCacheKey.ttl)
        }
      }

      this.logger.debug('Refunds listed successfully', {
        merchantId,
        profileId,
        count: refunds.length,
        duration: Date.now() - startTime,
      })

      return result

    } catch (error) {
      this.logger.error('Failed to list refunds', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Actualiza un reembolso
   */
  async update(refundId: string, request: RefundUpdateData): Promise<RefundResponse> {
    const startTime = Date.now()
    this.logger.info('Updating refund', { refundId })

    try {
      // Validar request
      const validatedRequest = RefundEndpoints.updateRefund.validateBody(request)

      // Construir URL
      const url = RefundEndpoints.updateRefund.buildUrl(this.config.baseUrl, refundId)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const refund = RefundResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateRefundCache(refundId)
        await this.invalidatePaymentRefundsCache(refund.payment_id)
      }

      this.logger.info('Refund updated successfully', {
        refundId,
        status: refund.refund_status,
        duration: Date.now() - startTime,
      })

      return refund

    } catch (error) {
      this.logger.error('Failed to update refund', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Sincroniza estado del reembolso con el procesador
   */
  async sync(refundId: string): Promise<RefundResponse> {
    const startTime = Date.now()
    this.logger.info('Syncing refund with processor', { refundId })

    try {
      // Construir URL
      const url = RefundEndpoints.syncRefund.buildUrl(this.config.baseUrl, refundId)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse>('GET', url)

      // Validar response
      const refund = RefundResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateRefundCache(refundId)
        await this.invalidatePaymentRefundsCache(refund.payment_id)
      }

      this.logger.info('Refund synced successfully', {
        refundId,
        status: refund.refund_status,
        duration: Date.now() - startTime,
      })

      return refund

    } catch (error) {
      this.logger.error('Failed to sync refund', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene reembolsos de un pago específico
   */
  async getByPaymentId(paymentId: string): Promise<RefundResponse[]> {
    const startTime = Date.now()
    this.logger.debug('Getting refunds by payment ID', { paymentId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentRefunds(paymentId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Payment refunds found in cache', { paymentId })
          return cached
        }
      }

      // Construir URL
      const url = RefundEndpoints.getPaymentRefunds.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse[]>('GET', url)

      // Validar response
      const refunds = z.array(RefundResponseSchema).parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentRefunds(paymentId)
        await this.cache.set(cacheKey.key, refunds, cacheKey.ttl)

        // Cachear reembolsos individuales
        for (const refund of refunds) {
          const refundCacheKey = CacheKeys.refund(refund.refund_id)
          await this.cache.set(refundCacheKey.key, refund, refundCacheKey.ttl)
        }
      }

      this.logger.debug('Payment refunds retrieved successfully', {
        paymentId,
        count: refunds.length,
        duration: Date.now() - startTime,
      })

      return refunds

    } catch (error) {
      this.logger.error('Failed to get payment refunds', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene estadísticas de reembolsos
   */
  async getStatistics(
    merchantId: string, 
    profileId: string, 
    dateRange?: { from: string; to: string }
  ): Promise<RefundStatistics> {
    const startTime = Date.now()
    this.logger.debug('Getting refund statistics', { merchantId, profileId, dateRange })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.refundsStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Refund statistics found in cache', { merchantId, profileId })
          return cached
        }
      }

      // Construir query parameters
      const queryParams = new URLSearchParams()
      if (dateRange) {
        queryParams.append('from', dateRange.from)
        queryParams.append('to', dateRange.to)
      }

      // Hacer petición HTTP
      const response = await this.makeRequest<RefundStatistics>('GET', `/refunds/statistics?${queryParams}`, {
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Profile-Id': profileId,
        },
      })

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.refundsStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        await this.cache.set(cacheKey.key, response, cacheKey.ttl)
      }

      this.logger.debug('Refund statistics retrieved successfully', {
        merchantId,
        profileId,
        totalRefunds: response.total_refunds,
        successRate: response.success_rate,
        duration: Date.now() - startTime,
      })

      return response

    } catch (error) {
      this.logger.error('Failed to get refund statistics', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Valida si se puede hacer un reembolso
   */
  async validateRefund(paymentId: string, amount?: number): Promise<RefundValidationResult> {
    const startTime = Date.now()
    this.logger.debug('Validating refund', { paymentId, amount })

    try {
      // Obtener reembolsos existentes del pago
      const existingRefunds = await this.getByPaymentId(paymentId)
      
      // Calcular total ya reembolsado
      const alreadyRefunded = existingRefunds
        .filter(r => r.refund_status === 'success')
        .reduce((sum, r) => sum + r.refund_amount, 0)

      // Para validación completa, necesitaríamos el pago original
      // Por simplicidad, asumimos que el amount es válido si se proporciona
      let maxRefundable = 0
      if (existingRefunds.length > 0) {
        maxRefundable = existingRefunds[0].total_amount - alreadyRefunded
      }

      const errors: string[] = []

      if (amount !== undefined) {
        if (amount <= 0) {
          errors.push('El monto del reembolso debe ser mayor a 0')
        }

        if (maxRefundable > 0 && amount > maxRefundable) {
          errors.push(`El monto excede el máximo reembolsable: ${maxRefundable}`)
        }
      }

      const result: RefundValidationResult = {
        valid: errors.length === 0,
        errors,
        maxRefundable,
        alreadyRefunded,
      }

      this.logger.debug('Refund validation completed', {
        paymentId,
        amount,
        valid: result.valid,
        maxRefundable: result.maxRefundable,
        alreadyRefunded: result.alreadyRefunded,
        duration: Date.now() - startTime,
      })

      return result

    } catch (error) {
      this.logger.error('Failed to validate refund', {
        paymentId,
        amount,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Reintenta un reembolso fallido
   */
  async retry(refundId: string): Promise<RefundResponse> {
    const startTime = Date.now()
    this.logger.info('Retrying refund', { refundId })

    try {
      // Hacer petición HTTP
      const response = await this.makeRequest<RefundResponse>('POST', `/refunds/${refundId}/retry`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const refund = RefundResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateRefundCache(refundId)
        await this.invalidatePaymentRefundsCache(refund.payment_id)
      }

      this.logger.info('Refund retry successful', {
        refundId,
        status: refund.refund_status,
        duration: Date.now() - startTime,
      })

      return refund

    } catch (error) {
      this.logger.error('Failed to retry refund', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    urlOrEndpoint: string,
    options: {
      body?: any
      headers?: Record<string, string>
      timeout?: number
    } = {}
  ): Promise<T> {
    const url = urlOrEndpoint.startsWith('http') ? urlOrEndpoint : `${this.config.baseUrl}${urlOrEndpoint}`
    const requestTimeout = options.timeout || this.config.timeout

    const requestInit: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    }

    if (options.body && (method === 'POST' || method === 'PUT')) {
      requestInit.body = JSON.stringify(options.body)
    }

    // Crear timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), requestTimeout)
    })

    try {
      const response = await Promise.race([
        fetch(url, requestInit),
        timeoutPromise
      ])

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).status = response.status
        ;(error as any).statusCode = response.status
        ;(error as any).response = errorData
        throw error
      }

      return await response.json() as T

    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        const timeoutError = new Error(`Request to ${urlOrEndpoint} timed out after ${requestTimeout}ms`)
        ;(timeoutError as any).code = 'TIMEOUT'
        throw timeoutError
      }
      throw error
    }
  }

  private isNotFoundError(error: any): boolean {
    return error?.status === 404 || error?.statusCode === 404
  }

  private async invalidateRefundCache(refundId?: string): Promise<void> {
    if (!this.cache) return

    try {
      // Invalidar reembolso específico si se proporciona
      if (refundId) {
        const refundCacheKey = CacheKeys.refund(refundId)
        await this.cache.delete(refundCacheKey.key)
      }

      // Invalidar listas y estadísticas usando patrón
      // En una implementación real, aquí se usaría cache.deletePattern()
      this.logger.debug('Refund cache invalidated', { refundId })

    } catch (error) {
      this.logger.warn('Failed to invalidate refund cache', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async invalidatePaymentRefundsCache(paymentId: string): Promise<void> {
    if (!this.cache) return

    try {
      const cacheKey = CacheKeys.paymentRefunds(paymentId)
      await this.cache.delete(cacheKey.key)
      
      this.logger.debug('Payment refunds cache invalidated', { paymentId })

    } catch (error) {
      this.logger.warn('Failed to invalidate payment refunds cache', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Utilidades para reembolsos
export class RefundUtils {
  /**
   * Determina si un reembolso puede ser actualizado
   */
  static canUpdate(refund: RefundResponse): boolean {
    return ['pending', 'manual_review'].includes(refund.refund_status)
  }

  /**
   * Determina si un reembolso puede ser sincronizado
   */
  static canSync(refund: RefundResponse): boolean {
    return ['pending', 'manual_review'].includes(refund.refund_status)
  }

  /**
   * Determina si un reembolso requiere revisión manual
   */
  static requiresManualReview(refund: RefundResponse): boolean {
    return refund.refund_status === 'manual_review'
  }

  /**
   * Calcula el tiempo estimado de procesamiento
   */
  static getEstimatedProcessingTime(refund: RefundResponse): string {
    if (refund.refund_type === 'instant') {
      return '5-10 minutos'
    }
    
    // Basado en el conector usado
    const processingTimes: Record<string, string> = {
      'stripe': '5-10 días hábiles',
      'adyen': '1-3 días hábiles',
      'paypal': '3-5 días hábiles',
      'square': '2-4 días hábiles',
      'default': '3-7 días hábiles'
    }
    
    return processingTimes[refund.connector] || processingTimes['default']
  }

  /**
   * Formatea monto de reembolso
   */
  static formatAmount(amount: number, currency: string = 'HNL'): string {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency,
    }).format(amount / 100) // Hyperswitch usa centavos
  }

  /**
   * Calcula estadísticas de reembolsos
   */
  static calculateRefundStats(refunds: RefundResponse[]): {
    total: number
    successful: number
    pending: number
    failed: number
    totalAmount: number
    successfulAmount: number
    averageAmount: number
    successRate: number
  } {
    const total = refunds.length
    const successful = refunds.filter(r => r.refund_status === 'success').length
    const pending = refunds.filter(r => ['pending', 'manual_review'].includes(r.refund_status)).length
    const failed = refunds.filter(r => r.refund_status === 'failure').length
    
    const totalAmount = refunds.reduce((sum, r) => sum + r.refund_amount, 0)
    const successfulAmount = refunds
      .filter(r => r.refund_status === 'success')
      .reduce((sum, r) => sum + r.refund_amount, 0)
    
    const averageAmount = total > 0 ? totalAmount / total : 0
    const successRate = total > 0 ? (successful / total) * 100 : 0
    
    return {
      total,
      successful,
      pending,
      failed,
      totalAmount,
      successfulAmount,
      averageAmount,
      successRate
    }
  }

  /**
   * Determina la prioridad de un reembolso fallido para reintento
   */
  static getRetryPriority(refund: RefundResponse): 'high' | 'medium' | 'low' | 'none' {
    if (refund.refund_status !== 'failure') return 'none'
    
    const amount = refund.refund_amount
    const errorCode = refund.error_code
    
    // Errores temporales tienen alta prioridad para reintento
    const temporaryErrors = ['insufficient_funds', 'try_again_later', 'processor_temporarily_unavailable']
    if (errorCode && temporaryErrors.includes(errorCode)) {
      return 'high'
    }
    
    // Errores permanentes tienen baja prioridad
    const permanentErrors = ['refund_expired', 'already_refunded', 'invalid_refund_amount']
    if (errorCode && permanentErrors.includes(errorCode)) {
      return 'low'
    }
    
    // Montos altos tienen prioridad media
    if (amount > 50000) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Calcula tiempo transcurrido desde creación
   */
  static getTimeSinceCreated(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} días`
    } else if (hours > 0) {
      return `${hours} horas`
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${minutes} minutos`
    }
  }

  /**
   * Agrupa reembolsos por estado
   */
  static groupByStatus(refunds: RefundResponse[]): Record<string, RefundResponse[]> {
    return refunds.reduce((groups, refund) => {
      const status = refund.refund_status
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(refund)
      return groups
    }, {} as Record<string, RefundResponse[]>)
  }

  /**
   * Agrupa reembolsos por motivo
   */
  static groupByReason(refunds: RefundResponse[]): Record<string, RefundResponse[]> {
    return refunds.reduce((groups, refund) => {
      const reason = refund.refund_reason || 'unknown'
      if (!groups[reason]) {
        groups[reason] = []
      }
      groups[reason].push(refund)
      return groups
    }, {} as Record<string, RefundResponse[]>)
  }
}

// Factory para crear HttpRefundRepository
export class RefundRepositoryFactory {
  /**
   * Crea repositorio configurado para diferentes entornos
   */
  static createForEnvironment(
    environment: 'development' | 'production' | 'test',
    baseUrl: string,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ): HttpRefundRepository {
    const envConfigs = {
      development: {
        baseUrl,
        timeout: 30000,
        retries: 3,
        enableCache: true,
        enableLogging: true,
      },
      production: {
        baseUrl,
        timeout: 20000,
        retries: 2,
        enableCache: true,
        enableLogging: true,
      },
      test: {
        baseUrl,
        timeout: 10000,
        retries: 1,
        enableCache: false,
        enableLogging: false,
      },
    }

    const config = envConfigs[environment]
    return new HttpRefundRepository(config, logger, cache)
  }
}

// Constantes
export const REFUND_CONSTANTS = {
  STATUSES: ['failure', 'manual_review', 'pending', 'success'] as const,
  
  TYPES: ['instant', 'regular'] as const,
  
  REASONS: [
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'expired_uncaptured_charge',
    'general'
  ] as const,

  MIN_REFUND_AMOUNT: 50, // 50 centavos mínimo
  MAX_REFUND_AMOUNT: 99999999, // ~$1M máximo

  PROCESSING_TIMES: {
    instant: { min: 5, max: 10, unit: 'minutes' },
    regular: { min: 3, max: 7, unit: 'business_days' }
  },

  ERROR_CODES: {
    TEMPORARY: [
      'insufficient_funds',
      'try_again_later',
      'processor_temporarily_unavailable'
    ],
    PERMANENT: [
      'refund_expired',
      'already_refunded',
      'invalid_refund_amount',
      'original_payment_not_found'
    ]
  },

  DEFAULT_TIMEOUT: 30000, // 30 segundos
  DEFAULT_RETRIES: 3,

  CACHE_TTL: {
    REFUND: 600, // 10 minutos
    LIST: 300, // 5 minutos
    PAYMENT_REFUNDS: 300, // 5 minutos
    STATISTICS: 900, // 15 minutos
  } as const,

  RETRY_PRIORITIES: ['none', 'low', 'medium', 'high'] as const,
} as const

export default HttpRefundRepository