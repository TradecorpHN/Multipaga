// src/infrastructure/security/HeaderValidator.ts
// ──────────────────────────────────────────────────────────────────────────────
// Validador de headers HTTP para seguridad en la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'

// Schemas de validación
const HeaderValidationConfigSchema = z.object({
  enableContentTypeValidation: z.boolean().default(true),
  allowedContentTypes: z.array(z.string()).default([
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ]),
  enableUserAgentValidation: z.boolean().default(true),
  blockedUserAgents: z.array(z.string()).default([]),
  enableAuthorizationValidation: z.boolean().default(true),
  requiredHeadersForPaths: z.record(z.array(z.string())).default({}),
  forbiddenHeaders: z.array(z.string()).default([]),
  enableXSSProtection: z.boolean().default(true),
  enableCSRFProtection: z.boolean().default(true),
  enableHSTSValidation: z.boolean().default(true),
  maxHeaderSize: z.number().default(8192), // 8KB
  maxHeaderCount: z.number().default(100),
  enableSanitization: z.boolean().default(true),
  customValidationRules: z.array(z.any()).default([]),
  enableLogging: z.boolean().default(true),
  strictMode: z.boolean().default(false),
})

const HeaderValidationRequestSchema = z.object({
  method: z.string(),
  path: z.string(),
  headers: z.record(z.string()),
  body: z.any().optional(),
  query: z.record(z.string()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
})

// Tipos exportados
export type HeaderValidationConfig = z.infer<typeof HeaderValidationConfigSchema>
export type HeaderValidationRequest = z.infer<typeof HeaderValidationRequestSchema>

// Resultado de validación
export interface HeaderValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sanitizedHeaders: Record<string, string>
  securityScore: number
  recommendedHeaders: Record<string, string>
}

export interface ValidationError {
  type: 'forbidden_header' | 'missing_header' | 'invalid_format' | 'size_limit' | 'security_violation'
  header: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  remediation?: string
}

export interface ValidationWarning {
  type: 'deprecated_header' | 'insecure_value' | 'missing_security_header' | 'performance_issue'
  header: string
  message: string
  recommendation: string
}

// Regla de validación personalizada
export interface CustomValidationRule {
  name: string
  matcher: (request: HeaderValidationRequest) => boolean
  validator: (headers: Record<string, string>) => ValidationError[]
  priority: number
}

// Estadísticas de validación
export interface HeaderValidationStats {
  totalRequests: number
  validRequests: number
  invalidRequests: number
  securityViolations: number
  averageSecurityScore: number
  commonErrors: Array<{ error: string; count: number }>
  headerDistribution: Record<string, number>
  timeRange: { start: string; end: string }
}

// Validador principal de headers
export class HeaderValidator {
  private config: HeaderValidationConfig
  private logger: StructuredLogger
  private customRules: CustomValidationRule[] = []
  private stats: HeaderValidationStats

  constructor(config: Partial<HeaderValidationConfig> = {}, logger?: StructuredLogger) {
    this.config = HeaderValidationConfigSchema.parse(config)
    this.logger = logger?.child({ component: 'HeaderValidator' }) || this.createFallbackLogger()
    this.stats = this.initializeStats()
  }

