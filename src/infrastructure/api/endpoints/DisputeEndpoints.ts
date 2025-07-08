// src/infrastructure/api/endpoints/DisputeEndpoints.ts
// ──────────────────────────────────────────────────────────────────────────────
// Endpoints API para manejo de disputas según especificación Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { 
  DisputeResponse, 
  DisputeListRequest, 
  DisputeEvidenceRequest,
  DisputeStatus,
  DisputeStage 
} from '@/types/hyperswitch'

// Schemas de validación
export const DisputeListParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  dispute_status: z.enum([
    'dispute_opened',
    'dispute_expired', 
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ]).optional(),
  dispute_stage: z.enum(['pre_dispute', 'dispute', 'pre_arbitration']).optional(),
  reason: z.string().optional(),
  connector: z.string().optional(),
  received_time: z.string().datetime().optional(),
  received_time_lt: z.string().datetime().optional(),
  received_time_gt: z.string().datetime().optional(),
  received_time_lte: z.string().datetime().optional(),
  received_time_gte: z.string().datetime().optional(),
})

export const DisputeEvidenceSchema = z.object({
  dispute_id: z.string().min(1),
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication', 
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other'
  ]),
  evidence_description: z.string().min(10).max(1000),
  customer_email: z.string().email().optional(),
  shipping_tracking_number: z.string().max(100).optional(),
  refund_amount: z.number().min(0).optional(),
  additional_notes: z.string().max(2000).optional(),
  evidence_files: z.array(z.string()).min(1),
  submitted_at: z.string().datetime(),
})

// Tipos exportados
export type DisputeListParams = z.infer<typeof DisputeListParamsSchema>
export type DisputeEvidenceData = z.infer<typeof DisputeEvidenceSchema>

// Endpoints de disputa
export class DisputeEndpoints {
  
  /**
   * GET /disputes - Lista disputas con filtros opcionales
   */
  static listDisputes = {
    method: 'GET' as const,
    path: '/disputes' as const,
    paramsSchema: DisputeListParamsSchema,
    
    buildUrl: (baseUrl: string, params?: DisputeListParams): string => {
      const url = new URL(`${baseUrl}/disputes`)
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(key, String(value))
          }
        })
      }
      
      return url.toString()
    },
    
    validateParams: (params: unknown): DisputeListParams => {
      return DisputeListParamsSchema.parse(params)
    }
  }

  /**
   * GET /disputes/{dispute_id} - Obtiene detalles de una disputa específica
   */
  static getDispute = {
    method: 'GET' as const,
    path: '/disputes/{dispute_id}' as const,
    
    buildUrl: (baseUrl: string, disputeId: string): string => {
      if (!disputeId || disputeId.trim() === '') {
        throw new Error('Dispute ID es requerido')
      }
      return `${baseUrl}/disputes/${encodeURIComponent(disputeId)}`
    },
    
    validateDisputeId: (disputeId: string): string => {
      const schema = z.string().min(1, 'Dispute ID no puede estar vacío')
      return schema.parse(disputeId)
    }
  }

  /**
   * POST /disputes/{dispute_id}/evidence - Envía evidencia para disputar un cargo
   */
  static submitEvidence = {
    method: 'POST' as const,
    path: '/disputes/{dispute_id}/evidence' as const,
    bodySchema: DisputeEvidenceSchema,
    
    buildUrl: (baseUrl: string, disputeId: string): string => {
      if (!disputeId || disputeId.trim() === '') {
        throw new Error('Dispute ID es requerido')
      }
      return `${baseUrl}/disputes/${encodeURIComponent(disputeId)}/evidence`
    },
    
    validateBody: (body: unknown): DisputeEvidenceData => {
      return DisputeEvidenceSchema.parse(body)
    },
    
    validateDisputeId: (disputeId: string): string => {
      const schema = z.string().min(1, 'Dispute ID no puede estar vacío')
      return schema.parse(disputeId)
    }
  }

  /**
   * GET /disputes/{dispute_id}/evidence - Obtiene evidencia enviada de una disputa
   */
  static getEvidence = {
    method: 'GET' as const,
    path: '/disputes/{dispute_id}/evidence' as const,
    
    buildUrl: (baseUrl: string, disputeId: string): string => {
      if (!disputeId || disputeId.trim() === '') {
        throw new Error('Dispute ID es requerido')
      }
      return `${baseUrl}/disputes/${encodeURIComponent(disputeId)}/evidence`
    },
    
    validateDisputeId: (disputeId: string): string => {
      const schema = z.string().min(1, 'Dispute ID no puede estar vacío')
      return schema.parse(disputeId)
    }
  }

  /**
   * PUT /disputes/{dispute_id}/accept - Acepta una disputa (no disputar)
   */
  static acceptDispute = {
    method: 'PUT' as const,
    path: '/disputes/{dispute_id}/accept' as const,
    
    buildUrl: (baseUrl: string, disputeId: string): string => {
      if (!disputeId || disputeId.trim() === '') {
        throw new Error('Dispute ID es requerido')
      }
      return `${baseUrl}/disputes/${encodeURIComponent(disputeId)}/accept`
    },
    
    validateDisputeId: (disputeId: string): string => {
      const schema = z.string().min(1, 'Dispute ID no puede estar vacío')
      return schema.parse(disputeId)
    }
  }
}

