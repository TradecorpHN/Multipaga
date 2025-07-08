// src/infrastructure/cache/MemoryCache.ts
// ──────────────────────────────────────────────────────────────────────────────
// Implementación de caché en memoria con TTL, eviction policies y estadísticas
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación
const CacheConfigSchema = z.object({
  maxSize: z.number().int().min(1).default(1000),
  defaultTTL: z.number().int().min(1).default(300), // 5 minutos
  cleanupInterval: z.number().int().min(1000).default(60000), // 1 minuto
  evictionPolicy: z.enum(['lru', 'lfu', 'fifo', 'ttl']).default('lru'),
  enableStats: z.boolean().default(true),
  enableMetrics: z.boolean().default(false),
  compressionThreshold: z.number().int().min(1024).default(10240), // 10KB
  enableCompression: z.boolean().default(false),
})

// Tipos exportados
export type CacheConfig = z.infer<typeof CacheConfigSchema>
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl'

// Entrada de caché
interface CacheEntry<T = any> {
  key: string
  value: T
  expiresAt: number
  createdAt: number
  lastAccessed: number
  accessCount: number
  size: number
  compressed: boolean
}

// Estadísticas de caché
export interface CacheStats {
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number
  evictions: number
  expirations: number
  totalSize: number
  averageSize: number
  oldestEntry?: {
    key: string
    age: number
  }
  mostAccessed?: {
    key: string
    count: number
  }
}

// Métricas detalladas
export interface CacheMetrics {
  operations: {
    get: number
    set: number
    delete: number
    clear: number
  }
  performance: {
    averageGetTime: number
    averageSetTime: number
    slowestOperations: Array<{
      operation: string
      key: string
      duration: number
      timestamp: number
    }>
  }
  memory: {
    totalAllocated: number
    compressionRatio: number
    largestEntry: number
  }
}

// Callback para eventos de caché
export interface CacheCallbacks<T = any> {
  onHit?: (key: string, value: T) => void
  onMiss?: (key: string) => void
  onSet?: (key: string, value: T, ttl?: number) => void
  onDelete?: (key: string, reason: 'manual' | 'expired' | 'evicted') => void
  onEviction?: (key: string, value: T, reason: EvictionPolicy) => void
  onExpiration?: (key: string, value: T) => void
  onError?: (error: Error, operation: string, key?: string) => void
}

// Implementación de caché en memoria
export class MemoryCache<T = any> {
  private entries = new Map<string, CacheEntry<T>>()
  private config: CacheConfig
  private callbacks: CacheCallbacks<T>
  private cleanupTimer?: NodeJS.Timeout
  private stats: CacheStats
  private metrics: CacheMetrics
  private accessOrder: string[] = [] // Para LRU
  private insertionOrder: string[] = [] // Para FIFO

  constructor(config: Partial<CacheConfig> = {}, callbacks: CacheCallbacks<T> = {}) {
    this.config = CacheConfigSchema.parse(config)
    this.callbacks = callbacks
    
    // Inicializar estadísticas
    this.stats = {
      size: 0,
      maxSize: this.config.maxSize,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      expirations: 0,
      totalSize: 0,
      averageSize: 0,
    }

    // Inicializar métricas
    this.metrics = {
      operations: { get: 0, set: 0, delete: 0, clear: 0 },
      performance: {
        averageGetTime: 0,
        averageSetTime: 0,
        slowestOperations: [],
      },
      memory: {
        totalAllocated: 0,
        compressionRatio: 1,
        largestEntry: 0,
      }
    }

    // Iniciar timer de limpieza
    this.startCleanupTimer()
  }

  /**
   * Obtiene un valor del caché
   */
  async get(key: string): Promise<T | undefined> {
    const startTime = Date.now()
    
    try {
      this.metrics.operations.get++

      const entry = this.entries.get(key)
      
      if (!entry) {
        this.stats.misses++
        this.callbacks.onMiss?.(key)
        this.updateHitRate()
        return undefined
      }

      // Verificar expiración
      if (this.isExpired(entry)) {
        this.deleteEntry(key, 'expired')
        this.stats.misses++
        this.callbacks.onMiss?.(key)
        this.updateHitRate()
        return undefined
      }

      // Actualizar estadísticas de acceso
      entry.lastAccessed = Date.now()
      entry.accessCount++
      this.updateAccessOrder(key)

      this.stats.hits++
      this.callbacks.onHit?.(key, entry.value)
      this.updateHitRate()

      return entry.value

    } catch (error) {
      this.callbacks.onError?.(error as Error, 'get', key)
      throw error
    } finally {
      this.updatePerformanceMetrics('get', Date.now() - startTime, key)
    }
  }

