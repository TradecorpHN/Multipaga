// src/infrastructure/security/RateLimiter.ts
// ──────────────────────────────────────────────────────────────────────────────
// Rate Limiter para control de velocidad de requests en la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'
import type { MemoryCache } from '../cache/MemoryCache'

// Schemas de validación
const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).max(3600000).default(900000), // 15 minutos por defecto
  maxRequests: z.number().min(1).max(10000).default(100),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  enableBurst: z.boolean().default(true),
  burstMultiplier: z.number().min(1).max(10).default(2),
  enableDynamicLimits: z.boolean().default(false),
  keyGenerator: z.enum(['ip', 'user', 'api-key', 'custom']).default('ip'),
  customKeyExtractor: z.function().optional(),
  whitelist: z.array(z.string()).default([]),
  blacklist: z.array(z.string()).default([]),
  enableSlowDown: z.boolean().default(false),
  slowDownDelay: z.number().default(1000), // ms de delay por request extra
  enableDistributedMode: z.boolean().default(false),
  enableLogging: z.boolean().default(true),
  headers: z.object({
    includeHeaders: z.boolean().default(true),
    limitHeader: z.string().default('X-RateLimit-Limit'),
    remainingHeader: z.string().default('X-RateLimit-Remaining'),
    resetHeader: z.string().default('X-RateLimit-Reset'),
    retryAfterHeader: z.string().default('Retry-After'),
  }).default({}),
})

const RateLimitRequestSchema = z.object({
  ip: z.string(),
  userId: z.string().optional(),
  apiKey: z.string().optional(),
  path: z.string(),
  method: z.string(),
  userAgent: z.string().optional(),
  headers: z.record(z.string()),
  timestamp: z.number(),
})

// Tipos exportados
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>
export type RateLimitRequest = z.infer<typeof RateLimitRequestSchema>

// Resultado de rate limiting
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
  headers: Record<string, string>
  reason?: string
  slowDown?: number
}

// Información de rate limit
export interface RateLimitInfo {
  key: string
  requests: number
  windowStart: number
  windowEnd: number
  blocked: boolean
  lastRequest: number
}

// Regla de rate limit personalizada
export interface RateLimitRule {
  name: string
  matcher: (request: RateLimitRequest) => boolean
  config: Partial<RateLimitConfig>
  priority: number
}

// Estadísticas de rate limiting
export interface RateLimitStats {
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  averageRequestsPerWindow: number
  topConsumers: Array<{ key: string; requests: number }>
  topBlockedIPs: Array<{ ip: string; blocks: number }>
  rateLimitDistribution: Record<string, number>
  timeRange: { start: string; end: string }
}

// Store para almacenar datos de rate limiting
interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | null>
  set(key: string, info: RateLimitInfo): Promise<void>
  increment(key: string): Promise<number>
  reset(key: string): Promise<void>
  cleanup(): Promise<void>
}

// Implementación de store en memoria
class MemoryRateLimitStore implements RateLimitStore {
  private data = new Map<string, RateLimitInfo>()
  private cleanupInterval?: NodeJS.Timeout

  constructor(private windowMs: number) {
    // Limpiar datos expirados cada minuto
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async get(key: string): Promise<RateLimitInfo | null> {
    const info = this.data.get(key)
    if (!info) return null

    // Verificar si ha expirado
    if (Date.now() > info.windowEnd) {
      this.data.delete(key)
      return null
    }

    return info
  }

  async set(key: string, info: RateLimitInfo): Promise<void> {
    this.data.set(key, info)
  }

  async increment(key: string): Promise<number> {
    const now = Date.now()
    let info = this.data.get(key)

    if (!info || now > info.windowEnd) {
      // Crear nueva ventana
      info = {
        key,
        requests: 1,
        windowStart: now,
        windowEnd: now + this.windowMs,
        blocked: false,
        lastRequest: now,
      }
    } else {
      // Incrementar en ventana existente
      info.requests++
      info.lastRequest = now
    }

    this.data.set(key, info)
    return info.requests
  }

  async reset(key: string): Promise<void> {
    this.data.delete(key)
  }

async cleanup(): Promise<void> {
  const now = Date.now()
  const keysToDelete: string[] = []
  
      Array.from(this.data.entries()).forEach(([key, info]) => {
    if (now > info.windowEnd) {
      keysToDelete.push(key)
    }
  })}

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.data.clear()
  }
}

