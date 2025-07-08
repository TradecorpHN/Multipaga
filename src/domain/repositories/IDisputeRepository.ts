// src/domain/repositories/IDisputeRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// IDisputeRepository - Interface del repositorio para disputas de pago
// ──────────────────────────────────────────────────────────────────────────────

import { Dispute, DisputeData, DisputeEvidence } from '../entities/Dispute'
import { DisputeStatus } from '../value-objects/DisputeStatus'
import { DateRange } from '../value-objects/DateRange'

/**
 * Filtros para buscar disputas
 */
export interface DisputeFilters {
  dispute_status?: DisputeStatus[]
  dispute_stage?: ('pre_dispute' | 'dispute' | 'pre_arbitration')[]
  connector?: string[]
  payment_id?: string
  customer_id?: string
  dispute_reason?: string
  amount_gte?: number
  amount_lte?: number
  currency?: string[]
  date_range?: DateRange
  challenge_required_by_gte?: Date
  challenge_required_by_lte?: Date
  has_evidence?: boolean
  resolved_disputes_only?: boolean
  unresolved_disputes_only?: boolean
}

/**
 * Opciones de ordenamiento para disputas
 */
export interface DisputeSortOptions {
  sort_by?: 'created_at' | 'dispute_amount' | 'challenge_required_by' | 'connector_created_at'
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
 * Respuesta paginada de disputas
 */
export interface PaginatedDisputesResponse {
  disputes: DisputeData[]
  total_count: number
  has_more: boolean
  next_offset?: number
}

/**
 * Parámetros para enviar evidencia de disputa
 */
export interface SubmitEvidenceParams {
  dispute_id: string
  evidence_type: 'transaction_receipt' | 'customer_communication' | 'shipping_documentation' | 'cancellation_policy' | 'refund_policy' | 'other'
  evidence_description: string
  customer_email?: string
  shipping_tracking_number?: string
  refund_amount?: number
  additional_notes?: string
  evidence_files: string[] // URLs o IDs de archivos
}

/**
 * Estadísticas de disputas
 */
export interface DisputeStatistics {
  total_disputes: number
  disputes_by_status: Record<string, number>
  disputes_by_stage: Record<string, number>
  disputes_by_connector: Record<string, number>
  total_dispute_amount: number
  average_dispute_amount: number
  dispute_rate: number // Porcentaje de transacciones disputadas
  win_rate: number // Porcentaje de disputas ganadas
  response_rate: number // Porcentaje de disputas respondidas
  period_start: Date
  period_end: Date
}

/**
 * Resumen de disputa para dashboards
 */
export interface DisputeSummary {
  dispute_id: string
  payment_id: string
  dispute_status: string
  dispute_stage: string
  amount: number
  currency: string
  connector: string
  dispute_reason?: string
  challenge_required_by?: Date
  days_to_respond?: number
  evidence_count: number
  created_at: Date
}

/**
 * Métricas de performance de disputas
 */
export interface DisputePerformanceMetrics {
  connector: string
  total_disputes: number
  disputes_won: number
  disputes_lost: number
  disputes_pending: number
  win_rate: number
  average_response_time_hours: number
  total_disputed_amount: number
  recovered_amount: number
  period_start: Date
  period_end: Date
}

/**
 * Alertas de disputas
 */
export interface DisputeAlert {
  alert_id: string
  dispute_id: string
  alert_type: 'challenge_deadline_approaching' | 'high_value_dispute' | 'repeat_customer_dispute' | 'unusual_dispute_pattern'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  action_required: boolean
  deadline?: Date
  created_at: Date
  acknowledged_at?: Date
  acknowledged_by?: string
}

/**
 * Interface del repositorio para gestión de disputas
 * 
 * Define las operaciones disponibles para gestionar disputas de pago,
 * incluyendo seguimiento, respuesta a disputas y análisis de tendencias.
 */
export interface IDisputeRepository {
  /**
   * Guarda una nueva disputa
   */
  save(dispute: Dispute): Promise<void>

  /**
   * Actualiza una disputa existente
   */
  update(dispute: Dispute): Promise<void>

  /**
   * Obtiene una disputa por su ID
   */
  findById(merchantId: string, disputeId: string): Promise<Dispute | null>

  /**
   * Obtiene una disputa por el ID del pago
   */
  findByPaymentId(merchantId: string, paymentId: string): Promise<Dispute[]>

  /**
   * Obtiene disputa por ID del conector
   */
  findByConnectorDisputeId(
    merchantId: string, 
    connectorDisputeId: string, 
    connector: string
  ): Promise<Dispute | null>

