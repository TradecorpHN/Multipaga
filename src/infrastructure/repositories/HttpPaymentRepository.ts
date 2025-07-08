// src/infrastructure/repositories/HttpPaymentRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// Repositorio HTTP para gestión de pagos con Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'
import type { MemoryCache } from '../cache/MemoryCache'
import { CacheKeys } from '../cache/CacheKeys'
import { PaymentEndpoints, type PaymentCreateData, type PaymentListParams, type PaymentUpdateData, type PaymentConfirmData, type PaymentCaptureData } from '../api/endpoints/PaymentEndpoints'

// Interfaces del dominio (basadas en Hyperswitch)
export interface PaymentResponse {
  payment_id: string
  merchant_id: string
  status: PaymentStatus
  amount: number
  amount_capturable?: number
  amount_received?: number
  connector: string
  client_secret?: string
  created: string
  currency: string
  customer_id?: string
  description?: string
  refunds?: PaymentRefund[]
  disputes?: PaymentDispute[]
  error_code?: string
  error_message?: string
  error_reason?: string
  mandate_id?: string
  mandate_data?: MandateData
  setup_future_usage?: 'on_session' | 'off_session'
  off_session?: boolean
  capture_on?: string
  capture_method?: 'automatic' | 'manual'
  payment_method?: PaymentMethod
  payment_method_data?: PaymentMethodData
  payment_token?: string
  shipping?: ShippingDetails
  billing?: BillingDetails
  statement_descriptor_name?: string
  statement_descriptor_suffix?: string
  next_action?: NextAction
  cancellation_reason?: string
  udf1?: string
  udf2?: string
  unified_code?: string
  unified_message?: string
  metadata?: Record<string, any>
  frm_message?: FrmMessage
  merchant_connector_id?: string
  feature_metadata?: FeatureMetadata
  attempt_count: number
  profile_id?: string
  merchant_decision?: string
  payment_link_id?: string
  payment_method_id?: string
  payment_method_status?: string
  updated: string
  charges?: Charges
  frm_metadata?: Record<string, any>
}

export type PaymentStatus = 
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'cancelled'
  | 'succeeded'
  | 'failed'
  | 'partially_captured'
  | 'partially_captured_and_capturable'

export interface PaymentMethod {
  type: string
  card?: CardDetails
  wallet?: WalletDetails
  bank_transfer?: BankTransferDetails
}

export interface CardDetails {
  last4: string
  card_type?: string
  card_network?: string
  card_issuer?: string
  card_issuing_country?: string
  card_isin?: string
  card_extended_bin?: string
  card_exp_month?: string
  card_exp_year?: string
  card_holder_name?: string
  payment_checks?: PaymentChecks
  authentication_data?: AuthenticationData
}

export interface PaymentChecks {
  cvc_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
  address_line1_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
  address_postal_code_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
}

export interface AuthenticationData {
  threeds_version?: string
  authentication_flow?: string
  lookup_status?: string
  authentication_status?: string
  eci?: string
  cavv?: string
  xid?: string
  enrolled_status?: string
  authentication_timestamp?: string
}

export interface WalletDetails {
  type: 'apple_pay' | 'google_pay' | 'paypal' | 'samsung_pay'
  [key: string]: any
}

export interface BankTransferDetails {
  bank_name?: string
  bank_code?: string
  account_number?: string
  routing_number?: string
}

export interface PaymentMethodData {
  type: string
  [key: string]: any
}

export interface ShippingDetails {
  address?: AddressDetails
  phone?: PhoneDetails
  name?: string
  email?: string
}

export interface BillingDetails {
  address?: AddressDetails
  phone?: PhoneDetails
  email?: string
}

export interface AddressDetails {
  line1?: string
  line2?: string
  line3?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  first_name?: string
  last_name?: string
}

export interface PhoneDetails {
  number?: string
  country_code?: string
}

export interface NextAction {
  type: string
  redirect_to_url?: string
  url_to_redirect?: string
  verify_with_microdeposits?: any
  [key: string]: any
}

export interface PaymentRefund {
  refund_id: string
  amount: number
  currency: string
  reason?: string
  status: string
  created_at: string
}

export interface PaymentDispute {
  dispute_id: string
  amount: string
  currency: string
  dispute_stage: string
  dispute_status: string
  created_at: string
}

export interface MandateData {
  customer_acceptance: CustomerAcceptance
  mandate_type?: MandateType
}