// Implementación de store con caché externo
class CacheRateLimitStore implements RateLimitStore {
  constructor(
    private cache: MemoryCache<RateLimitInfo>,
    private windowMs: number
  ) {}

  async get(key: string): Promise<RateLimitInfo | null> {
    return await this.cache.get(key) || null
  }

  async set(key: string, info: RateLimitInfo): Promise<void> {
    const ttl = Math.ceil((info.windowEnd - Date.now()) / 1000)
    await this.cache.set(key, info, ttl)
  }

  async increment(key: string): Promise<number> {
    const now = Date.now()
    let info = await this.get(key)

    if (!info || now > info.windowEnd) {
      // Crear nueva ventana
      info = {
        key,
        requests: 1,
        windowStart: now,
        windowEnd: now + this.windowMs,
        blocked: false,
        lastRequest: now,
      }
    } else {
      // Incrementar en ventana existente
      info.requests++
      info.lastRequest = now
    }

    await this.set(key, info)
    return info.requests
  }

  async reset(key: string): Promise<void> {
    await this.cache.delete(key)
  }

  async cleanup(): Promise<void> {
    // El cache maneja su propia limpieza con TTL
  }
}

// Rate Limiter principal
export class RateLimiter {
  private config: RateLimitConfig
  private logger: StructuredLogger
  private store: RateLimitStore
  private customRules: RateLimitRule[] = []
  private stats: RateLimitStats

  constructor(
    config: Partial<RateLimitConfig> = {},
    logger?: StructuredLogger,
    cache?: MemoryCache<RateLimitInfo>
  ) {
    this.config = RateLimitConfigSchema.parse(config)
    this.logger = logger?.child({ component: 'RateLimiter' }) || this.createFallbackLogger()
    
    // Crear store apropiado
    this.store = cache 
      ? new CacheRateLimitStore(cache, this.config.windowMs)
      : new MemoryRateLimitStore(this.config.windowMs)
    
    this.stats = this.initializeStats()
  }

  /**
   * Verifica si una petición está dentro de los límites
   */
  async checkLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    const startTime = Date.now()