  /**
   * Lista disputas con filtros y paginación
   */
  findAll(
    merchantId: string,
    filters?: DisputeFilters,
    sortOptions?: DisputeSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedDisputesResponse>

  /**
   * Obtiene disputas pendientes de respuesta
   */
  findPendingResponse(merchantId: string): Promise<DisputeSummary[]>

  /**
   * Obtiene disputas que vencen pronto
   */
  findExpiringDisputes(
    merchantId: string,
    daysAhead: number = 7
  ): Promise<DisputeSummary[]>

  /**
   * Obtiene disputas por estado específico
   */
  findByStatus(
    merchantId: string, 
    status: DisputeStatus,
    pagination?: PaginationOptions
  ): Promise<PaginatedDisputesResponse>

  /**
   * Obtiene disputas por etapa específica
   */
  findByStage(
    merchantId: string,
    stage: 'pre_dispute' | 'dispute' | 'pre_arbitration',
    pagination?: PaginationOptions
  ): Promise<PaginatedDisputesResponse>

  /**
   * Obtiene disputas de alto valor
   */
  findHighValueDisputes(
    merchantId: string,
    minimumAmount: number,
    currency: string
  ): Promise<DisputeSummary[]>

  /**
   * Envía evidencia para una disputa
   */
  submitEvidence(
    merchantId: string,
    params: SubmitEvidenceParams
  ): Promise<DisputeEvidence>

  /**
   * Obtiene la evidencia de una disputa
   */
  getEvidence(
    merchantId: string, 
    disputeId: string
  ): Promise<DisputeEvidence[]>

  /**
   * Acepta una disputa
   */
  acceptDispute(
    merchantId: string, 
    disputeId: string,
    reason?: string
  ): Promise<void>

  /**
   * Obtiene estadísticas de disputas para un período
   */
  getStatistics(
    merchantId: string,
    dateRange: DateRange,
    connector?: string
  ): Promise<DisputeStatistics>

  /**
   * Obtiene métricas de performance por conector
   */
  getPerformanceMetrics(
    merchantId: string,
    dateRange: DateRange
  ): Promise<DisputePerformanceMetrics[]>

  /**
   * Obtiene el historial de disputas de un cliente
   */
  getCustomerDisputeHistory(
    merchantId: string,
    customerId: string
  ): Promise<DisputeSummary[]>

  /**
   * Obtiene disputas por razón específica
   */
  findByReason(
    merchantId: string,
    reason: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedDisputesResponse>

  /**
   * Obtiene alertas activas de disputas
   */
  getActiveAlerts(merchantId: string): Promise<DisputeAlert[]>

  /**
   * Crea una nueva alerta de disputa
   */
  createAlert(alert: Omit<DisputeAlert, 'alert_id' | 'created_at'>): Promise<DisputeAlert>

  /**
   * Marca una alerta como reconocida
   */
  acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void>

  /**
   * Obtiene tendencias de disputas
   */
  getDisputeTrends(
    merchantId: string,
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<Array<{
    period: string
    total_disputes: number
    total_amount: number
    win_rate: number
  }>>

  /**
   * Busca disputas por texto libre
   */
  search(
    merchantId: string,
    query: string,
    filters?: Partial<DisputeFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedDisputesResponse>

  /**
   * Obtiene disputas relacionadas (mismo cliente, patrón similar, etc.)
   */
  findRelatedDisputes(
    merchantId: string,
    disputeId: string
  ): Promise<DisputeSummary[]>

  /**
   * Obtiene disputas que requieren acción inmediata
   */
  findActionRequired(merchantId: string): Promise<DisputeSummary[]>

  /**
   * Exporta disputas a CSV/Excel
   */
  exportDisputes(
    merchantId: string,
    filters?: DisputeFilters,
    format: 'csv' | 'excel'
  ): Promise<{
    download_url: string
    expires_at: Date
  }>

  /**
   * Obtiene el resumen de disputa para notificaciones
   */
  getDisputeNotificationSummary(
    merchantId: string,
    disputeId: string
  ): Promise<{
    dispute_id: string
    payment_id: string
    amount: number
    currency: string
    customer_email?: string
    challenge_deadline?: Date
    connector: string
    dispute_reason?: string
  }>

  /**
   * Marca las disputas como revisadas
   */
  markAsReviewed(
    merchantId: string,
    disputeIds: string[],
    reviewedBy: string
  ): Promise<void>

  /**
   * Obtiene disputas no revisadas
   */
  findUnreviewed(merchantId: string): Promise<DisputeSummary[]>

  /**
   * Calcula la tasa de éxito por tipo de evidencia
   */
  getEvidenceSuccessRates(
    merchantId: string,
    dateRange: DateRange
  ): Promise<Array<{
    evidence_type: string
    total_used: number
    successful_outcomes: number
    success_rate: number
  }>>

  /**
   * Obtiene recomendaciones para mejorar la tasa de éxito en disputas
   */
  getDisputeRecommendations(
    merchantId: string
  ): Promise<Array<{
    type: 'evidence_improvement' | 'process_optimization' | 'prevention_strategy'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimated_impact: string
  }>>

  /**
   * Elimina una disputa (solo para casos excepcionales)
   */
  delete(merchantId: string, disputeId: string): Promise<void>
}