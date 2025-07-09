// src/infrastructure/cache/CacheKeys.ts
// ──────────────────────────────────────────────────────────────────────────────
// Definición centralizada de claves de caché para la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación para parámetros de claves
const CacheKeyParamsSchema = z.object({
  merchantId:    z.string().min(1).optional(),
  profileId:     z.string().min(1).optional(),
  userId:        z.string().min(1).optional(),
  paymentId:     z.string().min(1).optional(),
  refundId:      z.string().min(1).optional(),
  disputeId:     z.string().min(1).optional(),
  connectorId:   z.string().min(1).optional(),
  customerId:    z.string().min(1).optional(),
  currency:      z.string().length(3).optional(),
  status:        z.string().optional(),
  dateRange:     z.string().optional(),
  page:          z.number().int().min(1).optional(),
  limit:         z.number().int().min(1).optional(),
})

// Tipo exportado
export type CacheKeyParams = z.infer<typeof CacheKeyParamsSchema>

// Configuración de TTL por tipo de caché
export interface CacheTTLConfig {
  payments: number
  refunds: number
  disputes: number
  profiles: number
  connectors: number
  customers: number
  analytics: number
  metadata: number
  session: number
  config: number
  temporary: number
}

// TTL por defecto en segundos
export const DEFAULT_TTL_CONFIG: CacheTTLConfig = {
  payments:    300,
  refunds:     600,
  disputes:    1800,
  profiles:    3600,
  connectors:  7200,
  customers:   1800,
  analytics:   900,
  metadata:    10800,
  session:     1800,
  config:      14400,
  temporary:   60,
}

// ──────────────────────────────────────────────────────────────────────────────
// Clase principal para manejo de claves de caché
// ──────────────────────────────────────────────────────────────────────────────

export class CacheKeys {
  private static readonly PREFIX    = 'multipaga'
  private static readonly SEPARATOR = ':'
  private static ttlConfig: CacheTTLConfig = { ...DEFAULT_TTL_CONFIG }

  /** Configura TTL personalizado */
  static configureTTL(config: Partial<CacheTTLConfig>): void {
    CacheKeys.ttlConfig = { ...CacheKeys.ttlConfig, ...config }
  }

  /** Obtiene configuración actual de TTL */
  static getTTLConfig(): CacheTTLConfig {
    return { ...CacheKeys.ttlConfig }
  }

  /** Construye una clave de caché con formato estándar */
  public static buildKey(
    namespace: string,
    ...parts: (string | number | undefined)[]
  ): string {
    const validParts = parts.filter(
      part => part !== undefined && part !== null && part !== ''
    )
    return [CacheKeys.PREFIX, namespace, ...validParts].join(CacheKeys.SEPARATOR)
  }

