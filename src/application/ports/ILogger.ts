// src/application/ports/ILogger.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interface de Logger - Puerto para logging estructurado y observabilidad
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Niveles de logging
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Contexto base para todos los logs
 */
export interface LogContext {
  // Identificadores de contexto
  correlationId?: string
  requestId?: string
  sessionId?: string
  userId?: string
  merchantId?: string
  profileId?: string
  
  // Información de la aplicación
  component?: string
  service?: string
  version?: string
  environment?: string
  
  // Información técnica
  hostname?: string
  process?: string
  thread?: string
  
  // Información de request HTTP
  method?: string
  url?: string
  userAgent?: string
  ip?: string
  
  // Timing y performance
  duration?: number
  timestamp?: Date
  
  // Campos personalizados
  [key: string]: any
}

/**
 * Entrada de log estructurada
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context: LogContext
  error?: Error
  stack?: string
  metadata?: Record<string, any>
}

/**
 * Configuración del logger
 */
export interface LoggerConfig {
  level: LogLevel
  format: 'json' | 'text' | 'pretty'
  timestamp: boolean
  colorize: boolean
  prettyPrint: boolean
  maxDepth: number
  maxArrayLength: number
  hideObject: boolean
  translateTime: boolean | string
  ignore: string[]
  include: string[]
  messageKey: string
  levelKey: string
  timestampKey: string
  errorKey: string
  
  // Configuración de transports
  transports: LogTransportConfig[]
  
  // Configuración de contexto
  defaultContext?: LogContext
  sensitiveFields?: string[]
  redactionCharacter?: string
  
  // Configuración de performance
  asyncLogging?: boolean
  bufferSize?: number
  flushInterval?: number
  
  // Configuración de rotación
  maxFileSize?: number
  maxFiles?: number
  compress?: boolean
  
  // Hooks
  onError?: (error: Error) => void
  onFlush?: () => void
}

/**
 * Configuración de transport
 */
export interface LogTransportConfig {
  type: 'console' | 'file' | 'http' | 'syslog' | 'database' | 'custom'
  level?: LogLevel
  format?: 'json' | 'text' | 'pretty'
  enabled?: boolean
  
  // Configuración específica por tipo
  console?: {
    colorize?: boolean
    stderr?: boolean
  }
  
  file?: {
    filename: string
    maxSize?: number
    maxFiles?: number
    compress?: boolean
    datePattern?: string
    createSymlink?: boolean
  }
  
  http?: {
    url: string
    method?: string
    headers?: Record<string, string>
    timeout?: number
    retries?: number
    batchSize?: number
    flushInterval?: number
  }
  
  syslog?: {
    host?: string
    port?: number
    protocol?: 'udp' | 'tcp'
    facility?: string
    severity?: string
  }
  
  database?: {
    connectionString: string
    tableName: string
    fields: Record<string, string>
  }
  
  custom?: {
    handler: (entry: LogEntry) => Promise<void> | void
    options?: Record<string, any>
  }
}

/**
 * Configuración de alertas
 */
export interface AlertConfig {
  enabled: boolean
  levels: LogLevel[]
  conditions: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex'
    value: any
  }>
  throttle?: {
    maxAlerts: number
    windowMs: number
  }
  destinations: Array<{
    type: 'email' | 'webhook' | 'slack' | 'sms'
    config: Record<string, any>
  }>
}

/**
 * Métricas del logger
 */
export interface LoggerMetrics {
  totalLogs: number
  logsByLevel: Record<LogLevel, number>
  logsByComponent: Record<string, number>
  errorsCount: number
  warningsCount: number
  averageLogsPerSecond: number
  bufferUsage: number
  transportStatus: Record<string, {
    status: 'healthy' | 'error' | 'disabled'
    lastError?: string
    logsProcessed: number
    logsDropped: number
  }>
  performance: {
    averageLogTime: number
    slowestLog: number
    fastestLog: number
  }
  since: Date
}

/**
 * Configuración de consulta de logs
 */
