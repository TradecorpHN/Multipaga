// src/infrastructure/api/endpoints/RefundEndpoints.ts
// ──────────────────────────────────────────────────────────────────────────────
// Endpoints API para manejo de reembolsos según especificación Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { 
  RefundRequest,
  RefundResponse,
  Currency
} from '@/types/hyperswitch'

// Schemas de validación para reembolsos
export const RefundCreateSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID es requerido'),
  amount: z.number().int().min(1, 'Monto debe ser mayor a 0').optional(),
  reason: z.enum([
    'duplicate',
    'fraudulent', 
    'requested_by_customer',
    'expired_uncaptured_charge',
    'general'
  ]).optional(),
  refund_type: z.enum(['instant', 'regular']).default('regular'),
  metadata: z.record(z.string()).optional(),
  merchant_connector_details: z.object({
    creds_identifier: z.string().optional(),
    encoded_data: z.string().optional(),
  }).optional(),
})

export const RefundListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  payment_id: z.string().optional(),
  refund_status: z.enum([
    'failure',
    'manual_review', 
    'pending',
    'success'
  ]).optional(),
  created: z.object({
    gte: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
    gt: z.string().datetime().optional(),
    lt: z.string().datetime().optional(),
  }).optional(),
  amount: z.object({
    gte: z.number().int().optional(),
    lte: z.number().int().optional(),
    gt: z.number().int().optional(),
    lt: z.number().int().optional(),
  }).optional(),
})

export const RefundUpdateSchema = z.object({
  reason: z.enum([
    'duplicate',
    'fraudulent',
    'requested_by_customer', 
    'expired_uncaptured_charge',
    'general'
  ]).optional(),
  metadata: z.record(z.string()).optional(),
})

// Tipos exportados
export type RefundCreateData = z.infer<typeof RefundCreateSchema>
export type RefundListParams = z.infer<typeof RefundListSchema>
export type RefundUpdateData = z.infer<typeof RefundUpdateSchema>

// Endpoints de reembolsos
export class RefundEndpoints {

  /**
   * POST /refunds - Crea un nuevo reembolso
   */
  static createRefund = {
    method: 'POST' as const,
    path: '/refunds' as const,
    bodySchema: RefundCreateSchema,
    
    buildUrl: (baseUrl: string): string => {
      return `${baseUrl}/refunds`
    },
    
    validateBody: (body: unknown): RefundCreateData => {
      return RefundCreateSchema.parse(body)
    }
  }