  /** Valida parámetros de clave de caché */
  private static validateParams(params: CacheKeyParams): CacheKeyParams {
    return CacheKeyParamsSchema.parse(params)
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE PAGOS
  // ──────────────────────────────────────────────────────────────────────────────

  static payment(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId),
      ttl: CacheKeys.ttlConfig.payments,
    }
  }

  static paymentsList(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'status' | 'page' | 'limit'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'payments', 'list',
        v.merchantId, v.profileId, v.status, v.page, v.limit
      ),
      ttl: CacheKeys.ttlConfig.payments,
    }
  }

  static paymentsStats(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'payments', 'stats',
        v.merchantId, v.profileId, v.dateRange
      ),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  static paymentAttempts(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId, 'attempts'),
      ttl: CacheKeys.ttlConfig.payments,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE REFUNDS
  // ──────────────────────────────────────────────────────────────────────────────

  static refund(refundId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('refund', refundId),
      ttl: CacheKeys.ttlConfig.refunds,
    }
  }

  static refundsList(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'paymentId' | 'status' | 'page' | 'limit'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'refunds', 'list',
        v.merchantId, v.profileId, v.paymentId, v.status, v.page, v.limit
      ),
      ttl: CacheKeys.ttlConfig.refunds,
    }
  }

  static paymentRefunds(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId, 'refunds'),
      ttl: CacheKeys.ttlConfig.refunds,
    }
  }

  static refundsStats(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'refunds', 'stats',
        v.merchantId, v.profileId, v.dateRange
      ),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE DISPUTAS
  // ──────────────────────────────────────────────────────────────────────────────

  static dispute(disputeId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('dispute', disputeId),
      ttl: CacheKeys.ttlConfig.disputes,
    }
  }

  static disputesList(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'status' | 'page' | 'limit'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'disputes', 'list',
        v.merchantId, v.profileId, v.status, v.page, v.limit
      ),
      ttl: CacheKeys.ttlConfig.disputes,
    }
  }

  static disputeEvidence(disputeId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('dispute', disputeId, 'evidence'),
      ttl: CacheKeys.ttlConfig.disputes,
    }
  }

  static disputesStats(
    params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>
  ): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey(
        'disputes', 'stats',
        v.merchantId, v.profileId, v.dateRange
      ),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE PERFILES
  // ──────────────────────────────────────────────────────────────────────────────

  static profile(merchantId: string, profileId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profile', merchantId, profileId),
      ttl: CacheKeys.ttlConfig.profiles,
    }
  }

  static profilesList(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profiles', 'list', merchantId),
      ttl: CacheKeys.ttlConfig.profiles,
    }
  }

  static profileWebhooks(merchantId: string, profileId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profile', merchantId, profileId, 'webhooks'),
      ttl: CacheKeys.ttlConfig.profiles,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CONECTORES
  // ──────────────────────────────────────────────────────────────────────────────

  static connector(merchantId: string, connectorId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connector', merchantId, connectorId),
      ttl: CacheKeys.ttlConfig.connectors,
    }
  }

  static connectorsList(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connectors', 'list', merchantId),
      ttl: CacheKeys.ttlConfig.connectors,
    }
  }

  static availableConnectors(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connectors', 'available'),
      ttl: CacheKeys.ttlConfig.connectors,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CLIENTES
  // ──────────────────────────────────────────────────────────────────────────────

  static customer(merchantId: string, customerId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('customer', merchantId, customerId),
      ttl: CacheKeys.ttlConfig.customers,
    }
  }

  static customersList(params: Pick<CacheKeyParams, 'merchantId' | 'page' | 'limit'>): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('customers', 'list', v.merchantId, v.page, v.limit),
      ttl: CacheKeys.ttlConfig.customers,
    }
  }

  static customerPaymentMethods(merchantId: string, customerId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('customer', merchantId, customerId, 'payment-methods'),
      ttl: CacheKeys.ttlConfig.customers,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE ANALYTICS Y REPORTES
  // ──────────────────────────────────────────────────────────────────────────────

  static dashboardAnalytics(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'dashboard', v.merchantId, v.profileId, v.dateRange),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  static performanceMetrics(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'performance', v.merchantId, v.profileId, v.dateRange),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  static revenueReport(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'currency' | 'dateRange'>): { key: string; ttl: number } {
    const v = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'revenue', v.merchantId, v.profileId, v.currency, v.dateRange),
      ttl: CacheKeys.ttlConfig.analytics,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE SESIÓN Y AUTENTICACIÓN
  // ──────────────────────────────────────────────────────────────────────────────

  static userSession(userId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('session', 'user', userId),
      ttl: CacheKeys.ttlConfig.session,
    }
  }

  static apiToken(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('session', 'api-token', merchantId),
      ttl: CacheKeys.ttlConfig.session,
    }
  }

  static rateLimitByIP(ip: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('rate-limit', 'ip', ip.replace(/\./g, '-')),
      ttl: 900,
    }
  }

  static rateLimitByUser(userId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('rate-limit', 'user', userId),
      ttl: 900,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CONFIGURACIÓN Y METADATA
  // ──────────────────────────────────────────────────────────────────────────────

  static appConfig(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('config', 'app'),
      ttl: CacheKeys.ttlConfig.config,
    }
  }

  static featureFlags(merchantId?: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('config', 'features', merchantId),
      ttl: CacheKeys.ttlConfig.config,
    }
  }

  static currenciesMetadata(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('metadata', 'currencies'),
      ttl: CacheKeys.ttlConfig.metadata,
    }
  }

  static countriesMetadata(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('metadata', 'countries'),
      ttl: CacheKeys.ttlConfig.metadata,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES TEMPORALES Y LOCKS
  // ──────────────────────────────────────────────────────────────────────────────

  static operationLock(operation: string, resourceId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('lock', operation, resourceId),
      ttl: CacheKeys.ttlConfig.temporary,
    }
  }

  static temporary(namespace: string, id: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('temp', namespace, id),
      ttl: CacheKeys.ttlConfig.temporary,
    }
  }

  static webhookDelivery(webhookId: string, attemptId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('webhook', 'delivery', webhookId, attemptId),
      ttl: 3600,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILIDADES DE GESTIÓN DE CLAVES
  // ──────────────────────────────────────────────────────────────────────────────

  static pattern(namespace: string, ...parts: (string | undefined)[]): string {
    const validParts = parts.filter(part => part !== undefined && part !== null && part !== '')
    return [CacheKeys.PREFIX, namespace, ...validParts, '*'].join(CacheKeys.SEPARATOR)
  }

  static getNamespace(key: string): string | null {
    const parts = key.split(CacheKeys.SEPARATOR)
    return parts.length >= 2 ? parts[1] : null
  }

  static isValidKey(key: string): boolean {
    return key.startsWith(CacheKeys.PREFIX + CacheKeys.SEPARATOR) && key.length > CacheKeys.PREFIX.length + 1
  }

  static parseKey(key: string): { prefix: string; namespace: string; parts: string[] } | null {
    if (!CacheKeys.isValidKey(key)) return null
    const [prefix, namespace, ...remaining] = key.split(CacheKeys.SEPARATOR)
    return { prefix, namespace, parts: remaining }
  }
}