    try {
      // Validar request
      const validatedRequest = RateLimitRequestSchema.parse(request)
      
      // Incrementar estadísticas
      this.stats.totalRequests++

      // Generar clave única para el request
      const key = this.generateKey(validatedRequest)

      // Verificar whitelist
      if (this.isWhitelisted(key, validatedRequest)) {
        const result = this.createAllowedResult(key)
        this.logRateLimitResult(validatedRequest, result, Date.now() - startTime)
        return result
      }

      // Verificar blacklist
      if (this.isBlacklisted(key, validatedRequest)) {
        const result = this.createBlockedResult(key, 'Blacklisted')
        this.updateStats(false)
        this.logRateLimitResult(validatedRequest, result, Date.now() - startTime)
        return result
      }

      // Aplicar reglas personalizadas
      const customRuleResult = await this.applyCustomRules(validatedRequest)
      if (customRuleResult) {
        this.updateStats(customRuleResult.allowed)
        this.logRateLimitResult(validatedRequest, customRuleResult, Date.now() - startTime)
        return customRuleResult
      }

      // Verificar límite principal
      const currentCount = await this.store.increment(key)
      const limit = this.calculateDynamicLimit(validatedRequest)
      
      // Verificar si excede el límite
      if (currentCount > limit) {
        // Verificar burst allowance
        if (this.config.enableBurst) {
          const burstLimit = limit * this.config.burstMultiplier
          if (currentCount <= burstLimit) {
            // Permitir con warning
            const result = this.createBurstAllowedResult(key, currentCount, limit, burstLimit)
            this.updateStats(true)
            this.logRateLimitResult(validatedRequest, result, Date.now() - startTime)
            return result
          }
        }

        // Bloquear request
        const result = this.createBlockedResult(key, 'Rate limit exceeded', currentCount, limit)
        this.updateStats(false)
        this.logRateLimitResult(validatedRequest, result, Date.now() - startTime)
        return result
      }

      // Permitir request
      const result = this.createAllowedResult(key, currentCount, limit)
      this.updateStats(true)
      this.logRateLimitResult(validatedRequest, result, Date.now() - startTime)
      return result

    } catch (error) {
      this.logger.error('Error in rate limiter', {
        error: error instanceof Error ? error.message : String(error),
        ip: request.ip,
        path: request.path,
        duration: Date.now() - startTime,
      })

      // En caso de error, permitir request por defecto
      return this.createAllowedResult('error-fallback')
    }
  }

  /**
   * Añade una regla personalizada
   */
  addCustomRule(rule: RateLimitRule): void {
    this.customRules.push(rule)
    this.customRules.sort((a, b) => b.priority - a.priority)
    
    this.logger.info('Custom rate limit rule added', {
      ruleName: rule.name,
      priority: rule.priority,
      totalRules: this.customRules.length,
    })
  }

  /**
   * Remueve una regla personalizada
   */
  removeCustomRule(ruleName: string): boolean {
    const initialLength = this.customRules.length
    this.customRules = this.customRules.filter(rule => rule.name !== ruleName)
    
    const removed = this.customRules.length < initialLength
    if (removed) {
      this.logger.info('Custom rate limit rule removed', {
        ruleName,
        remainingRules: this.customRules.length,
      })
    }
    
    return removed
  }

  /**
   * Resetea el contador para una clave específica
   */
  async resetLimit(key: string): Promise<void> {
    await this.store.reset(key)
    this.logger.info('Rate limit reset', { key })
  }

  /**
   * Obtiene información de rate limit para una clave
   */
  async getLimitInfo(key: string): Promise<RateLimitInfo | null> {
    return await this.store.get(key)
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = RateLimitConfigSchema.parse({ ...this.config, ...newConfig })
    this.logger.info('Rate limiter configuration updated')
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): RateLimitConfig {
    return { ...this.config }
  }

  /**
   * Obtiene estadísticas
   */
  getStatistics(): RateLimitStats {
    return { ...this.stats }
  }

  /**
   * Reinicia estadísticas
   */
  resetStatistics(): void {
    this.stats = this.initializeStats()
    this.logger.info('Rate limiter statistics reset')
  }

  /**
   * Limpia datos expirados
   */
  async cleanup(): Promise<void> {
    await this.store.cleanup()
  }

  /**
   * Destruye el rate limiter y limpia recursos
   */
  async destroy(): Promise<void> {
    await this.cleanup()
    if (this.store instanceof MemoryRateLimitStore) {
      this.store.destroy()
    }
  }

  /**
   * Crea middleware Express
   */
  createExpressMiddleware() {
    return async (req: any, res: any, next: any) => {
      const rateLimitRequest: RateLimitRequest = {
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        apiKey: req.headers['api-key'],
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        headers: req.headers,
        timestamp: Date.now(),
      }

      const result = await this.checkLimit(rateLimitRequest)

      // Establecer headers de rate limit
      if (this.config.headers.includeHeaders) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value)
        })
      }

      if (!result.allowed) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: result.reason || 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        })
        return
      }

      // Aplicar slow down si está configurado
      if (result.slowDown && result.slowDown > 0) {
        setTimeout(next, result.slowDown)
      } else {
        next()
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

private generateKey(request: RateLimitRequest): string {
  switch (this.config.keyGenerator) {
    case 'ip':
      return `ip:${request.ip}`
    case 'user':
      return request.userId ? `user:${request.userId}` : `ip:${request.ip}`
    case 'api-key':
      return request.apiKey ? `api:${request.apiKey}` : `ip:${request.ip}`
    case 'custom':
      if (this.config.customKeyExtractor) {
        const customKey = this.config.customKeyExtractor(request)
        // Validar que el resultado sea string
        return typeof customKey === 'string' ? customKey : `ip:${request.ip}`
      }
      return `ip:${request.ip}`
    default:
      return `ip:${request.ip}`
  }
}

  private isWhitelisted(key: string, request: RateLimitRequest): boolean {
    return this.config.whitelist.some(pattern => {
      // Soporte para wildcards simples
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(key) || regex.test(request.ip)
      }
      return key === pattern || request.ip === pattern
    })
  }

  private isBlacklisted(key: string, request: RateLimitRequest): boolean {
    return this.config.blacklist.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(key) || regex.test(request.ip)
      }
      return key === pattern || request.ip === pattern
    })
  }

  private async applyCustomRules(request: RateLimitRequest): Promise<RateLimitResult | null> {
    for (const rule of this.customRules) {
      if (rule.matcher(request)) {
        this.logger.debug('Custom rate limit rule matched', {
          ruleName: rule.name,
          priority: rule.priority,
        })

        // Crear un rate limiter temporal con la configuración de la regla
        const ruleConfig = { ...this.config, ...rule.config }
        const tempLimiter = new RateLimiter(ruleConfig, this.logger)
        const result = await tempLimiter.checkLimit(request)
        
        return {
          ...result,
          reason: `Custom rule: ${rule.name}`,
        }
      }
    }
    return null
  }

  private calculateDynamicLimit(request: RateLimitRequest): number {
    if (!this.config.enableDynamicLimits) {
      return this.config.maxRequests
    }

    let limit = this.config.maxRequests

    // Ajustar límite basado en el tipo de endpoint
    if (request.path.startsWith('/api/payments')) {
      limit = Math.floor(limit * 0.5) // Límite más estricto para pagos
    } else if (request.path.startsWith('/api/webhooks')) {
      limit = Math.floor(limit * 2) // Límite más permisivo para webhooks
    } else if (request.path.startsWith('/health')) {
      limit = Math.floor(limit * 10) // Muy permisivo para health checks
    }

    // Ajustar por método HTTP
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      limit = Math.floor(limit * 0.7) // Más estricto para operaciones de escritura
    }

    return Math.max(1, limit)
  }

  private createAllowedResult(key: string, current = 1, limit?: number): RateLimitResult {
    const actualLimit = limit || this.config.maxRequests
    const remaining = Math.max(0, actualLimit - current)
    const resetTime = Date.now() + this.config.windowMs

    return {
      allowed: true,
      limit: actualLimit,
      remaining,
      resetTime,
      headers: this.buildHeaders(actualLimit, remaining, resetTime),
    }
  }

  private createBurstAllowedResult(key: string, current: number, limit: number, burstLimit: number): RateLimitResult {
    const remaining = Math.max(0, burstLimit - current)
    const resetTime = Date.now() + this.config.windowMs
    const slowDown = this.config.enableSlowDown 
      ? (current - limit) * this.config.slowDownDelay 
      : 0

    return {
      allowed: true,
      limit: burstLimit,
      remaining,
      resetTime,
      slowDown,
      reason: 'Burst allowance used',
      headers: this.buildHeaders(burstLimit, remaining, resetTime),
    }
  }

  private createBlockedResult(key: string, reason: string, current?: number, limit?: number): RateLimitResult {
    const actualLimit = limit || this.config.maxRequests
    const resetTime = Date.now() + this.config.windowMs
    const retryAfter = Math.ceil(this.config.windowMs / 1000)

    return {
      allowed: false,
      limit: actualLimit,
      remaining: 0,
      resetTime,
      retryAfter,
      reason,
      headers: this.buildHeaders(actualLimit, 0, resetTime, retryAfter),
    }
  }

  private buildHeaders(limit: number, remaining: number, resetTime: number, retryAfter?: number): Record<string, string> {
    const headers: Record<string, string> = {}

    if (this.config.headers.includeHeaders) {
      headers[this.config.headers.limitHeader] = limit.toString()
      headers[this.config.headers.remainingHeader] = remaining.toString()
      headers[this.config.headers.resetHeader] = Math.ceil(resetTime / 1000).toString()

      if (retryAfter) {
        headers[this.config.headers.retryAfterHeader] = retryAfter.toString()
      }
    }

    return headers
  }

  private updateStats(allowed: boolean): void {
    if (allowed) {
      this.stats.allowedRequests++
    } else {
      this.stats.blockedRequests++
    }

    const totalRequests = this.stats.allowedRequests + this.stats.blockedRequests
    this.stats.averageRequestsPerWindow = totalRequests > 0 
      ? (this.stats.allowedRequests / totalRequests) * this.config.maxRequests
      : 0
  }

  private logRateLimitResult(request: RateLimitRequest, result: RateLimitResult, duration: number): void {
    if (!this.config.enableLogging) return

    const logData = {
      ip: request.ip,
      path: request.path,
      method: request.method,
      allowed: result.allowed,
      limit: result.limit,
      remaining: result.remaining,
      reason: result.reason,
      duration,
    }

    if (result.allowed) {
      this.logger.debug('Request allowed by rate limiter', logData)
    } else {
      this.logger.warn('Request blocked by rate limiter', logData)
    }
  }

  private initializeStats(): RateLimitStats {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageRequestsPerWindow: 0,
      topConsumers: [],
      topBlockedIPs: [],
      rateLimitDistribution: {},
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    }
  }

  private createFallbackLogger(): StructuredLogger {
    return {
      error: (msg, meta) => console.error('[RATE-LIMIT-ERROR]', msg, meta),
      warn: (msg, meta) => console.warn('[RATE-LIMIT-WARN]', msg, meta),
      info: (msg, meta) => console.info('[RATE-LIMIT-INFO]', msg, meta),
      debug: (msg, meta) => console.debug('[RATE-LIMIT-DEBUG]', msg, meta),
      trace: (msg, meta) => console.trace('[RATE-LIMIT-TRACE]', msg, meta),
      child: (meta) => this.createFallbackLogger(),
      addContext: () => {},
      setLevel: () => {},
      getLevel: () => 'info' as const,
    }
  }
}

