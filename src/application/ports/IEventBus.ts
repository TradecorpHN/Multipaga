// src/application/ports/IEventBus.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interface de Event Bus - Puerto para comunicación asíncrona entre componentes
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Metadata base para todos los eventos
 */
export interface EventMetadata {
  eventId: string
  timestamp: Date
  source: string
  version: string
  correlationId?: string
  causationId?: string
  userId?: string
  merchantId?: string
  profileId?: string
  environment?: string
  retryCount?: number
  originalTimestamp?: Date
}

/**
 * Estructura base para todos los eventos del dominio
 */
export interface DomainEvent<T = any> {
  type: string
  data: T
  metadata: EventMetadata
}

/**
 * Opciones para publicación de eventos
 */
export interface PublishOptions {
  delay?: number                 // Retraso en milisegundos
  priority?: 'low' | 'normal' | 'high' | 'critical'
  retry?: {
    maxAttempts: number
    backoffMs: number
    exponentialBackoff?: boolean
  }
  persistent?: boolean          // Persistir evento para recuperación
  partition?: string           // Partición para distribución
  headers?: Record<string, string>
  timeout?: number             // Timeout en milisegundos
}

/**
 * Opciones para suscripción a eventos
 */
export interface SubscriptionOptions {
  autoAck?: boolean            // Auto-acknowledgment
  concurrency?: number         // Número de handlers concurrentes
  prefetch?: number           // Número de mensajes a prefetch
  deadLetterQueue?: string    // Cola de mensajes fallidos
  retryPolicy?: {
    maxAttempts: number
    backoffMs: number
    exponentialBackoff?: boolean
  }
  filter?: (event: DomainEvent) => boolean // Filtro de eventos
  group?: string              // Grupo de consumidores
  durable?: boolean           // Suscripción durable
}

/**
 * Handler para eventos
 */
export type EventHandler<T = any> = (
  event: DomainEvent<T>
) => Promise<void> | void

/**
 * Handler para errores
 */
export type ErrorHandler = (
  error: Error,
  event: DomainEvent,
  context: {
    handlerName: string
    attempt: number
    maxAttempts: number
  }
) => Promise<void> | void

/**
 * Información de suscripción
 */
export interface SubscriptionInfo {
  id: string
  eventType: string
  handler: EventHandler
  options: SubscriptionOptions
  status: 'active' | 'paused' | 'error'
  createdAt: Date
  lastProcessed?: Date
  processedCount: number
  errorCount: number
}

/**
 * Estadísticas del event bus
 */
export interface EventBusStats {
  totalPublished: number
  totalProcessed: number
  totalErrors: number
  avgProcessingTime: number
  activeSubscriptions: number
  pendingEvents: number
  deadLetterCount: number
  throughputPerSecond: number
  byEventType: Record<string, {
    published: number
    processed: number
    errors: number
    avgProcessingTime: number
  }>
  byHandler: Record<string, {
    processed: number
    errors: number
    avgProcessingTime: number
    status: string
  }>
}

/**
 * Estado de salud del event bus
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memory: {
    used: number
    available: number
    percentage: number
  }
  connections: {
    active: number
    total: number
  }
  queues: Array<{
    name: string
    size: number
    status: 'healthy' | 'warning' | 'error'
  }>
  issues: string[]
  lastCheck: Date
}

// ──────────────────────────────────────────────────────────────────────────────
// Eventos específicos del dominio Multipaga
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Eventos de Payment
 */
export interface PaymentCreatedEvent {
  paymentId: string
  merchantId: string
  amount: number
  currency: string
  customerId?: string
  connector: string
  status: string
  createdAt: Date
}

export interface PaymentStatusChangedEvent {
  paymentId: string
  merchantId: string
  previousStatus: string
  newStatus: string
  reason?: string
  connector: string
  timestamp: Date
}

export interface PaymentFailedEvent {
  paymentId: string
  merchantId: string
  amount: number
  currency: string
  errorCode: string
  errorMessage: string
  connector: string
  failedAt: Date
}

export interface PaymentSucceededEvent {
  paymentId: string
  merchantId: string
  amount: number
  currency: string
  customerId?: string
  connector: string
  capturedAt: Date
}

/**
 * Eventos de Refund
 */
export interface RefundCreatedEvent {
  refundId: string
  paymentId: string
  merchantId: string
  amount: number
  currency: string
  reason?: string
  createdAt: Date
}

export interface RefundStatusChangedEvent {
  refundId: string
  paymentId: string
  merchantId: string
  previousStatus: string
  newStatus: string
  reason?: string
  timestamp: Date
}

/**
 * Eventos de Dispute
 */
export interface DisputeOpenedEvent {
  disputeId: string
  paymentId: string
  merchantId: string
  amount: number
  currency: string
  reason: string
  challengeRequiredBy?: Date
  openedAt: Date
}

