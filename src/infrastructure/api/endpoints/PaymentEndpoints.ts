// src/infrastructure/api/endpoints/PaymentEndpoints.ts
// ──────────────────────────────────────────────────────────────────────────────
// Endpoints API para manejo de pagos según especificación Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { 
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  Currency,
  PaymentMethod,
  CaptureMethod,
  PaymentListRequest
} from '@/types/hyperswitch'

// Schemas de validación para pagos
export const PaymentCreateSchema = z.object({
  amount: z.number().int().min(1, 'Monto debe ser mayor a 0'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'HNL', 'MXN', 'GTQ']),
  confirm: z.boolean().default(false),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  payment_method: z.object({
    type: z.string(),
    data: z.record(z.any()).optional(),
  }).optional(),
  payment_method_data: z.object({
    type: z.string(),
    card: z.object({
      card_number: z.string().regex(/^\d{13,19}$/, 'Número de tarjeta inválido').optional(),
      card_exp_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mes inválido').optional(),
      card_exp_year: z.string().regex(/^\d{4}$/, 'Año inválido').optional(),
      card_holder_name: z.string().min(2).max(50).optional(),
      card_cvc: z.string().regex(/^\d{3,4}$/, 'CVC inválido').optional(),
    }).optional(),
    wallet: z.object({
      type: z.enum(['apple_pay', 'google_pay', 'paypal', 'samsung_pay']),
      data: z.record(z.any()).optional(),
    }).optional(),
    bank_transfer: z.object({
      type: z.string(),
      bank_code: z.string().optional(),
      account_number: z.string().optional(),
    }).optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  shipping: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.string()).optional(),
  return_url: z.string().url().optional(),
  webhook_url: z.string().url().optional(),
  client_secret: z.string().optional(),
  authentication_type: z.enum(['three_ds', 'no_three_ds']).optional(),
  mandate_data: z.object({
    customer_acceptance: z.object({
      acceptance_type: z.enum(['online', 'offline']),
      accepted_at: z.string().datetime().optional(),
      online: z.object({
        ip_address: z.string().ip().optional(),
        user_agent: z.string().optional(),
      }).optional(),
    }),
  }).optional(),
})

export const PaymentListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  customer_id: z.string().optional(),
  payment_status: z.enum([
    'requires_payment_method',
    'requires_confirmation',
    'requires_action', 
    'processing',
    'requires_capture',
    'cancelled',
    'succeeded',
    'failed',
    'partially_captured',
    'partially_captured_and_capturable'
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

export const PaymentUpdateSchema = z.object({
  amount: z.number().int().min(1).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'HNL', 'MXN', 'GTQ']).optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.string()).optional(),
  return_url: z.string().url().optional(),
  webhook_url: z.string().url().optional(),
  shipping: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
})

export const PaymentCaptureSchema = z.object({
  amount_to_capture: z.number().int().min(1).optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
})

export const PaymentConfirmSchema = z.object({
  payment_method: z.object({
    type: z.string(),
    data: z.record(z.any()).optional(),
  }).optional(),
  payment_method_data: z.object({
    type: z.string(),
    card: z.object({
      card_number: z.string().optional(),
      card_exp_month: z.string().optional(),
      card_exp_year: z.string().optional(),
      card_holder_name: z.string().optional(),
      card_cvc: z.string().optional(),
    }).optional(),
  }).optional(),
  return_url: z.string().url().optional(),
  client_secret: z.string().optional(),
})

// Tipos exportados
export type PaymentCreateData = z.infer<typeof PaymentCreateSchema>
export type PaymentListParams = z.infer<typeof PaymentListSchema>
export type PaymentUpdateData = z.infer<typeof PaymentUpdateSchema>
export type PaymentCaptureData = z.infer<typeof PaymentCaptureSchema>
export type PaymentConfirmData = z.infer<typeof PaymentConfirmSchema>

// Endpoints de pagos
export class PaymentEndpoints {

