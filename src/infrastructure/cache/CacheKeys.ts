// src/infrastructure/cache/CacheKeys.ts
// ──────────────────────────────────────────────────────────────────────────────
// Definición centralizada de claves de caché para la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación para parámetros de claves
const CacheKeyParamsSchema = z.object({
  merchantId: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  paymentId: z.string().min(1).optional(),
  refundId: z.string().min(1).optional(),
  disputeId: z.string().min(1).optional(),
  connectorId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
  status: z.string().optional(),
  dateRange: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
})

// Tipos exportados
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
  payments: 300,      // 5 minutos - datos de pagos cambian frecuentemente
  refunds: 600,       // 10 minutos - refunds menos volátiles que pagos
  disputes: 1800,     // 30 minutos - disputas cambian menos frecuentemente
  profiles: 3600,     // 1 hora - configuración de perfiles estable
  connectors: 7200,   // 2 horas - configuración de conectores muy estable
  customers: 1800,    // 30 minutos - datos de clientes moderadamente estables
  analytics: 900,     // 15 minutos - analytics necesitan ser frescos pero no en tiempo real
  metadata: 10800,    // 3 horas - metadata rara vez cambia
  session: 1800,      // 30 minutos - sesiones de usuario
  config: 14400,      // 4 horas - configuración de aplicación
  temporary: 60,      // 1 minuto - caché temporal para evitar race conditions
}

// Clase principal para manejo de claves de caché
export class CacheKeys {
  private static readonly PREFIX = 'multipaga'
  private static readonly SEPARATOR = ':'
  private static ttlConfig: CacheTTLConfig = { ...DEFAULT_TTL_CONFIG }

  /**
   * Configura TTL personalizado
   */
  static configureTTL(config: Partial<CacheTTLConfig>): void {
    CacheKeys.ttlConfig = { ...CacheKeys.ttlConfig, ...config }
  }

  /**
   * Obtiene configuración actual de TTL
   */
  static getTTLConfig(): CacheTTLConfig {
    return { ...CacheKeys.ttlConfig }
  }

  /**
   * Construye una clave de caché con formato estándar
   */
  private static buildKey(namespace: string, ...parts: (string | number | undefined)[]): string {
    const validParts = parts.filter(part => part !== undefined && part !== null && part !== '')
    return [CacheKeys.PREFIX, namespace, ...validParts].join(CacheKeys.SEPARATOR)
  }

