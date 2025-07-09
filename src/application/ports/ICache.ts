// src/application/ports/ICache.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interface de Cache - Puerto para abstracción de operaciones de cache
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Opciones para operaciones de cache
 */
export interface CacheOptions {
  ttl?: number                    // Time to live en segundos
  tags?: string[]                // Tags para invalidación en grupo
  compress?: boolean             // Comprimir datos grandes
  serialize?: boolean            // Serializar automáticamente objetos
  namespace?: string             // Namespace para agrupar keys
  sliding?: boolean              // TTL deslizante (se extiende en cada acceso)
}

/**
 * Opciones para invalidación de cache
 */
export interface CacheInvalidationOptions {
  pattern?: string               // Patrón de keys a invalidar
  tags?: string[]               // Tags específicos a invalidar
  namespace?: string            // Namespace específico
  cascade?: boolean             // Invalidación en cascada
}

/**
 * Metadatos de un elemento en cache
 */
export interface CacheMetadata {
  key: string
  ttl: number
  createdAt: Date
  updatedAt: Date
  accessCount: number
  lastAccessed: Date
  size?: number
  tags?: string[]
  namespace?: string
}

/**
 * Estadísticas del cache
 */
export interface CacheStats {
  totalKeys: number
  totalMemory: number
  hitRate: number
  missRate: number
  evictionCount: number
  expiredCount: number
  averageKeySize: number
  oldestKey?: CacheMetadata
  newestKey?: CacheMetadata
  mostAccessed?: CacheMetadata
  byNamespace: Record<string, {
    keyCount: number
    memory: number
    hitRate: number
  }>
}

/**
 * Configuración del cache
 */
export interface CacheConfig {
  maxMemory?: number            // Memoria máxima en bytes
  maxKeys?: number              // Número máximo de keys
  defaultTtl?: number           // TTL por defecto en segundos
  checkInterval?: number        // Intervalo de limpieza en segundos
  compressionThreshold?: number // Tamaño mínimo para comprimir
  enableStats?: boolean         // Habilitar estadísticas
  enableEvents?: boolean        // Habilitar eventos
  keyPrefix?: string           // Prefijo global para keys
}

/**
 * Eventos del cache
 */
export type CacheEvent = 
  | 'hit'           // Key encontrada
  | 'miss'          // Key no encontrada
  | 'set'           // Valor establecido
  | 'delete'        // Valor eliminado
  | 'expire'        // Valor expirado
  | 'evict'         // Valor removido por límites
  | 'clear'         // Cache limpiado
  | 'error'         // Error en operación

/**
 * Handler para eventos del cache
 */
export type CacheEventHandler = (event: CacheEvent, data: {
  key?: string
  value?: any
  metadata?: CacheMetadata
  error?: Error
}) => void

/**
 * Resultado de operación en lote
 */
export interface BatchOperationResult<T = any> {
  successful: Array<{ key: string; value: T }>
  failed: Array<{ key: string; error: Error }>
  stats: {
    total: number
    successful: number
    failed: number
  }
}

/**
 * Interface principal del Cache
 * 
 * Proporciona abstracción para operaciones de cache con soporte para:
 * - Operaciones CRUD básicas
 * - TTL y expiración
 * - Invalidación por tags y patrones
 * - Operaciones en lote
 * - Estadísticas y monitoreo
 * - Eventos y observabilidad
 */