export interface CustomerAcceptance {
  acceptance_type: 'online' | 'offline'
  accepted_at?: string
  online?: OnlineAcceptance
  offline?: OfflineAcceptance
}

export interface OnlineAcceptance {
  ip_address?: string
  user_agent?: string
}

export interface OfflineAcceptance {
  contact_email?: string
}

export interface MandateType {
  multi_use?: MultiUseMandate
  single_use?: SingleUseMandate
}

export interface MultiUseMandate {
  amount?: number
  currency?: string
  start_date?: string
  end_date?: string
  metadata?: Record<string, any>
}

export interface SingleUseMandate {
  amount: number
  currency: string
}

export interface FrmMessage {
  frm_name?: string
  frm_transaction_id?: string
  frm_transaction_type?: string
  frm_status?: string
  frm_score?: number
  frm_reason?: string[]
  frm_error?: string
}

export interface FeatureMetadata {
  redirect_response?: Record<string, any>
  [key: string]: any
}

export interface Charges {
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

export interface PaymentListResponse {
  payments: PaymentResponse[]
  total_count: number
  has_more: boolean
}

export interface PaymentAttempt {
  attempt_id: string
  status: string
  amount: number
  currency: string
  payment_method: string
  error_reason?: string
  connector?: string
  created: string
  modified: string
}

export interface PaymentStatistics {
  total_payments: number
  successful_payments: number
  failed_payments: number
  total_amount: number
  average_amount: number
  success_rate: number
  payment_methods: Record<string, number>
  connectors: Record<string, number>
  currencies: Record<string, number>
  monthly_trend: Array<{
    month: string
    count: number
    amount: number
    success_rate: number
  }>
}

// Schemas de validación
const PaymentResponseSchema = z.object({
  payment_id: z.string(),
  merchant_id: z.string(),
  status: z.enum(['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'cancelled', 'succeeded', 'failed', 'partially_captured', 'partially_captured_and_capturable']),
  amount: z.number(),
  amount_capturable: z.number().optional(),
  amount_received: z.number().optional(),
  connector: z.string(),
  client_secret: z.string().optional(),
  created: z.string(),
  currency: z.string(),
  customer_id: z.string().optional(),
  description: z.string().optional(),
  refunds: z.array(z.any()).optional(),
  disputes: z.array(z.any()).optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  error_reason: z.string().optional(),
  mandate_id: z.string().optional(),
  mandate_data: z.any().optional(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  off_session: z.boolean().optional(),
  capture_on: z.string().optional(),
  capture_method: z.enum(['automatic', 'manual']).optional(),
  payment_method: z.any().optional(),
  payment_method_data: z.any().optional(),
  payment_token: z.string().optional(),
  shipping: z.any().optional(),
  billing: z.any().optional(),
  statement_descriptor_name: z.string().optional(),
  statement_descriptor_suffix: z.string().optional(),
  next_action: z.any().optional(),
  cancellation_reason: z.string().optional(),
  udf1: z.string().optional(),
  udf2: z.string().optional(),
  unified_code: z.string().optional(),
  unified_message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  frm_message: z.any().optional(),
  merchant_connector_id: z.string().optional(),
  feature_metadata: z.any().optional(),
  attempt_count: z.number(),
  profile_id: z.string().optional(),
  merchant_decision: z.string().optional(),
  payment_link_id: z.string().optional(),
  payment_method_id: z.string().optional(),
  payment_method_status: z.string().optional(),
  updated: z.string(),
  charges: z.any().optional(),
  frm_metadata: z.record(z.any()).optional(),
})

// Interfaz del repositorio
export interface IPaymentRepository {
  create(request: PaymentCreateData): Promise<PaymentResponse>
  getById(paymentId: string): Promise<PaymentResponse | null>
  list(merchantId: string, profileId: string, params?: PaymentListParams): Promise<PaymentListResponse>
  update(paymentId: string, request: PaymentUpdateData): Promise<PaymentResponse>
  confirm(paymentId: string, request: PaymentConfirmData): Promise<PaymentResponse>
  capture(paymentId: string, request?: PaymentCaptureData): Promise<PaymentResponse>
  cancel(paymentId: string, reason?: string): Promise<PaymentResponse>
  getAttempts(paymentId: string): Promise<PaymentAttempt[]>
  getStatistics(merchantId: string, profileId: string, dateRange?: { from: string; to: string }): Promise<PaymentStatistics>
  retry(paymentId: string): Promise<PaymentResponse>
}

// Configuración del repositorio
interface HttpPaymentRepositoryConfig {
  baseUrl: string
  timeout: number
  retries: number
  enableCache: boolean
  enableLogging: boolean
}

// Implementación del repositorio HTTP
export class HttpPaymentRepository implements IPaymentRepository {
  private config: HttpPaymentRepositoryConfig
  private logger: StructuredLogger
  private cache?: MemoryCache<any>

  constructor(
    config: HttpPaymentRepositoryConfig,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ) {
    this.config = config
    this.logger = logger.child({ repository: 'HttpPaymentRepository' })
    this.cache = cache
  }

  /**
   * Crea un nuevo pago
   */
  async create(request: PaymentCreateData): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Creating payment', { 
      amount: request.amount, 
      currency: request.currency,
      customerId: request.customer_id 
    })

    try {
      // Validar request
      const validatedRequest = PaymentEndpoints.createPayment.validateBody(request)

      // Construir URL
      const url = PaymentEndpoints.createPayment.buildUrl(this.config.baseUrl)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.payment(payment.payment_id)
        await this.cache.set(cacheKey.key, payment, cacheKey.ttl)
      }

      this.logger.info('Payment created successfully', {
        paymentId: payment.payment_id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to create payment', {
        amount: request.amount,
        currency: request.currency,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene un pago por ID
   */
  async getById(paymentId: string): Promise<PaymentResponse | null> {
    const startTime = Date.now()
    this.logger.debug('Getting payment by ID', { paymentId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.payment(paymentId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Payment found in cache', { paymentId })
          return cached
        }
      }

      // Construir URL
      const url = PaymentEndpoints.getPayment.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('GET', url)

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.payment(paymentId)
        await this.cache.set(cacheKey.key, payment, cacheKey.ttl)
      }

      this.logger.debug('Payment retrieved successfully', {
        paymentId,
        status: payment.status,
        amount: payment.amount,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.debug('Payment not found', { paymentId })
        return null
      }

      this.logger.error('Failed to get payment', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Lista pagos con filtros
   */
  async list(merchantId: string, profileId: string, params: PaymentListParams = {}): Promise<PaymentListResponse> {
    const startTime = Date.now()
    this.logger.debug('Listing payments', { merchantId, profileId, params })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentsList({ merchantId, profileId, ...params })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Payments list found in cache', { merchantId, profileId })
          return cached
        }
      }

      // Construir URL
      const url = PaymentEndpoints.listPayments.buildUrl(this.config.baseUrl, params)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse[]>('GET', url, {
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Profile-Id': profileId,
        },
      })

      // Validar response
      const payments = z.array(PaymentResponseSchema).parse(response)

      const result: PaymentListResponse = {
        payments,
        total_count: payments.length,
        has_more: payments.length === (params.limit || 20),
      }

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentsList({ merchantId, profileId, ...params })
        await this.cache.set(cacheKey.key, result, cacheKey.ttl)

        // Cachear pagos individuales
        for (const payment of payments) {
          const paymentCacheKey = CacheKeys.payment(payment.payment_id)
          await this.cache.set(paymentCacheKey.key, payment, paymentCacheKey.ttl)
        }
      }

      this.logger.debug('Payments listed successfully', {
        merchantId,
        profileId,
        count: payments.length,
        duration: Date.now() - startTime,
      })

      return result

    } catch (error) {
      this.logger.error('Failed to list payments', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Actualiza un pago
   */
  async update(paymentId: string, request: PaymentUpdateData): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Updating payment', { paymentId })

    try {
      // Validar request
      const validatedRequest = PaymentEndpoints.updatePayment.validateBody(request)

      // Construir URL
      const url = PaymentEndpoints.updatePayment.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidatePaymentCache(paymentId)
      }

      this.logger.info('Payment updated successfully', {
        paymentId,
        status: payment.status,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to update payment', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Confirma un pago
   */
  async confirm(paymentId: string, request: PaymentConfirmData): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Confirming payment', { paymentId })

    try {
      // Validar request
      const validatedRequest = PaymentEndpoints.confirmPayment.validateBody(request)

      // Construir URL
      const url = PaymentEndpoints.confirmPayment.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidatePaymentCache(paymentId)
      }

      this.logger.info('Payment confirmed successfully', {
        paymentId,
        status: payment.status,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to confirm payment', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Captura un pago autorizado
   */
  async capture(paymentId: string, request: PaymentCaptureData = {}): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Capturing payment', { paymentId, amountToCapture: request.amount_to_capture })

    try {
      // Validar request si hay datos
      const validatedRequest = Object.keys(request).length > 0 
        ? PaymentEndpoints.capturePayment.validateBody(request)
        : {}

      // Construir URL
      const url = PaymentEndpoints.capturePayment.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', url, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidatePaymentCache(paymentId)
      }

      this.logger.info('Payment captured successfully', {
        paymentId,
        status: payment.status,
        capturedAmount: payment.amount_received,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to capture payment', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Cancela un pago
   */
  async cancel(paymentId: string, reason?: string): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Cancelling payment', { paymentId, reason })

    try {
      // Construir URL
      const url = PaymentEndpoints.cancelPayment.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', url, {
        body: reason ? { cancellation_reason: reason } : {},
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidatePaymentCache(paymentId)
      }

      this.logger.info('Payment cancelled successfully', {
        paymentId,
        status: payment.status,
        reason: payment.cancellation_reason,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to cancel payment', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene intentos de pago
   */
  async getAttempts(paymentId: string): Promise<PaymentAttempt[]> {
    const startTime = Date.now()
    this.logger.debug('Getting payment attempts', { paymentId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentAttempts(paymentId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Payment attempts found in cache', { paymentId })
          return cached
        }
      }

      // Construir URL
      const url = PaymentEndpoints.getPaymentAttempts.buildUrl(this.config.baseUrl, paymentId)

      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentAttempt[]>('GET', url)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentAttempts(paymentId)
        await this.cache.set(cacheKey.key, response, cacheKey.ttl)
      }

      this.logger.debug('Payment attempts retrieved successfully', {
        paymentId,
        attemptsCount: response.length,
        duration: Date.now() - startTime,
      })

      return response

    } catch (error) {
      this.logger.error('Failed to get payment attempts', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene estadísticas de pagos
   */
  async getStatistics(
    merchantId: string, 
    profileId: string, 
    dateRange?: { from: string; to: string }
  ): Promise<PaymentStatistics> {
    const startTime = Date.now()
    this.logger.debug('Getting payment statistics', { merchantId, profileId, dateRange })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentsStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Payment statistics found in cache', { merchantId, profileId })
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
      const response = await this.makeRequest<PaymentStatistics>('GET', `/payments/statistics?${queryParams}`, {
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Profile-Id': profileId,
        },
      })

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.paymentsStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        await this.cache.set(cacheKey.key, response, cacheKey.ttl)
      }

      this.logger.debug('Payment statistics retrieved successfully', {
        merchantId,
        profileId,
        totalPayments: response.total_payments,
        successRate: response.success_rate,
        duration: Date.now() - startTime,
      })

      return response

    } catch (error) {
      this.logger.error('Failed to get payment statistics', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Reintenta un pago fallido
   */
  async retry(paymentId: string): Promise<PaymentResponse> {
    const startTime = Date.now()
    this.logger.info('Retrying payment', { paymentId })

    try {
      // Hacer petición HTTP
      const response = await this.makeRequest<PaymentResponse>('POST', `/payments/${paymentId}/retry`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const payment = PaymentResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidatePaymentCache(paymentId)
      }

      this.logger.info('Payment retry successful', {
        paymentId,
        status: payment.status,
        attemptCount: payment.attempt_count,
        duration: Date.now() - startTime,
      })

      return payment

    } catch (error) {
      this.logger.error('Failed to retry payment', {
        paymentId,
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

  private async invalidatePaymentCache(paymentId?: string): Promise<void> {
    if (!this.cache) return

    try {
      // Invalidar pago específico si se proporciona
      if (paymentId) {
        const paymentCacheKey = CacheKeys.payment(paymentId)
        await this.cache.delete(paymentCacheKey.key)

        const attemptsCacheKey = CacheKeys.paymentAttempts(paymentId)
        await this.cache.delete(attemptsCacheKey.key)
      }

      // Invalidar listas y estadísticas usando patrón
      // En una implementación real, aquí se usaría cache.deletePattern()
      this.logger.debug('Payment cache invalidated', { paymentId })

    } catch (error) {
      this.logger.warn('Failed to invalidate payment cache', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Utilidades para pagos
export class PaymentUtils {
  /**
   * Determina si un pago puede ser capturado
   */
  static canCapture(payment: PaymentResponse): boolean {
    return payment.status === 'requires_capture' || 
           payment.status === 'partially_captured_and_capturable'
  }

  /**
   * Determina si un pago puede ser cancelado
   */
  static canCancel(payment: PaymentResponse): boolean {
    const cancellableStatuses: PaymentStatus[] = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing'
    ]
    return cancellableStatuses.includes(payment.status)
  }

  /**
   * Determina si un pago puede ser confirmado
   */
  static canConfirm(payment: PaymentResponse): boolean {
    return payment.status === 'requires_confirmation'
  }

  /**
   * Determina si un pago requiere acción del usuario
   */
  static requiresAction(payment: PaymentResponse): boolean {
    return payment.status === 'requires_action'
  }

  /**
   * Calcula el monto disponible para captura
   */
  static getCapturableAmount(payment: PaymentResponse): number {
    if (payment.status === 'requires_capture') {
      return payment.amount
    }
    
    if (payment.status === 'partially_captured_and_capturable') {
      return payment.amount_capturable || 0
    }
    
    return 0
  }

  /**
   * Formatea monto en centavos a formato de moneda
   */
  static formatAmount(amount: number, currency: string = 'HNL'): string {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency,
    }).format(amount / 100) // Hyperswitch usa centavos
  }

  /**
   * Calcula la tasa de éxito de pagos
   */
  static calculateSuccessRate(payments: PaymentResponse[]): number {
    if (payments.length === 0) return 0
    
    const successfulPayments = payments.filter(p => p.status === 'succeeded').length
    return (successfulPayments / payments.length) * 100
  }

  /**
   * Agrupa pagos por estado
   */
  static groupByStatus(payments: PaymentResponse[]): Record<PaymentStatus, PaymentResponse[]> {
    return payments.reduce((groups, payment) => {
      if (!groups[payment.status]) {
        groups[payment.status] = []
      }
      groups[payment.status].push(payment)
      return groups
    }, {} as Record<PaymentStatus, PaymentResponse[]>)
  }

  /**
   * Obtiene próxima acción requerida
   */
  static getNextActionType(payment: PaymentResponse): string | null {
    return payment.next_action?.type || null
  }

  /**
   * Determina la prioridad de un pago fallido para reintento
   */
  static getRetryPriority(payment: PaymentResponse): 'high' | 'medium' | 'low' | 'none' {
    if (payment.status !== 'failed') return 'none'
    
    const amount = payment.amount
    const errorCode = payment.error_code
    
    // Errores temporales tienen alta prioridad
    const temporaryErrors = ['card_declined_temporarily', 'insufficient_funds', 'try_again_later']
    if (errorCode && temporaryErrors.includes(errorCode)) {
      return 'high'
    }
    
    // Errores permanentes tienen baja prioridad
    const permanentErrors = ['card_declined', 'invalid_card', 'expired_card']
    if (errorCode && permanentErrors.includes(errorCode)) {
      return 'low'
    }
    
    // Montos altos tienen prioridad media
    if (amount > 50000) {
      return 'medium'
    }
    
    return 'low'
  }
}

// Factory para crear HttpPaymentRepository
export class PaymentRepositoryFactory {
  /**
   * Crea repositorio configurado para diferentes entornos
   */
  static createForEnvironment(
    environment: 'development' | 'production' | 'test',
    baseUrl: string,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ): HttpPaymentRepository {
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
    return new HttpPaymentRepository(config, logger, cache)
  }
}

// Constantes
export const PAYMENT_CONSTANTS = {
  STATUSES: [
    'requires_payment_method',
    'requires_confirmation', 
    'requires_action',
    'processing',
    'requires_capture',
    'cancelled',
    'succeeded',
    'failed',
    'partially_captured',
    'partially_captured_and_capturable'
  ] as const,

  CAPTURE_METHODS: ['automatic', 'manual'] as const,

  SETUP_FUTURE_USAGE: ['on_session', 'off_session'] as const,

  CURRENCY_MINOR_UNITS: {
    USD: 100,
    EUR: 100,
    GBP: 100,
    HNL: 100,
    MXN: 100,
    GTQ: 100,
  } as const,

  DEFAULT_TIMEOUT: 30000, // 30 segundos
  DEFAULT_RETRIES: 3,
  MAX_RETRIES: 5,

  CACHE_TTL: {
    PAYMENT: 300, // 5 minutos
    LIST: 180, // 3 minutos
    ATTEMPTS: 600, // 10 minutos
    STATISTICS: 900, // 15 minutos
  } as const,

  RETRY_PRIORITIES: ['none', 'low', 'medium', 'high'] as const,
} as const

export default HttpPaymentRepository