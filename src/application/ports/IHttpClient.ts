// src/application/ports/IHttpClient.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interface de HTTP Client - Puerto para comunicación HTTP con servicios externos
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Métodos HTTP soportados
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * Configuración de solicitud HTTP
 */
export interface HttpRequestConfig {
  url: string
  method: HttpMethod
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  data?: any
  timeout?: number
  retries?: number
  retryDelay?: number
  validateStatus?: (status: number) => boolean
  responseType?: 'json' | 'text' | 'blob' | 'stream' | 'buffer'
  maxRedirects?: number
  auth?: {
    username: string
    password: string
  } | {
    bearer: string
  } | {
    apiKey: string
    header?: string
  }
  proxy?: {
    host: string
    port: number
    auth?: {
      username: string
      password: string
    }
  }
  signal?: AbortSignal
  onUploadProgress?: (progressEvent: ProgressEvent) => void
  onDownloadProgress?: (progressEvent: ProgressEvent) => void
}

/**
 * Respuesta HTTP
 */
export interface HttpResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: HttpRequestConfig
  request?: any
  timing?: {
    start: number
    end: number
    duration: number
    dns?: number
    connect?: number
    tls?: number
    firstByte?: number
  }
}

/**
 * Error HTTP estructurado
 */
export interface HttpError extends Error {
  name: 'HttpError'
  message: string
  status?: number
  statusText?: string
  code?: string
  config?: HttpRequestConfig
  request?: any
  response?: HttpResponse
  isTimeout?: boolean
  isNetworkError?: boolean
  isCancel?: boolean
  stack?: string
}

/**
 * Configuración del cliente HTTP
 */
export interface HttpClientConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  maxRetries?: number
  retryDelay?: number
  retryCondition?: (error: HttpError) => boolean
  maxRedirects?: number
  validateStatus?: (status: number) => boolean
  transformRequest?: Array<(data: any, headers: Record<string, string>) => any>
  transformResponse?: Array<(data: any) => any>
  xsrfCookieName?: string
  xsrfHeaderName?: string
  withCredentials?: boolean
  responseEncoding?: string
  maxContentLength?: number
  maxBodyLength?: number
  decompress?: boolean
  insecureHTTPParser?: boolean
  transitional?: {
    silentJSONParsing?: boolean
    forcedJSONParsing?: boolean
    clarifyTimeoutError?: boolean
  }
}

/**
 * Interceptor de solicitud
 */
export type RequestInterceptor = (
  config: HttpRequestConfig
) => HttpRequestConfig | Promise<HttpRequestConfig>

/**
 * Interceptor de respuesta
 */
export type ResponseInterceptor = (
  response: HttpResponse
) => HttpResponse | Promise<HttpResponse>

/**
 * Interceptor de error
 */
export type ErrorInterceptor = (
  error: HttpError
) => Promise<never> | Promise<HttpResponse> | HttpError

/**
 * Estadísticas del cliente HTTP
 */
export interface HttpClientStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalBytes: number
  averageResponseTime: number
  activeRequests: number
  retryCount: number
  timeoutCount: number
  byMethod: Record<HttpMethod, {
    count: number
    successCount: number
    failureCount: number
    averageTime: number
  }>
  byStatus: Record<number, number>
  byHost: Record<string, {
    requests: number
    successRate: number
    averageTime: number
  }>
  recentErrors: Array<{
    timestamp: Date
    error: string
    url: string
    method: HttpMethod
    status?: number
  }>
}

/**
 * Información de salud del cliente HTTP
 */
export interface HttpClientHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  connectivity: {
    external: boolean
    dns: boolean
    ssl: boolean
  }
  performance: {
    averageResponseTime: number
    errorRate: number
    timeoutRate: number
  }
  resources: {
    activeConnections: number
    pooledConnections: number
    memoryUsage: number
  }
  issues: string[]
  lastCheck: Date
}

/**
 * Configuración de cache para requests
 */
export interface CacheConfig {
  enabled: boolean
  ttl?: number // Time to live en segundos
  key?: string | ((config: HttpRequestConfig) => string)
  invalidateOn?: HttpMethod[]
  storage?: 'memory' | 'redis' | 'custom'
  maxSize?: number
  compress?: boolean
}

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  enabled: boolean
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (config: HttpRequestConfig) => string
  onLimitReached?: (config: HttpRequestConfig) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Interface principal del HTTP Client
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Interface principal del HTTP Client
 * 
 * Proporciona abstracción para comunicación HTTP con:
 * - Métodos HTTP estándar (GET, POST, PUT, DELETE, etc.)
 * - Interceptores de request/response/error
 * - Reintentos automáticos con backoff
 * - Cache de respuestas
 * - Rate limiting
 * - Métricas y monitoreo
 * - Gestión de timeouts y cancelación
 * - Soporte para streaming y uploads
 */
