// src/infrastructure/api/interceptors/LoggingInterceptor.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interceptor de logging para requests/responses hacia Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Niveles de logging
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

// Esquemas de validación
const LogConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  enableRequestLogging: z.boolean().default(true),
  enableResponseLogging: z.boolean().default(true),
  enableErrorLogging: z.boolean().default(true),
  logRequestBody: z.boolean().default(false),
  logResponseBody: z.boolean().default(false),
  logHeaders: z.boolean().default(false),
  maxBodySize: z.number().default(10000), // bytes
  sanitizeFields: z.array(z.string()).default(['api-key', 'authorization', 'password']),
  excludeUrls: z.array(z.string()).default(['/health', '/ping']),
  includeTimestamps: z.boolean().default(true),
  includeCorrelationId: z.boolean().default(true),
  performanceThreshold: z.number().default(5000), // ms para considerar request lento
})

// Tipos exportados
export type LogConfig = z.infer<typeof LogConfigSchema>

// Interfaz para logger personalizado
export interface Logger {
  error(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  info(message: string, meta?: any): void
  debug(message: string, meta?: any): void
  trace(message: string, meta?: any): void
}

// Logger por defecto (console)
class ConsoleLogger implements Logger {
  private config: LogConfig

  constructor(config: LogConfig) {
    this.config = config
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace']
    const configLevelIndex = levels.indexOf(this.config.level)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex <= configLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return

    const timestamp = this.config.includeTimestamps ? new Date().toISOString() : ''
    const prefix = timestamp ? `[${timestamp}] ` : ''
    const levelStr = `[${level.toUpperCase()}]`
    
    const fullMessage = `${prefix}${levelStr} ${message}`

    switch (level) {
      case 'error':
        console.error(fullMessage, meta || '')
        break
      case 'warn':
        console.warn(fullMessage, meta || '')
        break
      case 'info':
        console.info(fullMessage, meta || '')
        break
      case 'debug':
        console.debug(fullMessage, meta || '')
        break
      case 'trace':
        console.trace(fullMessage, meta || '')
        break
    }
  }

  error(message: string, meta?: any): void {
    this.formatMessage('error', message, meta)
  }

  warn(message: string, meta?: any): void {
    this.formatMessage('warn', message, meta)
  }

  info(message: string, meta?: any): void {
    this.formatMessage('info', message, meta)
  }

  debug(message: string, meta?: any): void {
    this.formatMessage('debug', message, meta)
  }

  trace(message: string, meta?: any): void {
    this.formatMessage('trace', message, meta)
  }
}

// Interfaz para datos de request
interface RequestLogData {
  correlationId: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: any
  timestamp: string
  userAgent?: string
  ip?: string
}

// Interfaz para datos de response
interface ResponseLogData {
  correlationId: string
  status: number
  statusText: string
  headers?: Record<string, string>
  body?: any
  timestamp: string
  duration: number
  size?: number
}

// Interfaz para datos de error
interface ErrorLogData {
  correlationId: string
  error: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  timestamp: string
  context?: any
}

// Interceptor de logging
export class LoggingInterceptor {
  private config: LogConfig
  private logger: Logger
  private activeRequests = new Map<string, { startTime: number; requestData: RequestLogData }>()

  constructor(config: Partial<LogConfig> = {}, logger?: Logger) {
    this.config = LogConfigSchema.parse(config)
    this.logger = logger || new ConsoleLogger(this.config)
  }

  /**
   * Actualiza la configuración del interceptor
   */
  updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = LogConfigSchema.parse({ ...this.config, ...newConfig })
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): LogConfig {
    return { ...this.config }
  }

  /**
   * Intercepta request y registra información
   */
  async interceptRequest(request: RequestInit, url: string): Promise<{ request: RequestInit; correlationId: string }> {
    try {
      // Verificar si la URL debe ser excluida del logging
      if (this.shouldExcludeUrl(url)) {
        return { request, correlationId: '' }
      }

      const correlationId = this.generateCorrelationId()
      const timestamp = new Date().toISOString()
      const startTime = Date.now()

      // Construir datos del request
      const requestData: RequestLogData = {
        correlationId,
        method: request.method || 'GET',
        url,
        timestamp,
      }

      // Añadir headers si está habilitado
      if (this.config.logHeaders && request.headers) {
        requestData.headers = this.sanitizeHeaders(this.headersToObject(request.headers))
      }

      // Añadir body si está habilitado
      if (this.config.logRequestBody && request.body) {
        requestData.body = await this.safeParseBody(request.body)
      }

      // Guardar request activo para calcular duración
      this.activeRequests.set(correlationId, { startTime, requestData })



      // Añadir correlation ID a headers si está habilitado
      const enhancedRequest: RequestInit = { ...request }
      if (this.config.includeCorrelationId) {
        enhancedRequest.headers = {
          ...request.headers,
          'X-Correlation-ID': correlationId,
        }
      }

      return { request: enhancedRequest, correlationId }

    } catch (error) {
      this.logger.error('Error en LoggingInterceptor.interceptRequest', { error })
      return { request, correlationId: '' }
    }
  }

