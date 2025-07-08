// src/domain/repositories/IPaymentRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// IPaymentRepository - Interface del repositorio para transacciones de pago
// ──────────────────────────────────────────────────────────────────────────────

import { Transaction, TransactionData } from '../entities/Transaction'
import { PaymentStatus } from '../value-objects/PaymentStatus'
import { DateRange } from '../value-objects/DateRange'
import { Money } from '../value-objects/Money'

/**
 * Filtros para buscar pagos
 */
export interface PaymentFilters {
  status?: PaymentStatus[]
  connector?: string[]
  payment_method?: string[]
  payment_method_type?: string[]
  customer_id?: string
  amount_gte?: number
  amount_lte?: number
  currency?: string[]
  date_range?: DateRange
  created_date_range?: DateRange
  authorized_date_range?: DateRange
  captured_date_range?: DateRange
  business_country?: string[]
  business_label?: string[]
  profile_id?: string
  error_code?: string[]
  capture_method?: ('automatic' | 'manual')[]
  authentication_type?: ('three_ds' | 'no_three_ds')[]
  has_refunds?: boolean
  has_disputes?: boolean
  recurring?: boolean
}

/**
 * Opciones de ordenamiento para pagos
 */
export interface PaymentSortOptions {
  sort_by?: 'created' | 'amount' | 'status' | 'customer_id' | 'connector' | 'authorized_at' | 'captured_at'
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
 * Respuesta paginada de pagos
 */
export interface PaginatedPaymentsResponse {
  payments: TransactionData[]
  total_count: number
  has_more: boolean
  next_offset?: number
}

/**
 * Estadísticas de pagos
 */
export interface PaymentStatistics {
  total_payments: number
  successful_payments: number
  failed_payments: number
  pending_payments: number
  cancelled_payments: number
  total_volume: number
  successful_volume: number
  failed_volume: number
  average_transaction_amount: number
  success_rate: number
  currency: string
  payments_by_status: Record<string, number>
  payments_by_method: Record<string, number>
  payments_by_connector: Record<string, number>
  period_start: Date
  period_end: Date
}

/**
 * Resumen de pago para dashboards
 */
export interface PaymentSummary {
  payment_id: string
  status: string
  amount: number
  currency: string
  customer_id?: string
  payment_method?: string
  payment_method_type?: string
  connector?: string
  created: Date
  authorized_at?: Date
  captured_at?: Date
  error_message?: string
}

/**
 * Métricas de performance por conector
 */
export interface ConnectorPerformanceMetrics {
  connector: string
  total_payments: number
  successful_payments: number
  failed_payments: number
  success_rate: number
  average_response_time_ms: number
  total_volume: number
  average_transaction_amount: number
  error_rates_by_code: Record<string, number>
  period_start: Date
  period_end: Date
}

/**
 * Parámetros para crear un pago
 */
export interface CreatePaymentParams {
  payment_id?: string
  amount: number
  currency: string
  capture_method?: 'automatic' | 'manual'
  confirm?: boolean
  customer_id?: string
  description?: string
  metadata?: Record<string, any>
  payment_method?: string
  payment_method_data?: Record<string, any>
  billing?: any
  shipping?: any
  return_url?: string
  business_country?: string
  business_label?: string
  profile_id?: string
  connector?: string[]
  authentication_type?: 'three_ds' | 'no_three_ds'
  statement_descriptor?: string
  setup_future_usage?: 'off_session' | 'on_session'
}

/**
 * Parámetros para actualizar un pago
 */
export interface UpdatePaymentParams {
  amount?: number
  currency?: string
  description?: string
  metadata?: Record<string, any>
  shipping?: any
  billing?: any
  customer_id?: string
}

/**
 * Parámetros para confirmar un pago
 */
export interface ConfirmPaymentParams {
  payment_method?: string
  payment_method_data?: Record<string, any>
  return_url?: string
  browser_info?: any
  client_secret?: string
}

/**
 * Parámetros para capturar un pago
 */
export interface CapturePaymentParams {
  amount_to_capture?: number
  reason?: string
  metadata?: Record<string, any>
}

/**
 * Parámetros para cancelar un pago
 */
export interface CancelPaymentParams {
  cancellation_reason?: string
  metadata?: Record<string, any>
}

/**
 * Resultado de operación de pago
 */
export interface PaymentOperationResult {
  success: boolean
  payment_id: string
  status: string
  error_message?: string
  error_code?: string
  next_action?: any
  updated_at: Date
}

/**
 * Alertas de pagos
 */
export interface PaymentAlert {
  alert_id: string
  payment_id: string
  alert_type: 'high_value_transaction' | 'failed_payment_spike' | 'suspicious_activity' | 'connector_down'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  action_required: boolean
  created_at: Date
  acknowledged_at?: Date
  acknowledged_by?: string
}

/**
 * Interface del repositorio para gestión de pagos
 * 
 * Define las operaciones disponibles para gestionar transacciones de pago,
 * incluyendo creación, actualización, consulta y análisis de tendencias.
 */
export interface IPaymentRepository {
  /**
   * Crea un nuevo pago
   */
  create(merchantId: string, params: CreatePaymentParams): Promise<Transaction>

  /**
   * Guarda una transacción
   */
  save(transaction: Transaction): Promise<void>

  /**
   * Actualiza una transacción existente
   */
  update(transaction: Transaction): Promise<void>

  /**
   * Obtiene un pago por su ID
   */
  findById(merchantId: string, paymentId: string): Promise<Transaction | null>

  /**
   * Obtiene un pago por el ID de transacción del conector
   */
  findByConnectorTransactionId(
    merchantId: string,
    connectorTransactionId: string,
    connector: string
  ): Promise<Transaction | null>

