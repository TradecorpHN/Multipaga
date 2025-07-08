// src/domain/repositories/IRefundRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// IRefundRepository - Interface del repositorio para reembolsos
// ──────────────────────────────────────────────────────────────────────────────

import { Refund, RefundData } from '../entities/Refund'
import { RefundStatus } from '../value-objects/RefundStatus'
import { DateRange } from '../value-objects/DateRange'

/**
 * Filtros para buscar reembolsos
 */
export interface RefundFilters {
  refund_status?: RefundStatus[]
  refund_type?: ('instant' | 'regular')[]
  connector?: string[]
  payment_id?: string
  customer_id?: string
  amount_gte?: number
  amount_lte?: number
  currency?: string[]
  date_range?: DateRange
  created_date_range?: DateRange
  processed_date_range?: DateRange
  refund_reason?: string
  sent_to_gateway?: boolean
  has_error?: boolean
  error_code?: string[]
  profile_id?: string
  merchant_connector_id?: string
}

/**
 * Opciones de ordenamiento para reembolsos
 */
export interface RefundSortOptions {
  sort_by?: 'created_at' | 'updated_at' | 'refund_amount' | 'status' | 'connector'
  sort_order?: 'asc' | 'desc'
}

/**
 * Opciones de paginación
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
}

/**
 * Respuesta paginada de reembolsos
 */
export interface PaginatedRefundsResponse {
  refunds: RefundData[]
  total_count: number
  has_more: boolean
  next_offset?: number
}

/**
 * Parámetros para crear un reembolso
 */
export interface CreateRefundParams {
  payment_id: string
  refund_id?: string
  amount?: number
  reason?: string
  refund_type?: 'instant' | 'regular'
  metadata?: Record<string, any>
  description?: string
}

/**
 * Parámetros para actualizar un reembolso
 */
export interface UpdateRefundParams {
  refund_id: string
  refund_reason?: string
  metadata?: Record<string, any>
  description?: string
}

/**
 * Estadísticas de reembolsos
 */
export interface RefundStatistics {
  total_refunds: number
  successful_refunds: number
  failed_refunds: number
  pending_refunds: number
  total_refund_amount: number
  successful_refund_amount: number
  failed_refund_amount: number
  average_refund_amount: number
  refund_rate: number // Porcentaje de pagos reembolsados
  success_rate: number // Porcentaje de reembolsos exitosos
  instant_refunds_count: number
  regular_refunds_count: number
  refunds_by_status: Record<string, number>
  refunds_by_reason: Record<string, number>
  refunds_by_connector: Record<string, number>
  period_start: Date
  period_end: Date
}

/**
 * Resumen de reembolso para dashboards
 */
export interface RefundSummary {
  refund_id: string
  payment_id: string
  refund_status: string
  refund_type: 'instant' | 'regular'
  refund_amount: number
  total_amount: number
  currency: string
  connector: string
  refund_reason?: string
  failure_reason?: string
  created_at: Date
  updated_at: Date
  sent_to_gateway: boolean
  processing_duration_ms?: number
}

/**
 * Métricas de performance de reembolsos por conector
 */
export interface RefundPerformanceMetrics {
  connector: string
  total_refunds: number
  successful_refunds: number
  failed_refunds: number
  success_rate: number
  average_processing_time_ms: number
  instant_refunds_supported: boolean
  total_refund_volume: number
  average_refund_amount: number
  error_rates_by_code: Record<string, number>
  period_start: Date
  period_end: Date
}

/**
 * Resultado de operación de reembolso
 */
export interface RefundOperationResult {
  success: boolean
  refund_id: string
  status: string
  error_message?: string
  error_code?: string
  connector_refund_id?: string
  processing_time_ms?: number
  updated_at: Date
}

/**
 * Alertas de reembolsos
 */
export interface RefundAlert {
  alert_id: string
  refund_id: string
  payment_id: string
  alert_type: 'refund_failed' | 'high_refund_rate' | 'processing_delayed' | 'unusual_refund_pattern'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  action_required: boolean
  created_at: Date
  acknowledged_at?: Date
  acknowledged_by?: string
}

