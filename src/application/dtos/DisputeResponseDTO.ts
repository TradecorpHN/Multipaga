// src/application/dtos/DisputeResponseDTO.ts
// ──────────────────────────────────────────────────────────────────────────────
// DTOs para respuestas de disputas - Transferencia de datos de disputas
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

/**
 * Schema para evidencia de disputa
 */
export const DisputeEvidenceSchema = z.object({
  evidence_id: z.string(),
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication', 
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'duplicate_charge_documentation',
    'product_or_service_description',
    'receipt',
    'service_documentation',
    'customer_signature',
    'uncategorized_file',
    'uncategorized_text'
  ]),
  evidence_description: z.string(),
  evidence_data: z.object({
    customer_email_address: z.string().email().optional(),
    customer_name: z.string().optional(),
    shipping_address: z.string().optional(),
    shipping_carrier: z.string().optional(),
    shipping_date: z.string().optional(),
    shipping_tracking_number: z.string().optional(),
    receipt_url: z.string().url().optional(),
    service_date: z.string().optional(),
    service_documentation: z.string().optional(),
    billing_address: z.string().optional(),
    receipt: z.string().optional(),
    customer_communication: z.string().optional(),
    refund_policy: z.string().optional(),
    cancellation_policy: z.string().optional(),
    refund_policy_disclosure: z.string().optional(),
    refund_refusal_explanation: z.string().optional(),
    uncategorized_file: z.string().optional(),
    uncategorized_text: z.string().optional(),
  }).optional(),
  evidence_files: z.array(z.object({
    file_id: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    file_type: z.string(),
    file_url: z.string().url(),
    uploaded_at: z.string(),
  })).optional(),
  submitted_at: z.string(),
  submitted_by: z.string().optional(),
  status: z.enum(['pending', 'submitted', 'accepted', 'rejected']).default('pending'),
})

/**
 * Schema principal para respuesta de disputa
 */
export const DisputeResponseSchema = z.object({
  dispute_id: z.string(),
  payment_id: z.string(),
  attempt_id: z.string(),
  merchant_id: z.string(),
  connector: z.string(),
  connector_dispute_id: z.string(),
  connector_status: z.string(),
  dispute_stage: z.enum([
    'pre_dispute',
    'dispute',
    'pre_arbitration',
    'arbitration'
  ]),
  dispute_status: z.enum([
    'dispute_opened',
    'dispute_expired',
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ]),
  amount: z.string(),
  currency: z.string(),
  dispute_amount: z.number(),
  dispute_reason: z.string().optional(),
  connector_reason: z.string().optional(),
  connector_reason_code: z.string().optional(),
  challenge_required_by: z.string().optional(),
  connector_created_at: z.string().optional(),
  connector_updated_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
  evidence: z.array(DisputeEvidenceSchema).default([]),
  case_id: z.string().optional(),
  dispute_arn: z.string().optional(),
  bin: z.string().optional(),
  last_four_digits: z.string().optional(),
  card_network: z.string().optional(),
  dispute_documentation: z.object({
    dispute_id: z.string(),
    case_id: z.string().optional(),
    dispute_amount: z.number(),
    dispute_currency: z.string(),
    dispute_date: z.string(),
    dispute_reason: z.string(),
    due_by: z.string().optional(),
    liability_shift: z.boolean().optional(),
    network_reason_code: z.string().optional(),
    processor_comments: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Schema para filtros de listado de disputas
 */
export const DisputeListFiltersSchema = z.object({
  merchant_id: z.string(),
  profile_id: z.string().optional(),
  dispute_status: z.array(z.enum([
    'dispute_opened',
    'dispute_expired', 
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ])).optional(),
  dispute_stage: z.array(z.enum([
    'pre_dispute',
    'dispute', 
    'pre_arbitration',
    'arbitration'
  ])).optional(),
  connector: z.array(z.string()).optional(),
  dispute_reason: z.string().optional(),
  amount_gte: z.number().optional(),
  amount_lte: z.number().optional(),
  currency: z.array(z.string()).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  challenge_required_by_after: z.string().optional(),
  challenge_required_by_before: z.string().optional(),
  payment_id: z.string().optional(),
  customer_id: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'amount', 'challenge_required_by']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Schema para respuesta de listado de disputas
 */
export const DisputeListResponseSchema = z.object({
  disputes: z.array(DisputeResponseSchema),
  total_count: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().optional(),
  summary: z.object({
    total_disputes: z.number(),
    open_disputes: z.number(),
    won_disputes: z.number(),
    lost_disputes: z.number(),
    total_dispute_amount: z.number(),
    pending_response: z.number(),
    average_resolution_days: z.number(),
  }).optional(),
})

/**
 * Schema para estadísticas de disputas
 */
export const DisputeStatsSchema = z.object({
  merchant_id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  total_disputes: z.number(),
  total_dispute_amount: z.number(),
  dispute_rate: z.number(),
  win_rate: z.number(),
  average_resolution_time_days: z.number(),
  by_status: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    percentage: z.number(),
  })),
  by_reason: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    win_rate: z.number(),
  })),
  by_connector: z.record(z.object({
    count: z.number(),
    amount: z.number(),
    dispute_rate: z.number(),
  })),
  trending: z.array(z.object({
    period: z.string(),
    count: z.number(),
    amount: z.number(),
    dispute_rate: z.number(),
  })),
  upcoming_deadlines: z.array(z.object({
    dispute_id: z.string(),
    challenge_required_by: z.string(),
    days_remaining: z.number(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
  })),
})

// ──────────────────────────────────────────────────────────────────────────────
// Type exports
// ──────────────────────────────────────────────────────────────────────────────