  /**
   * Valida headers de una petición HTTP
   */
  validateHeaders(request: HeaderValidationRequest): HeaderValidationResult {
    const startTime = Date.now()
    
    try {
      // Validar esquema de request
      const validatedRequest = HeaderValidationRequestSchema.parse(request)
      
      // Incrementar estadísticas
      this.stats.totalRequests++

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      let sanitizedHeaders = { ...validatedRequest.headers }

      // Validaciones básicas
      this.validateHeaderSize(validatedRequest.headers, errors)
      this.validateHeaderCount(validatedRequest.headers, errors)
      this.validateForbiddenHeaders(validatedRequest.headers, errors)
      this.validateRequiredHeaders(validatedRequest, errors)

      // Validaciones específicas
      if (this.config.enableContentTypeValidation) {
        this.validateContentType(validatedRequest, errors)
      }

      if (this.config.enableUserAgentValidation) {
        this.validateUserAgent(validatedRequest.headers, errors, warnings)
      }

      if (this.config.enableAuthorizationValidation) {
        this.validateAuthorization(validatedRequest.headers, errors, warnings)
      }

      // Validaciones de seguridad
      if (this.config.enableXSSProtection) {
        this.validateXSSProtection(validatedRequest.headers, warnings)
      }

      if (this.config.enableCSRFProtection) {
        this.validateCSRFProtection(validatedRequest, errors, warnings)
      }

      if (this.config.enableHSTSValidation) {
        this.validateHSTS(validatedRequest.headers, warnings)
      }

      // Aplicar reglas personalizadas
      this.applyCustomRules(validatedRequest, errors)

      // Sanitizar headers si está habilitado
      if (this.config.enableSanitization) {
        sanitizedHeaders = this.sanitizeHeaders(sanitizedHeaders)
      }

      // Calcular score de seguridad
      const securityScore = this.calculateSecurityScore(validatedRequest.headers, errors, warnings)

      // Generar headers de seguridad recomendados
      const recommendedHeaders = this.generateSecurityHeaders(validatedRequest)

      const result: HeaderValidationResult = {
        valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
        errors,
        warnings,
        sanitizedHeaders,
        securityScore,
        recommendedHeaders,
      }

      // Actualizar estadísticas
      this.updateStats(result)
      this.logValidationResult(validatedRequest, result, Date.now() - startTime)

      return result

    } catch (error) {
      this.logger.error('Error validating headers', {
        error: error instanceof Error ? error.message : String(error),
        path: request.path,
        method: request.method,
        duration: Date.now() - startTime,
      })

      return {
        valid: false,
        errors: [{
          type: 'security_violation',
          header: 'validation',
          message: 'Internal validation error',
          severity: 'critical',
        }],
        warnings: [],
        sanitizedHeaders: {},
        securityScore: 0,
        recommendedHeaders: {},
      }
    }
  }

