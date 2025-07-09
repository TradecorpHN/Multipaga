// src/infrastructure/cache/MemoryCache.ts
// ──────────────────────────────────────────────────────────────────────────────
// Implementación de caché en memoria con TTL, eviction policies y estadísticas
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación
const CacheConfigSchema = z.object({
  maxSize: z.number().int().min(1).default(1000),
  defaultTTL: z.number().int().min(1).default(300),      // 5 minutos
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
  oldestEntry?: { key: string; age: number }
  mostAccessed?: { key: string; count: number }
}

// Métricas detalladas
export interface CacheMetrics {
  operations: { get: number; set: number; delete: number; clear: number }
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
  memory: { totalAllocated: number; compressionRatio: number; largestEntry: number }
}

// Callbacks de eventos
export interface CacheCallbacks<T = any> {
  onHit?: (key: string, value: T) => void
  onMiss?: (key: string) => void
  onSet?: (key: string, value: T, ttl?: number) => void
  onDelete?: (key: string, reason: 'manual' | 'expired' | 'evicted') => void
  onEviction?: (key: string, value: T, reason: EvictionPolicy) => void
  onExpiration?: (key: string, value: T) => void
  onError?: (error: Error, operation: string, key?: string) => void
}

export class MemoryCache<T = any> {
  private entries = new Map<string, CacheEntry<T>>()
  private config: CacheConfig
  private callbacks: CacheCallbacks<T>
  private cleanupTimer?: NodeJS.Timeout
  private stats: CacheStats
  private metrics: CacheMetrics
  private accessOrder: string[] = []
  private insertionOrder: string[] = []

  constructor(
    config: Partial<CacheConfig> = {},
    callbacks: CacheCallbacks<T> = {}
  ) {
    this.config = CacheConfigSchema.parse(config)
    this.callbacks = callbacks

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
      },
    }

    this.startCleanupTimer()
  }

  async get(key: string): Promise<T | undefined> {
    const start = Date.now()
    try {
      this.metrics.operations.get++
      const entry = this.entries.get(key)
      if (!entry) {
        this.stats.misses++
        this.callbacks.onMiss?.(key)
        this.updateHitRate()
        return undefined
      }
      if (this.isExpired(entry)) {
        this.deleteEntry(key, 'expired')
        this.stats.misses++
        this.callbacks.onMiss?.(key)
        this.updateHitRate()
        return undefined
      }
      entry.lastAccessed = Date.now()
      entry.accessCount++
      this.updateAccessOrder(key)
      this.stats.hits++
      this.callbacks.onHit?.(key, entry.value)
      this.updateHitRate()
      return entry.value
    } catch (err) {
      this.callbacks.onError?.(err as Error, 'get', key)
      throw err
    } finally {
      this.updatePerformanceMetrics('get', Date.now() - start, key)
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const start = Date.now()
    try {
      this.metrics.operations.set++
      const actualTTL = ttl ?? this.config.defaultTTL
      const expiresAt = Date.now() + actualTTL * 1000
      const size = this.calculateSize(value)
      let finalValue = value
      let compressed = false
      if (this.config.enableCompression && size > this.config.compressionThreshold) {
        finalValue = await this.compressValue(value)
        compressed = true
      }
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
      const existing = this.entries.get(key)
      if (existing) {
        this.stats.totalSize -= existing.size
      } else if (this.entries.size >= this.config.maxSize) {
        await this.evictEntries(1)
      }
      this.entries.set(key, entry)
      this.stats.totalSize += size
      this.stats.size = this.entries.size
      this.updateInsertionOrder(key)
      this.updateAccessOrder(key)
      this.metrics.memory.totalAllocated += size
      this.metrics.memory.largestEntry = Math.max(
        this.metrics.memory.largestEntry,
        size
      )
      if (compressed) this.updateCompressionRatio()
      this.callbacks.onSet?.(key, value, ttl)
    } catch (err) {
      this.callbacks.onError?.(err as Error, 'set', key)
      throw err
    } finally {
      this.updatePerformanceMetrics('set', Date.now() - start, key)
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      this.metrics.operations.delete++
      return this.deleteEntry(key, 'manual')
    } catch (err) {
      this.callbacks.onError?.(err as Error, 'delete', key)
      throw err
    }
  }

  has(key: string): boolean {
    const entry = this.entries.get(key)
    return !!entry && !this.isExpired(entry)
  }

  ttl(key: string): number {
    const entry = this.entries.get(key)
    if (!entry || this.isExpired(entry)) return -1
    return Math.floor((entry.expiresAt - Date.now()) / 1000)
  }

  clear(): void {
    try {
      this.metrics.operations.clear++
      this.entries.clear()
      this.accessOrder = []
      this.insertionOrder = []
      this.stats.size = 0
      this.stats.totalSize = 0
      this.metrics.memory.totalAllocated = 0
    } catch (err) {
      this.callbacks.onError?.(err as Error, 'clear')
      throw err
    }
  }

  keys(): string[] {
    this.cleanupExpired()
    return Array.from(this.entries.keys())
  }

  values(): T[] {
    this.cleanupExpired()
    return Array.from(this.entries.values()).map(e => e.value)
  }

  size(): number {
    this.cleanupExpired()
    return this.entries.size
  }

  getStats(): CacheStats {
    this.cleanupExpired()
    this.updateStats()
    return { ...this.stats }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  updateConfig(cfg: Partial<CacheConfig>): void {
    this.config = CacheConfigSchema.parse({ ...this.config, ...cfg })
    this.stopCleanupTimer()
    this.startCleanupTimer()
    if (this.entries.size > this.config.maxSize) {
      this.evictEntries(this.entries.size - this.config.maxSize)
    }
  }

  export(): Record<string, { value: T; expiresAt: number }> {
    const out: Record<string, { value: T; expiresAt: number }> = {}
    for (const [key, entry] of Array.from(this.entries.entries())) {
      if (!this.isExpired(entry)) {
        out[key] = { value: entry.value, expiresAt: entry.expiresAt }
      }
    }
    return out
  }

  async import(data: Record<string, { value: T; expiresAt: number }>): Promise<void> {
    for (const [key, { value, expiresAt }] of Object.entries(data)) {
      if (expiresAt > Date.now()) {
        const ttl = Math.floor((expiresAt - Date.now()) / 1000)
        await this.set(key, value, ttl)
      }
    }
  }

  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Privados
  // ──────────────────────────────────────────────────────────────────────────────

  private deleteEntry(key: string, reason: 'manual' | 'expired' | 'evicted'): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    this.entries.delete(key)
    this.stats.size = this.entries.size
    this.stats.totalSize -= entry.size
    this.metrics.memory.totalAllocated -= entry.size
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
    const keys = this.selectKeysForEviction(count)
    for (const key of keys) this.deleteEntry(key, 'evicted')
  }

  private selectKeysForEviction(count: number): string[] {
    switch (this.config.evictionPolicy) {
      case 'lru':
        return this.accessOrder.slice(0, count)
      case 'fifo':
        return this.insertionOrder.slice(0, count)
      case 'lfu':
        return Array.from(this.entries.entries())
          .sort(([, a], [, b]) => a.accessCount - b.accessCount)
          .slice(0, count)
          .map(([k]) => k)
      case 'ttl':
        return Array.from(this.entries.entries())
          .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
          .slice(0, count)
          .map(([k]) => k)
    }
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    this.accessOrder.push(key)
  }

  private updateInsertionOrder(key: string): void {
    if (!this.insertionOrder.includes(key)) {
      this.insertionOrder.push(key)
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total ? (this.stats.hits / total) * 100 : 0
  }

  private updateStats(): void {
    const ents = Array.from(this.entries.values())
    if (ents.length) {
      this.stats.averageSize = this.stats.totalSize / ents.length
      const oldest = ents.reduce((p, c) => (p.createdAt < c.createdAt ? p : c))
      this.stats.oldestEntry = { key: oldest.key, age: Date.now() - oldest.createdAt }
      const most = ents.reduce((p, c) => (p.accessCount > c.accessCount ? p : c))
      this.stats.mostAccessed = { key: most.key, count: most.accessCount }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    const expired: string[] = []
    for (const [key, entry] of Array.from(this.entries.entries())) {
      if (entry.expiresAt <= now) expired.push(key)
    }
    expired.forEach(k => this.deleteEntry(k, 'expired'))
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), this.config.cleanupInterval)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2
    } catch {
      return 1024
    }
  }

  private async compressValue(value: T): Promise<T> {
    return value
  }

  private updateCompressionRatio(): void {
    const comps = Array.from(this.entries.values()).filter(e => e.compressed)
    if (comps.length) this.metrics.memory.compressionRatio = 0.8
  }

  private updatePerformanceMetrics(operation: string, duration: number, key: string): void {
    if (!this.config.enableMetrics) return
    if (operation === 'get') {
      const tot = this.metrics.operations.get
      this.metrics.performance.averageGetTime = (this.metrics.performance.averageGetTime * (tot - 1) + duration) / tot
    } else if (operation === 'set') {
      const tot = this.metrics.operations.set
      this.metrics.performance.averageSetTime = (this.metrics.performance.averageSetTime * (tot - 1) + duration) / tot
    }
    if (duration > 100) {
      this.metrics.performance.slowestOperations.push({ operation, key, duration, timestamp: Date.now() })
      if (this.metrics.performance.slowestOperations.length > 10) {
        this.metrics.performance.slowestOperations = this.metrics.performance.slowestOperations.slice(-10)
      }
    }
  }
}

export default MemoryCache
