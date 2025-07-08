// src/infrastructure/logging/SentryErrorReporter.ts
// ──────────────────────────────────────────────────────────────────────────────
// Integración con Sentry para reporte de errores y monitoreo de performance
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger, LogLevel } from './LoggerFactory'

// Schemas de validación
const SentryConfigSchema = z.object({
  dsn: z.string().url('DSN de Sentry inválido'),
  environment: z.string().default('production'),
  release: z.string().optional(),
  serverName: z.string().default('multipaga-server'),
  sampleRate: z.number().min(0).max(1).default(1.0),
  maxBreadcrumbs: z.number().int().min(0).max(100).default(50),
  enableTracing: z.boolean().default(false),
  tracesSampleRate: z.number().min(0).max(1).default(0.1),
  enablePerformanceMonitoring: z.boolean().default(true),
  enableUserContext: z.boolean().default(true),
  enableRequestData: z.boolean().default(true),
  enableConsoleIntegration: z.boolean().default(false),
  beforeSend: z.function().optional(),
  beforeBreadcrumb: z.function().optional(),
  integrations: z.array(z.any()).default([]),
  ignoreErrors: z.array(z.string()).default([]),
  ignoreTransactions: z.array(z.string()).default([]),
  sensitiveFields: z.array(z.string()).default(['password', 'api-key', 'authorization']),
})