/**
 * Análisis de tendencias de reembolsos
 */
export interface RefundTrendAnalysis {
  period: string
  total_refunds: number
  refund_amount: number
  refund_rate: number
  success_rate: number
  average_processing_time_ms: number
  top_refund_reasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
  connector_performance: Array<{
    connector: string
    success_rate: number
    average_time_ms: number
  }>
}

/**
 * Configuración de políticas de reembolso
 */
export interface RefundPolicyConfig {
  merchant_id: string
  auto_refund_enabled: boolean
  auto_refund_threshold_amount?: number
  auto_refund_time_limit_hours?: number
  instant_refund_enabled: boolean
  instant_refund_max_amount?: number
  partial_refunds_allowed: boolean
  refund_reasons_required: boolean
  allowed_refund_reasons?: string[]
  notification_settings: {
    email_notifications: boolean
    webhook_notifications: boolean
    sms_notifications: boolean
  }
  approval_workflow: {
    enabled: boolean
    approval_threshold_amount?: number
    auto_approve_trusted_customers: boolean
  }
}

/**
 * Interface del repositorio para gestión de reembolsos
 * 
 * Define las operaciones disponibles para gestionar reembolsos,
 * incluyendo procesamiento, seguimiento y análisis de tendencias.
 */
export interface IRefundRepository {
  /**
   * Crea un nuevo reembolso
   */
  create(merchantId: string, params: CreateRefundParams): Promise<Refund>

  /**
   * Guarda un reembolso
   */
  save(refund: Refund): Promise<void>

  /**
   * Actualiza un reembolso existente
   */
  update(refund: Refund): Promise<void>

  /**
   * Obtiene un reembolso por su ID
   */
  findById(merchantId: string, refundId: string): Promise<Refund | null>