export interface IHttpClient {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Métodos HTTP básicos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Realiza una solicitud HTTP genérica
   */
  request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>>
  
  /**
   * Solicitud GET
   */
  get<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method'>
  ): Promise<HttpResponse<T>>
  
  /**
   * Solicitud POST
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<HttpResponse<T>>
  
  /**
   * Solicitud PUT
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<HttpResponse<T>>
  
  /**
   * Solicitud PATCH
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<HttpResponse<T>>
  
  /**
   * Solicitud DELETE
   */
  delete<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method'>
  ): Promise<HttpResponse<T>>
  
  /**
   * Solicitud HEAD
   */
  head(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method'>
  ): Promise<HttpResponse>
  
  /**
   * Solicitud OPTIONS
   */
  options(
    url: string,
    config?: Omit<HttpRequestConfig, 'url' | 'method'>
  ): Promise<HttpResponse>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones en lote y concurrencia
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Ejecuta múltiples requests en paralelo
   */
  all<T = any>(
    requests: HttpRequestConfig[]
  ): Promise<HttpResponse<T>[]>
  
  /**
   * Ejecuta múltiples requests con límite de concurrencia
   */
  allSettled<T = any>(
    requests: HttpRequestConfig[],
    concurrency?: number
  ): Promise<Array<{
    status: 'fulfilled' | 'rejected'
    value?: HttpResponse<T>
    reason?: HttpError
  }>>
  
  /**
   * Ejecuta requests en secuencia
   */
  sequence<T = any>(
    requests: HttpRequestConfig[]
  ): Promise<HttpResponse<T>[]>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de interceptores
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Añade un interceptor de solicitud
   */
  addRequestInterceptor(
    interceptor: RequestInterceptor,
    errorHandler?: ErrorInterceptor
  ): number // Retorna ID del interceptor
  
  /**
   * Añade un interceptor de respuesta
   */
  addResponseInterceptor(
    interceptor: ResponseInterceptor,
    errorHandler?: ErrorInterceptor
  ): number
  
  /**
   * Remueve un interceptor por ID
   */
  removeInterceptor(interceptorId: number): boolean
  
  /**
   * Limpia todos los interceptores
   */
  clearInterceptors(): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Configuración y personalización
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Configura el cliente HTTP
   */
  configure(config: Partial<HttpClientConfig>): void
  
  /**
   * Obtiene la configuración actual
   */
  getConfig(): HttpClientConfig
  
  /**
   * Crea una nueva instancia con configuración específica
   */
  create(config?: Partial<HttpClientConfig>): IHttpClient
  
  /**
   * Establece headers por defecto
   */
  setDefaultHeaders(headers: Record<string, string>): void
  
  /**
   * Obtiene headers por defecto
   */
  getDefaultHeaders(): Record<string, string>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Cache y optimización
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Configura cache para requests
   */
  configureCache(config: CacheConfig): void
  
  /**
   * Invalida cache por patrón
   */
  invalidateCache(pattern?: string): Promise<number>
  
  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): Promise<{
    size: number
    hitRate: number
    missRate: number
    memoryUsage: number
  }>
  
  /**
   * Configura rate limiting
   */
  configureRateLimit(config: RateLimitConfig): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Monitoreo y estadísticas
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene estadísticas del cliente
   */
  getStats(): Promise<HttpClientStats>
  
  /**
   * Obtiene información de salud
   */
  getHealth(): Promise<HttpClientHealth>
  
  /**
   * Resetea estadísticas
   */
  resetStats(): void
  
  /**
   * Obtiene métricas en tiempo real
   */
  getRealTimeMetrics(): Promise<{
    activeRequests: number
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
    bandwidthUsage: number
  }>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de conexiones y recursos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica conectividad a una URL
   */
  ping(url: string, timeout?: number): Promise<{
    success: boolean
    responseTime: number
    error?: string
  }>
  
  /**
   * Cierra todas las conexiones activas
   */
  close(): Promise<void>
  
  /**
   * Cancela todas las solicitudes activas
   */
  cancelAll(): void
  
  /**
   * Obtiene información de conexiones activas
   */
  getActiveConnections(): Promise<Array<{
    id: string
    url: string
    method: HttpMethod
    startTime: Date
    timeout?: number
  }>>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Utilidades para streams y uploads
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Sube un archivo con progreso
   */
  uploadFile(
    url: string,
    file: File | Buffer | ReadableStream,
    options?: {
      fieldName?: string
      fileName?: string
      contentType?: string
      headers?: Record<string, string>
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
      chunkSize?: number
    }
  ): Promise<HttpResponse>
  
  /**
   * Descarga un archivo con progreso
   */
  downloadFile(
    url: string,
    options?: {
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
      range?: { start: number; end?: number }
      headers?: Record<string, string>
    }
  ): Promise<{
    data: ReadableStream | Buffer
    headers: Record<string, string>
    size: number
  }>
  
  /**
   * Stream de datos en tiempo real
   */
  stream(
    url: string,
    options?: {
      method?: HttpMethod
      headers?: Record<string, string>
      onData?: (chunk: any) => void
      onError?: (error: Error) => void
      onClose?: () => void
    }
  ): Promise<{
    close: () => void
    pause: () => void
    resume: () => void
  }>
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilidades y helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Utilidades para HTTP Client
 */
