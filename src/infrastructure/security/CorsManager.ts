// src/infrastructure/security/CorsManager.ts
// ──────────────────────────────────────────────────────────────────────────────
// Gestor de CORS (Cross-Origin Resource Sharing) para la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'

// Schemas de validación
const CorsConfigSchema = z.object({
  allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
  allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
  allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization', 'X-Requested-With']),
  exposedHeaders: z.array(z.string()).default(['X-Total-Count', 'X-Rate-Limit-Remaining']),
  allowCredentials: z.boolean().default(true),
  maxAge: z.number().int().min(0).max(86400).default(86400), // 24 horas máximo
  preflightContinue: z.boolean().default(false),
  optionsSuccessStatus: z.number().int().min(200).max(299).default(204),
  enableDynamicOrigins: z.boolean().default(false),
  trustedDomains: z.array(z.string()).default([]),
  blockedOrigins: z.array(z.string()).default([]),
  enableWildcardSubdomains: z.boolean().default(false),
  strictMode: z.boolean().default(true),
  enableLogging: z.boolean().default(true),
})

const CorsRequestSchema = z.object({
  origin: z.string().optional(),
  method: z.string(),
  headers: z.record(z.string()),
  path: z.string(),
  userAgent: z.string().optional(),
  referer: z.string().optional(),
})

// Tipos exportados
export type CorsConfig = z.infer<typeof CorsConfigSchema>
export type CorsRequest = z.infer<typeof CorsRequestSchema>

// Resultado de validación CORS
export interface CorsValidationResult {
  allowed: boolean
  headers: Record<string, string>
  statusCode: number
  reason?: string
  matchedRule?: string
}

// Información de origen
export interface OriginInfo {
  origin: string
  protocol: string
  hostname: string
  port?: string
  subdomain?: string
  domain: string
  tld: string
}

// Regla de CORS personalizada
export interface CorsRule {
  name: string
  matcher: (request: CorsRequest) => boolean
  config: Partial<CorsConfig>
  priority: number
}

// Estadísticas de CORS
export interface CorsStatistics {
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  allowRate: number
  topOrigins: Array<{ origin: string; count: number }>
  topBlockedOrigins: Array<{ origin: string; count: number }>
  methodDistribution: Record<string, number>
  timeRange: { start: string; end: string }
}

// Gestor principal de CORS
export class CorsManager {
  private config: CorsConfig
  private logger: StructuredLogger
  private customRules: CorsRule[] = []
  private stats: CorsStatistics
  private allowedOriginsCache = new Map<string, boolean>()
  private cacheExpiry = new Map<string, number>()

  constructor(config: Partial<CorsConfig> = {}, logger?: StructuredLogger) {
    this.config = CorsConfigSchema.parse(config)
    this.logger = logger?.child({ component: 'CorsManager' }) || this.createFallbackLogger()
    this.stats = this.initializeStats()
  }

  /**
   * Valida una petición CORS
   */
  validateRequest(request: CorsRequest): CorsValidationResult {
    const startTime = Date.now()
    
    try {
      // Validar esquema de request
      const validatedRequest = CorsRequestSchema.parse(request)
      
      // Incrementar estadísticas
      this.stats.totalRequests++
      this.stats.methodDistribution[validatedRequest.method] = 
        (this.stats.methodDistribution[validatedRequest.method] || 0) + 1

      // Verificar si es una petición preflight
      const isPreflight = validatedRequest.method === 'OPTIONS'
      
      // Aplicar reglas personalizadas primero
      const customRuleResult = this.applyCustomRules(validatedRequest)
      if (customRuleResult) {
        this.updateStats(validatedRequest, customRuleResult.allowed)
        this.logCorsResult(validatedRequest, customRuleResult, Date.now() - startTime)
        return customRuleResult
      }

      // Validar origen
      const originValidation = this.validateOrigin(validatedRequest.origin)
      if (!originValidation.allowed) {
        const result: CorsValidationResult = {
          allowed: false,
          headers: {},
          statusCode: 403,
          reason: originValidation.reason,
        }
        this.updateStats(validatedRequest, false)
        this.logCorsResult(validatedRequest, result, Date.now() - startTime)
        return result
      }

      // Validar método
      const methodValidation = this.validateMethod(validatedRequest.method, isPreflight)
      if (!methodValidation.allowed) {
        const result: CorsValidationResult = {
          allowed: false,
          headers: {},
          statusCode: 405,
          reason: methodValidation.reason,
        }
        this.updateStats(validatedRequest, false)
        this.logCorsResult(validatedRequest, result, Date.now() - startTime)
        return result
      }

      // Validar headers para peticiones preflight
      if (isPreflight) {
        const requestedHeaders = this.extractRequestedHeaders(validatedRequest.headers)
        const headerValidation = this.validateHeaders(requestedHeaders)
        if (!headerValidation.allowed) {
          const result: CorsValidationResult = {
            allowed: false,
            headers: {},
            statusCode: 400,
            reason: headerValidation.reason,
          }
          this.updateStats(validatedRequest, false)
          this.logCorsResult(validatedRequest, result, Date.now() - startTime)
          return result
        }
      }

      // Construir headers de respuesta
      const responseHeaders = this.buildResponseHeaders(validatedRequest, isPreflight)
      
      const result: CorsValidationResult = {
        allowed: true,
        headers: responseHeaders,
        statusCode: isPreflight ? this.config.optionsSuccessStatus : 200,
      }

      this.updateStats(validatedRequest, true)
      this.logCorsResult(validatedRequest, result, Date.now() - startTime)
      return result

    } catch (error) {
      this.logger.error('Error validating CORS request', {
        error: error instanceof Error ? error.message : String(error),
        request: this.sanitizeRequest(request),
        duration: Date.now() - startTime,
      })

      return {
        allowed: false,
        headers: {},
        statusCode: 500,
        reason: 'Internal server error during CORS validation',
      }
    }
  }