const ErrorContextSchema = z.object({
  user: z.object({
    id: z.string().optional(),
    email: z.string().email().optional(),
    username: z.string().optional(),
    merchantId: z.string().optional(),
    profileId: z.string().optional(),
  }).optional(),
  request: z.object({
    method: z.string().optional(),
    url: z.string().optional(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    query: z.record(z.string()).optional(),
  }).optional(),
  extra: z.record(z.any()).optional(),
  tags: z.record(z.string()).optional(),
  level: z.enum(['error', 'warning', 'info', 'debug', 'fatal']).optional(),
  fingerprint: z.array(z.string()).optional(),
})

// Tipos exportados
export type SentryConfig = z.infer<typeof SentryConfigSchema>
export type ErrorContext = z.infer<typeof ErrorContextSchema>
export type SentryLevel = 'error' | 'warning' | 'info' | 'debug' | 'fatal'

// Interfaces para Sentry (mock para compatibilidad)
interface MockSentryUser {
  id?: string
  email?: string
  username?: string
  [key: string]: any
}

interface MockSentryScope {
  setUser(user: MockSentryUser): void
  setTag(key: string, value: string): void
  setContext(key: string, context: any): void
  setLevel(level: SentryLevel): void
  setFingerprint(fingerprint: string[]): void
  addBreadcrumb(breadcrumb: any): void
  clear(): void
}

interface MockSentryHub {
  captureException(error: Error, scope?: MockSentryScope): string
  captureMessage(message: string, level?: SentryLevel, scope?: MockSentryScope): string
  withScope(callback: (scope: MockSentryScope) => void): void
  configureScope(callback: (scope: MockSentryScope) => void): void
}

// Mock de Sentry para cuando no está disponible
class MockSentry {
  static init(config: any): void {
    console.warn('Sentry not initialized - using mock implementation')
  }

  static captureException(error: Error): string {
    console.error('MOCK SENTRY - Exception:', error)
    return 'mock-event-id'
  }

  static captureMessage(message: string, level?: SentryLevel): string {
    console.log(`MOCK SENTRY - Message [${level}]:`, message)
    return 'mock-event-id'
  }

  static withScope(callback: (scope: MockSentryScope) => void): void {
    const mockScope: MockSentryScope = {
      setUser: (user) => console.log('Mock Sentry - Set User:', user),
      setTag: (key, value) => console.log(`Mock Sentry - Set Tag: ${key}=${value}`),
      setContext: (key, context) => console.log(`Mock Sentry - Set Context: ${key}`, context),
      setLevel: (level) => console.log(`Mock Sentry - Set Level: ${level}`),
      setFingerprint: (fingerprint) => console.log('Mock Sentry - Set Fingerprint:', fingerprint),
      addBreadcrumb: (breadcrumb) => console.log('Mock Sentry - Add Breadcrumb:', breadcrumb),
      clear: () => console.log('Mock Sentry - Clear Scope'),
    }
    callback(mockScope)
  }

  static getCurrentHub(): MockSentryHub {
    return {
      captureException: MockSentry.captureException,
      captureMessage: MockSentry.captureMessage,
      withScope: MockSentry.withScope,
      configureScope: MockSentry.withScope,
    }
  }

  static addBreadcrumb(breadcrumb: any): void {
    console.log('Mock Sentry - Breadcrumb:', breadcrumb)
  }

  static setUser(user: MockSentryUser): void {
    console.log('Mock Sentry - User:', user)
  }

  static setTag(key: string, value: string): void {
    console.log(`Mock Sentry - Tag: ${key}=${value}`)
  }

  static setContext(key: string, context: any): void {
    console.log(`Mock Sentry - Context: ${key}`, context)
  }
}

// Reporter principal de errores
export class SentryErrorReporter implements StructuredLogger {
  private config: SentryConfig
  private isInitialized = false
  private Sentry: any
  private context: Record<string, any> = {}
  private fallbackLogger?: StructuredLogger

  constructor(config: SentryConfig, fallbackLogger?: StructuredLogger) {
    this.config = SentryConfigSchema.parse(config)
    this.fallbackLogger = fallbackLogger
    this.initializeSentry()
  }

  /**
   * Inicializa Sentry
   */
  private async initializeSentry(): Promise<void> {
    try {
      // En un entorno real, aquí se importaría @sentry/node
      // this.Sentry = await import('@sentry/node')
      
      // Por ahora usamos mock
      this.Sentry = MockSentry

      this.Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        serverName: this.config.serverName,
        sampleRate: this.config.sampleRate,
        maxBreadcrumbs: this.config.maxBreadcrumbs,
        enableTracing: this.config.enableTracing,
        tracesSampleRate: this.config.tracesSampleRate,
        integrations: this.config.integrations,
        beforeSend: this.createBeforeSendHook(),
        beforeBreadcrumb: this.config.beforeBreadcrumb,
        ignoreErrors: this.config.ignoreErrors,
        ignoreTransactions: this.config.ignoreTransactions,
      })

      this.isInitialized = true
      this.addBreadcrumb('info', 'Sentry initialized successfully')

    } catch (error) {
      console.error('Failed to initialize Sentry:', error)
      this.isInitialized = false
    }
  }

  /**
   * Crea hook beforeSend para sanitizar datos
   */
  private createBeforeSendHook() {
    return (event: any) => {
      // Sanitizar datos sensibles
      if (event.request) {
        event.request = this.sanitizeRequestData(event.request)
      }

      if (event.extra) {
        event.extra = this.sanitizeData(event.extra)
      }

      // Llamar hook personalizado si existe
      if (this.config.beforeSend) {
        return this.config.beforeSend(event)
      }

      return event
    }
  }

  /**
   * Reporta un error a Sentry
   */
  captureError(error: Error, context?: ErrorContext): string {
    if (!this.isInitialized) {
      this.fallbackLogger?.error(error.message, { error: error.stack, context })
      return 'not-initialized'
    }

    try {
      return this.Sentry.withScope((scope: MockSentryScope) => {
        // Establecer contexto
        if (context) {
          this.applyContextToScope(scope, context)
        }

        // Aplicar contexto global
        Object.entries(this.context).forEach(([key, value]) => {
          scope.setContext(key, value)
        })

        return this.Sentry.captureException(error)
      })

    } catch (sentryError) {
      console.error('Error reporting to Sentry:', sentryError)
      this.fallbackLogger?.error(error.message, { error: error.stack, sentryError })
      return 'sentry-error'
    }
  }

  /**
   * Reporta un mensaje a Sentry
   */
  captureMessage(message: string, level: SentryLevel = 'info', context?: ErrorContext): string {
    if (!this.isInitialized) {
      this.fallbackLogger?.info(message, context)
      return 'not-initialized'
    }

    try {
      return this.Sentry.withScope((scope: MockSentryScope) => {
        scope.setLevel(level)

        if (context) {
          this.applyContextToScope(scope, context)
        }

        Object.entries(this.context).forEach(([key, value]) => {
          scope.setContext(key, value)
        })

        return this.Sentry.captureMessage(message, level)
      })

    } catch (sentryError) {
      console.error('Error reporting message to Sentry:', sentryError)
      this.fallbackLogger?.info(message, { context, sentryError })
      return 'sentry-error'
    }
  }

  /**
   * Añade breadcrumb para seguimiento
   */
  addBreadcrumb(level: 'info' | 'warning' | 'error' | 'debug', message: string, category?: string, data?: any): void {
    if (!this.isInitialized) {
      this.fallbackLogger?.debug(`Breadcrumb [${category}]: ${message}`, data)
      return
    }

    try {
      this.Sentry.addBreadcrumb({
        message,
        level,
        category: category || 'custom',
        data: data ? this.sanitizeData(data) : undefined,
        timestamp: Date.now() / 1000,
      })
    } catch (error) {
      console.error('Error adding breadcrumb to Sentry:', error)
    }
  }

  /**
   * Establece contexto de usuario
   */
  setUser(user: {
    id?: string
    email?: string
    username?: string
    merchantId?: string
    profileId?: string
    [key: string]: any
  }): void {
    if (!this.isInitialized) {
      this.fallbackLogger?.debug('Set user context', user)
      return
    }

    try {
      this.Sentry.setUser(this.sanitizeData(user))
    } catch (error) {
      console.error('Error setting user context:', error)
    }
  }

  /**
   * Establece tag personalizado
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) {
      this.fallbackLogger?.debug(`Set tag: ${key}=${value}`)
      return
    }

    try {
      this.Sentry.setTag(key, value)
    } catch (error) {
      console.error('Error setting tag:', error)
    }
  }

  /**
   * Establece contexto adicional
   */
  setContext(key: string, context: any): void {
    if (!this.isInitialized) {
      this.fallbackLogger?.debug(`Set context: ${key}`, context)
      return
    }

    try {
      this.Sentry.setContext(key, this.sanitizeData(context))
    } catch (error) {
      console.error('Error setting context:', error)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // IMPLEMENTACIÓN DE StructuredLogger
  // ──────────────────────────────────────────────────────────────────────────────

  error(message: string, meta?: any): void {
    this.captureMessage(message, 'error', { extra: meta })
    this.fallbackLogger?.error(message, meta)
  }

  warn(message: string, meta?: any): void {
    this.captureMessage(message, 'warning', { extra: meta })
    this.fallbackLogger?.warn(message, meta)
  }

  info(message: string, meta?: any): void {
    this.addBreadcrumb('info', message, 'log', meta)
    this.fallbackLogger?.info(message, meta)
  }

  debug(message: string, meta?: any): void {
    this.addBreadcrumb('debug', message, 'log', meta)
    this.fallbackLogger?.debug(message, meta)
  }

  trace(message: string, meta?: any): void {
    this.addBreadcrumb('debug', message, 'trace', meta)
    this.fallbackLogger?.trace(message, meta)
  }

  child(meta: Record<string, any>): StructuredLogger {
    // Crear nuevo reporter con contexto adicional
    const childReporter = new SentryErrorReporter(this.config, this.fallbackLogger?.child(meta))
    childReporter.context = { ...this.context, ...meta }
    return childReporter
  }

  addContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
    this.setContext('logger_context', this.context)
  }

  setLevel(level: LogLevel): void {
    // Sentry no maneja niveles de la misma forma, delegar al fallback
    this.fallbackLogger?.setLevel(level)
  }

  getLevel(): LogLevel {
    return this.fallbackLogger?.getLevel() || 'info'
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private applyContextToScope(scope: MockSentryScope, context: ErrorContext): void {
    if (context.user) {
      scope.setUser(context.user)
    }

    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    if (context.level) {
      scope.setLevel(context.level)
    }

    if (context.fingerprint) {
      scope.setFingerprint(context.fingerprint)
    }

    if (context.request) {
      scope.setContext('request', this.sanitizeRequestData(context.request))
    }

    if (context.extra) {
      scope.setContext('extra', this.sanitizeData(context.extra))
    }
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data }

    const sanitizeRecursive = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const shouldSanitize = this.config.sensitiveFields.some(field => 
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

  private sanitizeRequestData(request: any): any {
    const sanitized = { ...request }

    // Sanitizar headers
    if (sanitized.headers) {
      sanitized.headers = this.sanitizeData(sanitized.headers)
    }

    // Sanitizar body
    if (sanitized.body) {
      sanitized.body = this.sanitizeData(sanitized.body)
    }

    // Sanitizar query parameters
    if (sanitized.query) {
      sanitized.query = this.sanitizeData(sanitized.query)
    }

    return sanitized
  }

  /**
   * Obtiene información de estado del reporter
   */
  getStatus(): {
    initialized: boolean
    config: Partial<SentryConfig>
    contextSize: number
  } {
    return {
      initialized: this.isInitialized,
      config: {
        environment: this.config.environment,
        sampleRate: this.config.sampleRate,
        enableTracing: this.config.enableTracing,
        enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      },
      contextSize: Object.keys(this.context).length,
    }
  }
}

// Utilidades para Sentry
export class SentryUtils {
  /**
   * Crea contexto de error desde un Error estándar
   */
  static createErrorContext(
    error: Error,
    request?: any,
    user?: any,
    extra?: any
  ): ErrorContext {
    const context: ErrorContext = {
      extra: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...extra,
      },
    }

    if (request) {
      context.request = {
        method: request.method,
        url: request.url || request.originalUrl,
        headers: request.headers,
        body: request.body,
        query: request.query,
      }
    }

    if (user) {
      context.user = {
        id: user.id || user.userId,
        email: user.email,
        username: user.username || user.name,
        merchantId: user.merchantId,
        profileId: user.profileId,
      }
    }

    return context
  }

  /**
   * Determina el nivel de Sentry basado en el tipo de error
   */
  static determineSentryLevel(error: Error): SentryLevel {
    const errorName = error.name.toLowerCase()
    const errorMessage = error.message.toLowerCase()

    if (errorName.includes('validation') || errorMessage.includes('validation')) {
      return 'warning'
    }

    if (errorName.includes('auth') || errorMessage.includes('unauthorized')) {
      return 'warning'
    }

    if (errorName.includes('network') || errorMessage.includes('timeout')) {
      return 'error'
    }

    if (errorName.includes('syntax') || errorName.includes('reference')) {
      return 'fatal'
    }

    return 'error'
  }

  /**
   * Crea fingerprint para agrupación de errores
   */
  static createFingerprint(error: Error, context?: any): string[] {
    const fingerprint = [error.name]

    // Añadir línea de stack si está disponible
    if (error.stack) {
      const firstLine = error.stack.split('\n')[1]
      if (firstLine) {
        fingerprint.push(firstLine.trim())
      }
    }

    // Añadir contexto específico
    if (context?.endpoint) {
      fingerprint.push(context.endpoint)
    }

    if (context?.operation) {
      fingerprint.push(context.operation)
    }

    return fingerprint
  }

  /**
   * Valida configuración de Sentry
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    try {
      SentryConfigSchema.parse(config)
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
}

// Factory para crear SentryErrorReporter
export class SentryReporterFactory {
  /**
   * Crea reporter configurado para diferentes entornos
   */
  static createForEnvironment(
    environment: 'development' | 'production' | 'test',
    dsn: string,
    fallbackLogger?: StructuredLogger
  ): SentryErrorReporter {
    const envConfigs = {
      development: {
        dsn,
        environment: 'development',
        sampleRate: 1.0,
        enableTracing: true,
        tracesSampleRate: 1.0,
        enableConsoleIntegration: true,
        enablePerformanceMonitoring: false,
      },
      production: {
        dsn,
        environment: 'production', 
        sampleRate: 0.1, // 10% sampling en producción
        enableTracing: false,
        tracesSampleRate: 0.01,
        enableConsoleIntegration: false,
        enablePerformanceMonitoring: true,
      },
      test: {
        dsn: 'https://test@test.ingest.sentry.io/test',
        environment: 'test',
        sampleRate: 0.0, // No reportar en tests
        enableTracing: false,
        enablePerformanceMonitoring: false,
      },
    }

    const config = envConfigs[environment]
    return new SentryErrorReporter(config as SentryConfig, fallbackLogger)
  }
}

// Constantes
export const SENTRY_CONSTANTS = {
  LEVELS: ['error', 'warning', 'info', 'debug', 'fatal'] as const,
  
  DEFAULT_SAMPLE_RATE: 1.0,
  PRODUCTION_SAMPLE_RATE: 0.1,
  
  DEFAULT_TRACES_SAMPLE_RATE: 0.1,
  
  MAX_BREADCRUMBS: 50,
  
  COMMON_IGNORE_ERRORS: [
    'NetworkError',
    'TimeoutError',
    'AbortError',
    'ChunkLoadError',
    'Script error',
    'Non-Error promise rejection captured',
  ] as const,
  
  SENSITIVE_FIELDS: [
    'password',
    'api-key',
    'authorization',
    'token',
    'secret',
    'key',
    'credential',
    'x-api-key',
    'cookie',
    'session',
  ] as const,
} as const

export default SentryErrorReporter