  /**
   * Valida parámetros de clave de caché
   */
  private static validateParams(params: CacheKeyParams): CacheKeyParams {
    return CacheKeyParamsSchema.parse(params)
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE PAGOS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para un pago específico
   */
  static payment(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId),
      ttl: CacheKeys.ttlConfig.payments
    }
  }

  /**
   * Clave para lista de pagos con filtros
   */
  static paymentsList(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'status' | 'page' | 'limit'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('payments', 'list', validated.merchantId, validated.profileId, validated.status, validated.page, validated.limit),
      ttl: CacheKeys.ttlConfig.payments
    }
  }

  /**
   * Clave para estadísticas de pagos
   */
  static paymentsStats(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('payments', 'stats', validated.merchantId, validated.profileId, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  /**
   * Clave para intentos de pago
   */
  static paymentAttempts(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId, 'attempts'),
      ttl: CacheKeys.ttlConfig.payments
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE REFUNDS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para un refund específico
   */
  static refund(refundId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('refund', refundId),
      ttl: CacheKeys.ttlConfig.refunds
    }
  }

  /**
   * Clave para lista de refunds
   */
  static refundsList(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'paymentId' | 'status' | 'page' | 'limit'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('refunds', 'list', validated.merchantId, validated.profileId, validated.paymentId, validated.status, validated.page, validated.limit),
      ttl: CacheKeys.ttlConfig.refunds
    }
  }

  /**
   * Clave para refunds de un pago específico
   */
  static paymentRefunds(paymentId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('payment', paymentId, 'refunds'),
      ttl: CacheKeys.ttlConfig.refunds
    }
  }

  /**
   * Clave para estadísticas de refunds
   */
  static refundsStats(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('refunds', 'stats', validated.merchantId, validated.profileId, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE DISPUTAS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para una disputa específica
   */
  static dispute(disputeId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('dispute', disputeId),
      ttl: CacheKeys.ttlConfig.disputes
    }
  }

  /**
   * Clave para lista de disputas
   */
  static disputesList(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'status' | 'page' | 'limit'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('disputes', 'list', validated.merchantId, validated.profileId, validated.status, validated.page, validated.limit),
      ttl: CacheKeys.ttlConfig.disputes
    }
  }

  /**
   * Clave para evidencia de disputa
   */
  static disputeEvidence(disputeId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('dispute', disputeId, 'evidence'),
      ttl: CacheKeys.ttlConfig.disputes
    }
  }

  /**
   * Clave para estadísticas de disputas
   */
  static disputesStats(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('disputes', 'stats', validated.merchantId, validated.profileId, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE PERFILES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para un perfil específico
   */
  static profile(merchantId: string, profileId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profile', merchantId, profileId),
      ttl: CacheKeys.ttlConfig.profiles
    }
  }

  /**
   * Clave para lista de perfiles de un merchant
   */
  static profilesList(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profiles', 'list', merchantId),
      ttl: CacheKeys.ttlConfig.profiles
    }
  }

  /**
   * Clave para configuración de webhook de un perfil
   */
  static profileWebhooks(merchantId: string, profileId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('profile', merchantId, profileId, 'webhooks'),
      ttl: CacheKeys.ttlConfig.profiles
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CONECTORES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para un conector específico
   */
  static connector(merchantId: string, connectorId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connector', merchantId, connectorId),
      ttl: CacheKeys.ttlConfig.connectors
    }
  }

  /**
   * Clave para lista de conectores de un merchant
   */
  static connectorsList(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connectors', 'list', merchantId),
      ttl: CacheKeys.ttlConfig.connectors
    }
  }

  /**
   * Clave para conectores disponibles globalmente
   */
  static availableConnectors(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('connectors', 'available'),
      ttl: CacheKeys.ttlConfig.connectors
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CLIENTES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para un cliente específico
   */
  static customer(merchantId: string, customerId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('customer', merchantId, customerId),
      ttl: CacheKeys.ttlConfig.customers
    }
  }

  /**
   * Clave para lista de clientes
   */
  static customersList(params: Pick<CacheKeyParams, 'merchantId' | 'page' | 'limit'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('customers', 'list', validated.merchantId, validated.page, validated.limit),
      ttl: CacheKeys.ttlConfig.customers
    }
  }

  /**
   * Clave para métodos de pago de un cliente
   */
  static customerPaymentMethods(merchantId: string, customerId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('customer', merchantId, customerId, 'payment-methods'),
      ttl: CacheKeys.ttlConfig.customers
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE ANALYTICS Y REPORTES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para dashboard analytics
   */
  static dashboardAnalytics(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'dashboard', validated.merchantId, validated.profileId, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  /**
   * Clave para métricas de performance
   */
  static performanceMetrics(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'performance', validated.merchantId, validated.profileId, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  /**
   * Clave para reportes de revenue
   */
  static revenueReport(params: Pick<CacheKeyParams, 'merchantId' | 'profileId' | 'currency' | 'dateRange'>): { key: string; ttl: number } {
    const validated = CacheKeys.validateParams(params)
    return {
      key: CacheKeys.buildKey('analytics', 'revenue', validated.merchantId, validated.profileId, validated.currency, validated.dateRange),
      ttl: CacheKeys.ttlConfig.analytics
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE SESIÓN Y AUTENTICACIÓN
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para sesión de usuario
   */
  static userSession(userId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('session', 'user', userId),
      ttl: CacheKeys.ttlConfig.session
    }
  }

  /**
   * Clave para token de API
   */
  static apiToken(merchantId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('session', 'api-token', merchantId),
      ttl: CacheKeys.ttlConfig.session
    }
  }

  /**
   * Clave para rate limiting por IP
   */
  static rateLimitByIP(ip: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('rate-limit', 'ip', ip.replace(/\./g, '-')),
      ttl: 900 // 15 minutos
    }
  }

  /**
   * Clave para rate limiting por usuario
   */
  static rateLimitByUser(userId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('rate-limit', 'user', userId),
      ttl: 900 // 15 minutos
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES DE CONFIGURACIÓN Y METADATA
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para configuración de aplicación
   */
  static appConfig(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('config', 'app'),
      ttl: CacheKeys.ttlConfig.config
    }
  }

  /**
   * Clave para configuración de features flags
   */
  static featureFlags(merchantId?: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('config', 'features', merchantId),
      ttl: CacheKeys.ttlConfig.config
    }
  }

  /**
   * Clave para metadata de currencies
   */
  static currenciesMetadata(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('metadata', 'currencies'),
      ttl: CacheKeys.ttlConfig.metadata
    }
  }

  /**
   * Clave para metadata de países
   */
  static countriesMetadata(): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('metadata', 'countries'),
      ttl: CacheKeys.ttlConfig.metadata
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CLAVES TEMPORALES Y LOCKS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Clave para lock de operación crítica
   */
  static operationLock(operation: string, resourceId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('lock', operation, resourceId),
      ttl: CacheKeys.ttlConfig.temporary
    }
  }

  /**
   * Clave para caché temporal
   */
  static temporary(namespace: string, id: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('temp', namespace, id),
      ttl: CacheKeys.ttlConfig.temporary
    }
  }

  /**
   * Clave para webhook delivery attempts
   */
  static webhookDelivery(webhookId: string, attemptId: string): { key: string; ttl: number } {
    return {
      key: CacheKeys.buildKey('webhook', 'delivery', webhookId, attemptId),
      ttl: 3600 // 1 hora
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILIDADES DE GESTIÓN DE CLAVES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Genera patrón para invalidar múltiples claves
   */
  static pattern(namespace: string, ...parts: (string | undefined)[]): string {
    const validParts = parts.filter(part => part !== undefined && part !== null && part !== '')
    return [CacheKeys.PREFIX, namespace, ...validParts, '*'].join(CacheKeys.SEPARATOR)
  }

  /**
   * Obtiene namespace de una clave
   */
  static getNamespace(key: string): string | null {
    const parts = key.split(CacheKeys.SEPARATOR)
    return parts.length >= 2 ? parts[1] : null
  }

  /**
   * Valida formato de clave
   */
  static isValidKey(key: string): boolean {
    return key.startsWith(CacheKeys.PREFIX + CacheKeys.SEPARATOR) && key.length > CacheKeys.PREFIX.length + 1
  }

  /**
   * Parsea una clave para extraer sus componentes
   */
  static parseKey(key: string): { prefix: string; namespace: string; parts: string[] } | null {
    if (!CacheKeys.isValidKey(key)) return null
    
    const parts = key.split(CacheKeys.SEPARATOR)
    const [prefix, namespace, ...remainingParts] = parts
    
    return {
      prefix,
      namespace,
      parts: remainingParts
    }
  }
}

// Utilidades adicionales para manejo de claves
export class CacheKeyUtils {
  /**
   * Genera hash MD5 de una clave larga para acortar
   */
  static hashKey(key: string): string {
    // Implementación simple de hash para Node.js/Browser
    let hash = 0
    if (key.length === 0) return hash.toString()
    
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a 32-bit integer
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * Crea versión comprimida de una clave muy larga
   */
  static compressKey(key: string, maxLength: number = 250): string {
    if (key.length <= maxLength) return key
    
    const parsed = CacheKeys.parseKey(key)
    if (!parsed) return key
    
    // Mantener prefix y namespace, comprimir el resto
    const essentialPart = `${parsed.prefix}:${parsed.namespace}`
    const remainingLength = maxLength - essentialPart.length - 1
    const compressedParts = CacheKeyUtils.hashKey(parsed.parts.join(':'))
    
    return `${essentialPart}:${compressedParts}`
  }

  /**
   * Valida que los parámetros de clave sean seguros
   */
  static sanitizeKeyPart(part: string): string {
    return part
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Reemplazar caracteres especiales
      .toLowerCase()
      .substring(0, 50) // Limitar longitud
  }

  /**
   * Genera clave única basada en timestamp
   */
  static timestampKey(namespace: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return CacheKeys.buildKey(namespace, 'ts', timestamp, random)
  }
}

// Constantes de configuración
export const CACHE_CONSTANTS = {
  PREFIX: 'multipaga',
  SEPARATOR: ':',
  MAX_KEY_LENGTH: 250,
  DEFAULT_TTL: 300, // 5 minutos
  MIN_TTL: 60,      // 1 minuto
  MAX_TTL: 86400,   // 24 horas
  
  // Patrones comunes
  PATTERNS: {
    ALL_PAYMENTS: 'multipaga:payment*',
    ALL_REFUNDS: 'multipaga:refund*',
    ALL_DISPUTES: 'multipaga:dispute*',
    ALL_PROFILES: 'multipaga:profile*',
    ALL_ANALYTICS: 'multipaga:analytics*',
    ALL_SESSIONS: 'multipaga:session*',
    ALL_LOCKS: 'multipaga:lock*',
    ALL_TEMP: 'multipaga:temp*',
  } as const,
  
  // Namespaces válidos
  NAMESPACES: [
    'payment',
    'payments',
    'refund', 
    'refunds',
    'dispute',
    'disputes',
    'profile',
    'profiles',
    'connector',
    'connectors',
    'customer',
    'customers',
    'analytics',
    'session',
    'config',
    'metadata',
    'lock',
    'temp',
    'webhook',
    'rate-limit',
  ] as const,
} as const

export default CacheKeys