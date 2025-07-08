// src/infrastructure/repositories/HttpConnectorRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// Repositorio HTTP para gestión de conectores con Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'
import type { MemoryCache } from '../cache/MemoryCache'
import { CacheKeys } from '../cache/CacheKeys'

// Interfaces del dominio (basadas en Hyperswitch)
export interface ConnectorAccount {
  merchant_id: string
  merchant_connector_id: string
  connector_name: string
  connector_account_details: {
    auth_type: 'HeaderKey' | 'BodyKey' | 'SignatureKey' | 'MultiAuthKey'
    api_key?: string
    key1?: string
    key2?: string
    api_secret?: string
    [key: string]: any
  }
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: PaymentMethodsEnabled[]
  connector_type: 'payment_processor' | 'payment_vas' | 'authentication_processor'
  metadata?: Record<string, any>
  created_at: string
  modified_at: string
  connector_label?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
  frm_configs?: FrmConfigs[]
}

export interface PaymentMethodsEnabled {
  payment_method: string
  payment_method_types?: PaymentMethodType[]
}

export interface PaymentMethodType {
  payment_method_type: string
  minimum_amount?: number
  maximum_amount?: number
  recurring_enabled?: boolean
  installment_payment_enabled?: boolean
}

export interface FrmConfigs {
  gateway: string
  payment_methods: PaymentMethodsEnabled[]
}

export interface ConnectorCreateRequest {
  connector_type: 'payment_processor' | 'payment_vas' | 'authentication_processor'
  connector_name: string
  connector_account_details: Record<string, any>
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: PaymentMethodsEnabled[]
  metadata?: Record<string, any>
  connector_label?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
}

export interface ConnectorUpdateRequest {
  connector_account_details?: Record<string, any>
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: PaymentMethodsEnabled[]
  metadata?: Record<string, any>
  connector_label?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
}

export interface ConnectorListRequest {
  limit?: number
  offset?: number
  connector_type?: 'payment_processor' | 'payment_vas' | 'authentication_processor'
}

export interface ConnectorListResponse {
  connectors: ConnectorAccount[]
  total_count: number
  has_more: boolean
}

// Schemas de validación
const ConnectorAccountSchema = z.object({
  merchant_id: z.string(),
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  connector_account_details: z.record(z.any()),
  test_mode: z.boolean().optional(),
  disabled: z.boolean().optional(),
  payment_methods_enabled: z.array(z.any()).optional(),
  connector_type: z.enum(['payment_processor', 'payment_vas', 'authentication_processor']),
  metadata: z.record(z.any()).optional(),
  created_at: z.string(),
  modified_at: z.string(),
  connector_label: z.string().optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
  frm_configs: z.array(z.any()).optional(),
})

const ConnectorCreateRequestSchema = z.object({
  connector_type: z.enum(['payment_processor', 'payment_vas', 'authentication_processor']),
  connector_name: z.string().min(1, 'Connector name is required'),
  connector_account_details: z.record(z.any()),
  test_mode: z.boolean().default(true),
  disabled: z.boolean().default(false),
  payment_methods_enabled: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  connector_label: z.string().optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
})

const ConnectorListRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  connector_type: z.enum(['payment_processor', 'payment_vas', 'authentication_processor']).optional(),
})

// Interfaz del repositorio
export interface IConnectorRepository {
  create(merchantId: string, request: ConnectorCreateRequest): Promise<ConnectorAccount>
  getById(merchantId: string, connectorId: string): Promise<ConnectorAccount | null>
  list(merchantId: string, request?: ConnectorListRequest): Promise<ConnectorListResponse>
  update(merchantId: string, connectorId: string, request: ConnectorUpdateRequest): Promise<ConnectorAccount>
  delete(merchantId: string, connectorId: string): Promise<void>
  getAvailableConnectors(): Promise<string[]>
  validateConnector(merchantId: string, connectorId: string): Promise<boolean>
}

// Configuración del repositorio
interface HttpConnectorRepositoryConfig {
  baseUrl: string
  timeout: number
  retries: number
  enableCache: boolean
  enableLogging: boolean
}