export interface ICache {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones básicas
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene un valor del cache
   */
  get<T = any>(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<T | null>
  
  /**
   * Establece un valor en el cache
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>
  
  /**
   * Elimina un valor del cache
   */
  delete(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<boolean>
  
  /**
   * Verifica si existe una key en el cache
   */
  has(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<boolean>
  
  /**
   * Obtiene múltiples valores del cache
   */
  getMany<T = any>(keys: string[], options?: Pick<CacheOptions, 'namespace'>): Promise<Record<string, T | null>>
  
  /**
   * Establece múltiples valores en el cache
   */
  setMany<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<BatchOperationResult<T>>
  
  /**
   * Elimina múltiples valores del cache
   */
  deleteMany(keys: string[], options?: Pick<CacheOptions, 'namespace'>): Promise<BatchOperationResult<boolean>>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones avanzadas
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Incrementa un valor numérico en el cache
   */
  increment(key: string, delta?: number, options?: CacheOptions): Promise<number>
  
  /**
   * Decrementa un valor numérico en el cache
   */
  decrement(key: string, delta?: number, options?: CacheOptions): Promise<number>
  
  /**
   * Obtiene y elimina un valor del cache (atomico)
   */
  pop<T = any>(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<T | null>
  
  /**
   * Establece un valor solo si no existe
   */
  setIfNotExists<T = any>(key: string, value: T, options?: CacheOptions): Promise<boolean>
  
  /**
   * Actualiza el TTL de una key sin cambiar el valor
   */
  touch(key: string, ttl: number, options?: Pick<CacheOptions, 'namespace'>): Promise<boolean>
  
  /**
   * Obtiene el TTL restante de una key
   */
  getTtl(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<number | null>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Búsqueda y filtrado
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Busca keys que coincidan con un patrón
   */
  keys(pattern?: string, options?: Pick<CacheOptions, 'namespace'>): Promise<string[]>
  
  /**
   * Obtiene todas las keys con sus metadatos
   */
  scan(options?: {
    pattern?: string
    namespace?: string
    limit?: number
    cursor?: string
  }): Promise<{
    keys: CacheMetadata[]
    cursor?: string
    hasMore: boolean
  }>
  
  /**
   * Obtiene valores por tags
   */
  getByTags<T = any>(tags: string[], options?: Pick<CacheOptions, 'namespace'>): Promise<Record<string, T>>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Invalidación y limpieza
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Invalida cache por tags
   */
  invalidateByTags(tags: string[], options?: CacheInvalidationOptions): Promise<number>
  
  /**
   * Invalida cache por patrón de keys
   */
  invalidateByPattern(pattern: string, options?: CacheInvalidationOptions): Promise<number>
  
  /**
   * Limpia todo el cache o un namespace específico
   */
  clear(namespace?: string): Promise<number>
  
  /**
   * Limpia keys expiradas manualmente
   */
  cleanup(): Promise<number>
  
  /**
   * Libera memoria eliminando keys menos usadas
   */
  evict(targetMemory?: number): Promise<number>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Monitoreo y estadísticas
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene estadísticas del cache
   */
  getStats(): Promise<CacheStats>
  
  /**
   * Obtiene metadatos de una key específica
   */
  getMetadata(key: string, options?: Pick<CacheOptions, 'namespace'>): Promise<CacheMetadata | null>
  
  /**
   * Obtiene información de salud del cache
   */
  getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    memory: {
      used: number
      available: number
      percentage: number
    }
    performance: {
      averageResponseTime: number
      hitRate: number
      errorRate: number
    }
    issues: string[]
  }>
  
  /**
   * Resetea estadísticas del cache
   */
  resetStats(): Promise<void>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Configuración y eventos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Configura el cache
   */
  configure(config: Partial<CacheConfig>): Promise<void>
  
  /**
   * Obtiene la configuración actual
   */
  getConfig(): Promise<CacheConfig>
  
  /**
   * Suscribe a eventos del cache
   */
  on(event: CacheEvent, handler: CacheEventHandler): void
  
  /**
   * Desuscribe de eventos del cache
   */
  off(event: CacheEvent, handler?: CacheEventHandler): void
  
  /**
   * Emite un evento del cache
   */
  emit(event: CacheEvent, data: Parameters<CacheEventHandler>[1]): void
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones de backup y restore
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Exporta el cache a un formato serializado
   */
  export(options?: {
    namespace?: string
    includeExpired?: boolean
    format?: 'json' | 'binary'
  }): Promise<string | Buffer>
  
  /**
   * Importa datos al cache desde un backup
   */
  import(data: string | Buffer, options?: {
    namespace?: string
    overwrite?: boolean
    preserveTtl?: boolean
  }): Promise<BatchOperationResult>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de conexión y recursos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica la conectividad del cache
   */
  ping(): Promise<number> // Retorna latencia en ms
  
  /**
   * Cierra la conexión del cache y libera recursos
   */
  disconnect(): Promise<void>
  
  /**
   * Reconecta al cache
   */
  reconnect(): Promise<void>
  
  /**
   * Verifica si el cache está conectado
   */
  isConnected(): boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilidades y helpers para implementaciones
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Utilidades para cache
 */
export namespace CacheUtils {
  
  /**
   * Genera una key de cache con namespace y prefijo
   */
  export function buildKey(parts: string[], options?: {
    prefix?: string
    namespace?: string
    separator?: string
  }): string {
    const { prefix = '', namespace = '', separator = ':' } = options || {}
    const keyParts = [prefix, namespace, ...parts].filter(Boolean)
    return keyParts.join(separator)
  }
  
  /**
   * Valida un TTL
   */
  export function validateTtl(ttl: number): boolean {
    return Number.isInteger(ttl) && ttl > 0 && ttl <= 2147483647 // Max int32
  }
  
  /**
   * Calcula el tamaño aproximado de un valor
   */
  export function estimateSize(value: any): number {
    if (value === null || value === undefined) return 0
    if (typeof value === 'string') return value.length * 2 // UTF-16
    if (typeof value === 'number') return 8
    if (typeof value === 'boolean') return 4
    if (Buffer.isBuffer(value)) return value.length
    
    // Para objetos, usar JSON como aproximación
    try {
      return JSON.stringify(value).length * 2
    } catch {
      return 0
    }
  }
  
  /**
   * Sanitiza una key de cache
   */
  export function sanitizeKey(key: string): string {
    return key
      .replace(/[^a-zA-Z0-9:_.-]/g, '_') // Reemplazar caracteres especiales
      .replace(/_{2,}/g, '_') // Reducir múltiples underscores
      .substring(0, 250) // Limitar longitud
  }
  
  /**
   * Parsea un patrón de búsqueda a expresión regular
   */
  export function patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escapar caracteres especiales
      .replace(/\*/g, '.*') // * -> .*
      .replace(/\?/g, '.') // ? -> .
    
    return new RegExp(`^${escaped}$`, 'i')
  }
  
  /**
   * Comprime datos si exceden el umbral
   */
  export async function maybeCompress(
    data: string, 
    threshold: number = 1024
  ): Promise<{ data: string | Buffer; compressed: boolean }> {
    if (data.length <= threshold) {
      return { data, compressed: false }
    }
    
    // En implementación real usarías zlib o similar
    // const compressed = await gzip(data)
    // return { data: compressed, compressed: true }
    
    return { data, compressed: false }
  }
  
  /**
   * Descomprime datos si están comprimidos
   */
  export async function maybeDecompress(
    data: string | Buffer, 
    compressed: boolean
  ): Promise<string> {
    if (!compressed || typeof data === 'string') {
      return data as string
    }
    
    // En implementación real usarías zlib o similar
    // return await gunzip(data as Buffer)
    
    return data.toString()
  }
}

/**
 * Constantes del cache
 */
export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 300,          // 5 minutos
  MAX_TTL: 86400 * 7,       // 7 días
  DEFAULT_NAMESPACE: 'default',
  KEY_SEPARATOR: ':',
  MAX_KEY_LENGTH: 250,
  COMPRESSION_THRESHOLD: 1024, // 1KB
  STATS_RETENTION_DAYS: 30,
  
  // Patrones comunes
  PATTERNS: {
    ALL: '*',
    PAYMENTS: 'payment:*',
    SESSIONS: 'session:*',
    USERS: 'user:*',
    ANALYTICS: 'analytics:*',
  } as const,
  
  // TTLs por tipo de dato
  TTL_PRESETS: {
    SESSION: 1800,     // 30 minutos
    CACHE_BUSTER: 60,  // 1 minuto
    ANALYTICS: 3600,   // 1 hora
    RATE_LIMIT: 60,    // 1 minuto
    CONFIG: 300,       // 5 minutos
  } as const,
} as const

export default ICache