  /**
   * Obtiene pagos por cliente
   */
  findByCustomerId(
    merchantId: string,
    customerId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedPaymentsResponse>

  /**
   * Lista pagos con filtros y paginación
   */
  findAll(
    merchantId: string,
    filters?: PaymentFilters,
    sortOptions?: PaymentSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedPaymentsResponse>

  /**
   * Obtiene pagos por estado específico
   */
  findByStatus(
    merchantId: string,
    status: PaymentStatus,
    pagination?: PaginationOptions
  ): Promise<PaginatedPaymentsResponse>

  /**
   * Obtiene pagos pendientes de captura
   */
  findPendingCapture(merchantId: string): Promise<PaymentSummary[]>

  /**
   * Obtiene pagos fallidos recientes
   */
  findRecentFailures(
    merchantId: string,
    hoursBack: number = 24
  ): Promise<PaymentSummary[]>

  /**
   * Actualiza un pago existente
   */
  updatePayment(
    merchantId: string,
    paymentId: string,
    params: UpdatePaymentParams
  ): Promise<PaymentOperationResult>

  /**
   * Confirma un pago
   */
  confirmPayment(
    merchantId: string,
    paymentId: string,
    params: ConfirmPaymentParams
  ): Promise<PaymentOperationResult>

  /**
   * Captura un pago autorizado
   */
  capturePayment(
    merchantId: string,
    paymentId: string,
    params?: CapturePaymentParams
  ): Promise<PaymentOperationResult>

  /**
   * Cancela un pago
   */
  cancelPayment(
    merchantId: string,
    paymentId: string,
    params?: CancelPaymentParams
  ): Promise<PaymentOperationResult>

  /**
   * Obtiene estadísticas de pagos para un período
   */
  getStatistics(
    merchantId: string,
    dateRange: DateRange,
    filters?: Partial<PaymentFilters>
  ): Promise<PaymentStatistics>

  /**
   * Obtiene métricas de performance por conector
   */
  getConnectorPerformanceMetrics(
    merchantId: string,
    dateRange: DateRange
  ): Promise<ConnectorPerformanceMetrics[]>

  /**
   * Obtiene tendencias de pagos
   */
  getPaymentTrends(
    merchantId: string,
    dateRange: DateRange,
    groupBy: 'hour' | 'day' | 'week' | 'month'
  ): Promise<Array<{
    period: string
    total_payments: number
    successful_payments: number
    total_volume: number
    success_rate: number
  }>>

  /**
   * Busca pagos por texto libre
   */
  search(
    merchantId: string,
    query: string,
    filters?: Partial<PaymentFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedPaymentsResponse>

  /**
   * Obtiene el historial de intentos de un pago
   */
  getPaymentAttempts(
    merchantId: string,
    paymentId: string
  ): Promise<Array<{
    attempt_id: string
    connector: string
    status: string
    error_code?: string
    error_message?: string
    created_at: Date
  }>>

  /**
   * Obtiene pagos de alto valor
   */
  findHighValuePayments(
    merchantId: string,
    minimumAmount: number,
    currency: string,
    dateRange?: DateRange
  ): Promise<PaymentSummary[]>

  /**
   * Obtiene pagos sospechosos
   */
  findSuspiciousPayments(
    merchantId: string,
    dateRange?: DateRange
  ): Promise<PaymentSummary[]>

  /**
   * Obtiene alertas activas de pagos
   */
  getActiveAlerts(merchantId: string): Promise<PaymentAlert[]>

  /**
   * Crea una nueva alerta de pago
   */
  createAlert(alert: Omit<PaymentAlert, 'alert_id' | 'created_at'>): Promise<PaymentAlert>

  /**
   * Marca una alerta como reconocida
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>

  /**
   * Obtiene pagos que requieren acción
   */
  findActionRequired(merchantId: string): Promise<PaymentSummary[]>

  /**
   * Exporta pagos a CSV/Excel
   */
  exportPayments(
    merchantId: string,
    filters?: PaymentFilters,
    format: 'csv' | 'excel'
  ): Promise<{
    download_url: string
    expires_at: Date
  }>

  /**
   * Obtiene el volumen de transacciones por método de pago
   */
  getVolumeByPaymentMethod(
    merchantId: string,
    dateRange: DateRange
  ): Promise<Array<{
    payment_method: string
    payment_method_type?: string
    transaction_count: number
    total_volume: number
    success_rate: number
  }>>

  /**
   * Obtiene análisis de tasas de error
   */
  getErrorAnalysis(
    merchantId: string,
    dateRange: DateRange
  ): Promise<Array<{
    error_code: string
    error_message: string
    occurrence_count: number
    affected_connectors: string[]
    first_seen: Date
    last_seen: Date
  }>>

  /**
   * Obtiene métricas de tiempo de respuesta
   */
  getResponseTimeMetrics(
    merchantId: string,
    dateRange: DateRange,
    connector?: string
  ): Promise<{
    average_response_time_ms: number
    median_response_time_ms: number
    p95_response_time_ms: number
    p99_response_time_ms: number
    slowest_operations: Array<{
      operation: string
      average_time_ms: number
    }>
  }>

  /**
   * Verifica la disponibilidad de un conector
   */
  checkConnectorHealth(
    merchantId: string,
    connector: string
  ): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    response_time_ms: number
    error_rate: number
    last_checked: Date
  }>

  /**
   * Obtiene recomendaciones de optimización
   */
  getOptimizationRecommendations(
    merchantId: string
  ): Promise<Array<{
    type: 'routing_optimization' | 'connector_performance' | 'error_reduction'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimated_impact: string
  }>>

  /**
   * Elimina un pago (solo para casos excepcionales)
   */
  delete(merchantId: string, paymentId: string): Promise<void>
}