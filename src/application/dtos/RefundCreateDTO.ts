// src/application/dtos/RefundCreateDTO.ts
// ──────────────────────────────────────────────────────────────────────────────
// DTOs para creación de reembolsos - Transferencia de datos para crear reembolsos
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

/**
 * Schema para razones de reembolso predefinidas
 */
export const RefundReasonSchema = z.enum([
  'duplicate',
  'fraudulent', 
  'requested_by_customer',
  'expired_uncaptured_charge',
  'product_unsatisfactory',
  'product_not_received',
  'unrecognized_charge',
  'subscription_canceled',
  'product_unacceptable',
  'service_unsatisfactory',
  'service_not_received',
  'partial_refund',
  'order_change',
  'order_canceled',
  'return_policy',
  'goodwill',
  'other'
])

/**
 * Schema para tipo de reembolso
 */
export const RefundTypeSchema = z.enum([
  'instant',
  'regular'
])

/**
 * Schema para detalles de cargos del reembolso
 */
export const RefundChargesSchema = z.object({
  charge_id: z.string().optional(),
  charge_type: z.enum(['stripe_fee', 'application_fee', 'platform_fee', 'interchange_fee']).optional(),
  charge_amount: z.number().optional(),
  refund_charge_amount: z.number().optional(),
})

/**
 * Schema principal para creación de reembolso
 */
export const RefundCreateSchema = z.object({
  // Campos obligatorios
  payment_id: z.string().min(1, 'Payment ID is required'),
  
  // Campos opcionales básicos
  refund_id: z.string().optional(),
  amount: z.number().int().min(1).optional(),
  reason: RefundReasonSchema.optional(),
  refund_type: RefundTypeSchema.default('regular'),
  
  // Campos descriptivos
  description: z.string().max(1000).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  
  // Metadatos y configuración
  metadata: z.record(z.any()).optional(),
  
  // Campos internos de Hyperswitch
  merchant_id: z.string().optional(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
  
  // Configuración avanzada
  charges: z.array(RefundChargesSchema).optional(),
  
  // Campos de auditoría
  created_by: z.string().optional(),
  reason_code: z.string().optional(),
  external_reference_id: z.string().optional(),
  
  // Configuración de notificaciones
  notify_customer: z.boolean().default(true),
  send_receipt_email: z.boolean().default(true),
  
  // Validación adicional
  force_sync: z.boolean().default(false),
  
}).refine(
  (data) => {
    // Validación personalizada: si se especifica un monto, debe ser positivo
    if (data.amount !== undefined && data.amount <= 0) {
      return false
    }
    return true
  },
  {
    message: 'Amount must be positive when specified',
    path: ['amount']
  }
)

/**
 * Schema para actualización de reembolso
 */
export const RefundUpdateSchema = z.object({
  reason: RefundReasonSchema.optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
  updated_by: z.string().optional(),
})

/**
 * Schema para cancelación de reembolso
 */
export const RefundCancelSchema = z.object({
  cancellation_reason: z.string().min(1, 'Cancellation reason is required'),
  metadata: z.record(z.any()).optional(),
  cancelled_by: z.string().optional(),
})

/**
 * Schema para filtros de listado de reembolsos
 */
export const RefundListFiltersSchema = z.object({
  merchant_id: z.string(),
  profile_id: z.string().optional(),
  payment_id: z.string().optional(),
  customer_id: z.string().optional(),
  refund_status: z.array(z.enum(['failure', 'manual_review', 'pending', 'success'])).optional(),
  refund_type: z.array(RefundTypeSchema).optional(),
  reason: z.array(RefundReasonSchema).optional(),
  connector: z.array(z.string()).optional(),
  currency: z.array(z.string()).optional(),
  amount_gte: z.number().optional(),
  amount_lte: z.number().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  updated_after: z.string().optional(),
  updated_before: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'amount', 'refund_status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Schema para respuesta de reembolso
 */
export const RefundResponseSchema = z.object({
  refund_id: z.string(),
  payment_id: z.string(),
  merchant_id: z.string(),
  connector_transaction_id: z.string(),
  connector: z.string(),
  connector_refund_id: z.string().optional(),
  external_reference_id: z.string().optional(),
  refund_type: RefundTypeSchema,
  total_amount: z.number(),
  currency: z.string(),
  refund_amount: z.number(),
  refund_status: z.enum(['failure', 'manual_review', 'pending', 'success']),
  sent_to_gateway: z.boolean(),
  refund_reason: RefundReasonSchema.optional(),
  failure_reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  error_message: z.string().optional(),
  error_code: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  description: z.string().optional(),
  attempt_id: z.string(),
  refund_arn: z.string().optional(),
  charges: z.array(RefundChargesSchema).optional(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
})

/**
 * Schema para respuesta de listado de reembolsos
 */
export const RefundListResponseSchema = z.object({
  refunds: z.array(RefundResponseSchema),
  total_count: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().optional(),
  summary: z.object({
    total_refunds: z.number(),
    total_refund_amount: z.number(),
    successful_refunds: z.number(),
    failed_refunds: z.number(),
    pending_refunds: z.number(),
    refund_rate: z.number(),
  }).optional(),
})

/**
 * Schema para estadísticas de reembolsos
 */
export const RefundStatsSchema = z.object({
  merchant_id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  total_refunds: z.number(),
  total_refund_amount: z.number(),
  refund_rate: z.number(),
  average_refund_amount: z.number(),
  average_processing_time_hours: z.number(),
  by_status: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    percentage: z.number(),
  })),
  by_reason: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    success_rate: z.number(),
  })),
  by_connector: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    success_rate: z.number(),
  })),
  by_type: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    average_processing_time: z.number(),
  })),
  trending: z.array(z.object({
    period: z.string(),
    count: z.number(),
    amount: z.number(),
    refund_rate: z.number(),
  })),
})

