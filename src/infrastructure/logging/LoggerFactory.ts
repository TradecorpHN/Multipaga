// src/infrastructure/logging/LoggerFactory.ts
// ──────────────────────────────────────────────────────────────────────────────
// Factory para crear diferentes tipos de loggers según el entorno y configuración
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Interfaces de logging
export interface Logger {
  error(message: string, meta?: any, ...args: any[]): void
  warn(message: string, meta?: any, ...args: any[]): void
  info(message: string, meta?: any, ...args: any[]): void
  debug(message: string, meta?: any, ...args: any[]): void
  trace(message: string, meta?: any, ...args: any[]): void
}

export interface StructuredLogger extends Logger {
  child(meta: Record<string, any>): StructuredLogger
  addContext(context: Record<string, any>): void
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
}

// Niveles de logging
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

// Schemas de validación
const LogConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  format: z.enum(['json', 'simple', 'detailed']).default('json'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(false),
  enableSentry: z.boolean().default(false),
  filePath: z.string().optional(),
  maxFileSize: z.string().default('20m'),
  maxFiles: z.number().default(5),
  datePattern: z.string().default('YYYY-MM-DD'),
  sensitiveFields: z.array(z.string()).default(['password', 'api-key', 'authorization']),
  enableStackTrace: z.boolean().default(true),
  enableMetadata: z.boolean().default(true),
  enableCorrelationId: z.boolean().default(true),
  environment: z.enum(['development', 'production', 'test']).default('development'),
})

const SentryConfigSchema = z.object({
  dsn: z.string().url(),
  environment: z.string().default('production'),
  release: z.string().optional(),
  sampleRate: z.number().min(0).max(1).default(1.0),
  enableTracing: z.boolean().default(false),
  tracesSampleRate: z.number().min(0).max(1).default(0.1),
})

// Tipos exportados
export type LogConfig = z.infer<typeof LogConfigSchema>
export type SentryConfig = z.infer<typeof SentryConfigSchema>

// Interfaz para transport de logging
export interface LogTransport {
  log(level: LogLevel, message: string, meta?: any): void
  error?(error: Error): void
  close?(): void
}

// Console Logger simple
export class ConsoleLogger implements StructuredLogger {
  private level: LogLevel
  private context: Record<string, any> = {}
  private config: LogConfig

  constructor(config: LogConfig) {
    this.config = config
    this.level = config.level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace']
    const configLevelIndex = levels.indexOf(this.level)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex <= configLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const context = { ...this.context, ...meta }
    
    if (this.config.format === 'json') {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...context,
      }
      console.log(JSON.stringify(logEntry))
    } else if (this.config.format === 'detailed') {
      const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context) : ''
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`)
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`)
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

  child(meta: Record<string, any>): StructuredLogger {
    const childLogger = new ConsoleLogger(this.config)
    childLogger.context = { ...this.context, ...meta }
    childLogger.level = this.level
    return childLogger
  }

  addContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }
}

// File Logger con rotación
export class FileLogger implements StructuredLogger {
  private level: LogLevel
  private context: Record<string, any> = {}
  private config: LogConfig
  private fileHandle?: FileSystemWritableFileStream

  constructor(config: LogConfig) {
    this.config = config
    this.level = config.level
    this.initializeFile()
  }

  private async initializeFile(): Promise<void> {
    // En un entorno real, aquí se configuraría winston o similar
    // Por ahora, implementación básica para demostración
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace']
    const configLevelIndex = levels.indexOf(this.level)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex <= configLevelIndex
  }

  private async writeToFile(level: LogLevel, message: string, meta?: any): Promise<void> {
    if (!this.shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const context = { ...this.context, ...meta }
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    }

    try {
      // En producción, usar winston file transport o similar
      console.log('FILE LOG:', JSON.stringify(logEntry))
    } catch (error) {
      console.error('Error writing to log file:', error)
    }
  }

  error(message: string, meta?: any): void {
    this.writeToFile('error', message, meta)
  }

  warn(message: string, meta?: any): void {
    this.writeToFile('warn', message, meta)
  }

  info(message: string, meta?: any): void {
    this.writeToFile('info', message, meta)
  }

  debug(message: string, meta?: any): void {
    this.writeToFile('debug', message, meta)
  }

  trace(message: string, meta?: any): void {
    this.writeToFile('trace', message, meta)
  }

  child(meta: Record<string, any>): StructuredLogger {
    const childLogger = new FileLogger(this.config)
    childLogger.context = { ...this.context, ...meta }
    childLogger.level = this.level
    return childLogger
  }

  addContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }
}

// Composite Logger que combina múltiples transports
export class CompositeLogger implements StructuredLogger {
  private loggers: StructuredLogger[] = []
  private level: LogLevel
  private context: Record<string, any> = {}

  constructor(loggers: StructuredLogger[], level: LogLevel = 'info') {
    this.loggers = loggers
    this.level = level
  }

