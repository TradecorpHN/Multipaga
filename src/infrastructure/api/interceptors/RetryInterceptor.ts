// src/infrastructure/api/interceptors/RetryInterceptor.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interceptor de reintento para requests hacia Hyperswitch API con backoff exponencial
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación
const RetryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(3),
  initialDelay: z.number().min(100).max(10000).default(1000), // ms
  maxDelay: z.number().min(1000).max(60000).default(30000), // ms
  backoffMultiplier: z.number().min(1).max(5).default(2),
  jitterMax: z.number().min(0).max(1000).default(100), // ms
  retryableStatusCodes: z.array(z.number()).default([408, 429, 500, 502, 503, 504]),
  retryableErrorCodes: z.array(z.string()).default([
    'ECONNRESET',
    'ETIMEDOUT', 
    'ENOTFOUND',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR'
  ]),
  retryableHttpMethods: z.array(z.string()).default(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']),
  nonRetryableErrorCodes: z.array(z.string()).default([
    'INVALID_API_KEY',
    'AUTHENTICATION_FAILED',
    'INSUFFICIENT_PERMISSIONS',
    'INVALID_REQUEST_FORMAT'
  ]),
  enableRetryAfterHeader: z.boolean().default(true),
  maxRetryAfterDelay: z.number().default(60000), // 1 minuto máximo
  timeoutPerAttempt: z.number().default(30000), // 30 segundos por intento
  enableCircuitBreaker: z.boolean().default(true),
  circuitBreakerThreshold: z.number().default(5), // fallos consecutivos
  circuitBreakerResetTime: z.number().default(60000), // 1 minuto
})

// Tipos exportados
export type RetryConfig = z.infer<typeof RetryConfigSchema>

// Estados del circuit breaker
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

// Información de un intento de retry
export interface RetryAttempt {
  attemptNumber: number
  delay: number
  error?: Error
  statusCode?: number
  timestamp: number
  totalElapsed: number
}

// Resultado de un retry
export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: RetryAttempt[]
  totalDuration: number
  circuitBreakerTriggered: boolean
}

// Interfaz para callback de retry
export interface RetryCallbacks {
  onRetry?: (attempt: RetryAttempt, error: Error) => void
  onSuccess?: (result: any, attempts: RetryAttempt[]) => void
  onFailure?: (error: Error, attempts: RetryAttempt[]) => void
  onCircuitBreakerOpen?: () => void
  onCircuitBreakerClose?: () => void
}

// Error específico de circuit breaker
export class CircuitBreakerError extends Error {
  constructor(message: string = 'Circuit breaker is open') {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

// Error específico de retry agotado
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public attempts: RetryAttempt[],
    public lastError: Error
  ) {
    super(message)
    this.name = 'RetryExhaustedError'
  }
}

// Circuit breaker simple
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private lastFailureTime = 0
  private successCount = 0

  constructor(
    private threshold: number,
    private resetTime: number
  ) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTime) {
        this.state = 'half-open'
        this.successCount = 0
        return true
      }
      return false
    }
    
    // half-open state
    return true
  }

  onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= 2) { // Requiere 2 éxitos para cerrar
        this.state = 'closed'
      }
    }
  }

  onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.state === 'half-open') {
      this.state = 'open'
    } else if (this.failureCount >= this.threshold) {
      this.state = 'open'
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.lastFailureTime = 0
    this.successCount = 0
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    }
  }
}

// Interceptor de retry
export class RetryInterceptor {
  private config: RetryConfig
  private circuitBreaker: CircuitBreaker
  private callbacks: RetryCallbacks