  /**
   * Intercepta response y registra información
   */
  async interceptResponse(response: Response, correlationId: string): Promise<Response> {
    try {
      if (!correlationId || !this.activeRequests.has(correlationId)) {
        return response
      }

      const { startTime, requestData } = this.activeRequests.get(correlationId)!
      const timestamp = new Date().toISOString()
      const duration = Date.now() - startTime

      // Construir datos del response
      const responseData: ResponseLogData = {
        correlationId,
        status: response.status,
        statusText: response.statusText,
        timestamp,
        duration,
      }

      // Añadir headers si está habilitado
      if (this.config.logHeaders) {
        responseData.headers = this.sanitizeHeaders(this.headersToObject(response.headers))
      }

      // Añadir body si está habilitado
      if (this.config.logResponseBody) {
        const clonedResponse = response.clone()
        responseData.body = await this.safeParseResponseBody(clonedResponse)
        responseData.size = responseData.body ? JSON.stringify(responseData.body).length : 0
      }

      // Determinar nivel de log basado en status y duración
      const logLevel = this.determineLogLevel(response.status, duration)

      // Log del response
      if (this.config.enableResponseLogging) {
        this.logger[logLevel](`HTTP Response: ${response.status} ${response.statusText} (${duration}ms)`, {
          correlationId,
          request: requestData,
          response: responseData,
        })
      }

      // Log de performance si es lento
      if (duration > this.config.performanceThreshold) {
        this.logger.warn(`Slow request detected: ${requestData.method} ${requestData.url} (${duration}ms)`, {
          correlationId,
          duration,
          threshold: this.config.performanceThreshold,
        })
      }

      // Limpiar request activo
      this.activeRequests.delete(correlationId)

      return response

    } catch (error) {
      this.logger.error('Error en LoggingInterceptor.interceptResponse', { error, correlationId })
      return response
    }
  }

  /**
   * Registra errores
   */
  logError(error: Error, correlationId: string = '', context?: any): void {
    try {
      if (!this.config.enableErrorLogging) return

      const timestamp = new Date().toISOString()
      const errorData: ErrorLogData = {
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
        timestamp,
        context,
      }

      this.logger.error(`HTTP Error: ${error.message}`, errorData)

      // Limpiar request activo si existe
      if (correlationId && this.activeRequests.has(correlationId)) {
        this.activeRequests.delete(correlationId)
      }

    } catch (logError) {
      // Fallback a console directo si hay error en el logger
      console.error('Error en LoggingInterceptor.logError:', logError)
      console.error('Error original:', error)
    }
  }

  /**
   * Verifica si una URL debe ser excluida del logging
   */
  private shouldExcludeUrl(url: string): boolean {
    return this.config.excludeUrls.some(excludePattern => {
      if (excludePattern.includes('*')) {
        // Simple wildcard matching
        const regex = new RegExp(excludePattern.replace(/\*/g, '.*'))
        return regex.test(url)
      }
      return url.includes(excludePattern)
    })
  }

  /**
   * Genera un ID de correlación único
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `${timestamp}-${random}`
  }

  /**
   * Convierte Headers a objeto plano
   */
  private headersToObject(headers: HeadersInit): Record<string, string> {
    if (headers instanceof Headers) {
      const obj: Record<string, string> = {}
      headers.forEach((value, key) => {
        obj[key] = value
      })
      return obj
    }

    if (Array.isArray(headers)) {
      const obj: Record<string, string> = {}
      headers.forEach(([key, value]) => {
        obj[key] = value
      })
      return obj
    }

    return headers as Record<string, string>
  }

  /**
   * Sanitiza headers sensibles
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers }

    this.config.sanitizeFields.forEach(field => {
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes(field.toLowerCase())) {
          sanitized[key] = '[REDACTED]'
        }
      })
    })

    return sanitized
  }

  /**
   * Parsea body de request de forma segura
   */
  private async safeParseBody(body: BodyInit): Promise<any> {
    try {
      if (typeof body === 'string') {
        if (body.length > this.config.maxBodySize) {
          return `[TRUNCATED - Size: ${body.length} bytes]`
        }
        try {
          return JSON.parse(body)
        } catch {
          return body
        }
      }

      if (body instanceof FormData) {
        const formObj: Record<string, any> = {}
        body.forEach((value, key) => {
          formObj[key] = value instanceof File ? `[File: ${value.name}]` : value
        })
        return formObj
      }

      if (body instanceof URLSearchParams) {
        const params: Record<string, string> = {}
        body.forEach((value, key) => {
          params[key] = value
        })
        return params
      }

      return '[Unsupported body type]'

    } catch (error) {
      return '[Error parsing body]'
    }
  }