export type DisputeEvidenceDTO = z.infer<typeof DisputeEvidenceSchema>
export type DisputeResponseDTO = z.infer<typeof DisputeResponseSchema>
export type DisputeListFiltersDTO = z.infer<typeof DisputeListFiltersSchema>
export type DisputeListResponseDTO = z.infer<typeof DisputeListResponseSchema>
export type DisputeStatsDTO = z.infer<typeof DisputeStatsSchema>

// ──────────────────────────────────────────────────────────────────────────────
// DTOs específicos para requests y responses
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DTO para aceptar una disputa
 */
export interface AcceptDisputeRequestDTO {
  dispute_id: string
  reason?: string
  metadata?: Record<string, any>
}

/**
 * DTO para challenge de disputa
 */
export interface ChallengeDisputeRequestDTO {
  dispute_id: string
  evidence: Array<{
    evidence_type: string
    evidence_description: string
    evidence_data?: Record<string, any>
    evidence_files?: string[]
  }>
  submit_immediately?: boolean
  metadata?: Record<string, any>
}

/**
 * DTO para respuesta de operación de disputa
 */
export interface DisputeOperationResponseDTO {
  dispute_id: string
  status: string
  message: string
  updated_at: string
  next_action?: {
    action_type: 'submit_evidence' | 'await_decision' | 'accept_loss'
    required_by?: string
    description: string
  }
}

/**
 * DTO para evidencia detallada
 */
export interface DisputeEvidenceDetailDTO extends DisputeEvidenceDTO {
  validation_status: {
    is_valid: boolean
    errors: string[]
    warnings: string[]
  }
  submission_history: Array<{
    submitted_at: string
    submitted_by: string
    status: string
    connector_response?: string
  }>
  estimated_strength: 'weak' | 'moderate' | 'strong'
  recommendations: string[]
}

/**
 * DTO para timeline de disputa
 */
export interface DisputeTimelineDTO {
  dispute_id: string
  events: Array<{
    event_id: string
    event_type: 'dispute_opened' | 'evidence_submitted' | 'decision_received' | 'status_changed'
    description: string
    timestamp: string
    actor: 'merchant' | 'customer' | 'connector' | 'system'
    data?: Record<string, any>
  }>
  milestones: Array<{
    milestone_type: 'challenge_deadline' | 'decision_expected' | 'arbitration_deadline'
    date: string
    status: 'upcoming' | 'overdue' | 'completed'
    description: string
  }>
}

/**
 * DTO para alertas de disputas
 */
export interface DisputeAlertDTO {
  alert_id: string
  dispute_id: string
  alert_type: 'deadline_approaching' | 'new_dispute' | 'evidence_required' | 'decision_received'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  action_required: boolean
  deadline?: string
  created_at: string
  acknowledged: boolean
  acknowledged_at?: string
  acknowledged_by?: string
}

/**
 * DTO para resumen de disputa
 */
export interface DisputeSummaryDTO {
  dispute_id: string
  payment_id: string
  amount: number
  currency: string
  status: string
  stage: string
  reason: string
  created_at: string
  challenge_required_by?: string
  days_to_respond?: number
  evidence_count: number
  last_activity: string
  risk_score: number
  estimated_outcome: 'likely_win' | 'uncertain' | 'likely_loss'
  priority: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Utilidades para validación y transformación
 */
export class DisputeResponseValidation {
  
  /**
   * Valida respuesta de disputa
   */
  static validateDisputeResponse(dispute: unknown): DisputeResponseDTO {
    return DisputeResponseSchema.parse(dispute)
  }
  
  /**
   * Valida filtros de listado
   */
  static validateListFilters(filters: unknown): DisputeListFiltersDTO {
    return DisputeListFiltersSchema.parse(filters)
  }
  
  /**
   * Valida evidencia de disputa
   */
  static validateEvidence(evidence: unknown): DisputeEvidenceDTO {
    return DisputeEvidenceSchema.parse(evidence)
  }
  
  /**
   * Calcula prioridad basada en tiempo restante y monto
   */
  static calculatePriority(challengeDeadline?: string, amount?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (!challengeDeadline) return 'low'
    
    const deadline = new Date(challengeDeadline)
    const now = new Date()
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysRemaining < 0) return 'critical'
    if (daysRemaining <= 2) return 'critical'
    if (daysRemaining <= 5) return 'high'
    if (daysRemaining <= 10) return 'medium'
    
    // También considerar el monto
    if (amount && amount >= 10000) return 'high'
    if (amount && amount >= 1000) return 'medium'
    
    return 'low'
  }
  
  /**
   * Formatea monto para display
   */
  static formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100) // Asumiendo que el monto está en centavos
  }
  
  /**
   * Calcula días restantes para challenge
   */
  static calculateDaysRemaining(challengeDeadline?: string): number | null {
    if (!challengeDeadline) return null
    
    const deadline = new Date(challengeDeadline)
    const now = new Date()
    
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  /**
   * Sanitiza filtros para consulta
   */
  static sanitizeFilters(filters: Record<string, any>): Partial<DisputeListFiltersDTO> {
    const allowedFields = DisputeListFiltersSchema.keyof().options
    const sanitized = Object.keys(filters)
      .filter(key => allowedFields.includes(key as any))
      .reduce((obj, key) => {
        obj[key] = filters[key]
        return obj
      }, {} as Record<string, any>)
    
    // Validación parcial para filtros opcionales
    try {
      return DisputeListFiltersSchema.partial().parse(sanitized)
    } catch {
      return {}
    }
  }
}

export default DisputeResponseValidation