  addLogger(logger: StructuredLogger): void {
    this.loggers.push(logger)
  }

  removeLogger(logger: StructuredLogger): void {
    this.loggers = this.loggers.filter(l => l !== logger)
  }

  error(message: string, meta?: any): void {
    this.loggers.forEach(logger => logger.error(message, { ...this.context, ...meta }))
  }

  warn(message: string, meta?: any): void {
    this.loggers.forEach(logger => logger.warn(message, { ...this.context, ...meta }))
  }

  info(message: string, meta?: any): void {
    this.loggers.forEach(logger => logger.info(message, { ...this.context, ...meta }))
  }

  debug(message: string, meta?: any): void {
    this.loggers.forEach(logger => logger.debug(message, { ...this.context, ...meta }))
  }

  trace(message: string, meta?: any): void {
    this.loggers.forEach(logger => logger.trace(message, { ...this.context, ...meta }))
  }

  child(meta: Record<string, any>): StructuredLogger {
    const childLoggers = this.loggers.map(logger => logger.child(meta))
    const childLogger = new CompositeLogger(childLoggers, this.level)
    childLogger.context = { ...this.context, ...meta }
    return childLogger
  }

  addContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
    this.loggers.forEach(logger => logger.addContext(context))
  }

  setLevel(level: LogLevel): void {
    this.level = level
    this.loggers.forEach(logger => logger.setLevel(level))
  }

  getLevel(): LogLevel {
    return this.level
  }
}

// Factory principal
export class LoggerFactory {
  private static instance: LoggerFactory
  private loggers = new Map<string, StructuredLogger>()
  private defaultConfig: LogConfig
  private sentryConfig?: SentryConfig