  /**
   * Parsea body de response de forma segura
   */
  private async safeParseResponseBody(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const text = await response.text()
        if (text.length > this.config.maxBodySize) {
          return `[TRUNCATED - Size: ${text.length} bytes]`
        }
        return JSON.parse(text)
      }

      if (contentType.includes('text/')) {
        const text = await response.text()
        if (text.length > this.config.maxBodySize) {
          return `[TRUNCATED - Size: ${text.length} bytes]`
        }
        return text
      }

      return '[Binary or unsupported content type]'

    } catch (error) {
      return '[Error parsing response body]'
    }
  }

  /**
   * Determina el nivel de log basado en status y duración
   */
  private determineLogLevel(status: number, duration: number): LogLevel {
    // Errores del servidor
    if (status >= 500) return 'error'
    
    // Errores del cliente
    if (status >= 400) return 'warn'
    
    // Requests lentos
    if (duration > this.config.performanceThreshold) return 'warn'
    
    // Redirecciones
    if (status >= 300) return 'info'
    
    // Éxito
    return 'debug'
  }

  /**
   * Obtiene estadísticas de logging
   */
  getStats(): {
    activeRequests: number
    oldestActiveRequest?: {
      correlationId: string
      duration: number
      url: string
    }
  } {
    const stats = {
      activeRequests: this.activeRequests.size,
    } as any

    if (this.activeRequests.size > 0) {
      let oldestRequest = null
      let oldestTime = Date.now()

      this.activeRequests.forEach(({ startTime, requestData }, correlationId) => {
        if (startTime < oldestTime) {
          oldestTime = startTime
          oldestRequest = {
            correlationId,
            duration: Date.now() - startTime,
            url: requestData.url,
          }
        }
      })

      if (oldestRequest) {
        stats.oldestActiveRequest = oldestRequest
      }
    }

    return stats
  }

  /**
   * Limpia requests activos antiguos (cleanup)
   */
  cleanup(maxAgeMs: number = 300000): void { // 5 minutos por defecto
    const cutoff = Date.now() - maxAgeMs
    const toDelete: string[] = []

    this.activeRequests.forEach(({ startTime }, correlationId) => {
      if (startTime < cutoff) {
        toDelete.push(correlationId)
      }
    })

    toDelete.forEach(correlationId => {
      this.activeRequests.delete(correlationId)
      this.logger.warn(`Cleaned up stale request: ${correlationId}`)
    })
  }
}

// Utilidades para logging
export class LoggingUtils {
  /**
   * Crea un logger configurado para diferentes entornos
   */
  static createLogger(environment: 'development' | 'production' | 'test'): LoggingInterceptor {
    const configs = {
      development: {
        level: 'debug' as LogLevel,
        logRequestBody: true,
        logResponseBody: true,
        logHeaders: true,
        performanceThreshold: 2000,
      },
      production: {
        level: 'info' as LogLevel,
        logRequestBody: false,
        logResponseBody: false,
        logHeaders: false,
        performanceThreshold: 5000,
        excludeUrls: ['/health', '/ping', '/metrics'],
      },
      test: {
        level: 'error' as LogLevel,
        enableRequestLogging: false,
        enableResponseLogging: false,
        enableErrorLogging: true,
      },
    }

    return new LoggingInterceptor(configs[environment])
  }

  /**
   * Formatea duración en formato legible
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  /**
   * Formatea tamaño en bytes a formato legible
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Extrae información útil de un error
   */
  static extractErrorInfo(error: Error): {
    name: string
    message: string
    stack?: string
    isNetworkError: boolean
    isTimeoutError: boolean
    statusCode?: number
  } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isNetworkError: error.message.includes('network') || error.message.includes('fetch'),
      isTimeoutError: error.message.includes('timeout') || error.message.includes('aborted'),
      statusCode: (error as any).statusCode || (error as any).status,
    }
  }
}

// Constantes de logging
export const LOGGING_CONSTANTS = {
  DEFAULT_MAX_BODY_SIZE: 10000, // 10KB
  DEFAULT_PERFORMANCE_THRESHOLD: 5000, // 5 segundos
  CLEANUP_INTERVAL: 300000, // 5 minutos
  MAX_CORRELATION_ID_LENGTH: 50,
  SENSITIVE_FIELDS: [
    'api-key',
    'authorization',
    'password',
    'secret',
    'token',
    'key',
    'credential',
    'x-api-key',
  ] as const,
  LOG_LEVELS: ['error', 'warn', 'info', 'debug', 'trace'] as const,
  EXCLUDE_PATTERNS: [
    '/health*',
    '/ping*',
    '/metrics*',
    '*/status',
  ] as const,
} as const

export default LoggingInterceptor