  /**
   * Obtiene reembolsos por ID de pago
   */
  findByPaymentId(
    merchantId: string,
    paymentId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene un reembolso por el ID del conector
   */
  findByConnectorRefundId(
    merchantId: string,
    connectorRefundId: string,
    connector: string
  ): Promise<Refund | null>

  /**
   * Lista reembolsos con filtros y paginación
   */
  findAll(
    merchantId: string,
    filters?: RefundFilters,
    sortOptions?: RefundSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene reembolsos por estado específico
   */
  findByStatus(
    merchantId: string,
    status: RefundStatus,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene reembolsos pendientes
   */
  findPending(merchantId: string): Promise<RefundSummary[]>

  /**
   * Obtiene reembolsos fallidos recientes
   */
  findRecentFailures(
    merchantId: string,
    hoursBack: number = 24
  ): Promise<RefundSummary[]>

  /**
   * Obtiene reembolsos que requieren revisión manual
   */
  findRequiringManualReview(merchantId: string): Promise<RefundSummary[]>

  /**
   * Actualiza un reembolso con parámetros específicos
   */
  updateRefund(
    merchantId: string,
    params: UpdateRefundParams
  ): Promise<RefundOperationResult>

  /**
   * Procesa un reembolso
   */
  processRefund(
    merchantId: string,
    refundId: string
  ): Promise<RefundOperationResult>

  /**
   * Cancela un reembolso (solo si está pendiente)
   */
  cancelRefund(
    merchantId: string,
    refundId: string,
    reason: string
  ): Promise<RefundOperationResult>

  /**
   * Reintenta un reembolso fallido
   */
  retryRefund(
    merchantId: string,
    refundId: string
  ): Promise<RefundOperationResult>

  /**
   * Obtiene estadísticas de reembolsos para un período
   */
  getStatistics(
    merchantId: string,
    dateRange: DateRange,
    filters?: Partial<RefundFilters>
  ): Promise<RefundStatistics>

  /**
   * Obtiene métricas de performance por conector
   */
  getPerformanceMetrics(
    merchantId: string,
    dateRange: DateRange
  ): Promise<RefundPerformanceMetrics[]>

  /**
   * Obtiene tendencias de reembolsos
   */
  getRefundTrends(
    merchantId: string,
    dateRange: DateRange,
    groupBy: 'hour' | 'day' | 'week' | 'month'
  ): Promise<RefundTrendAnalysis[]>

  /**
   * Busca reembolsos por texto libre
   */
  search(
    merchantId: string,
    query: string,
    filters?: Partial<RefundFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene el historial de reembolsos de un cliente
   */
  getCustomerRefundHistory(
    merchantId: string,
    customerId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene reembolsos por razón específica
   */
  findByReason(
    merchantId: string,
    reason: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedRefundsResponse>

  /**
   * Obtiene reembolsos de alto valor
   */
  findHighValueRefunds(
    merchantId: string,
    minimumAmount: number,
    currency: string,
    dateRange?: DateRange
  ): Promise<RefundSummary[]>

  /**
   * Obtiene alertas activas de reembolsos
   */
  getActiveAlerts(merchantId: string): Promise<RefundAlert[]>

  /**
   * Crea una nueva alerta de reembolso
   */
  createAlert(alert: Omit<RefundAlert, 'alert_id' | 'created_at'>): Promise<RefundAlert>

  /**
   * Marca una alerta como reconocida
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>

  /**
   * Exporta reembolsos a CSV/Excel
   */
  exportRefunds(
    merchantId: string,
    filters?: RefundFilters,
    format: 'csv' | 'excel'
  ): Promise<{
    download_url: string
    expires_at: Date
  }>

  /**
   * Obtiene la tasa de reembolsos por método de pago
   */
  getRefundRateByPaymentMethod(
    merchantId: string,
    dateRange: DateRange
  ): Promise<Array<{
    payment_method: string
    payment_method_type?: string
    total_payments: number
    total_refunds: number
    refund_rate: number
    average_refund_amount: number
  }>>

  /**
   * Obtiene análisis de razones de reembolso
   */
  getRefundReasonAnalysis(
    merchantId: string,
    dateRange: DateRange
  ): Promise<Array<{
    reason: string
    count: number
    percentage: number
    total_amount: number
    average_amount: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }>>

  /**
   * Obtiene métricas de tiempo de procesamiento
   */
  getProcessingTimeMetrics(
    merchantId: string,
    dateRange: DateRange,
    connector?: string
  ): Promise<{
    average_processing_time_ms: number
    median_processing_time_ms: number
    p95_processing_time_ms: number
    p99_processing_time_ms: number
    instant_refunds_percentage: number
    slowest_connectors: Array<{
      connector: string
      average_time_ms: number
    }>
  }>

  /**
   * Verifica la elegibilidad para reembolso de un pago
   */
  checkRefundEligibility(
    merchantId: string,
    paymentId: string,
    requestedAmount?: number
  ): Promise<{
    eligible: boolean
    reason?: string
    max_refundable_amount: number
    available_refund_amount: number
    existing_refunds: RefundSummary[]
  }>

  /**
   * Obtiene la configuración de políticas de reembolso
   */
  getRefundPolicyConfig(merchantId: string): Promise<RefundPolicyConfig | null>

  /**
   * Actualiza la configuración de políticas de reembolso
   */
  updateRefundPolicyConfig(
    merchantId: string,
    config: Partial<RefundPolicyConfig>
  ): Promise<void>

  /**
   * Obtiene recomendaciones para optimizar reembolsos
   */
  getOptimizationRecommendations(
    merchantId: string
  ): Promise<Array<{
    type: 'processing_speed' | 'success_rate' | 'cost_reduction' | 'policy_optimization'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimated_impact: string
    implementation_effort: 'low' | 'medium' | 'high'
  }>>

  /**
   * Obtiene el estado de salud del sistema de reembolsos
   */
  getRefundSystemHealth(merchantId: string): Promise<{
    overall_status: 'healthy' | 'degraded' | 'critical'
    success_rate_24h: number
    average_processing_time_24h: number
    pending_refunds_count: number
    failed_refunds_24h: number
    connector_status: Array<{
      connector: string
      status: 'healthy' | 'degraded' | 'down'
      success_rate: number
      last_successful_refund: Date
    }>
    alerts_count: number
    last_updated: Date
  }>

  /**
   * Elimina un reembolso (solo para casos excepcionales)
   */
  delete(merchantId: string, refundId: string): Promise<void>
}