export interface LogQuery {
  levels?: LogLevel[]
  components?: string[]
  timeRange?: {
    from: Date
    to: Date
  }
  limit?: number
  offset?: number
  search?: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Resultado de consulta de logs
 */
export interface LogQueryResult {
  logs: LogEntry[]
  total: number
  hasMore: boolean
  aggregations?: Record<string, {
    count: number
    percentage: number
  }>
}

/**
 * Información de salud del logger
 */
export interface LoggerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  transports: Record<string, {
    status: 'healthy' | 'error' | 'disabled'
    lastSuccess?: Date
    lastError?: Date
    errorMessage?: string
  }>
  buffer: {
    usage: number
    capacity: number
    oldestEntry?: Date
  }
  performance: {
    logsPerSecond: number
    averageProcessingTime: number
    memoryUsage: number
  }
  issues: string[]
  lastCheck: Date
}

// ──────────────────────────────────────────────────────────────────────────────
// Interface principal del Logger
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Interface principal del Logger
 * 
 * Proporciona abstracción para logging estructurado con:
 * - Múltiples niveles de logging
 * - Contexto estructurado y metadata
 * - Múltiples transports (console, file, HTTP, etc.)
 * - Búsqueda y consulta de logs
 * - Métricas y observabilidad
 * - Alertas basadas en condiciones
 * - Performance optimizado con buffers
 */
export interface ILogger {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Métodos básicos de logging
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Log genérico con nivel especificado
   */
  log(level: LogLevel, message: string, context?: LogContext): void
  
  /**
   * Log de nivel trace (más detallado)
   */
  trace(message: string, context?: LogContext): void
  
  /**
   * Log de nivel debug
   */
  debug(message: string, context?: LogContext): void
  
  /**
   * Log de nivel info
   */
  info(message: string, context?: LogContext): void
  
  /**
   * Log de nivel warning
   */
  warn(message: string, context?: LogContext): void
  
  /**
   * Log de nivel error
   */
  error(message: string, error?: Error, context?: LogContext): void
  