  /**
   * Añade una regla de validación personalizada
   */
  addCustomRule(rule: CustomValidationRule): void {
    this.customRules.push(rule)
    this.customRules.sort((a, b) => b.priority - a.priority)
    
    this.logger.info('Custom validation rule added', {
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
      this.logger.info('Custom validation rule removed', {
        ruleName,
        remainingRules: this.customRules.length,
      })
    }
    
    return removed
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<HeaderValidationConfig>): void {
    this.config = HeaderValidationConfigSchema.parse({ ...this.config, ...newConfig })
    this.logger.info('Header validation configuration updated')
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): HeaderValidationConfig {
    return { ...this.config }
  }

  /**
   * Obtiene estadísticas de validación
   */
  getStatistics(): HeaderValidationStats {
    return { ...this.stats }
  }

  /**
   * Reinicia estadísticas
   */
  resetStatistics(): void {
    this.stats = this.initializeStats()
    this.logger.info('Header validation statistics reset')
  }

  /**
   * Valida headers específicos de la API de Hyperswitch
   */
  validateHyperswitchHeaders(headers: Record<string, string>): HeaderValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validar API Key
    const apiKey = headers['api-key'] || headers['authorization']
    if (!apiKey) {
      errors.push({
        type: 'missing_header',
        header: 'api-key',
        message: 'API key is required for Hyperswitch requests',
        severity: 'critical',
        remediation: 'Include api-key header with valid API key',
      })
    } else if (apiKey.length < 20) {
      errors.push({
        type: 'invalid_format',
        header: 'api-key',
        message: 'API key format appears invalid',
        severity: 'high',
      })
    }

    // Validar headers de contexto
    const merchantId = headers['x-merchant-id']
    const profileId = headers['x-profile-id']

    if (!merchantId) {
      warnings.push({
        type: 'missing_security_header',
        header: 'x-merchant-id',
        message: 'Merchant ID not provided',
        recommendation: 'Include X-Merchant-Id header for better request context',
      })
    }

    if (!profileId) {
      warnings.push({
        type: 'missing_security_header',
        header: 'x-profile-id',
        message: 'Profile ID not provided',
        recommendation: 'Include X-Profile-Id header for profile-specific requests',
      })
    }

    // Validar Content-Type para requests con body
    const contentType = headers['content-type']
    if (!contentType) {
      warnings.push({
        type: 'missing_security_header',
        header: 'content-type',
        message: 'Content-Type not specified',
        recommendation: 'Specify Content-Type header',
      })
    }

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      sanitizedHeaders: headers,
      securityScore: this.calculateSecurityScore(headers, errors, warnings),
      recommendedHeaders: this.generateHyperswitchSecurityHeaders(),
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private validateHeaderSize(headers: Record<string, string>, errors: ValidationError[]): void {
    const totalSize = Object.entries(headers)
      .reduce((size, [key, value]) => size + key.length + (value?.length || 0), 0)

    if (totalSize > this.config.maxHeaderSize) {
      errors.push({
        type: 'size_limit',
        header: 'total',
        message: `Total header size ${totalSize} exceeds limit ${this.config.maxHeaderSize}`,
        severity: 'high',
        remediation: 'Reduce header size or split into multiple requests',
      })
    }
  }

  private validateHeaderCount(headers: Record<string, string>, errors: ValidationError[]): void {
    const headerCount = Object.keys(headers).length

    if (headerCount > this.config.maxHeaderCount) {
      errors.push({
        type: 'size_limit',
        header: 'count',
        message: `Header count ${headerCount} exceeds limit ${this.config.maxHeaderCount}`,
        severity: 'medium',
        remediation: 'Reduce number of headers',
      })
    }
  }

  private validateForbiddenHeaders(headers: Record<string, string>, errors: ValidationError[]): void {
    this.config.forbiddenHeaders.forEach(forbiddenHeader => {
      const headerName = forbiddenHeader.toLowerCase()
      const found = Object.keys(headers).find(key => key.toLowerCase() === headerName)
      
      if (found) {
        errors.push({
          type: 'forbidden_header',
          header: found,
          message: `Header ${found} is forbidden`,
          severity: 'high',
          remediation: `Remove ${found} header`,
        })
      }
    })
  }

  private validateRequiredHeaders(request: HeaderValidationRequest, errors: ValidationError[]): void {
    const pathRules = this.config.requiredHeadersForPaths[request.path] || []
    
    pathRules.forEach(requiredHeader => {
      const headerName = requiredHeader.toLowerCase()
      const found = Object.keys(request.headers).find(key => key.toLowerCase() === headerName)
      
      if (!found) {
        errors.push({
          type: 'missing_header',
          header: requiredHeader,
          message: `Required header ${requiredHeader} is missing for path ${request.path}`,
          severity: 'high',
          remediation: `Include ${requiredHeader} header`,
        })
      }
    })
  }

  private validateContentType(request: HeaderValidationRequest, errors: ValidationError[]): void {
    const contentType = request.headers['content-type']
    
    // Solo validar Content-Type para métodos con body
    if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
      if (!contentType) {
        errors.push({
          type: 'missing_header',
          header: 'content-type',
          message: 'Content-Type header is required for requests with body',
          severity: 'medium',
          remediation: 'Include Content-Type header',
        })
        return
      }

      const baseType = contentType.split(';')[0].trim().toLowerCase()
      if (!this.config.allowedContentTypes.includes(baseType)) {
        errors.push({
          type: 'invalid_format',
          header: 'content-type',
          message: `Content-Type ${baseType} is not allowed`,
          severity: 'medium',
          remediation: `Use one of: ${this.config.allowedContentTypes.join(', ')}`,
        })
      }
    }
  }

  private validateUserAgent(headers: Record<string, string>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const userAgent = headers['user-agent']
    
    if (!userAgent) {
      warnings.push({
        type: 'missing_security_header',
        header: 'user-agent',
        message: 'User-Agent header is missing',
        recommendation: 'Include User-Agent for better request tracking',
      })
      return
    }

    // Verificar user agents bloqueados
    const isBlocked = this.config.blockedUserAgents.some(blocked => 
      userAgent.toLowerCase().includes(blocked.toLowerCase())
    )

    if (isBlocked) {
      errors.push({
        type: 'security_violation',
        header: 'user-agent',
        message: 'User-Agent is blocked',
        severity: 'high',
      })
    }

    // Detectar bots sospechosos
    const suspiciousBots = ['bot', 'crawler', 'spider', 'scraper']
    const isSuspicious = suspiciousBots.some(bot => 
      userAgent.toLowerCase().includes(bot)
    )

    if (isSuspicious) {
      warnings.push({
        type: 'insecure_value',
        header: 'user-agent',
        message: 'Potential bot activity detected',
        recommendation: 'Verify if this is legitimate automated traffic',
      })
    }
  }