// Utilidades para rate limiting
export class RateLimitUtils {
  /**
   * Crea configuración para diferentes entornos
   */
  static createConfigForEnvironment(environment: 'development' | 'production' | 'test'): RateLimitConfig {
    const envConfigs = {
      development: {
        windowMs: 60000, // 1 minuto
        maxRequests: 1000,
        enableBurst: true,
        burstMultiplier: 5,
        enableDynamicLimits: true,
        enableSlowDown: false,
        enableLogging: true,
        whitelist: ['127.0.0.1', 'localhost'],
      },
      production: {
        windowMs: 900000, // 15 minutos
        maxRequests: 100,
        enableBurst: true,
        burstMultiplier: 1.5,
        enableDynamicLimits: true,
        enableSlowDown: true,
        slowDownDelay: 500,
        enableLogging: false,
        keyGenerator: 'api-key' as const,
      },
      test: {
        windowMs: 60000, // 1 minuto
        maxRequests: 10000,
        enableBurst: false,
        enableLogging: false,
        whitelist: ['*'], // Permitir todo en tests
      },
    }

    return RateLimitConfigSchema.parse(envConfigs[environment])
  }

  /**
   * Crea reglas personalizadas comunes
   */
  static createCommonRules(): RateLimitRule[] {
    return [
      {
        name: 'strict-payments',
        matcher: (req) => req.path.startsWith('/api/payments'),
        config: {
          windowMs: 60000, // 1 minuto
          maxRequests: 10,
          enableBurst: false,
        },
        priority: 100,
      },
      {
        name: 'permissive-webhooks',
        matcher: (req) => req.path.startsWith('/api/webhooks'),
        config: {
          windowMs: 60000,
          maxRequests: 1000,
          keyGenerator: 'ip' as const,
        },
        priority: 90,
      },
      {
        name: 'auth-endpoints',
        matcher: (req) => req.path.includes('/auth/'),
        config: {
          windowMs: 300000, // 5 minutos
          maxRequests: 5,
          enableSlowDown: true,
          slowDownDelay: 2000,
        },
        priority: 95,
      },
      {
        name: 'health-checks',
        matcher: (req) => req.path === '/health' || req.path === '/ping',
        config: {
          maxRequests: 10000,
          enableBurst: false,
        },
        priority: 80,
      },
    ]
  }