// Utilidades para manejo de disputas
export class DisputeUtils {
  
  /**
   * Mapea estados de disputa a etiquetas legibles
   */
  static getStatusLabel(status: DisputeStatus): string {
    const statusLabels: Record<DisputeStatus, string> = {
      'dispute_opened': 'Disputa Abierta',
      'dispute_expired': 'Disputa Expirada', 
      'dispute_accepted': 'Disputa Aceptada',
      'dispute_cancelled': 'Disputa Cancelada',
      'dispute_challenged': 'Disputa Disputada',
      'dispute_won': 'Disputa Ganada',
      'dispute_lost': 'Disputa Perdida'
    }
    
    return statusLabels[status] || status
  }

  /**
   * Mapea etapas de disputa a etiquetas legibles
   */
  static getStageLabel(stage: DisputeStage): string {
    const stageLabels: Record<DisputeStage, string> = {
      'pre_dispute': 'Pre-Disputa',
      'dispute': 'Disputa',
      'pre_arbitration': 'Pre-Arbitraje'
    }
    
    return stageLabels[stage] || stage
  }

  /**
   * Determina si una disputa puede ser disputada
   */
  static canChallenge(dispute: DisputeResponse): boolean {
    return (
      dispute.dispute_status === 'dispute_opened' &&
      dispute.dispute_stage !== 'pre_arbitration' &&
      dispute.challenge_required_by !== undefined &&
      new Date(dispute.challenge_required_by) > new Date()
    )
  }

  /**
   * Determina si una disputa puede ser aceptada
   */
  static canAccept(dispute: DisputeResponse): boolean {
    return (
      dispute.dispute_status === 'dispute_opened' &&
      dispute.dispute_stage !== 'pre_arbitration'
    )
  }

  /**
   * Calcula días restantes para responder a una disputa
   */
  static getDaysToRespond(dispute: DisputeResponse): number | null {
    if (!dispute.challenge_required_by) return null
    
    const deadline = new Date(dispute.challenge_required_by)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  /**
   * Determina la prioridad de una disputa basada en cantidad y tiempo
   */
  static getPriority(dispute: DisputeResponse): 'high' | 'medium' | 'low' {
    const amount = parseFloat(dispute.amount)
    const daysToRespond = this.getDaysToRespond(dispute)
    
    // Alta prioridad: montos altos o poco tiempo para responder
    if (amount > 100000 || (daysToRespond !== null && daysToRespond <= 3)) {
      return 'high'
    }
    
    // Media prioridad: montos medios o tiempo medio
    if (amount > 50000 || (daysToRespond !== null && daysToRespond <= 7)) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Valida tipos de evidencia requeridos según el motivo de disputa
   */
  static getRequiredEvidenceTypes(reason?: string): string[] {
    const evidenceMap: Record<string, string[]> = {
      'fraudulent': ['transaction_receipt', 'customer_communication'],
      'duplicate': ['transaction_receipt'],
      'subscription_canceled': ['cancellation_policy', 'customer_communication'],
      'product_unacceptable': ['shipping_documentation', 'refund_policy'],
      'product_not_received': ['shipping_documentation'],
      'unrecognized': ['transaction_receipt', 'customer_communication'],
      'credit_not_processed': ['refund_policy', 'customer_communication']
    }
    
    return evidenceMap[reason || ''] || ['transaction_receipt', 'customer_communication']
  }
}

// Constantes para disputas
export const DISPUTE_CONSTANTS = {
  MAX_EVIDENCE_FILES: 10,
  MAX_FILE_SIZE_MB: 25,
  SUPPORTED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg', 
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  EVIDENCE_DESCRIPTION_MIN_LENGTH: 10,
  EVIDENCE_DESCRIPTION_MAX_LENGTH: 1000,
  ADDITIONAL_NOTES_MAX_LENGTH: 2000
} as const

export default DisputeEndpoints