  private validateAuthorization(headers: Record<string, string>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const authorization = headers['authorization']
    const apiKey = headers['api-key']
    
    if (!authorization && !apiKey) {
      warnings.push({
        type: 'missing_security_header',
        header: 'authorization',
        message: 'No authentication header found',
        recommendation: 'Include Authorization or API-Key header',
      })
      return
    }

    if (authorization) {
      // Validar formato Bearer token
      if (authorization.startsWith('Bearer ')) {
        const token = authorization.substring(7)
        if (token.length < 20) {
          errors.push({
            type: 'invalid_format',
            header: 'authorization',
            message: 'Bearer token appears too short',
            severity: 'medium',
          })
        }
      } else if (authorization.startsWith('Basic ')) {
        warnings.push({
          type: 'insecure_value',
          header: 'authorization',
          message: 'Basic authentication detected',
          recommendation: 'Consider using Bearer tokens for better security',
        })
      }
    }
  }

  private validateXSSProtection(headers: Record<string, string>, warnings: ValidationWarning[]): void {
    const xssProtection = headers['x-xss-protection']
    
    if (!xssProtection) {
      warnings.push({
        type: 'missing_security_header',
        header: 'x-xss-protection',
        message: 'X-XSS-Protection header not set',
        recommendation: 'Set X-XSS-Protection: 1; mode=block',
      })
    } else if (xssProtection !== '1; mode=block') {
      warnings.push({
        type: 'insecure_value',
        header: 'x-xss-protection',
        message: 'X-XSS-Protection not optimally configured',
        recommendation: 'Use X-XSS-Protection: 1; mode=block',
      })
    }
  }

  private validateCSRFProtection(request: HeaderValidationRequest, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Solo validar CSRF para métodos de modificación
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
      return
    }

    const csrfToken = request.headers['x-csrf-token'] || request.headers['x-xsrf-token']
    const origin = request.headers['origin']
    const referer = request.headers['referer']