  /**
   * Log de nivel fatal (errores críticos)
   */
  fatal(message: string, error?: Error, context?: LogContext): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Métodos especializados
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Log de request HTTP
   */
  logRequest(context: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: any
    ip?: string
    userAgent?: string
    userId?: string
    duration?: number
    status?: number
  }): void
  
  /**
   * Log de response HTTP
   */
  logResponse(context: {
    method: string
    url: string
    status: number
    headers?: Record<string, string>
    body?: any
    duration: number
    size?: number
  }): void
  
  /**
   * Log de evento de negocio
   */
  logBusinessEvent(
    eventType: string,
    eventData: Record<string, any>,
    context?: LogContext
  ): void
  
  /**
   * Log de seguridad
   */
  logSecurity(
    eventType: 'login' | 'logout' | 'unauthorized' | 'suspicious' | 'breach',
    details: Record<string, any>,
    context?: LogContext
  ): void
  
  /**
   * Log de performance
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
    context?: LogContext
  ): void
  
  /**
   * Log de auditoría
   */
  logAudit(
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, { from: any; to: any }>,
    context?: LogContext
  ): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de contexto
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Crea un logger hijo con contexto adicional
   */
  child(context: LogContext): ILogger
  
  /**
   * Establece contexto por defecto para todos los logs
   */
  setDefaultContext(context: LogContext): void
  
  /**
   * Obtiene el contexto por defecto actual
   */
  getDefaultContext(): LogContext
  
  /**
   * Limpia el contexto por defecto
   */
  clearDefaultContext(): void
  
  /**
   * Añade contexto que se mantendrá durante la ejecución
   */
  bindContext(context: LogContext): void
  
  /**
   * Desvincula contexto
   */
  unbindContext(keys?: string[]): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Configuración y gestión
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Configura el logger
   */
  configure(config: Partial<LoggerConfig>): void
  
  /**
   * Obtiene la configuración actual
   */
  getConfig(): LoggerConfig
  
  /**
   * Establece el nivel de logging
   */
  setLevel(level: LogLevel): void
  
  /**
   * Obtiene el nivel de logging actual
   */
  getLevel(): LogLevel
  
  /**
   * Verifica si un nivel está habilitado
   */
  isLevelEnabled(level: LogLevel): boolean
  
  /**
   * Añade un transport
   */
  addTransport(name: string, config: LogTransportConfig): void
  
  /**
   * Remueve un transport
   */
  removeTransport(name: string): void
  
  /**
   * Habilita/deshabilita un transport
   */
  toggleTransport(name: string, enabled: boolean): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Búsqueda y consulta
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Busca logs basado en criterios
   */
  query(query: LogQuery): Promise<LogQueryResult>
  
  /**
   * Busca logs por texto libre
   */
  search(
    searchTerm: string,
    options?: {
      levels?: LogLevel[]
      timeRange?: { from: Date; to: Date }
      limit?: number
    }
  ): Promise<LogEntry[]>
  
  /**
   * Obtiene logs recientes
   */
  getRecentLogs(
    count?: number,
    levels?: LogLevel[]
  ): Promise<LogEntry[]>
  
  /**
   * Obtiene logs por correlationId
   */
  getLogsByCorrelation(correlationId: string): Promise<LogEntry[]>
  
  /**
   * Obtiene agregaciones de logs
   */
  getAggregations(
    groupBy: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<Record<string, number>>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Métricas y observabilidad
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene métricas del logger
   */
  getMetrics(): Promise<LoggerMetrics>
  
  /**
   * Obtiene información de salud
   */
  getHealth(): Promise<LoggerHealth>
  
  /**
   * Resetea métricas
   */
  resetMetrics(): void
  
  /**
   * Obtiene estadísticas en tiempo real
   */
  getRealTimeStats(): Promise<{
    logsPerSecond: number
    bufferUsage: number
    activeTransports: number
    memoryUsage: number
    cpuUsage: number
  }>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Alertas y notificaciones
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Configura alertas
   */
  configureAlerts(config: AlertConfig): void
  
  /**
   * Añade una condición de alerta
   */
  addAlert(
    name: string,
    condition: (entry: LogEntry) => boolean,
    action: (entry: LogEntry) => Promise<void> | void
  ): void
  
  /**
   * Remueve una alerta
   */
  removeAlert(name: string): void
  
  /**
   * Lista alertas activas
   */
  listAlerts(): Array<{
    name: string
    enabled: boolean
    triggeredCount: number
    lastTriggered?: Date
  }>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de buffer y flush
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Fuerza el flush de todos los buffers
   */
  flush(): Promise<void>
  
  /**
   * Obtiene el estado del buffer
   */
  getBufferInfo(): {
    size: number
    capacity: number
    oldestEntry?: Date
    newestEntry?: Date
  }
  
  /**
   * Limpia el buffer
   */
  clearBuffer(): void
  
  /**
   * Pausa el logging (útil para testing)
   */
  pause(): void
  
  /**
   * Reanuda el logging
   */
  resume(): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de recursos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Cierra el logger y libera recursos
   */
  close(): Promise<void>
  
  /**
   * Verifica si el logger está cerrado
   */
  isClosed(): boolean
  
  /**
   * Reinicia el logger
   */
  restart(): Promise<void>
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilidades y helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Utilidades para logging
 */
export namespace LoggerUtils {
  
  /**
   * Convierte nivel de string a LogLevel
   */
  export function parseLevel(level: string): LogLevel {
    const normalized = level.toLowerCase() as LogLevel
    const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    
    if (validLevels.includes(normalized)) {
      return normalized
    }
    
    return 'info' // Default
  }
  
  /**
   * Compara niveles de logging
   */
  export function compareLevel(level1: LogLevel, level2: LogLevel): number {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    return levels.indexOf(level1) - levels.indexOf(level2)
  }
  
  /**
   * Verifica si un nivel está habilitado
   */
  export function isLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
    return compareLevel(targetLevel, currentLevel) >= 0
  }
  
  /**
   * Sanitiza contexto removiendo campos sensibles
   */
  export function sanitizeContext(
    context: LogContext,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'authorization']
  ): LogContext {
    const sanitized = { ...context }
    
    const sanitizeValue = (obj: any, path: string = ''): any => {
      if (obj === null || obj === undefined) return obj
      
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          return obj.map((item, index) => sanitizeValue(item, `${path}[${index}]`))
        }
        
        const result: any = {}
        Object.keys(obj).forEach(key => {
          const fieldPath = path ? `${path}.${key}` : key
          const isSensitive = sensitiveFields.some(field => 
            key.toLowerCase().includes(field.toLowerCase()) ||
            fieldPath.toLowerCase().includes(field.toLowerCase())
          )
          
          if (isSensitive) {
            result[key] = '[REDACTED]'
          } else {
            result[key] = sanitizeValue(obj[key], fieldPath)
          }
        })
        
        return result
      }
      
      return obj
    }
    
    return sanitizeValue(sanitized)
  }
  
  /**
   * Formatea error para logging
   */
  export function formatError(error: Error): {
    name: string
    message: string
    stack?: string
    cause?: any
  } {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: (error as any).cause,
    }
  }
  
  /**
   * Crea contexto de correlación
   */
  export function createCorrelationContext(
    correlationId?: string,
    parentId?: string
  ): { correlationId: string; parentId?: string } {
    return {
      correlationId: correlationId || generateCorrelationId(),
      parentId,
    }
  }
  
  /**
   * Genera ID de correlación único
   */
  export function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`
  }
  
  /**
   * Calcula duración desde timestamp
   */
  export function calculateDuration(startTime: Date): number {
    return Date.now() - startTime.getTime()
  }
  
  /**
   * Trunca mensaje si es muy largo
   */
  export function truncateMessage(message: string, maxLength: number = 1000): string {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength - 3) + '...'
  }
  
  /**
   * Serializa objeto para logging de forma segura
   */
  export function safeStringify(
    obj: any,
    maxDepth: number = 10,
    maxArrayLength: number = 100
  ): string {
    const seen = new WeakSet()
    
    const replacer = (_key: string, value: any, depth: number = 0): any => {
      if (depth > maxDepth) return '[Max Depth Reached]'
      
      if (value === null) return null
      if (typeof value === 'undefined') return '[undefined]'
      if (typeof value === 'function') return '[Function]'
      if (typeof value === 'symbol') return value.toString()
      
      if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular Reference]'
        seen.add(value)
        
        if (Array.isArray(value)) {
          if (value.length > maxArrayLength) {
            return [
              ...value.slice(0, maxArrayLength),
              `[... ${value.length - maxArrayLength} more items]`
            ]
          }
        }
      }
      
      return value
    }
    
    try {
      return JSON.stringify(obj, (key, value) => replacer(key, value))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `[Serialization Error: ${message}]`
    }
  }
}

/**
 * Constantes del logger
 */
export const LOGGER_CONSTANTS = {
  DEFAULT_LEVEL: 'info' as LogLevel,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_CONTEXT_DEPTH: 10,
  DEFAULT_BUFFER_SIZE: 1000,
  DEFAULT_FLUSH_INTERVAL: 5000, // 5 segundos
  
  // Campos estándar
  STANDARD_FIELDS: {
    TIMESTAMP: 'timestamp',
    LEVEL: 'level',
    MESSAGE: 'message',
    CONTEXT: 'context',
    ERROR: 'error',
    CORRELATION_ID: 'correlationId',
    REQUEST_ID: 'requestId',
    USER_ID: 'userId',
    MERCHANT_ID: 'merchantId',
  } as const,
  
  // Niveles numéricos para comparación
  LEVEL_VALUES: {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  } as const,
  
  // Colores para console output
  LEVEL_COLORS: {
    trace: '\x1b[37m', // white
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
  } as const,
  
  // Reset color
  COLOR_RESET: '\x1b[0m',
} as const

export default ILogger