  /**
   * Establece un valor en el caché
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now()
    
    try {
      this.metrics.operations.set++

      // Calcular TTL
      const actualTTL = ttl ?? this.config.defaultTTL
      const expiresAt = Date.now() + (actualTTL * 1000)

      // Calcular tamaño
      const size = this.calculateSize(value)
      
      // Verificar si necesita compresión
      let finalValue = value
      let compressed = false
      
      if (this.config.enableCompression && size > this.config.compressionThreshold) {
        finalValue = await this.compressValue(value)
        compressed = true
      }

      // Crear entrada
      const entry: CacheEntry<T> = {
        key,
        value: finalValue,
        expiresAt,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        size,
        compressed,
      }

      // Verificar si ya existe la entrada
      const existingEntry = this.entries.get(key)
      if (existingEntry) {
        this.stats.totalSize -= existingEntry.size
      } else {
        // Verificar límite de tamaño
        if (this.entries.size >= this.config.maxSize) {
          await this.evictEntries(1)
        }
      }

      // Guardar entrada
      this.entries.set(key, entry)
      this.stats.totalSize += size
      this.stats.size = this.entries.size
      this.updateInsertionOrder(key)
      this.updateAccessOrder(key)

      // Actualizar métricas
      this.metrics.memory.totalAllocated += size
      this.metrics.memory.largestEntry = Math.max(this.metrics.memory.largestEntry, size)
      
      if (compressed) {
        this.updateCompressionRatio()
      }

      this.callbacks.onSet?.(key, value, ttl)

    } catch (error) {
      this.callbacks.onError?.(error as Error, 'set', key)
      throw error
    } finally {
      this.updatePerformanceMetrics('set', Date.now() - startTime, key)
    }
  }

  /**
   * Elimina una entrada del caché
   */
  async delete(key: string): Promise<boolean> {
    try {
      this.metrics.operations.delete++
      return this.deleteEntry(key, 'manual')
    } catch (error) {
      this.callbacks.onError?.(error as Error, 'delete', key)
      throw error
    }
  }

  /**
   * Verifica si existe una clave
   */
  has(key: string): boolean {
    const entry = this.entries.get(key)
    return entry !== undefined && !this.isExpired(entry)
  }