    if (!csrfToken && !origin && !referer) {
      warnings.push({
        type: 'missing_security_header',
        header: 'csrf-protection',
        message: 'No CSRF protection headers found',
        recommendation: 'Include X-CSRF-Token, Origin, or Referer header',
      })
    }
  }

  private validateHSTS(headers: Record<string, string>, warnings: ValidationWarning[]): void {
    const hsts = headers['strict-transport-security']
    
    if (!hsts) {
      warnings.push({
        type: 'missing_security_header',
        header: 'strict-transport-security',
        message: 'HSTS header not set',
        recommendation: 'Set Strict-Transport-Security for HTTPS security',
      })
    }
  }

  private applyCustomRules(request: HeaderValidationRequest, errors: ValidationError[]): void {
    this.customRules.forEach(rule => {
      if (rule.matcher(request)) {
        const ruleErrors = rule.validator(request.headers)
        errors.push(...ruleErrors)
        
        this.logger.debug('Custom validation rule applied', {
          ruleName: rule.name,
          errorsFound: ruleErrors.length,
        })
      }
    })
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {}
    
    Object.entries(headers).forEach(([key, value]) => {
      // Limpiar caracteres peligrosos
      const cleanKey = key.replace(/[^\w-]/g, '').toLowerCase()
      const cleanValue = value
        .replace(/[<>\"']/g, '') // Remover caracteres XSS
        .replace(/\r?\n/g, '') // Remover line breaks
        .trim()
        .substring(0, 1000) // Limitar longitud
      
      if (cleanKey && cleanValue) {
        sanitized[cleanKey] = cleanValue
      }
    })
    
    return sanitized
  }

  private calculateSecurityScore(headers: Record<string, string>, errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100

    // Penalizar errores
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': score -= 25; break
        case 'high': score -= 15; break
        case 'medium': score -= 10; break
        case 'low': score -= 5; break
      }
    })

    // Penalizar warnings
    warnings.forEach(warning => {
      score -= 2
    })

    // Bonificar headers de seguridad
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
      'content-security-policy',
      'x-xss-protection'
    ]

    securityHeaders.forEach(header => {
      if (headers[header]) {
        score += 5
      }
    })

    return Math.max(0, Math.min(100, score))
  }

  private generateSecurityHeaders(request: HeaderValidationRequest): Record<string, string> {
    const securityHeaders: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }

    // Añadir HSTS solo para HTTPS
    if (request.headers['x-forwarded-proto'] === 'https') {
      securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    }

    // CSP básico para APIs
    if (request.path.startsWith('/api/')) {
      securityHeaders['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
    }

    return securityHeaders
  }

  private generateHyperswitchSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-API-Version': '2024-01-01',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  }

  private updateStats(result: HeaderValidationResult): void {
    if (result.valid) {
      this.stats.validRequests++
    } else {
      this.stats.invalidRequests++
    }

    // Contar violaciones de seguridad
    const securityViolations = result.errors.filter(e => 
      e.type === 'security_violation' || e.severity === 'critical'
    ).length

    this.stats.securityViolations += securityViolations

    // Actualizar score promedio
    const totalRequests = this.stats.validRequests + this.stats.invalidRequests
    this.stats.averageSecurityScore = 
      ((this.stats.averageSecurityScore * (totalRequests - 1)) + result.securityScore) / totalRequests

    // Contar errores comunes
    result.errors.forEach(error => {
      const errorKey = `${error.type}:${error.header}`
      const existing = this.stats.commonErrors.find(e => e.error === errorKey)
      if (existing) {
        existing.count++
      } else {
        this.stats.commonErrors.push({ error: errorKey, count: 1 })
      }
    })

    // Mantener solo top 20 errores
    this.stats.commonErrors.sort((a, b) => b.count - a.count).splice(20)
  }

  private logValidationResult(request: HeaderValidationRequest, result: HeaderValidationResult, duration: number): void {
    if (!this.config.enableLogging) return

    const logData = {
      method: request.method,
      path: request.path,
      valid: result.valid,
      errorsCount: result.errors.length,
      warningsCount: result.warnings.length,
      securityScore: result.securityScore,
      duration,
      ip: request.ip,
    }

    if (result.valid) {
      this.logger.debug('Header validation passed', logData)
    } else {
      this.logger.warn('Header validation failed', {
        ...logData,
        errors: result.errors.map(e => ({ type: e.type, header: e.header, severity: e.severity })),
      })
    }
  }

  private initializeStats(): HeaderValidationStats {
    return {
      totalRequests: 0,
      validRequests: 0,
      invalidRequests: 0,
      securityViolations: 0,
      averageSecurityScore: 0,
      commonErrors: [],
      headerDistribution: {},
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    }
  }

  private createFallbackLogger(): StructuredLogger {
    return {
      error: (msg, meta) => console.error('[HEADER-ERROR]', msg, meta),
      warn: (msg, meta) => console.warn('[HEADER-WARN]', msg, meta),
      info: (msg, meta) => console.info('[HEADER-INFO]', msg, meta),
      debug: (msg, meta) => console.debug('[HEADER-DEBUG]', msg, meta),
      trace: (msg, meta) => console.trace('[HEADER-TRACE]', msg, meta),
      child: (meta) => this.createFallbackLogger(),
      addContext: () => {},
      setLevel: () => {},
      getLevel: () => 'info' as const,
    }
  }
}