// ──────────────────────────────────────────────────────────────────────────────
// Type exports
// ──────────────────────────────────────────────────────────────────────────────

export type RefundReason = z.infer<typeof RefundReasonSchema>
export type RefundType = z.infer<typeof RefundTypeSchema>
export type RefundChargesDTO = z.infer<typeof RefundChargesSchema>
export type RefundCreateDTO = z.infer<typeof RefundCreateSchema>
export type RefundUpdateDTO = z.infer<typeof RefundUpdateSchema>
export type RefundCancelDTO = z.infer<typeof RefundCancelSchema>
export type RefundListFiltersDTO = z.infer<typeof RefundListFiltersSchema>
export type RefundResponseDTO = z.infer<typeof RefundResponseSchema>
export type RefundListResponseDTO = z.infer<typeof RefundListResponseSchema>
export type RefundStatsDTO = z.infer<typeof RefundStatsSchema>

// ──────────────────────────────────────────────────────────────────────────────
// DTOs específicos para diferentes casos de uso
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DTO para reembolso parcial
 */
export interface PartialRefundCreateDTO extends RefundCreateDTO {
  amount: number // Obligatorio para reembolsos parciales
  reason: 'partial_refund'
  partial_refund_details: {
    items: Array<{
      item_id: string
      item_name: string
      quantity: number
      unit_amount: number
      total_amount: number
    }>
    shipping_refund: number
    tax_refund: number
    discount_refund: number
  }
}

/**
 * DTO para reembolso completo
 */
export interface FullRefundCreateDTO extends Omit<RefundCreateDTO, 'amount'> {
  // Monto se omite intencionalmente para reembolso completo
  refund_all_charges?: boolean
}

/**
 * DTO para reembolso instantáneo
 */
export interface InstantRefundCreateDTO extends RefundCreateDTO {
  refund_type: 'instant'
  instant_refund_config?: {
    destination_account: string
    reference_id: string
  }
}

/**
 * DTO para reembolso por lotes
 */
export interface BatchRefundCreateDTO {
  refunds: Array<RefundCreateDTO>
  batch_id?: string
  batch_description?: string
  process_immediately?: boolean
  notify_on_completion?: boolean
  created_by: string
}

/**
 * DTO para respuesta de operación de reembolso
 */
export interface RefundOperationResponseDTO {
  refund_id: string
  payment_id: string
  status: string
  message: string
  refund_amount: number
  currency: string
  created_at: string
  estimated_completion?: string
  tracking_id?: string
  next_action?: {
    action_type: 'wait_processing' | 'contact_support' | 'retry'
    estimated_time?: string
    description: string
  }
}

/**
 * DTO para alertas de reembolso
 */
export interface RefundAlertDTO {
  alert_id: string
  refund_id: string
  payment_id: string
  alert_type: 'refund_failed' | 'refund_delayed' | 'high_refund_rate' | 'suspicious_refund'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  action_required: boolean
  created_at: string
  acknowledged: boolean
  acknowledged_at?: string
  acknowledged_by?: string
  auto_resolve: boolean
}

/**
 * DTO para análisis de reembolso
 */
export interface RefundAnalysisDTO {
  refund_id: string
  payment_id: string
  eligibility: {
    is_eligible: boolean
    reasons: string[]
    restrictions: string[]
  }
  risk_assessment: {
    risk_score: number
    risk_level: 'low' | 'medium' | 'high'
    fraud_indicators: string[]
    recommendations: string[]
  }
  financial_impact: {
    refund_amount: number
    fees_lost: number
    chargeback_risk: number
    total_impact: number
  }
  processing_estimate: {
    estimated_completion: string
    confidence_level: number
    potential_delays: string[]
  }
}

/**
 * Utilidades para validación y transformación
 */
export class RefundCreateValidation {
  