  /**
   * GET /refunds - Lista reembolsos con filtros opcionales
   */
  static listRefunds = {
    method: 'GET' as const,
    path: '/refunds' as const,
    paramsSchema: RefundListSchema,
    
    buildUrl: (baseUrl: string, params?: RefundListParams): string => {
      const url = new URL(`${baseUrl}/refunds`)
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null) {
              // Manejar objetos anidados como created, amount
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (subValue !== undefined) {
                  url.searchParams.set(`${key}.${subKey}`, String(subValue))
                }
              })
            } else {
              url.searchParams.set(key, String(value))
            }
          }
        })
      }
      
      return url.toString()
    },
    
    validateParams: (params: unknown): RefundListParams => {
      return RefundListSchema.parse(params)
    }
  }

  /**
   * GET /refunds/{refund_id} - Obtiene detalles de un reembolso específico
   */
  static getRefund = {
    method: 'GET' as const,
    path: '/refunds/{refund_id}' as const,
    
    buildUrl: (baseUrl: string, refundId: string): string => {
      if (!refundId || refundId.trim() === '') {
        throw new Error('Refund ID es requerido')
      }
      return `${baseUrl}/refunds/${encodeURIComponent(refundId)}`
    },
    
    validateRefundId: (refundId: string): string => {
      const schema = z.string().min(1, 'Refund ID no puede estar vacío')
      return schema.parse(refundId)
    }
  }

  /**
   * POST /refunds/{refund_id}/update - Actualiza un reembolso
   */
  static updateRefund = {
    method: 'POST' as const,
    path: '/refunds/{refund_id}/update' as const,
    bodySchema: RefundUpdateSchema,
    
    buildUrl: (baseUrl: string, refundId: string): string => {
      if (!refundId || refundId.trim() === '') {
        throw new Error('Refund ID es requerido')
      }
      return `${baseUrl}/refunds/${encodeURIComponent(refundId)}/update`
    },
    
    validateBody: (body: unknown): RefundUpdateData => {
      return RefundUpdateSchema.parse(body)
    },
    
    validateRefundId: (refundId: string): string => {
      const schema = z.string().min(1, 'Refund ID no puede estar vacío')
      return schema.parse(refundId)
    }
  }

  /**
   * GET /refunds/{refund_id}/sync - Sincroniza estado del reembolso con el procesador
   */
  static syncRefund = {
    method: 'GET' as const,
    path: '/refunds/{refund_id}/sync' as const,
    
    buildUrl: (baseUrl: string, refundId: string): string => {
      if (!refundId || refundId.trim() === '') {
        throw new Error('Refund ID es requerido')
      }
      return `${baseUrl}/refunds/${encodeURIComponent(refundId)}/sync`
    },
    
    validateRefundId: (refundId: string): string => {
      const schema = z.string().min(1, 'Refund ID no puede estar vacío')
      return schema.parse(refundId)
    }
  }

  /**
   * GET /payments/{payment_id}/refunds - Lista reembolsos de un pago específico
   */
  static getPaymentRefunds = {
    method: 'GET' as const,
    path: '/payments/{payment_id}/refunds' as const,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/refunds`
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }
}

// Utilidades para manejo de reembolsos
export class RefundUtils {
  
  /**
   * Mapea estados de reembolso a etiquetas legibles
   */
  static getStatusLabel(status: 'failure' | 'manual_review' | 'pending' | 'success'): string {
    const statusLabels: Record<string, string> = {
      'failure': 'Fallido',
      'manual_review': 'Revisión Manual',
      'pending': 'Pendiente',
      'success': 'Exitoso'
    }
    
    return statusLabels[status] || status
  }

  /**
   * Mapea razones de reembolso a etiquetas legibles
   */
  static getReasonLabel(reason: string): string {
    const reasonLabels: Record<string, string> = {
      'duplicate': 'Transacción Duplicada',
      'fraudulent': 'Transacción Fraudulenta',
      'requested_by_customer': 'Solicitado por Cliente',
      'expired_uncaptured_charge': 'Cargo Expirado sin Capturar',
      'general': 'Motivo General'
    }
    
    return reasonLabels[reason] || reason
  }

  /**
   * Mapea tipos de reembolso a etiquetas legibles
   */
  static getTypeLabel(type: 'instant' | 'regular'): string {
    const typeLabels: Record<string, string> = {
      'instant': 'Instantáneo',
      'regular': 'Regular'
    }
    
    return typeLabels[type] || type
  }

  /**
   * Determina si un reembolso puede ser actualizado
   */
  static canUpdate(refund: RefundResponse): boolean {
    return ['pending', 'manual_review'].includes(refund.refund_status)
  }

  /**
   * Determina si un reembolso puede ser sincronizado
   */
  static canSync(refund: RefundResponse): boolean {
    return ['pending', 'manual_review'].includes(refund.refund_status)
  }

  /**
   * Determina si un reembolso requiere revisión manual
   */
  static requiresManualReview(refund: RefundResponse): boolean {
    return refund.refund_status === 'manual_review'
  }

  /**
   * Calcula el tiempo estimado de procesamiento
   */
  static getEstimatedProcessingTime(refund: RefundResponse): string {
    if (refund.refund_type === 'instant') {
      return '5-10 minutos'
    }
    
    // Basado en el conector usado
    const processingTimes: Record<string, string> = {
      'stripe': '5-10 días hábiles',
      'adyen': '1-3 días hábiles',
      'paypal': '3-5 días hábiles',
      'square': '2-4 días hábiles',
      'default': '3-7 días hábiles'
    }
    
    return processingTimes[refund.connector] || processingTimes['default']
  }

  /**
   * Formatea monto de reembolso
   */
  static formatAmount(amount: number, currency: Currency = 'HNL'): string {
    const currencyConfig: Record<Currency, { locale: string; divisor: number }> = {
      'USD': { locale: 'en-US', divisor: 100 },
      'EUR': { locale: 'de-DE', divisor: 100 },
      'GBP': { locale: 'en-GB', divisor: 100 },
      'HNL': { locale: 'es-HN', divisor: 100 },
      'MXN': { locale: 'es-MX', divisor: 100 },
      'GTQ': { locale: 'es-GT', divisor: 100 }
    }
    
    const config = currencyConfig[currency] || currencyConfig['HNL']
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
    }).format(amount / config.divisor)
  }

  /**
   * Valida monto de reembolso contra el pago original
   */
  static validateRefundAmount(refundAmount: number, originalAmount: number, existingRefunds: RefundResponse[] = []): { 
    isValid: boolean; 
    error?: string; 
    maxRefundable: number 
  } {
    // Calcular total ya reembolsado
    const totalRefunded = existingRefunds
      .filter(r => r.refund_status === 'success')
      .reduce((sum, r) => sum + r.refund_amount, 0)
    
    const maxRefundable = originalAmount - totalRefunded
    
    if (refundAmount <= 0) {
      return {
        isValid: false,
        error: 'El monto del reembolso debe ser mayor a 0',
        maxRefundable
      }
    }
    
    if (refundAmount > maxRefundable) {
      return {
        isValid: false,
        error: `El monto excede el máximo reembolsable: ${RefundUtils.formatAmount(maxRefundable)}`,
        maxRefundable
      }
    }
    
    return {
      isValid: true,
      maxRefundable
    }
  }

  /**
   * Calcula estadísticas de reembolsos
   */
  static calculateRefundStats(refunds: RefundResponse[]): {
    total: number;
    successful: number;
    pending: number;
    failed: number;
    totalAmount: number;
    successfulAmount: number;
    averageAmount: number;
    successRate: number;
  } {
    const total = refunds.length
    const successful = refunds.filter(r => r.refund_status === 'success').length
    const pending = refunds.filter(r => ['pending', 'manual_review'].includes(r.refund_status)).length
    const failed = refunds.filter(r => r.refund_status === 'failure').length
    
    const totalAmount = refunds.reduce((sum, r) => sum + r.refund_amount, 0)
    const successfulAmount = refunds
      .filter(r => r.refund_status === 'success')
      .reduce((sum, r) => sum + r.refund_amount, 0)
    
    const averageAmount = total > 0 ? totalAmount / total : 0
    const successRate = total > 0 ? (successful / total) * 100 : 0
    
    return {
      total,
      successful,
      pending,
      failed,
      totalAmount,
      successfulAmount,
      averageAmount,
      successRate
    }
  }

  /**
   * Determina la prioridad de un reembolso fallido para reintento
   */
  static getRetryPriority(refund: RefundResponse): 'high' | 'medium' | 'low' | 'none' {
    if (refund.refund_status !== 'failure') return 'none'
    
    const amount = refund.refund_amount
    const errorCode = refund.error_code
    
    // Errores temporales tienen alta prioridad para reintento
    const temporaryErrors = ['insufficient_funds', 'try_again_later', 'processor_temporarily_unavailable']
    if (errorCode && temporaryErrors.includes(errorCode)) {
      return 'high'
    }
    
    // Errores permanentes tienen baja prioridad
    const permanentErrors = ['refund_expired', 'already_refunded', 'invalid_refund_amount']
    if (errorCode && permanentErrors.includes(errorCode)) {
      return 'low'
    }
    
    // Montos altos tienen prioridad media
    if (amount > 50000) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Genera sugerencias para optimizar reembolsos
   */
  static getOptimizationSuggestions(refunds: RefundResponse[]): string[] {
    const suggestions: string[] = []
    const stats = RefundUtils.calculateRefundStats(refunds)
    
    if (stats.successRate < 90) {
      suggestions.push('Considere revisar la configuración del procesador para mejorar la tasa de éxito')
    }
    
    if (stats.pending > stats.total * 0.2) {
      suggestions.push('Alto número de reembolsos pendientes. Revise el estado con su procesador')
    }
    
    const instantRefunds = refunds.filter(r => r.refund_type === 'instant')
    if (instantRefunds.length < refunds.length * 0.1) {
      suggestions.push('Considere habilitar reembolsos instantáneos para mejorar la experiencia del cliente')
    }
    
    const highValueRefunds = refunds.filter(r => r.refund_amount > 100000) // > $1000
    if (highValueRefunds.length > 0) {
      suggestions.push('Considere implementar aprobación manual para reembolsos de alto valor')
    }
    
    return suggestions
  }

  /**
   * Valida datos de reembolso antes de crear
   */
  static validateRefundData(data: RefundCreateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.payment_id) {
      errors.push('Payment ID es requerido')
    }
    
    if (data.amount && data.amount <= 0) {
      errors.push('El monto debe ser mayor a 0')
    }
    
    if (data.metadata && Object.keys(data.metadata).length > 50) {
      errors.push('Metadata no puede tener más de 50 claves')
    }
    
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        if (key.length > 40) {
          errors.push(`Clave de metadata muy larga: ${key}`)
        }
        if (value.length > 500) {
          errors.push(`Valor de metadata muy largo para la clave: ${key}`)
        }
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Constantes para reembolsos
export const REFUND_CONSTANTS = {
  MIN_REFUND_AMOUNT: 50, // 50 centavos mínimo
  MAX_REFUND_AMOUNT: 99999999, // ~$1M máximo
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  METADATA_MAX_KEYS: 50,
  METADATA_KEY_MAX_LENGTH: 40,
  METADATA_VALUE_MAX_LENGTH: 500,
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'HNL', 'MXN', 'GTQ'] as Currency[],
  REFUND_TYPES: ['instant', 'regular'] as const,
  REFUND_STATUSES: ['failure', 'manual_review', 'pending', 'success'] as const,
  REFUND_REASONS: [
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'expired_uncaptured_charge',
    'general'
  ] as const,
  PROCESSING_TIMES: {
    instant: { min: 5, max: 10, unit: 'minutes' },
    regular: { min: 3, max: 7, unit: 'business_days' }
  },
  RETRY_DELAYS: {
    first: 300,    // 5 minutos
    second: 1800,  // 30 minutos  
    third: 3600,   // 1 hora
    max: 86400     // 24 horas
  },
  WEBHOOK_EVENTS: [
    'refund_succeeded',
    'refund_failed',
    'refund_updated'
  ] as const
} as const

export default RefundEndpoints