  constructor(config: Partial<RetryConfig> = {}, callbacks: RetryCallbacks = {}) {
    this.config = RetryConfigSchema.parse(config)
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerResetTime
    )
    this.callbacks = callbacks
  }

  /**
   * Actualiza la configuración del interceptor
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = RetryConfigSchema.parse({ ...this.config, ...newConfig })
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerResetTime
    )
  }

  /**
   * Ejecuta una función con retry automático
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    const attempts: RetryAttempt[] = []
    let lastError: Error | undefined

    // Verificar circuit breaker
    if (this.config.enableCircuitBreaker && !this.circuitBreaker.canExecute()) {
      const error = new CircuitBreakerError()
      this.callbacks.onCircuitBreakerOpen?.()
      
      return {
        success: false,
        error,
        attempts: [],
        totalDuration: 0,
        circuitBreakerTriggered: true,
      }
    }

    for (let attemptNumber = 0; attemptNumber <= this.config.maxRetries; attemptNumber++) {
      const attemptStartTime = Date.now()
      
      try {
        // Aplicar timeout por intento
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT_ERROR')), this.config.timeoutPerAttempt)
        })

        const result = await Promise.race([operation(), timeoutPromise])
        
        // Éxito - registrar estadísticas
        const attempt: RetryAttempt = {
          attemptNumber,
          delay: 0,
          timestamp: attemptStartTime,
          totalElapsed: Date.now() - startTime,
        }
        attempts.push(attempt)

        // Actualizar circuit breaker
        if (this.config.enableCircuitBreaker) {
          this.circuitBreaker.onSuccess()
        }

        this.callbacks.onSuccess?.(result, attempts)

        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered: false,
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        const attempt: RetryAttempt = {
          attemptNumber,
          delay: 0,
          error: lastError,
          statusCode: (lastError as any).statusCode || (lastError as any).status,
          timestamp: attemptStartTime,
          totalElapsed: Date.now() - startTime,
        }
        attempts.push(attempt)

        // Verificar si debe hacer retry
        const shouldRetry = this.shouldRetry(lastError, attemptNumber)
        
        if (!shouldRetry || attemptNumber === this.config.maxRetries) {
          // No más retries - actualizar circuit breaker
          if (this.config.enableCircuitBreaker) {
            this.circuitBreaker.onFailure()
            if (this.circuitBreaker.getState() === 'open') {
              this.callbacks.onCircuitBreakerOpen?.()
            }
          }

          const retryError = new RetryExhaustedError(
            `Operation failed after ${attempts.length} attempts: ${lastError.message}`,
            attempts,
            lastError
          )

          this.callbacks.onFailure?.(retryError, attempts)

          return {
            success: false,
            error: retryError,
            attempts,
            totalDuration: Date.now() - startTime,
            circuitBreakerTriggered: false,
          }
        }

        // Calcular delay para siguiente intento
        const delay = this.calculateDelay(attemptNumber, lastError)
        attempt.delay = delay

        this.callbacks.onRetry?.(attempt, lastError)

        // Esperar antes del siguiente intento
        await this.sleep(delay)
      }
    }

    // Este punto no debería alcanzarse, pero por seguridad
    const finalError = lastError || new Error('Unknown error occurred')
    return {
      success: false,
      error: finalError,
      attempts,
      totalDuration: Date.now() - startTime,
      circuitBreakerTriggered: false,
    }
  }

  /**
   * Ejecuta un fetch con retry automático
   */
  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    const result = await this.executeWithRetry(async () => {
      const response = await fetch(url, options)
      
      // Verificar si el status code indica que debe hacer retry
      if (this.config.retryableStatusCodes.includes(response.status)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).statusCode = response.status
        ;(error as any).response = response
        throw error
      }

      return response
    })

    if (result.success && result.result) {
      return result.result
    }

    throw result.error || new Error('Fetch failed')
  }

  /**
   * Determina si debe hacer retry basado en el error y número de intento
   */
  private shouldRetry(error: Error, attemptNumber: number): boolean {
    // No retry si ya se alcanzó el máximo
    if (attemptNumber >= this.config.maxRetries) {
      return false
    }

    // Verificar errores no retryables
    const errorCode = (error as any).code || error.name || error.message
    if (this.config.nonRetryableErrorCodes.some(code => 
      errorCode.includes(code) || error.message.includes(code)
    )) {
      return false
    }

    // Verificar status code si está disponible
    const statusCode = (error as any).statusCode || (error as any).status
    if (statusCode) {
      return this.config.retryableStatusCodes.includes(statusCode)
    }

    // Verificar códigos de error retryables
    return this.config.retryableErrorCodes.some(code => 
      errorCode.includes(code) || error.message.includes(code)
    )
  }

  /**
   * Calcula el delay para el siguiente intento usando backoff exponencial
   */
  private calculateDelay(attemptNumber: number, error?: Error): number {
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attemptNumber)
    
    // Aplicar límite máximo
    delay = Math.min(delay, this.config.maxDelay)
    
    // Verificar header Retry-After si está habilitado
    if (this.config.enableRetryAfterHeader && error) {
      const retryAfter = this.extractRetryAfterHeader(error)
      if (retryAfter && retryAfter <= this.config.maxRetryAfterDelay) {
        delay = retryAfter
      }
    }
    
    // Añadir jitter para evitar thundering herd
    const jitter = Math.random() * this.config.jitterMax
    delay += jitter
    
    return Math.floor(delay)
  }

  /**
   * Extrae valor de Retry-After header del error
   */
  private extractRetryAfterHeader(error: Error): number | null {
    try {
      const response = (error as any).response
      if (response && response.headers) {
        const retryAfter = response.headers.get('retry-after')
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10)
          return isNaN(seconds) ? null : seconds * 1000 // convertir a ms
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Función de sleep promisificada
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Obtiene estadísticas del interceptor
   */
  getStats(): {
    config: RetryConfig
    circuitBreaker: {
      state: CircuitBreakerState
      failureCount: number
      successCount: number
      lastFailureTime: number
    }
  } {
    return {
      config: { ...this.config },
      circuitBreaker: this.circuitBreaker.getStats(),
    }
  }

  /**
   * Resetea el circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset()
    this.callbacks.onCircuitBreakerClose?.()
  }

  /**
   * Verifica si el interceptor está habilitado para un método HTTP
   */
  isRetryEnabledForMethod(method: string): boolean {
    return this.config.retryableHttpMethods.includes(method.toUpperCase())
  }
}

// Utilidades para retry
export class RetryUtils {
  /**
   * Crea un interceptor configurado para diferentes escenarios
   */
  static createRetryInterceptor(
    scenario: 'aggressive' | 'conservative' | 'minimal' | 'custom',
    customConfig?: Partial<RetryConfig>
  ): RetryInterceptor {
    const configs = {
      aggressive: {
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 1.5,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
        circuitBreakerThreshold: 8,
      },
      conservative: {
        maxRetries: 2,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableStatusCodes: [500, 502, 503, 504],
        circuitBreakerThreshold: 3,
      },
      minimal: {
        maxRetries: 1,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableStatusCodes: [503, 504],
        enableCircuitBreaker: false,
      },
      custom: customConfig || {},
    }

    return new RetryInterceptor(configs[scenario])
  }

  /**
   * Calcula el tiempo total máximo de retry
   */
  static calculateMaxRetryTime(config: RetryConfig): number {
    let totalTime = 0
    let delay = config.initialDelay

    for (let i = 0; i < config.maxRetries; i++) {
      totalTime += Math.min(delay, config.maxDelay) + config.jitterMax
      delay *= config.backoffMultiplier
    }

    return totalTime + (config.timeoutPerAttempt * (config.maxRetries + 1))
  }

  /**
   * Verifica si un error es retryable
   */
  static isRetryableError(
    error: Error,
    retryableStatusCodes: number[] = [408, 429, 500, 502, 503, 504],
    retryableErrorCodes: string[] = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
  ): boolean {
    const statusCode = (error as any).statusCode || (error as any).status
    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true
    }

    const errorCode = (error as any).code || error.name || error.message
    return retryableErrorCodes.some(code => 
      errorCode.includes(code) || error.message.includes(code)
    )
  }

  /**
   * Formatea estadísticas de retry para logging
   */
  static formatRetryStats(attempts: RetryAttempt[]): string {
    const totalTime = attempts[attempts.length - 1]?.totalElapsed || 0
    const totalDelays = attempts.reduce((sum, attempt) => sum + attempt.delay, 0)
    
    return `Attempts: ${attempts.length}, Total time: ${totalTime}ms, Total delays: ${totalDelays}ms`
  }

  /**
   * Crea callbacks de logging para retry
   */
  static createLoggingCallbacks(logger?: { 
    info: (msg: string, meta?: any) => void
    warn: (msg: string, meta?: any) => void
    error: (msg: string, meta?: any) => void
  }): RetryCallbacks {
    const log = logger || console

    return {
      onRetry: (attempt, error) => {
        log.warn(`Retry attempt ${attempt.attemptNumber + 1}`, {
          error: error.message,
          delay: attempt.delay,
          statusCode: attempt.statusCode,
        })
      },
      onSuccess: (result, attempts) => {
        if (attempts.length > 1) {
          log.info(`Operation succeeded after ${attempts.length} attempts`, {
            totalDuration: attempts[attempts.length - 1].totalElapsed,
          })
        }
      },
      onFailure: (error, attempts) => {
        log.error(`Operation failed after ${attempts.length} attempts`, {
          error: error.message,
          attempts: RetryUtils.formatRetryStats(attempts),
        })
      },
      onCircuitBreakerOpen: () => {
        log.warn('Circuit breaker opened - blocking further requests')
      },
      onCircuitBreakerClose: () => {
        log.info('Circuit breaker closed - allowing requests')
      },
    }
  }
}