  /**
   * Valida datos de creación de reembolso
   */
  static validateRefundCreate(data: unknown): RefundCreateDTO {
    return RefundCreateSchema.parse(data)
  }
  
  /**
   * Valida datos de actualización de reembolso
   */
  static validateRefundUpdate(data: unknown): RefundUpdateDTO {
    return RefundUpdateSchema.parse(data)
  }
  
  /**
   * Valida filtros de listado
   */
  static validateListFilters(data: unknown): RefundListFiltersDTO {
    return RefundListFiltersSchema.parse(data)
  }
  
  /**
   * Calcula monto máximo de reembolso basado en el pago original
   */
  static calculateMaxRefundAmount(
    originalAmount: number,
    existingRefunds: RefundResponseDTO[]
  ): number {
    const totalRefunded = existingRefunds
      .filter(refund => refund.refund_status === 'success')
      .reduce((sum, refund) => sum + refund.refund_amount, 0)
    
    return Math.max(0, originalAmount - totalRefunded)
  }
  
  /**
   * Valida que el monto de reembolso no exceda el límite
   */
  static validateRefundAmount(
    refundAmount: number,
    originalAmount: number,
    existingRefunds: RefundResponseDTO[]
  ): { valid: boolean; maxAmount: number; error?: string } {
    const maxAmount = this.calculateMaxRefundAmount(originalAmount, existingRefunds)
    
    if (refundAmount > maxAmount) {
      return {
        valid: false,
        maxAmount,
        error: `Refund amount ${refundAmount} exceeds maximum refundable amount ${maxAmount}`
      }
    }
    
    return { valid: true, maxAmount }
  }
  
  /**
   * Determina el tipo de reembolso recomendado basado en el tiempo
   */
  static getRecommendedRefundType(paymentCreatedAt: string): RefundType {
    const paymentDate = new Date(paymentCreatedAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60)
    
    // Reembolso instantáneo recomendado para pagos recientes (menos de 24 horas)
    return hoursDiff <= 24 ? 'instant' : 'regular'
  }
  
  /**
   * Construye request para Hyperswitch desde DTO
   */
  static buildHyperswitchRequest(dto: RefundCreateDTO): Record<string, any> {
    const request: Record<string, any> = {
      payment_id: dto.payment_id,
      refund_type: dto.refund_type,
    }
    
    // Añadir campos opcionales si están presentes
    if (dto.amount) request.amount = dto.amount
    if (dto.reason) request.reason = dto.reason
    if (dto.description) request.description = dto.description
    if (dto.metadata) request.metadata = dto.metadata
    if (dto.statement_descriptor_suffix) request.statement_descriptor_suffix = dto.statement_descriptor_suffix
    if (dto.external_reference_id) request.external_reference_id = dto.external_reference_id
    
    return request
  }
  
  /**
   * Mapea códigos de error de Hyperswitch a mensajes amigables
   */
  static getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'refund_amount_exceeds_payment_amount': 'El monto del reembolso excede el monto del pago',
      'payment_not_found': 'El pago especificado no fue encontrado',
      'payment_not_captured': 'El pago no ha sido capturado y no puede ser reembolsado',
      'refund_not_possible': 'El reembolso no es posible para este tipo de pago',
      'connector_error': 'Error del procesador de pagos',
      'insufficient_funds': 'Fondos insuficientes para procesar el reembolso',
      'duplicate_refund': 'Ya existe un reembolso con la misma referencia',
      'refund_window_expired': 'El período para realizar reembolsos ha expirado',
      'invalid_payment_method': 'El método de pago no soporta reembolsos',
    }
    
    return errorMessages[errorCode] || `Error desconocido: ${errorCode}`
  }
  
  /**
   * Calcula estadísticas de reembolso para un conjunto de pagos
   */
  static calculateRefundStats(
    payments: Array<{ amount: number; refunds?: RefundResponseDTO[] }>
  ): {
    refundRate: number
    totalRefunded: number
    averageRefundAmount: number
    refundCount: number
  } {
    let totalPaymentAmount = 0
    let totalRefunded = 0
    let refundCount = 0
    
    payments.forEach(payment => {
      totalPaymentAmount += payment.amount
      
      if (payment.refunds) {
        payment.refunds
          .filter(refund => refund.refund_status === 'success')
          .forEach(refund => {
            totalRefunded += refund.refund_amount
            refundCount++
          })
      }
    })
    
    return {
      refundRate: totalPaymentAmount > 0 ? (totalRefunded / totalPaymentAmount) * 100 : 0,
      totalRefunded,
      averageRefundAmount: refundCount > 0 ? totalRefunded / refundCount : 0,
      refundCount,
    }
  }
  
  /**
   * Sanitiza metadatos removiendo campos sensibles
   */
  static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'account']
    const sanitized = { ...metadata }
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete sanitized[key]
      }
    })
    
    return sanitized
  }
}

export default RefundCreateValidation