  /**
   * Calcula tiempo óptimo de ventana basado en el volumen esperado
   */
  static calculateOptimalWindow(expectedRequestsPerHour: number, maxAllowedRequests: number): number {
    // Calcular ventana que permita distribución uniforme
    const requestsPerMinute = expectedRequestsPerHour / 60
    const optimalWindowMinutes = maxAllowedRequests / requestsPerMinute
    
    // Redondear a valores estándar
    const standardWindows = [1, 5, 10, 15, 30, 60] // minutos
    const optimalWindow = standardWindows.find(w => w >= optimalWindowMinutes) || 60
    
    return optimalWindow * 60 * 1000 // convertir a ms
  }

  /**
   * Valida configuración de rate limit
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    try {
      RateLimitConfigSchema.parse(config)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }
      }
      return { valid: false, errors: ['Unknown validation error'] }
    }
  }

  /**
   * Crea extractores de clave personalizados
   */
  static createKeyExtractors() {
    return {
      ipAndUserAgent: (req: RateLimitRequest) => 
        `${req.ip}:${req.userAgent?.substring(0, 50) || 'unknown'}`,
      
      apiKeyTier: (req: RateLimitRequest) => {
        // Extraer tier del API key (ejemplo: api_key_tier1_xxx)
        const tier = req.apiKey?.match(/tier(\d+)/)?.[1] || 'default'
        return `tier:${tier}:${req.apiKey?.substring(0, 8) || req.ip}`
      },
      
      pathAndMethod: (req: RateLimitRequest) =>
        `${req.method}:${req.path.split('/').slice(0, 3).join('/')}:${req.ip}`,
      
      geographical: (req: RateLimitRequest) => {
        // Requeriría integración con servicio de geolocalización
        const country = 'unknown' // GeoIP lookup
        return `geo:${country}:${req.ip}`
      },
    }
  }
}