export interface DisputeChallengedEvent {
  disputeId: string
  paymentId: string
  merchantId: string
  evidenceSubmitted: number
  challengedAt: Date
  challengedBy: string
}

/**
 * Eventos de Analytics
 */
export interface AnalyticsEvent {
  eventType: string
  merchantId: string
  data: Record<string, any>
  timestamp: Date
  sessionId?: string
  userId?: string
}

/**
 * Eventos de Sistema
 */
export interface SystemHealthEvent {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  metrics?: Record<string, number>
  timestamp: Date
}

export interface AuditEvent {
  action: string
  entityType: string
  entityId: string
  userId?: string
  merchantId?: string
  changes?: Record<string, { from: any; to: any }>
  timestamp: Date
  ip?: string
  userAgent?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Interface principal del Event Bus
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Interface principal del Event Bus
 * 
 * Proporciona abstracción para comunicación asíncrona mediante eventos:
 * - Publicación y suscripción de eventos
 * - Manejo de errores y reintentos
 * - Persistencia y recuperación
 * - Monitoreo y estadísticas
 * - Gestión de suscripciones
 */
export interface IEventBus {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones de publicación
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Publica un evento
   */
  publish<T = any>(
    eventType: string,
    data: T,
    options?: PublishOptions
  ): Promise<string> // Retorna ID del evento
  
  /**
   * Publica múltiples eventos en lote
   */
  publishBatch<T = any>(
    events: Array<{
      eventType: string
      data: T
      options?: PublishOptions
    }>
  ): Promise<string[]> // Retorna IDs de los eventos
  
  /**
   * Programa un evento para publicación futura
   */
  schedule<T = any>(
    eventType: string,
    data: T,
    scheduledFor: Date,
    options?: PublishOptions
  ): Promise<string>
  
  /**
   * Cancela un evento programado
   */
  cancelScheduled(eventId: string): Promise<boolean>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Operaciones de suscripción
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Suscribe a un tipo de evento específico
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<string> // Retorna ID de la suscripción
  
  /**
   * Suscribe a múltiples tipos de eventos
   */
  subscribeToMany<T = any>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<string>
  