  /**
   * POST /payments - Crea un nuevo pago
   */
  static createPayment = {
    method: 'POST' as const,
    path: '/payments' as const,
    bodySchema: PaymentCreateSchema,
    
    buildUrl: (baseUrl: string): string => {
      return `${baseUrl}/payments`
    },
    
    validateBody: (body: unknown): PaymentCreateData => {
      return PaymentCreateSchema.parse(body)
    }
  }

  /**
   * GET /payments - Lista pagos con filtros opcionales
   */
  static listPayments = {
    method: 'GET' as const,
    path: '/payments' as const,
    paramsSchema: PaymentListSchema,
    
    buildUrl: (baseUrl: string, params?: PaymentListParams): string => {
      const url = new URL(`${baseUrl}/payments`)
      
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
    
    validateParams: (params: unknown): PaymentListParams => {
      return PaymentListSchema.parse(params)
    }
  }

  /**
   * GET /payments/{payment_id} - Obtiene detalles de un pago específico
   */
  static getPayment = {
    method: 'GET' as const,
    path: '/payments/{payment_id}' as const,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}`
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }

  /**
   * POST /payments/{payment_id}/update - Actualiza un pago existente
   */
  static updatePayment = {
    method: 'POST' as const,
    path: '/payments/{payment_id}/update' as const,
    bodySchema: PaymentUpdateSchema,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/update`
    },
    
    validateBody: (body: unknown): PaymentUpdateData => {
      return PaymentUpdateSchema.parse(body)
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }

  /**
   * POST /payments/{payment_id}/confirm - Confirma un pago
   */
  static confirmPayment = {
    method: 'POST' as const,
    path: '/payments/{payment_id}/confirm' as const,
    bodySchema: PaymentConfirmSchema,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/confirm`
    },
    
    validateBody: (body: unknown): PaymentConfirmData => {
      return PaymentConfirmSchema.parse(body)
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }

  /**
   * POST /payments/{payment_id}/capture - Captura un pago autorizado
   */
  static capturePayment = {
    method: 'POST' as const,
    path: '/payments/{payment_id}/capture' as const,
    bodySchema: PaymentCaptureSchema,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/capture`
    },
    
    validateBody: (body: unknown): PaymentCaptureData => {
      return PaymentCaptureSchema.parse(body)
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }

  /**
   * POST /payments/{payment_id}/cancel - Cancela un pago
   */
  static cancelPayment = {
    method: 'POST' as const,
    path: '/payments/{payment_id}/cancel' as const,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/cancel`
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }

  /**
   * GET /payments/{payment_id}/attempts - Lista intentos de pago
   */
  static getPaymentAttempts = {
    method: 'GET' as const,
    path: '/payments/{payment_id}/attempts' as const,
    
    buildUrl: (baseUrl: string, paymentId: string): string => {
      if (!paymentId || paymentId.trim() === '') {
        throw new Error('Payment ID es requerido')
      }
      return `${baseUrl}/payments/${encodeURIComponent(paymentId)}/attempts`
    },
    
    validatePaymentId: (paymentId: string): string => {
      const schema = z.string().min(1, 'Payment ID no puede estar vacío')
      return schema.parse(paymentId)
    }
  }
}

// Utilidades para manejo de pagos
export class PaymentUtils {
  
  /**
   * Mapea estados de pago a etiquetas legibles
   */
  static getStatusLabel(status: PaymentStatus): string {
    const statusLabels: Record<PaymentStatus, string> = {
      'requires_payment_method': 'Requiere Método de Pago',
      'requires_confirmation': 'Requiere Confirmación',
      'requires_action': 'Requiere Acción',
      'processing': 'Procesando',
      'requires_capture': 'Requiere Captura',
      'cancelled': 'Cancelado',
      'succeeded': 'Exitoso',
      'failed': 'Fallido',
      'partially_captured': 'Parcialmente Capturado',
      'partially_captured_and_capturable': 'Parcialmente Capturado y Capturable'
    }
    
    return statusLabels[status] || status
  }

  /**
   * Mapea métodos de captura a etiquetas legibles
   */
static getCaptureMethodLabel(method: CaptureMethod): string {
  const methodLabels: Record<CaptureMethod, string> = {
    automatic:             'Automática',
    manual:                'Manual',
    manual_multiple:       'Manual múltiple',
    scheduled:             'Programado',
    sequential_automatic:  'Automática secuencial',
  }

  return methodLabels[method] || method
}


  /**
   * Determina si un pago puede ser capturado
   */
  static canCapture(payment: PaymentResponse): boolean {
    return payment.status === 'requires_capture' || 
           payment.status === 'partially_captured_and_capturable'
  }

  /**
   * Determina si un pago puede ser cancelado
   */
  static canCancel(payment: PaymentResponse): boolean {
    return ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(payment.status)
  }

  /**
   * Determina si un pago puede ser confirmado
   */
  static canConfirm(payment: PaymentResponse): boolean {
    return payment.status === 'requires_confirmation'
  }

  /**
   * Determina si un pago requiere acción del usuario
   */
  static requiresAction(payment: PaymentResponse): boolean {
    return payment.status === 'requires_action'
  }

  /**
   * Calcula el monto disponible para captura
   */
  static getCapturableAmount(payment: PaymentResponse): number {
    if (payment.status === 'requires_capture') {
      return payment.amount
    }
    
    if (payment.status === 'partially_captured_and_capturable') {
      const capturedAmount = payment.amount_capturable || 0
      return payment.amount - capturedAmount
    }
    
    return 0
  }

  /**
   * Formatea monto en centavos a formato de moneda
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
   * Valida número de tarjeta usando algoritmo de Luhn
   */
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '')
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false
    }
    
    let sum = 0
    let shouldDouble = false
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i))
      
      if (shouldDouble) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      shouldDouble = !shouldDouble
    }
    
    return sum % 10 === 0
  }

  /**
   * Determina el tipo de tarjeta por el número
   */
  static getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '')
    
    if (/^4/.test(cleaned)) return 'visa'
    if (/^5[1-5]/.test(cleaned)) return 'mastercard'
    if (/^3[47]/.test(cleaned)) return 'amex'
    if (/^6/.test(cleaned)) return 'discover'
    if (/^35/.test(cleaned)) return 'jcb'
    if (/^30/.test(cleaned)) return 'diners'
    
    return 'unknown'
  }

  /**
   * Calcula la prioridad de un pago fallido para reintento
   */
  static getRetryPriority(payment: PaymentResponse): 'high' | 'medium' | 'low' | 'none' {
    if (payment.status !== 'failed') return 'none'
    
    const amount = payment.amount
    const errorCode = payment.error_code
    
    // Errores temporales tienen alta prioridad para reintento
    const temporaryErrors = ['card_declined_temporarily', 'insufficient_funds', 'try_again_later']
    if (errorCode && temporaryErrors.includes(errorCode)) {
      return 'high'
    }
    
    // Errores permanentes tienen baja prioridad
    const permanentErrors = ['card_declined', 'invalid_card', 'expired_card']
    if (errorCode && permanentErrors.includes(errorCode)) {
      return 'low'
    }
    
    // Montos altos tienen prioridad media
    if (amount > 50000) {
      return 'medium'
    }
    
    return 'low'
  }
}

// Constantes para pagos
export const PAYMENT_CONSTANTS = {
  MIN_AMOUNT: 50, // 50 centavos mínimo
  MAX_AMOUNT: 99999999, // ~$1M máximo
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  STATEMENT_DESCRIPTOR_MAX_LENGTH: 22,
  DESCRIPTION_MAX_LENGTH: 1000,
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'HNL', 'MXN', 'GTQ'] as Currency[],
  CARD_NUMBER_MIN_LENGTH: 13,
  CARD_NUMBER_MAX_LENGTH: 19,
  CVC_LENGTH: { AMEX: 4, DEFAULT: 3 },
  WEBHOOK_TIMEOUT_SECONDS: 30,
  PAYMENT_TIMEOUT_MINUTES: 15
} as const

export default PaymentEndpoints