// Implementación del repositorio HTTP
export class HttpConnectorRepository implements IConnectorRepository {
  private config: HttpConnectorRepositoryConfig
  private logger: StructuredLogger
  private cache?: MemoryCache<any>

  constructor(
    config: HttpConnectorRepositoryConfig,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ) {
    this.config = config
    this.logger = logger.child({ repository: 'HttpConnectorRepository' })
    this.cache = cache
  }

  /**
   * Crea un nuevo conector
   */
  async create(merchantId: string, request: ConnectorCreateRequest): Promise<ConnectorAccount> {
    const startTime = Date.now()
    this.logger.info('Creating connector', { merchantId, connectorName: request.connector_name })

    try {
      // Validar request
      const validatedRequest = ConnectorCreateRequestSchema.parse(request)

      // Hacer petición HTTP
      const response = await this.makeRequest<ConnectorAccount>('POST', `/account/${merchantId}/connectors`, {
        body: validatedRequest,
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId,
        },
      })

      // Validar response
      const connector = ConnectorAccountSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateConnectorCache(merchantId)
      }

      this.logger.info('Connector created successfully', {
        merchantId,
        connectorId: connector.merchant_connector_id,
        duration: Date.now() - startTime,
      })

      return connector

    } catch (error) {
      this.logger.error('Failed to create connector', {
        merchantId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene un conector por ID
   */
  async getById(merchantId: string, connectorId: string): Promise<ConnectorAccount | null> {
    const startTime = Date.now()
    this.logger.debug('Getting connector by ID', { merchantId, connectorId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.connector(merchantId, connectorId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Connector found in cache', { merchantId, connectorId })
          return cached
        }
      }

      // Hacer petición HTTP
      const response = await this.makeRequest<ConnectorAccount>('GET', `/account/${merchantId}/connectors/${connectorId}`, {
        headers: {
          'X-Merchant-Id': merchantId,
        },
      })

      // Validar response
      const connector = ConnectorAccountSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.connector(merchantId, connectorId)
        await this.cache.set(cacheKey.key, connector, cacheKey.ttl)
      }

      this.logger.debug('Connector retrieved successfully', {
        merchantId,
        connectorId,
        duration: Date.now() - startTime,
      })

      return connector

    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.debug('Connector not found', { merchantId, connectorId })
        return null
      }

      this.logger.error('Failed to get connector', {
        merchantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Lista conectores de un merchant
   */
  async list(merchantId: string, request: ConnectorListRequest = {}): Promise<ConnectorListResponse> {
    const startTime = Date.now()
    this.logger.debug('Listing connectors', { merchantId, request })

    try {
      // Validar request
      const validatedRequest = ConnectorListRequestSchema.parse(request)

      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.connectorsList(merchantId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Connectors list found in cache', { merchantId })
          return cached
        }
      }

      // Construir query parameters
      const queryParams = new URLSearchParams()
      Object.entries(validatedRequest).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })

      // Hacer petición HTTP
      const response = await this.makeRequest<ConnectorAccount[]>('GET', `/account/${merchantId}/connectors?${queryParams}`, {
        headers: {
          'X-Merchant-Id': merchantId,
        },
      })

      // Validar response
      const connectors = z.array(ConnectorAccountSchema).parse(response)

      const result: ConnectorListResponse = {
        connectors,
        total_count: connectors.length,
        has_more: connectors.length === validatedRequest.limit,
      }

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.connectorsList(merchantId)
        await this.cache.set(cacheKey.key, result, cacheKey.ttl)

        // Cachear conectores individuales
        for (const connector of connectors) {
          const connectorCacheKey = CacheKeys.connector(merchantId, connector.merchant_connector_id)
          await this.cache.set(connectorCacheKey.key, connector, connectorCacheKey.ttl)
        }
      }

      this.logger.debug('Connectors listed successfully', {
        merchantId,
        count: connectors.length,
        duration: Date.now() - startTime,
      })

      return result

    } catch (error) {
      this.logger.error('Failed to list connectors', {
        merchantId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Actualiza un conector
   */
  async update(merchantId: string, connectorId: string, request: ConnectorUpdateRequest): Promise<ConnectorAccount> {
    const startTime = Date.now()
    this.logger.info('Updating connector', { merchantId, connectorId })

    try {
      // Hacer petición HTTP
      const response = await this.makeRequest<ConnectorAccount>('POST', `/account/${merchantId}/connectors/${connectorId}`, {
        body: request,
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId,
        },
      })

      // Validar response
      const connector = ConnectorAccountSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateConnectorCache(merchantId, connectorId)
      }

      this.logger.info('Connector updated successfully', {
        merchantId,
        connectorId,
        duration: Date.now() - startTime,
      })

      return connector

    } catch (error) {
      this.logger.error('Failed to update connector', {
        merchantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Elimina un conector
   */
  async delete(merchantId: string, connectorId: string): Promise<void> {
    const startTime = Date.now()
    this.logger.info('Deleting connector', { merchantId, connectorId })

    try {
      // Hacer petición HTTP
      await this.makeRequest<void>('DELETE', `/account/${merchantId}/connectors/${connectorId}`, {
        headers: {
          'X-Merchant-Id': merchantId,
        },
      })

      // Invalidar caché
      if (this.cache) {
        await this.invalidateConnectorCache(merchantId, connectorId)
      }

      this.logger.info('Connector deleted successfully', {
        merchantId,
        connectorId,
        duration: Date.now() - startTime,
      })

    } catch (error) {
      this.logger.error('Failed to delete connector', {
        merchantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene lista de conectores disponibles
   */
  async getAvailableConnectors(): Promise<string[]> {
    const startTime = Date.now()
    this.logger.debug('Getting available connectors')

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.availableConnectors()
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Available connectors found in cache')
          return cached
        }
      }

      // Hacer petición HTTP
      const response = await this.makeRequest<{ connectors: string[] }>('GET', '/connectors', {})

      const connectors = response.connectors || []

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.availableConnectors()
        await this.cache.set(cacheKey.key, connectors, cacheKey.ttl)
      }

      this.logger.debug('Available connectors retrieved successfully', {
        count: connectors.length,
        duration: Date.now() - startTime,
      })

      return connectors

    } catch (error) {
      this.logger.error('Failed to get available connectors', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Valida la configuración de un conector
   */
  async validateConnector(merchantId: string, connectorId: string): Promise<boolean> {
    const startTime = Date.now()
    this.logger.debug('Validating connector', { merchantId, connectorId })

    try {
      // Hacer petición HTTP de validación
      await this.makeRequest<void>('POST', `/account/${merchantId}/connectors/${connectorId}/verify`, {
        headers: {
          'X-Merchant-Id': merchantId,
        },
      })

      this.logger.info('Connector validation successful', {
        merchantId,
        connectorId,
        duration: Date.now() - startTime,
      })

      return true

    } catch (error) {
      this.logger.warn('Connector validation failed', {
        merchantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })

      return false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    options: {
      body?: any
      headers?: Record<string, string>
      timeout?: number
    }
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
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

      // Si es DELETE, puede no tener contenido
      if (method === 'DELETE' && response.status === 204) {
        return {} as T
      }

      return await response.json() as T

    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        const timeoutError = new Error(`Request to ${endpoint} timed out after ${requestTimeout}ms`)
        ;(timeoutError as any).code = 'TIMEOUT'
        throw timeoutError
      }
      throw error
    }
  }

  private isNotFoundError(error: any): boolean {
    return error?.status === 404 || error?.statusCode === 404
  }

  private async invalidateConnectorCache(merchantId: string, connectorId?: string): Promise<void> {
    if (!this.cache) return

    try {
      // Invalidar lista de conectores
      const listCacheKey = CacheKeys.connectorsList(merchantId)
      await this.cache.delete(listCacheKey.key)

      // Invalidar conector específico si se proporciona
      if (connectorId) {
        const connectorCacheKey = CacheKeys.connector(merchantId, connectorId)
        await this.cache.delete(connectorCacheKey.key)
      }

      this.logger.debug('Connector cache invalidated', { merchantId, connectorId })

    } catch (error) {
      this.logger.warn('Failed to invalidate connector cache', {
        merchantId,
        connectorId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Utilidades para conectores
export class ConnectorUtils {
  /**
   * Valida credenciales de conector según el tipo
   */
  static validateConnectorCredentials(
    connectorName: string,
    credentials: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    const validationRules: Record<string, string[]> = {
      stripe: ['api_key'],
      adyen: ['api_key', 'merchant_account'],
      paypal: ['client_id', 'client_secret'],
      square: ['application_id', 'access_token'],
      braintree: ['merchant_id', 'public_key', 'private_key'],
    }

    const requiredFields = validationRules[connectorName.toLowerCase()]
    if (!requiredFields) {
      errors.push(`Unknown connector: ${connectorName}`)
      return { valid: false, errors }
    }

    requiredFields.forEach(field => {
      if (!credentials[field] || credentials[field].trim() === '') {
        errors.push(`Missing required field: ${field}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Genera configuración por defecto para un conector
   */
  static getDefaultConnectorConfig(connectorName: string): Partial<ConnectorCreateRequest> {
    const defaults: Record<string, Partial<ConnectorCreateRequest>> = {
      stripe: {
        connector_type: 'payment_processor',
        test_mode: true,
        payment_methods_enabled: [
          {
            payment_method: 'card',
            payment_method_types: [
              { payment_method_type: 'credit' },
              { payment_method_type: 'debit' }
            ]
          }
        ]
      },
      adyen: {
        connector_type: 'payment_processor',
        test_mode: true,
        payment_methods_enabled: [
          {
            payment_method: 'card',
            payment_method_types: [
              { payment_method_type: 'credit' },
              { payment_method_type: 'debit' }
            ]
          }
        ]
      },
      paypal: {
        connector_type: 'payment_processor',
        test_mode: true,
        payment_methods_enabled: [
          {
            payment_method: 'wallet',
            payment_method_types: [
              { payment_method_type: 'paypal' }
            ]
          }
        ]
      }
    }

    return defaults[connectorName.toLowerCase()] || {
      connector_type: 'payment_processor',
      test_mode: true,
    }
  }

  /**
   * Mapea nombre de conector a configuración de métodos de pago
   */
  static getConnectorPaymentMethods(connectorName: string): PaymentMethodsEnabled[] {
    const paymentMethods: Record<string, PaymentMethodsEnabled[]> = {
      stripe: [
        {
          payment_method: 'card',
          payment_method_types: [
            { payment_method_type: 'credit', recurring_enabled: true },
            { payment_method_type: 'debit', recurring_enabled: true }
          ]
        },
        {
          payment_method: 'wallet',
          payment_method_types: [
            { payment_method_type: 'apple_pay' },
            { payment_method_type: 'google_pay' }
          ]
        }
      ],
      adyen: [
        {
          payment_method: 'card',
          payment_method_types: [
            { payment_method_type: 'credit', recurring_enabled: true },
            { payment_method_type: 'debit', recurring_enabled: true }
          ]
        },
        {
          payment_method: 'bank_transfer',
          payment_method_types: [
            { payment_method_type: 'sepa' },
            { payment_method_type: 'ideal' }
          ]
        }
      ],
      paypal: [
        {
          payment_method: 'wallet',
          payment_method_types: [
            { payment_method_type: 'paypal', recurring_enabled: true }
          ]
        }
      ]
    }

    return paymentMethods[connectorName.toLowerCase()] || []
  }
}

// Constantes
export const CONNECTOR_CONSTANTS = {
  SUPPORTED_CONNECTORS: [
    'stripe',
    'adyen', 
    'paypal',
    'square',
    'braintree',
    'checkout',
    'worldpay',
    'cybersource',
  ] as const,

  CONNECTOR_TYPES: [
    'payment_processor',
    'payment_vas', 
    'authentication_processor',
  ] as const,

  AUTH_TYPES: [
    'HeaderKey',
    'BodyKey',
    'SignatureKey',
    'MultiAuthKey',
  ] as const,

  DEFAULT_TIMEOUT: 30000, // 30 segundos
  DEFAULT_RETRIES: 3,
  MAX_RETRIES: 5,

  CACHE_TTL: {
    CONNECTOR: 3600, // 1 hora
    LIST: 1800, // 30 minutos
    AVAILABLE: 7200, // 2 horas
  } as const,
} as const

export default HttpConnectorRepository