  /**
   * Añade una regla personalizada de CORS
   */
  addCustomRule(rule: CorsRule): void {
    this.customRules.push(rule)
    // Ordenar por prioridad (mayor prioridad primero)
    this.customRules.sort((a, b) => b.priority - a.priority)
    
    this.logger.info('Custom CORS rule added', {
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
      this.logger.info('Custom CORS rule removed', {
        ruleName,
        remainingRules: this.customRules.length,
      })
    }
    
    return removed
  }

  /**
   * Actualiza la configuración de CORS
   */
  updateConfig(newConfig: Partial<CorsConfig>): void {
    const oldConfig = { ...this.config }
    this.config = CorsConfigSchema.parse({ ...this.config, ...newConfig })
    
    // Limpiar caché si cambiaron los orígenes permitidos
    if (JSON.stringify(oldConfig.allowedOrigins) !== JSON.stringify(this.config.allowedOrigins)) {
      this.clearOriginCache()
    }
    
    this.logger.info('CORS configuration updated', {
      changes: this.getConfigChanges(oldConfig, this.config),
    })
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): CorsConfig {
    return { ...this.config }
  }

  /**
   * Obtiene estadísticas de CORS
   */
  getStatistics(): CorsStatistics {
    return { ...this.stats }
  }

  /**
   * Reinicia estadísticas
   */
  resetStatistics(): void {
    this.stats = this.initializeStats()
    this.logger.info('CORS statistics reset')
  }

  /**
   * Limpia caché de orígenes
   */
  clearOriginCache(): void {
    this.allowedOriginsCache.clear()
    this.cacheExpiry.clear()
    this.logger.debug('CORS origin cache cleared')
  }

  /**
   * Verifica si un origen está permitido
   */
  isOriginAllowed(origin: string): boolean {
    return this.validateOrigin(origin).allowed
  }

  /**
   * Genera configuración de middleware Express
   */
  toExpressMiddleware(): (req: any, res: any, next: any) => void {
    return (req, res, next) => {
      const corsRequest: CorsRequest = {
        origin: req.headers.origin,
        method: req.method,
        headers: req.headers,
        path: req.path,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      }

      const result = this.validateRequest(corsRequest)
      
      // Establecer headers CORS
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })

      if (!result.allowed) {
        res.status(result.statusCode).json({
          error: 'CORS policy violation',
          message: result.reason,
        })
        return
      }

      // Para peticiones OPTIONS, terminar aquí
      if (req.method === 'OPTIONS') {
        res.status(result.statusCode).end()
        return
      }

      next()
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private validateOrigin(origin?: string): { allowed: boolean; reason?: string } {
    // Permitir peticiones sin origen (same-origin, mobile apps, etc.)
    if (!origin) {
      return { allowed: true }
    }

    // Verificar caché
    const cached = this.getCachedOriginResult(origin)
    if (cached !== undefined) {
      return { allowed: cached }
    }

    // Verificar lista de orígenes bloqueados
    if (this.config.blockedOrigins.includes(origin)) {
      this.setCachedOriginResult(origin, false)
      return { allowed: false, reason: 'Origin is explicitly blocked' }
    }

    // Verificar orígenes permitidos exactos
    if (this.config.allowedOrigins.includes(origin) || this.config.allowedOrigins.includes('*')) {
      this.setCachedOriginResult(origin, true)
      return { allowed: true }
    }

    // Verificar subdominios si está habilitado
    if (this.config.enableWildcardSubdomains) {
      const isSubdomainAllowed = this.checkWildcardSubdomains(origin)
      if (isSubdomainAllowed) {
        this.setCachedOriginResult(origin, true)
        return { allowed: true }
      }
    }

    // Verificar dominios confiables
    if (this.config.trustedDomains.length > 0) {
      const isTrustedDomain = this.checkTrustedDomains(origin)
      if (isTrustedDomain) {
        this.setCachedOriginResult(origin, true)
        return { allowed: true }
      }
    }

    // Verificar orígenes dinámicos si está habilitado
    if (this.config.enableDynamicOrigins) {
      const isDynamicAllowed = this.checkDynamicOrigin(origin)
      if (isDynamicAllowed) {
        this.setCachedOriginResult(origin, true)
        return { allowed: true }
      }
    }

    this.setCachedOriginResult(origin, false)
    return { 
      allowed: false, 
      reason: this.config.strictMode ? 'Origin not in allowed list' : 'Origin validation failed'
    }
  }

  private validateMethod(method: string, isPreflight: boolean): { allowed: boolean; reason?: string } {
    if (isPreflight) {
      // Para preflight, siempre permitir OPTIONS
      return { allowed: true }
    }

    if (this.config.allowedMethods.includes(method) || this.config.allowedMethods.includes('*')) {
      return { allowed: true }
    }

    return { 
      allowed: false, 
      reason: `Method ${method} not allowed` 
    }
  }

  private validateHeaders(requestedHeaders: string[]): { allowed: boolean; reason?: string } {
    if (this.config.allowedHeaders.includes('*')) {
      return { allowed: true }
    }

    const allowedHeadersLower = this.config.allowedHeaders.map(h => h.toLowerCase())
    const unauthorizedHeaders = requestedHeaders.filter(
      header => !allowedHeadersLower.includes(header.toLowerCase())
    )

    if (unauthorizedHeaders.length > 0) {
      return {
        allowed: false,
        reason: `Headers not allowed: ${unauthorizedHeaders.join(', ')}`
      }
    }

    return { allowed: true }
  }

  private buildResponseHeaders(request: CorsRequest, isPreflight: boolean): Record<string, string> {
    const headers: Record<string, string> = {}

    // Access-Control-Allow-Origin
    if (request.origin) {
      headers['Access-Control-Allow-Origin'] = this.config.allowedOrigins.includes('*') 
        ? '*' 
        : request.origin
    } else {
      headers['Access-Control-Allow-Origin'] = '*'
    }

    // Access-Control-Allow-Credentials
    if (this.config.allowCredentials && !this.config.allowedOrigins.includes('*')) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    // Headers específicos para preflight
    if (isPreflight) {
      headers['Access-Control-Allow-Methods'] = this.config.allowedMethods.join(', ')
      headers['Access-Control-Allow-Headers'] = this.config.allowedHeaders.join(', ')
      headers['Access-Control-Max-Age'] = this.config.maxAge.toString()
    }

    // Access-Control-Expose-Headers
    if (this.config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = this.config.exposedHeaders.join(', ')
    }

    // Vary header para caching correcto
    headers['Vary'] = 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'

    return headers
  }

  private extractRequestedHeaders(headers: Record<string, string>): string[] {
    const requestedHeaders = headers['access-control-request-headers']
    if (!requestedHeaders) return []
    
    return requestedHeaders
      .split(',')
      .map(header => header.trim())
      .filter(header => header.length > 0)
  }

  private applyCustomRules(request: CorsRequest): CorsValidationResult | null {
    for (const rule of this.customRules) {
      if (rule.matcher(request)) {
        this.logger.debug('Custom CORS rule matched', {
          ruleName: rule.name,
          priority: rule.priority,
          origin: request.origin,
          method: request.method,
        })

        // Aplicar configuración de la regla
        const ruleConfig = { ...this.config, ...rule.config }
        const tempManager = new CorsManager(ruleConfig)
        const result = tempManager.validateRequest(request)
        result.matchedRule = rule.name
        return result
      }
    }
    return null
  }

  private checkWildcardSubdomains(origin: string): boolean {
    try {
      const originInfo = this.parseOrigin(origin)
      
      return this.config.allowedOrigins.some(allowedOrigin => {
        if (!allowedOrigin.startsWith('*.')) return false
        
        const domain = allowedOrigin.substring(2) // Remover "*."
        return originInfo.hostname.endsWith(`.${domain}`) || originInfo.hostname === domain
      })
    } catch {
      return false
    }
  }

  private checkTrustedDomains(origin: string): boolean {
    try {
      const originInfo = this.parseOrigin(origin)
      
      return this.config.trustedDomains.some(trustedDomain => {
        return originInfo.domain === trustedDomain || originInfo.hostname.endsWith(`.${trustedDomain}`)
      })
    } catch {
      return false
    }
  }

  private checkDynamicOrigin(origin: string): boolean {
    try {
      const originInfo = this.parseOrigin(origin)
      
      // Lógica personalizable para orígenes dinámicos
      // Por ejemplo, permitir localhost en desarrollo
      if (process.env.NODE_ENV === 'development') {
        if (originInfo.hostname === 'localhost' || originInfo.hostname === '127.0.0.1') {
          return true
        }
      }
      
      // Permitir dominios con https
      if (originInfo.protocol === 'https:') {
        return true
      }
      
      return false
    } catch {
      return false
    }
  }

  private parseOrigin(origin: string): OriginInfo {
    const url = new URL(origin)
    const hostnameParts = url.hostname.split('.')
    
    return {
      origin,
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      subdomain: hostnameParts.length > 2 ? hostnameParts[0] : undefined,
      domain: hostnameParts.slice(-2).join('.'),
      tld: hostnameParts[hostnameParts.length - 1],
    }
  }

  private getCachedOriginResult(origin: string): boolean | undefined {
    const expiry = this.cacheExpiry.get(origin)
    if (expiry && Date.now() > expiry) {
      this.allowedOriginsCache.delete(origin)
      this.cacheExpiry.delete(origin)
      return undefined
    }
    return this.allowedOriginsCache.get(origin)
  }

  private setCachedOriginResult(origin: string, allowed: boolean): void {
    this.allowedOriginsCache.set(origin, allowed)
    this.cacheExpiry.set(origin, Date.now() + (this.config.maxAge * 1000))
  }

  private updateStats(request: CorsRequest, allowed: boolean): void {
    if (allowed) {
      this.stats.allowedRequests++
    } else {
      this.stats.blockedRequests++
      
      if (request.origin) {
        const blocked = this.stats.topBlockedOrigins.find(item => item.origin === request.origin)
        if (blocked) {
          blocked.count++
        } else {
          this.stats.topBlockedOrigins.push({ origin: request.origin, count: 1 })
        }
        // Mantener solo top 10
        this.stats.topBlockedOrigins.sort((a, b) => b.count - a.count).splice(10)
      }
    }

    if (request.origin) {
      const origin = this.stats.topOrigins.find(item => item.origin === request.origin)
      if (origin) {
        origin.count++
      } else {
        this.stats.topOrigins.push({ origin: request.origin, count: 1 })
      }
      // Mantener solo top 10
      this.stats.topOrigins.sort((a, b) => b.count - a.count).splice(10)
    }

    this.stats.allowRate = this.stats.totalRequests > 0 
      ? (this.stats.allowedRequests / this.stats.totalRequests) * 100 
      : 0
  }

  private logCorsResult(request: CorsRequest, result: CorsValidationResult, duration: number): void {
    if (!this.config.enableLogging) return

    const logData = {
      origin: request.origin,
      method: request.method,
      path: request.path,
      allowed: result.allowed,
      statusCode: result.statusCode,
      reason: result.reason,
      matchedRule: result.matchedRule,
      duration,
      userAgent: request.userAgent,
    }

    if (result.allowed) {
      this.logger.debug('CORS request allowed', logData)
    } else {
      this.logger.warn('CORS request blocked', logData)
    }
  }

  private sanitizeRequest(request: Partial<CorsRequest>): Partial<CorsRequest> {
    return {
      origin: request.origin,
      method: request.method,
      path: request.path,
      // Omitir headers completos por seguridad
    }
  }

  private getConfigChanges(oldConfig: CorsConfig, newConfig: CorsConfig): Record<string, any> {
    const changes: Record<string, any> = {}
    
    Object.keys(newConfig).forEach(key => {
      const oldValue = (oldConfig as any)[key]
      const newValue = (newConfig as any)[key]
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { from: oldValue, to: newValue }
      }
    })
    
    return changes
  }