// Utilidades adicionales para manejo de claves
export class CacheKeyUtils {
  /** Genera hash MD5 de una clave larga para acortar */
  static hashKey(key: string): string {
    let hash = 0
    if (key.length === 0) return '0'
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(36)
  }

  /** Crea versión comprimida de una clave muy larga */
  static compressKey(key: string, maxLength: number = 250): string {
    if (key.length <= maxLength) return key
    const parsed = CacheKeys.parseKey(key)
    if (!parsed) return key
    const essential = `${parsed.prefix}:${parsed.namespace}`
    const remainingHash = CacheKeyUtils.hashKey(parsed.parts.join(':'))
    return `${essential}:${remainingHash}`
  }

  /** Valida y sanitiza una parte de clave */
  static sanitizeKeyPart(part: string): string {
    return part.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase().substring(0, 50)
  }

  /** Genera clave única basada en timestamp */
  static timestampKey(namespace: string): string {
    const ts = Date.now().toString(36)
    const rnd = Math.random().toString(36).substring(2)
    return CacheKeys.buildKey(namespace, 'ts', ts, rnd)
  }
}

// Constantes de configuración
export const CACHE_CONSTANTS = {
  PREFIX: 'multipaga',
  SEPARATOR: ':',
  MAX_KEY_LENGTH: 250,
  DEFAULT_TTL: 300,
  MIN_TTL: 60,
  MAX_TTL: 86400,
  PATTERNS: {
    ALL_PAYMENTS:    'multipaga:payment*',
    ALL_REFUNDS:     'multipaga:refund*',
    ALL_DISPUTES:    'multipaga:dispute*',
    ALL_PROFILES:    'multipaga:profile*',
    ALL_ANALYTICS:   'multipaga:analytics*',
    ALL_SESSIONS:    'multipaga:session*',
    ALL_LOCKS:       'multipaga:lock*',
    ALL_TEMP:        'multipaga:temp*',
  } as const,
  NAMESPACES: [
    'payment','payments','refund','refunds','dispute','disputes',
    'profile','profiles','connector','connectors','customer','customers',
    'analytics','session','config','metadata','lock','temp','webhook','rate-limit',
  ] as const,
} as const

export default CacheKeys