// Constantes de retry
export const RETRY_CONSTANTS = {
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_INITIAL_DELAY: 1000, // 1 segundo
  DEFAULT_MAX_DELAY: 30000, // 30 segundos
  DEFAULT_BACKOFF_MULTIPLIER: 2,
  DEFAULT_JITTER_MAX: 100, // 100ms
  DEFAULT_TIMEOUT_PER_ATTEMPT: 30000, // 30 segundos
  
  RETRYABLE_STATUS_CODES: [408, 429, 500, 502, 503, 504] as const,
  NON_RETRYABLE_STATUS_CODES: [400, 401, 403, 404, 405, 409, 410, 422] as const,
  
  RETRYABLE_ERROR_CODES: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
  ] as const,
  
  NON_RETRYABLE_ERROR_CODES: [
    'INVALID_API_KEY',
    'AUTHENTICATION_FAILED',
    'INSUFFICIENT_PERMISSIONS',
    'INVALID_REQUEST_FORMAT',
    'VALIDATION_ERROR',
  ] as const,
  
  HTTP_METHODS_SAFE_TO_RETRY: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'] as const,
  HTTP_METHODS_NOT_SAFE_TO_RETRY: ['POST', 'PATCH'] as const,
  
  CIRCUIT_BREAKER: {
    DEFAULT_THRESHOLD: 5,
    DEFAULT_RESET_TIME: 60000, // 1 minuto
    HALF_OPEN_SUCCESS_THRESHOLD: 2,
  } as const,
} as const

export default RetryInterceptor