// Constantes
export const RATE_LIMIT_CONSTANTS = {
  DEFAULT_WINDOW_MS: 900000, // 15 minutos
  DEFAULT_MAX_REQUESTS: 100,
  
  STANDARD_WINDOWS: {
    ONE_MINUTE: 60000,
    FIVE_MINUTES: 300000,
    FIFTEEN_MINUTES: 900000,
    ONE_HOUR: 3600000,
  } as const,
  
  KEY_GENERATORS: ['ip', 'user', 'api-key', 'custom'] as const,
  
  COMMON_LIMITS: {
    STRICT: 10,
    NORMAL: 100,
    PERMISSIVE: 1000,
    UNLIMITED: 10000,
  } as const,
  
  HEADERS: {
    LIMIT: 'X-RateLimit-Limit',
    REMAINING: 'X-RateLimit-Remaining',
    RESET: 'X-RateLimit-Reset',
    RETRY_AFTER: 'Retry-After',
  } as const,
  
  STATUS_CODES: {
    TOO_MANY_REQUESTS: 429,
  } as const,
  
  BURST_MULTIPLIERS: {
    CONSERVATIVE: 1.2,
    MODERATE: 1.5,
    AGGRESSIVE: 2.0,
    VERY_AGGRESSIVE: 3.0,
  } as const,
} as const

export default RateLimiter