  /**
   * Suscribe a eventos que coincidan con un patrón
   */
  subscribeToPattern<T = any>(
    pattern: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<string>
  
  /**
   * Desuscribe de eventos
   */
  unsubscribe(subscriptionId: string): Promise<boolean>
  
  /**
   * Pausa una suscripción
   */
  pauseSubscription(subscriptionId: string): Promise<boolean>
  
  /**
   * Reanuda una suscripción pausada
   */
  resumeSubscription(subscriptionId: string): Promise<boolean>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de handlers y errores
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Registra un handler global de errores
   */
  onError(handler: ErrorHandler): void
  
  /**
   * Remueve un handler de errores
   */
  offError(handler: ErrorHandler): void
  
  /**
   * Procesa manualmente eventos en dead letter queue
   */
  processDeadLetterQueue(
    maxEvents?: number,
    handler?: EventHandler
  ): Promise<number>
  
  /**
   * Reintenta eventos fallidos
   */
  retryFailedEvents(
    eventIds: string[],
    options?: { maxAttempts?: number }
  ): Promise<number>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Consultas y monitoreo
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene información de una suscripción
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>
  
  /**
   * Lista todas las suscripciones activas
   */
  listSubscriptions(filters?: {
    eventType?: string
    status?: string
    handlerName?: string
  }): Promise<SubscriptionInfo[]>
  
  /**
   * Obtiene eventos pendientes para un tipo específico
   */
  getPendingEvents(
    eventType?: string,
    limit?: number
  ): Promise<DomainEvent[]>
  
  /**
   * Obtiene historial de eventos
   */
  getEventHistory(
    filters: {
      eventType?: string
      merchantId?: string
      fromDate?: Date
      toDate?: Date
      limit?: number
      offset?: number
    }
  ): Promise<{
    events: DomainEvent[]
    total: number
    hasMore: boolean
  }>
  
  /**
   * Busca eventos por correlationId
   */
  getEventsByCorrelation(
    correlationId: string
  ): Promise<DomainEvent[]>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Estadísticas y salud
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene estadísticas del event bus
   */
  getStats(
    timeRange?: { from: Date; to: Date }
  ): Promise<EventBusStats>
  
  /**
   * Obtiene estado de salud
   */
  getHealth(): Promise<HealthStatus>
  
  /**
   * Resetea estadísticas
   */
  resetStats(): Promise<void>
  
  /**
   * Obtiene métricas en tiempo real
   */
  getRealTimeMetrics(): Promise<{
    eventsPerSecond: number
    averageLatency: number
    errorRate: number
    activeConnections: number
    queueSizes: Record<string, number>
  }>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de colas y persistencia
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Crea una cola personalizada
   */
  createQueue(
    name: string,
    options?: {
      durable?: boolean
      maxSize?: number
      ttl?: number
      priority?: boolean
    }
  ): Promise<void>
  
  /**
   * Elimina una cola
   */
  deleteQueue(name: string, force?: boolean): Promise<void>
  
  /**
   * Purga eventos de una cola
   */
  purgeQueue(name: string): Promise<number>
  
  /**
   * Obtiene tamaño de una cola
   */
  getQueueSize(name: string): Promise<number>
  
  // ──────────────────────────────────────────────────────────────────────────
  // Gestión de conexión y recursos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Conecta al event bus
   */
  connect(): Promise<void>
  
  /**
   * Desconecta del event bus
   */
  disconnect(): Promise<void>
  
  /**
   * Verifica conectividad
   */
  ping(): Promise<number> // Retorna latencia en ms
  
  /**
   * Verifica si está conectado
   */
  isConnected(): boolean
  
  /**
   * Cierra gracefully todas las operaciones
   */
  gracefulShutdown(timeoutMs?: number): Promise<void>
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilidades y helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Utilidades para eventos
 */
export namespace EventUtils {
  
  /**
   * Genera metadata para un evento
   */
  export function createMetadata(options: {
    source: string
    correlationId?: string
    causationId?: string
    userId?: string
    merchantId?: string
    profileId?: string
  }): EventMetadata {
    return {
      eventId: generateEventId(),
      timestamp: new Date(),
      source: options.source,
      version: '1.0',
      correlationId: options.correlationId,
      causationId: options.causationId,
      userId: options.userId,
      merchantId: options.merchantId,
      profileId: options.profileId,
      environment: process.env.NODE_ENV || 'development',
    }
  }
  
  /**
   * Crea un evento de dominio
   */
  export function createDomainEvent<T>(
    type: string,
    data: T,
    metadata: Partial<EventMetadata> = {}
  ): DomainEvent<T> {
    return {
      type,
      data,
      metadata: {
        eventId: generateEventId(),
        timestamp: new Date(),
        source: 'multipaga',
        version: '1.0',
        environment: process.env.NODE_ENV || 'development',
        ...metadata,
      }
    }
  }
  
  /**
   * Valida estructura de un evento
   */
  export function validateEvent(event: any): event is DomainEvent {
    return (
      event &&
      typeof event === 'object' &&
      typeof event.type === 'string' &&
      event.data !== undefined &&
      event.metadata &&
      typeof event.metadata === 'object' &&
      typeof event.metadata.eventId === 'string' &&
      event.metadata.timestamp instanceof Date
    )
  }
  
  /**
   * Extrae contexto de un evento para logging
   */
  export function extractContext(event: DomainEvent): {
    eventId: string
    type: string
    merchantId?: string
    userId?: string
    correlationId?: string
    timestamp: string
  } {
    return {
      eventId: event.metadata.eventId,
      type: event.type,
      merchantId: event.metadata.merchantId,
      userId: event.metadata.userId,
      correlationId: event.metadata.correlationId,
      timestamp: event.metadata.timestamp.toISOString(),
    }
  }
  
  /**
   * Calcula backoff exponencial
   */
  export function calculateBackoff(
    attempt: number,
    baseMs: number = 1000,
    maxMs: number = 30000
  ): number {
    const exponential = baseMs * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 0.1 * exponential
    return Math.min(exponential + jitter, maxMs)
  }
  
  /**
   * Genera ID único para evento
   */
  function generateEventId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `evt_${timestamp}_${random}`
  }
}

/**
 * Tipos de eventos del sistema Multipaga
 */
export const EVENT_TYPES = {
  // Payment events
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_UPDATED: 'payment.updated',
  PAYMENT_STATUS_CHANGED: 'payment.status_changed',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  
  // Refund events
  REFUND_CREATED: 'refund.created',
  REFUND_STATUS_CHANGED: 'refund.status_changed',
  REFUND_SUCCEEDED: 'refund.succeeded',
  REFUND_FAILED: 'refund.failed',
  
  // Dispute events
  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_CHALLENGED: 'dispute.challenged',
  DISPUTE_WON: 'dispute.won',
  DISPUTE_LOST: 'dispute.lost',
  DISPUTE_EVIDENCE_SUBMITTED: 'dispute.evidence_submitted',
  
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  
  // Analytics events
  ANALYTICS_TRACKED: 'analytics.tracked',
  METRICS_CALCULATED: 'metrics.calculated',
  
  // System events
  SYSTEM_HEALTH_CHANGED: 'system.health_changed',
  AUDIT_LOG_CREATED: 'audit.log_created',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
  
  // Webhook events
  WEBHOOK_DELIVERY_ATTEMPTED: 'webhook.delivery_attempted',
  WEBHOOK_DELIVERY_SUCCEEDED: 'webhook.delivery_succeeded',
  WEBHOOK_DELIVERY_FAILED: 'webhook.delivery_failed',
  
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

export default IEventBus