// Utilidades para validación de headers
export class HeaderValidationUtils {
  /**
   * Crea configuración para diferentes entornos
   */
  static createConfigForEnvironment(environment: 'development' | 'production' | 'test'): HeaderValidationConfig {
    const envConfigs = {
      development: {
        enableContentTypeValidation: true,
        enableUserAgentValidation: false,
        enableAuthorizationValidation: true,
        enableXSSProtection: false,
        enableCSRFProtection: false,
        strictMode: false,
        enableLogging: true,
        maxHeaderSize: 16384, // 16KB en desarrollo
      },
      production: {
        enableContentTypeValidation: true,
        enableUserAgentValidation: true,
        enableAuthorizationValidation: true,
        enableXSSProtection: true,
        enableCSRFProtection: true,
        enableHSTSValidation: true,
        strictMode: true,
        enableLogging: false,
        forbiddenHeaders: ['server', 'x-powered-by'],
        blockedUserAgents: ['bot', 'crawler', 'spider'],
      },
      test: {
        enableContentTypeValidation: false,
        enableUserAgentValidation: false,
        enableAuthorizationValidation: false,
        enableLogging: false,
        strictMode: false,
      },
    }

    return HeaderValidationConfigSchema.parse(envConfigs[environment])
  }

  /**
   * Crea reglas personalizadas comunes
   */
  static createCommonRules(): CustomValidationRule[] {
    return [
      {
        name: 'api-key-format',
        matcher: (req) => req.path.startsWith('/api/'),
        validator: (headers) => {
          const errors: ValidationError[] = []
          const apiKey = headers['api-key']
          
          if (apiKey && !/^[a-zA-Z0-9_-]{20,}$/.test(apiKey)) {
            errors.push({
              type: 'invalid_format',
              header: 'api-key',
              message: 'API key format is invalid',
              severity: 'high',
            })
          }
          
          return errors
        },
        priority: 100,
      },
      {
        name: 'webhook-signature',
        matcher: (req) => req.path.startsWith('/webhooks/'),
        validator: (headers) => {
          const errors: ValidationError[] = []
          const signature = headers['x-webhook-signature'] || headers['x-hub-signature-256']
          
          if (!signature) {
            errors.push({
              type: 'missing_header',
              header: 'x-webhook-signature',
              message: 'Webhook signature is required',
              severity: 'critical',
            })
          }
          
          return errors
        },
        priority: 90,
      },
    ]
  }

  /**
   * Valida configuración
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    try {
      HeaderValidationConfigSchema.parse(config)
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
   * Detecta headers potencialmente peligrosos
   */
  static detectDangerousHeaders(headers: Record<string, string>): string[] {
    const dangerous = [
      'x-forwarded-for', // Posible IP spoofing
      'x-real-ip',       // Posible IP spoofing
      'x-forwarded-host', // Posible host spoofing
      'x-forwarded-proto', // Posible protocol spoofing
    ]

    return Object.keys(headers).filter(header => 
      dangerous.includes(header.toLowerCase())
    )
  }

  /**
   * Genera middleware Express
   */
  static createExpressMiddleware(validator: HeaderValidator) {
    return (req: any, res: any, next: any) => {
      const validationRequest: HeaderValidationRequest = {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
        query: req.query,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }

      const result = validator.validateHeaders(validationRequest)

      // Añadir headers de seguridad recomendados
      Object.entries(result.recommendedHeaders).forEach(([key, value]) => {
        res.setHeader(key, value)
      })

      // Si hay errores críticos, bloquear request
      const criticalErrors = result.errors.filter(e => e.severity === 'critical')
      if (criticalErrors.length > 0) {
        res.status(400).json({
          error: 'Header validation failed',
          details: criticalErrors.map(e => ({ header: e.header, message: e.message })),
        })
        return
      }

      // Añadir resultado a request para uso posterior
      req.headerValidation = result

      next()
    }
  }
}

// Constantes
export const HEADER_VALIDATION_CONSTANTS = {
  SECURITY_HEADERS: [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'content-security-policy',
    'referrer-policy',
  ] as const,

  DANGEROUS_HEADERS: [
    'x-forwarded-for',
    'x-real-ip',
    'x-forwarded-host',
    'x-forwarded-proto',
  ] as const,

  COMMON_CONTENT_TYPES: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'text/html',
    'text/xml',
    'application/xml',
  ] as const,

  MAX_HEADER_SIZE: 8192, // 8KB
  MAX_HEADER_COUNT: 100,
  
  SEVERITY_LEVELS: ['low', 'medium', 'high', 'critical'] as const,
  
  VALIDATION_TYPES: [
    'forbidden_header',
    'missing_header', 
    'invalid_format',
    'size_limit',
    'security_violation'
  ] as const,
} as const

export default HeaderValidator