  private initializeStats(): CorsStatistics {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      allowRate: 0,
      topOrigins: [],
      topBlockedOrigins: [],
      methodDistribution: {},
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    }
  }

  private createFallbackLogger(): StructuredLogger {
    return {
      error: (msg, meta) => console.error('[CORS-ERROR]', msg, meta),
      warn: (msg, meta) => console.warn('[CORS-WARN]', msg, meta),
      info: (msg, meta) => console.info('[CORS-INFO]', msg, meta),
      debug: (msg, meta) => console.debug('[CORS-DEBUG]', msg, meta),
      trace: (msg, meta) => console.trace('[CORS-TRACE]', msg, meta),
      child: (meta) => this.createFallbackLogger(),
      addContext: () => {},
      setLevel: () => {},
      getLevel: () => 'info' as const,
    }
  }
}

// Utilidades para CORS
export class CorsUtils {
  /**
   * Crea configuración CORS para diferentes entornos
   */
  static createConfigForEnvironment(environment: 'development' | 'production' | 'test'): CorsConfig {
    const envConfigs = {
      development: {
        allowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['*'],
        allowCredentials: true,
        enableDynamicOrigins: true,
        enableWildcardSubdomains: true,
        strictMode: false,
        enableLogging: true,
      },
      production: {
        allowedOrigins: ['https://multipaga.com', 'https://api.multipaga.com'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
        exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
        allowCredentials: true,
        enableWildcardSubdomains: false,
        strictMode: true,
        enableLogging: false,
        trustedDomains: ['multipaga.com'],
      },
      test: {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: false,
        enableLogging: false,
        strictMode: false,
      },
    }

    return CorsConfigSchema.parse(envConfigs[environment])
  }

  /**
   * Crea reglas CORS personalizadas comunes
   */
  static createCommonRules(): CorsRule[] {
    return [
      {
        name: 'api-endpoints',
        matcher: (req) => req.path.startsWith('/api/'),
        config: {
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
          maxAge: 3600,
        },
        priority: 100,
      },
      {
        name: 'webhook-endpoints',
        matcher: (req) => req.path.startsWith('/webhooks/'),
        config: {
          allowedMethods: ['POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'X-Webhook-Signature'],
          allowCredentials: false,
        },
        priority: 90,
      },
      {
        name: 'health-check',
        matcher: (req) => req.path === '/health' || req.path === '/ping',
        config: {
          allowedOrigins: ['*'],
          allowedMethods: ['GET', 'HEAD'],
          allowCredentials: false,
        },
        priority: 80,
      },
    ]
  }

  /**
   * Valida una configuración CORS
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    try {
      CorsConfigSchema.parse(config)
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
   * Genera middleware Next.js
   */
  static createNextJSMiddleware(corsManager: CorsManager) {
    return async (req: any, res: any) => {
      const corsRequest: CorsRequest = {
        origin: req.headers.origin,
        method: req.method,
        headers: req.headers,
        path: req.nextUrl?.pathname || req.url,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      }

      const result = corsManager.validateRequest(corsRequest)
      
      // Establecer headers CORS en la respuesta
      Object.entries(result.headers).forEach(([key, value]) => {
        res.headers.set(key, value)
      })

      if (!result.allowed) {
        return new Response(JSON.stringify({
          error: 'CORS policy violation',
          message: result.reason,
        }), {
          status: result.statusCode,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Para peticiones OPTIONS, retornar respuesta inmediata
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: result.statusCode,
          headers: result.headers,
        })
      }
    }
  }
}

// Constantes de CORS
export const CORS_CONSTANTS = {
  DEFAULT_ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as const,
  
  DEFAULT_ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ] as const,
  
  DEFAULT_EXPOSED_HEADERS: [
    'X-Total-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
  ] as const,
  
  STANDARD_PORTS: {
    HTTP: 80,
    HTTPS: 443,
  } as const,
  
  CACHE_DURATION: {
    DEFAULT: 86400, // 24 horas
    SHORT: 3600,    // 1 hora
    LONG: 604800,   // 7 días
  } as const,
  
  HTTP_METHODS: [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
    'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'
  ] as const,
  
  SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'] as const,
  
  SIMPLE_HEADERS: [
    'accept',
    'accept-language',
    'content-language',
    'content-type',
  ] as const,
} as const

export default CorsManager