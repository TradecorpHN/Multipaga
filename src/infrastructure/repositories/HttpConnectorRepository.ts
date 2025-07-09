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
  metadata?: Record<string, any>
  connector_label?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
}

export interface ConnectorUpdateRequest {
  connector_account_details?: {
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

// ====================== Schemas de validación ======================

const ConnectorAccountDetailsSchema = z.object({
  auth_type: z.enum(['HeaderKey', 'BodyKey', 'SignatureKey', 'MultiAuthKey']),
  api_key: z.string().optional(),
  key1: z.string().optional(),
  key2: z.string().optional(),
  api_secret: z.string().optional(),
}).catchall(z.any())

const ConnectorAccountSchema = z.object({
  merchant_id: z.string(),
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  connector_account_details: ConnectorAccountDetailsSchema,
  test_mode: z.boolean().optional(),
  disabled: z.boolean().optional(),
  payment_methods_enabled: z.array(z.any()).optional(),
  connector_type: z.enum([
    'payment_processor',
    'payment_vas',
    'authentication_processor'
  ]),
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
  connector_type: z.enum([
    'payment_processor',
    'payment_vas',
    'authentication_processor'
  ]),
  connector_name: z.string().min(1, 'Connector name is required'),
  connector_account_details: ConnectorAccountDetailsSchema,
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
  connector_type: z
    .enum(['payment_processor', 'payment_vas', 'authentication_processor'])
    .optional(),
})

// ====================== Repositorio ======================

export interface IConnectorRepository {
  create(
    merchantId: string,
    request: ConnectorCreateRequest
  ): Promise<ConnectorAccount>
  getById(
    merchantId: string,
    connectorId: string
  ): Promise<ConnectorAccount | null>
  list(
    merchantId: string,
    request?: ConnectorListRequest
  ): Promise<ConnectorListResponse>
  update(
    merchantId: string,
    connectorId: string,
    request: ConnectorUpdateRequest
  ): Promise<ConnectorAccount>
  delete(merchantId: string, connectorId: string): Promise<void>
  getAvailableConnectors(): Promise<string[]>
  validateConnector(
    merchantId: string,
    connectorId: string
  ): Promise<boolean>
}

interface HttpConnectorRepositoryConfig {
  baseUrl: string
  timeout: number
  retries: number
  enableCache: boolean
  enableLogging: boolean
}

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

  /** Crea un nuevo conector */
  async create(
    merchantId: string,
    request: ConnectorCreateRequest
  ): Promise<ConnectorAccount> {
    const startTime = Date.now()
    this.logger.info('Creating connector', {
      merchantId,
      connectorName: request.connector_name
    })

    const validated = ConnectorCreateRequestSchema.parse(request)
    const raw = await this.makeRequest<any>(
      'POST',
      `/account/${merchantId}/connectors`,
      {
        body: validated,
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId
        }
      }
    )
    const connector = ConnectorAccountSchema.parse(raw)

    if (this.cache) await this.invalidateConnectorCache(merchantId)

    this.logger.info('Connector created successfully', {
      merchantId,
      connectorId: connector.merchant_connector_id,
      duration: Date.now() - startTime
    })
    return connector
  }

  /** Obtiene un conector por ID */
  async getById(
    merchantId: string,
    connectorId: string
  ): Promise<ConnectorAccount | null> {
    const startTime = Date.now()
    this.logger.debug('Getting connector by ID', { merchantId, connectorId })

    if (this.cache) {
      const key = CacheKeys.connector(merchantId, connectorId)
      const cached = await this.cache.get(key.key)
      if (cached) return cached
    }

    const raw = await this.makeRequest<any>(
      'GET',
      `/account/${merchantId}/connectors/${connectorId}`,
      { headers: { 'X-Merchant-Id': merchantId } }
    )
    const connector = ConnectorAccountSchema.parse(raw)
    if (this.cache) {
      const key = CacheKeys.connector(merchantId, connectorId)
      await this.cache.set(key.key, connector, key.ttl)
    }
    return connector
  }