  private constructor() {
    this.defaultConfig = LogConfigSchema.parse({})
  }

  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory()
    }
    return LoggerFactory.instance
  }

  /**
   * Configura el factory con configuración global
   */
  configure(config: Partial<LogConfig>, sentryConfig?: SentryConfig): void {
    this.defaultConfig = LogConfigSchema.parse({ ...this.defaultConfig, ...config })
    
    if (sentryConfig) {
      this.sentryConfig = SentryConfigSchema.parse(sentryConfig)
    }
  }

  /**
   * Crea un logger con nombre específico
   */
  createLogger(name: string, config?: Partial<LogConfig>): StructuredLogger {
    const finalConfig = LogConfigSchema.parse({ ...this.defaultConfig, ...config })
    
    const loggers: StructuredLogger[] = []

    // Console logger
    if (finalConfig.enableConsole) {
      loggers.push(new ConsoleLogger(finalConfig))
    }

    // File logger
    if (finalConfig.enableFile) {
      loggers.push(new FileLogger(finalConfig))
    }

    // Sentry logger (implementación en SentryErrorReporter)
    if (finalConfig.enableSentry && this.sentryConfig) {
      // Se integraría aquí con SentryErrorReporter
    }

    const logger = loggers.length === 1 ? loggers[0] : new CompositeLogger(loggers, finalConfig.level)
    
    // Añadir contexto del nombre
    logger.addContext({ logger: name })
    
    // Cachear logger
    this.loggers.set(name, logger)
    
    return logger
  }

  /**
   * Obtiene logger existente o crea uno nuevo
   */
  getLogger(name: string): StructuredLogger {
    const existing = this.loggers.get(name)
    if (existing) {
      return existing
    }
    
    return this.createLogger(name)
  }

  /**
   * Crea logger optimizado para diferentes casos de uso
   */
  createSpecializedLogger(
    type: 'api' | 'database' | 'security' | 'performance' | 'business',
    name?: string
  ): StructuredLogger {
    const loggerName = name || type
    
    const specialConfigs = {
      api: {
        level: 'info' as LogLevel,
        enableConsole: true,
        enableFile: true,
        format: 'json' as const,
        enableCorrelationId: true,
      },
      database: {
        level: 'warn' as LogLevel,
        enableConsole: true,
        enableFile: true,
        format: 'detailed' as const,
      },
      security: {
        level: 'info' as LogLevel,
        enableConsole: true,
        enableFile: true,
        enableSentry: true,
        format: 'json' as const,
        sensitiveFields: ['password', 'api-key', 'authorization', 'token', 'secret'],
      },
      performance: {
        level: 'debug' as LogLevel,
        enableConsole: false,
        enableFile: true,
        format: 'json' as const,
        enableMetadata: true,
      },
      business: {
        level: 'info' as LogLevel,
        enableConsole: true,
        enableFile: true,
        enableSentry: false,
        format: 'detailed' as const,
      },
    }

    const config = specialConfigs[type]
    const logger = this.createLogger(loggerName, config)
    
    // Añadir contexto específico del tipo
    logger.addContext({ type, service: 'multipaga' })
    
    return logger
  }

  /**
   * Crea logger para diferentes entornos
   */
  createEnvironmentLogger(
    environment: 'development' | 'production' | 'test',
    name: string = 'app'
  ): StructuredLogger {
    const envConfigs = {
      development: {
        level: 'debug' as LogLevel,
        enableConsole: true,
        enableFile: false,
        enableSentry: false,
        format: 'detailed' as const,
        enableStackTrace: true,
      },
      production: {
        level: 'info' as LogLevel,
        enableConsole: false,
        enableFile: true,
        enableSentry: true,
        format: 'json' as const,
        enableStackTrace: false,
      },
      test: {
        level: 'error' as LogLevel,
        enableConsole: false,
        enableFile: false,
        enableSentry: false,
        format: 'simple' as const,
      },
    }

    const config = envConfigs[environment]
    const logger = this.createLogger(name, { ...config, environment })
    
    logger.addContext({ 
      environment, 
      nodeEnv: process.env.NODE_ENV,
      version: process.env.npm_package_version 
    })
    
    return logger
  }

  /**
   * Crea logger con correlación automática
   */
  createCorrelatedLogger(correlationId: string, baseLogger?: StructuredLogger): StructuredLogger {
    const logger = baseLogger || this.getLogger('app')
    return logger.child({ correlationId })
  }

  /**
   * Crea logger para usuario específico
   */
  createUserLogger(userId: string, merchantId?: string): StructuredLogger {
    const logger = this.getLogger('user-activity')
    return logger.child({ 
      userId, 
      merchantId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Crea logger para request HTTP
   */
  createRequestLogger(requestId: string, method: string, url: string): StructuredLogger {
    const logger = this.getLogger('http-requests')
    return logger.child({
      requestId,
      method,
      url,
      startTime: Date.now(),
    })
  }

  /**
   * Limpia todos los loggers cacheados
   */
  clearCache(): void {
    this.loggers.clear()
  }

  /**
   * Obtiene información de debug del factory
   */
  getDebugInfo(): {
    loggerCount: number
    loggerNames: string[]
    defaultConfig: LogConfig
    sentryEnabled: boolean
  } {
    return {
      loggerCount: this.loggers.size,
      loggerNames: Array.from(this.loggers.keys()),
      defaultConfig: { ...this.defaultConfig },
      sentryEnabled: !!this.sentryConfig,
    }
  }
}

// Utilidades de logging
export class LoggingUtils {
  /**
   * Sanitiza datos sensibles del logging
   */
  static sanitize(data: any, sensitiveFields: string[] = []): any {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data }
    const allSensitiveFields = [
      'password',
      'api-key', 
      'authorization',
      'token',
      'secret',
      'key',
      'credential',
      ...sensitiveFields
    ]

    const sanitizeRecursive = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const shouldSanitize = allSensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )

        if (shouldSanitize) {
          result[key] = '[REDACTED]'
        } else {
          result[key] = sanitizeRecursive(value)
        }
      }

      return result
    }

    return sanitizeRecursive(sanitized)
  }

  /**
   * Extrae información útil de un error
   */
  static extractErrorInfo(error: Error): {
    name: string
    message: string
    stack?: string
    code?: string
    statusCode?: number
    cause?: any
  } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode || (error as any).status,
      cause: (error as any).cause,
    }
  }

  /**
   * Formatea duración en formato legible
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
    return `${(ms / 3600000).toFixed(1)}h`
  }

  /**
   * Crea contexto de performance
   */
  static createPerformanceContext(startTime: number): {
    duration: number
    durationFormatted: string
    timestamp: string
  } {
    const duration = Date.now() - startTime
    return {
      duration,
      durationFormatted: LoggingUtils.formatDuration(duration),
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Genera ID de correlación único
   */
  static generateCorrelationId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `${timestamp}-${random}`
  }
}

// Singleton global para acceso fácil
export const loggerFactory = LoggerFactory.getInstance()

// Funciones de conveniencia
export const createLogger = (name: string, config?: Partial<LogConfig>): StructuredLogger => {
  return loggerFactory.createLogger(name, config)
}

export const getLogger = (name: string): StructuredLogger => {
  return loggerFactory.getLogger(name)
}

// Constantes de logging
export const LOGGING_CONSTANTS = {
  LOG_LEVELS: ['error', 'warn', 'info', 'debug', 'trace'] as const,
  LOG_FORMATS: ['json', 'simple', 'detailed'] as const,
  
  DEFAULT_SENSITIVE_FIELDS: [
    'password',
    'api-key',
    'authorization', 
    'token',
    'secret',
    'key',
    'credential',
    'x-api-key',
  ] as const,
  
  SPECIALIZED_LOGGER_TYPES: [
    'api',
    'database', 
    'security',
    'performance',
    'business',
  ] as const,
  
  ENVIRONMENTS: ['development', 'production', 'test'] as const,
  
  FILE_ROTATION: {
    MAX_SIZE: '20m',
    MAX_FILES: 5,
    DATE_PATTERN: 'YYYY-MM-DD',
  } as const,
} as const

export default LoggerFactory