export namespace HttpUtils {
  
  /**
   * Construye URL con parámetros de query
   */
  export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl
    }
    
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
    
    return url.toString()
  }
  
  /**
   * Valida si un status code es exitoso
   */
  export function isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 300
  }
  
  /**
   * Determina si un error es reintentable
   */
  export function isRetryableError(error: HttpError): boolean {
    if (error.isTimeout || error.isNetworkError) return true
    if (!error.status) return false
    
    // Reintentar en errores del servidor y algunos del cliente
    return (
      error.status >= 500 || // Errores del servidor
      error.status === 408 || // Request Timeout
      error.status === 409 || // Conflict
      error.status === 423 || // Locked
      error.status === 429    // Too Many Requests
    )
  }
  
  /**
   * Calcula delay de reintento con backoff exponencial
   */
  export function calculateRetryDelay(
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    jitter: boolean = true
  ): number {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    
    if (!jitter) return exponentialDelay
    
    // Añadir jitter para evitar thundering herd
    const jitterRange = exponentialDelay * 0.1
    const jitterValue = (Math.random() - 0.5) * 2 * jitterRange
    
    return Math.max(0, exponentialDelay + jitterValue)
  }
  
  /**
   * Sanitiza headers removiendo información sensible
   */
  export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'authentication',
      'proxy-authorization'
    ]
    
    const sanitized = { ...headers }
    
    sensitiveHeaders.forEach(header => {
      const key = Object.keys(sanitized).find(k => k.toLowerCase() === header)
      if (key && sanitized[key]) {
        sanitized[key] = '[REDACTED]'
      }
    })
    
    return sanitized
  }
  
  /**
   * Estima el tamaño de una solicitud HTTP
   */
  export function estimateRequestSize(config: HttpRequestConfig): number {
    let size = 0
    
    // URL y método
    size += config.url.length + (config.method?.length || 3)
    
    // Headers
    if (config.headers) {
      size += Object.entries(config.headers).reduce(
        (acc, [key, value]) => acc + key.length + value.length + 4, // 4 por ": \r\n"
        0
      )
    }
    
    // Body
    if (config.data) {
      if (typeof config.data === 'string') {
        size += config.data.length
      } else if (Buffer.isBuffer(config.data)) {
        size += config.data.length
      } else {
        size += JSON.stringify(config.data).length
      }
    }
    
    return size
  }
  
  /**
   * Genera clave de cache para una solicitud
   */
  export function generateCacheKey(config: HttpRequestConfig): string {
    const parts = [
      config.method || 'GET',
      config.url,
      JSON.stringify(config.params || {}),
    ]
    
    // Solo incluir body para métodos que lo soportan
    if (['POST', 'PUT', 'PATCH'].includes(config.method || '')) {
      parts.push(JSON.stringify(config.data || {}))
    }
    
    return parts.join('|')
  }
  
  /**
   * Convierte timeout de minutos/segundos a milisegundos
   */
  export function parseTimeout(timeout: string | number): number {
    if (typeof timeout === 'number') return timeout
    
    const match = timeout.match(/^(\d+)(ms|s|m)?$/)
    if (!match) return 5000 // Default 5 segundos
    
    const value = parseInt(match[1], 10)
    const unit = match[2] || 'ms'
    
    switch (unit) {
      case 'ms': return value
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      default: return value
    }
  }
}

/**
 * Constantes para HTTP Client
 */
export const HTTP_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000, // 30 segundos
  DEFAULT_RETRY_DELAY: 1000, // 1 segundo
  MAX_RETRY_ATTEMPTS: 3,
  MAX_REDIRECTS: 5,
  DEFAULT_USER_AGENT: 'Multipaga-HttpClient/1.0',
  
  // Status codes comunes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  } as const,
  
  // Content types comunes
  CONTENT_TYPES: {
    JSON: 'application/json',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html',
    XML: 'application/xml',
    BINARY: 'application/octet-stream',
  } as const,
  
  // Headers comunes
  HEADERS: {
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    USER_AGENT: 'User-Agent',
    X_API_KEY: 'X-API-Key',
    X_REQUEST_ID: 'X-Request-ID',
    X_CORRELATION_ID: 'X-Correlation-ID',
    CACHE_CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    IF_NONE_MATCH: 'If-None-Match',
  } as const,
} as const

export default IHttpClient