  /** Lista conectores de un merchant */
  async list(
    merchantId: string,
    request: ConnectorListRequest = {}
  ): Promise<ConnectorListResponse> {
    const startTime = Date.now()
    const validated = ConnectorListRequestSchema.parse(request)

    if (this.cache) {
      const key = CacheKeys.connectorsList(merchantId)
      const cached = await this.cache.get(key.key)
      if (cached) return cached
    }

    const qs = new URLSearchParams()
    Object.entries(validated).forEach(([k, v]) => v != null && qs.append(k, String(v)))

    const raw = await this.makeRequest<any[]>(
      'GET',
      `/account/${merchantId}/connectors?${qs}`,
      { headers: { 'X-Merchant-Id': merchantId } }
    )
    const connectors = z.array(ConnectorAccountSchema).parse(raw)

    const result: ConnectorListResponse = {
      connectors,
      total_count: connectors.length,
      has_more: connectors.length === validated.limit
    }
    if (this.cache) {
      const listKey = CacheKeys.connectorsList(merchantId)
      await this.cache.set(listKey.key, result, listKey.ttl)
      for (const c of connectors) {
        const k = CacheKeys.connector(merchantId, c.merchant_connector_id)
        await this.cache.set(k.key, c, k.ttl)
      }
    }
    return result
  }

  /** Actualiza un conector */
  async update(
    merchantId: string,
    connectorId: string,
    request: ConnectorUpdateRequest
  ): Promise<ConnectorAccount> {
    const raw = await this.makeRequest<any>(
      'POST',
      `/account/${merchantId}/connectors/${connectorId}`,
      {
        body: request,
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId
        }
      }
    )
    const connector = ConnectorAccountSchema.parse(raw)
    if (this.cache) await this.invalidateConnectorCache(merchantId, connectorId)
    return connector
  }

  /** Elimina un conector */
  async delete(merchantId: string, connectorId: string): Promise<void> {
    await this.makeRequest<void>(
      'DELETE',
      `/account/${merchantId}/connectors/${connectorId}`,
      { headers: { 'X-Merchant-Id': merchantId } }
    )
    if (this.cache) await this.invalidateConnectorCache(merchantId, connectorId)
  }

  /** Obtiene lista de conectores disponibles */
  async getAvailableConnectors(): Promise<string[]> {
    if (this.cache) {
      const key = CacheKeys.availableConnectors()
      const cached = await this.cache.get(key.key)
      if (cached) return cached
    }
    const raw = await this.makeRequest<{ connectors: string[] }>(
      'GET',
      '/connectors',
      {}
    )
    const list = raw.connectors ?? []
    if (this.cache) {
      const key = CacheKeys.availableConnectors()
      await this.cache.set(key.key, list, key.ttl)
    }
    return list
  }

  /** Valida la configuración de un conector */
  async validateConnector(
    merchantId: string,
    connectorId: string
  ): Promise<boolean> {
    try {
      await this.makeRequest<void>(
        'POST',
        `/account/${merchantId}/connectors/${connectorId}/verify`,
        { headers: { 'X-Merchant-Id': merchantId } }
      )
      return true
    } catch {
      return false
    }
  }

  // ——— MÉTODOS PRIVADOS ——————————————————————————————————————————————

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    options: { body?: any; headers?: Record<string, string>; timeout?: number }
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const timeoutMs = options.timeout ?? this.config.timeout
    const init: RequestInit = {
      method,
      headers: { Accept: 'application/json', ...options.headers }
    }
    if (options.body && (method === 'POST' || method === 'PUT')) {
      init.body = JSON.stringify(options.body)
    }
    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('Request timeout')), timeoutMs)
    )
    const res = await Promise.race([fetch(url, init), timeoutPromise])
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const err = new Error(errData.message || res.statusText)
      ;(err as any).status = res.status
      throw err
    }
    if (method === 'DELETE' && res.status === 204) return {} as T
    return (await res.json()) as T
  }

  private async invalidateConnectorCache(
    merchantId: string,
    connectorId?: string
  ): Promise<void> {
    if (!this.cache) return
    const listKey = CacheKeys.connectorsList(merchantId)
    await this.cache.delete(listKey.key)
    if (connectorId) {
      const k = CacheKeys.connector(merchantId, connectorId)
      await this.cache.delete(k.key)
    }
  }
}

export default HttpConnectorRepository