  /**
   * Obtiene el TTL restante de una clave
   */
  ttl(key: string): number {
    const entry = this.entries.get(key)
    if (!entry) return -1
    
    if (this.isExpired(entry)) return -1
    
    return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000))
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    try {
      this.metrics.operations.clear++
      
      this.entries.clear()
      this.accessOrder = []
      this.insertionOrder = []
      
      this.stats.size = 0
      this.stats.totalSize = 0
      this.metrics.memory.totalAllocated = 0
      
    } catch (error) {
      this.callbacks.onError?.(error as Error, 'clear')
      throw error
    }
  }

  /**
   * Obtiene todas las claves
   */
  keys(): string[] {
    this.cleanupExpired()
    return Array.from(this.entries.keys())
  }

  /**
   * Obtiene todos los valores
   */
  values(): T[] {
    this.cleanupExpired()
    return Array.from(this.entries.values()).map(entry => entry.value)
  }

  /**
   * Obtiene el tamaño actual del caché
   */
  size(): number {
    this.cleanupExpired()
    return this.entries.size
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): CacheStats {
    this.cleanupExpired()
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * Obtiene métricas detalladas
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = CacheConfigSchema.parse({ ...this.config, ...newConfig })
    
    // Reiniciar timer de limpieza si cambió el intervalo
    this.stopCleanupTimer()
    this.startCleanupTimer()
    
    // Ajustar tamaño si es necesario
    if (this.entries.size > this.config.maxSize) {
      const toEvict = this.entries.size - this.config.maxSize
      this.evictEntries(toEvict)
    }
  }

  /**
   * Exporta el caché a un objeto
   */
  export(): Record<string, { value: T; expiresAt: number }> {
    const exported: Record<string, { value: T; expiresAt: number }> = {}
    
    for (const [key, entry] of this.entries) {
      if (!this.isExpired(entry)) {
        exported[key] = {
          value: entry.value,
          expiresAt: entry.expiresAt,
        }
      }
    }
    
    return exported
  }

  /**
   * Importa datos al caché
   */
  async import(data: Record<string, { value: T; expiresAt: number }>): Promise<void> {
    for (const [key, { value, expiresAt }] of Object.entries(data)) {
      if (expiresAt > Date.now()) {
        const ttl = Math.floor((expiresAt - Date.now()) / 1000)
        await this.set(key, value, ttl)
      }
    }
  }

  /**
   * Destruye el caché y limpia recursos
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private deleteEntry(key: string, reason: 'manual' | 'expired' | 'evicted'): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false

    this.entries.delete(key)
    this.stats.size = this.entries.size
    this.stats.totalSize -= entry.size
    this.metrics.memory.totalAllocated -= entry.size

    // Remover de órdenes
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    this.insertionOrder = this.insertionOrder.filter(k => k !== key)

    this.callbacks.onDelete?.(key, reason)

    if (reason === 'expired') {
      this.stats.expirations++
      this.callbacks.onExpiration?.(key, entry.value)
    } else if (reason === 'evicted') {
      this.stats.evictions++
      this.callbacks.onEviction?.(key, entry.value, this.config.evictionPolicy)
    }

    return true
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiresAt <= Date.now()
  }

  private async evictEntries(count: number): Promise<void> {
    const keysToEvict = this.selectKeysForEviction(count)
    
    for (const key of keysToEvict) {
      this.deleteEntry(key, 'evicted')
    }
  }

  private selectKeysForEviction(count: number): string[] {
    const keys: string[] = []
    
    switch (this.config.evictionPolicy) {
      case 'lru':
        keys.push(...this.accessOrder.slice(0, count))
        break
        
      case 'fifo':
        keys.push(...this.insertionOrder.slice(0, count))
        break
        
      case 'lfu':
        const entriesByAccess = Array.from(this.entries.entries())
          .sort(([, a], [, b]) => a.accessCount - b.accessCount)
          .slice(0, count)
          .map(([key]) => key)
        keys.push(...entriesByAccess)
        break
        
      case 'ttl':
        const entriesByTTL = Array.from(this.entries.entries())
          .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
          .slice(0, count)
          .map(([key]) => key)
        keys.push(...entriesByTTL)
        break
    }
    
    return keys
  }

  private updateAccessOrder(key: string): void {
    // Remover si ya existe
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    // Añadir al final (más reciente)
    this.accessOrder.push(key)
  }

  private updateInsertionOrder(key: string): void {
    // Solo añadir si no existe
    if (!this.insertionOrder.includes(key)) {
      this.insertionOrder.push(key)
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  private updateStats(): void {
    const entries = Array.from(this.entries.values())
    
    if (entries.length > 0) {
      this.stats.averageSize = this.stats.totalSize / entries.length
      
      // Entrada más antigua
      const oldest = entries.reduce((prev, current) => 
        prev.createdAt < current.createdAt ? prev : current
      )
      this.stats.oldestEntry = {
        key: oldest.key,
        age: Date.now() - oldest.createdAt,
      }
      
      // Entrada más accedida
      const mostAccessed = entries.reduce((prev, current) => 
        prev.accessCount > current.accessCount ? prev : current
      )
      this.stats.mostAccessed = {
        key: mostAccessed.key,
        count: mostAccessed.accessCount,
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.deleteEntry(key, 'expired'))
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
    }, this.config.cleanupInterval)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2 // Aproximación para UTF-16
    } catch {
      return 1024 // Tamaño por defecto si no se puede serializar
    }
  }

  private async compressValue(value: T): Promise<T> {
    // Implementación básica de compresión (en producción usar zlib o similar)
    try {
      const stringified = JSON.stringify(value)
      // Aquí iría la lógica de compresión real
      return value // Por ahora devolver el original
    } catch {
      return value
    }
  }

  private updateCompressionRatio(): void {
    // Calcular ratio de compresión promedio
    const compressedEntries = Array.from(this.entries.values()).filter(e => e.compressed)
    if (compressedEntries.length > 0) {
      // Lógica para calcular ratio de compresión
      this.metrics.memory.compressionRatio = 0.8 // Placeholder
    }
  }

  private updatePerformanceMetrics(operation: string, duration: number, key: string): void {
    if (!this.config.enableMetrics) return

    // Actualizar promedio
    if (operation === 'get') {
      const total = this.metrics.operations.get
      this.metrics.performance.averageGetTime = 
        ((this.metrics.performance.averageGetTime * (total - 1)) + duration) / total
    } else if (operation === 'set') {
      const total = this.metrics.operations.set
      this.metrics.performance.averageSetTime = 
        ((this.metrics.performance.averageSetTime * (total - 1)) + duration) / total
    }

    // Registrar operaciones lentas
    if (duration > 100) { // Más de 100ms
      this.metrics.performance.slowestOperations.push({
        operation,
        key,
        duration,
        timestamp: Date.now(),
      })

      // Mantener solo las últimas 10
      if (this.metrics.performance.slowestOperations.length > 10) {
        this.metrics.performance.slowestOperations = 
          this.metrics.performance.slowestOperations.slice(-10)
      }
    }
  }
}

// Utilidades para caché
export class CacheUtils {
  /**
   * Crea una instancia de caché optimizada para diferentes casos de uso
   */
  static createCache<T>(
    type: 'fast' | 'memory-efficient' | 'persistent' | 'analytics',
    customConfig?: Partial<CacheConfig>
  ): MemoryCache<T> {
    const configs = {
      fast: {
        maxSize: 500,
        defaultTTL: 60, // 1 minuto
        cleanupInterval: 30000, // 30 segundos
        evictionPolicy: 'lru' as EvictionPolicy,
        enableCompression: false,
      },
      'memory-efficient': {
        maxSize: 2000,
        defaultTTL: 1800, // 30 minutos
        cleanupInterval: 120000, // 2 minutos
        evictionPolicy: 'lfu' as EvictionPolicy,
        enableCompression: true,
        compressionThreshold: 5120, // 5KB
      },
      persistent: {
        maxSize: 10000,
        defaultTTL: 7200, // 2 horas
        cleanupInterval: 300000, // 5 minutos
        evictionPolicy: 'ttl' as EvictionPolicy,
        enableStats: true,
      },
      analytics: {
        maxSize: 100,
        defaultTTL: 300, // 5 minutos
        cleanupInterval: 60000, // 1 minuto
        evictionPolicy: 'fifo' as EvictionPolicy,
        enableMetrics: true,
      },
    }

    const config = { ...configs[type], ...customConfig }
    return new MemoryCache<T>(config)
  }

  /**
   * Calcula el tamaño óptimo de caché basado en memoria disponible
   */
  static calculateOptimalSize(availableMemoryMB: number, averageEntrySizeKB: number): number {
    const maxMemoryUsageMB = availableMemoryMB * 0.1 // Usar máximo 10% de memoria
    const maxMemoryUsageKB = maxMemoryUsageMB * 1024
    return Math.floor(maxMemoryUsageKB / averageEntrySizeKB)
  }

  /**
   * Formatea estadísticas para visualización
   */
  static formatStats(stats: CacheStats): string {
    return `
Cache Stats:
  Size: ${stats.size}/${stats.maxSize}
  Hit Rate: ${stats.hitRate.toFixed(2)}%
  Total Memory: ${(stats.totalSize / 1024).toFixed(2)} KB
  Average Entry Size: ${stats.averageSize.toFixed(0)} bytes
  Evictions: ${stats.evictions}
  Expirations: ${stats.expirations}
    `.trim()
  }
}

// Constantes de caché
export const CACHE_CONSTANTS = {
  DEFAULT_MAX_SIZE: 1000,
  DEFAULT_TTL: 300, // 5 minutos
  MIN_TTL: 1,
  MAX_TTL: 86400, // 24 horas
  MIN_CLEANUP_INTERVAL: 1000, // 1 segundo
  DEFAULT_CLEANUP_INTERVAL: 60000, // 1 minuto
  COMPRESSION_THRESHOLD: 10240, // 10KB
  MAX_SLOW_OPERATIONS: 10,
  MEMORY_WARNING_THRESHOLD: 0.8, // 80% de memoria usada
  
  EVICTION_POLICIES: ['lru', 'lfu', 'fifo', 'ttl'] as const,
  
  SIZE_UNITS: {
    BYTE: 1,
    KB: 1024,
    MB: 1024 * 1024,
  } as const,
} as const

export default MemoryCache