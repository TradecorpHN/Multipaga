// src/application/dtos/PaymentCreateDTO.ts
// ──────────────────────────────────────────────────────────────────────────────
// DTOs para creación de pagos - Transferencia de datos para crear pagos
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

/**
 * Schema para dirección
 */
export const AddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  line3: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

/**
 * Schema para teléfono
 */
export const PhoneSchema = z.object({
  number: z.string().optional(),
  country_code: z.string().optional(),
})

/**
 * Schema para información de billing
 */
export const BillingSchema = z.object({
  address: AddressSchema.optional(),
  phone: PhoneSchema.optional(),
  email: z.string().email().optional(),
})

/**
 * Schema para información de shipping
 */
export const ShippingSchema = z.object({
  address: AddressSchema.optional(),
  phone: PhoneSchema.optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
})

/**
 * Schema para datos de tarjeta
 */
export const CardDataSchema = z.object({
  card_number: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
  card_exp_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month'),
  card_exp_year: z.string().regex(/^\d{4}$/, 'Invalid year'),
  card_holder_name: z.string().min(1, 'Cardholder name is required'),
  card_cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),
  nick_name: z.string().optional(),
})

/**
 * Schema para datos de wallet
 */
export const WalletDataSchema = z.object({
  apple_pay: z.object({
    payment_data: z.string(),
    payment_method: z.object({
      display_name: z.string().optional(),
      network: z.string().optional(),
      type: z.string().optional(),
    }).optional(),
    transaction_identifier: z.string().optional(),
  }).optional(),
  google_pay: z.object({
    type: z.literal('google_pay'),
    info: z.object({
      card_network: z.string(),
      card_details: z.string(),
    }).optional(),
    tokenization_data: z.object({
      type: z.string(),
      token: z.string(),
    }),
  }).optional(),
  paypal: z.object({
    redirect_url: z.string().url().optional(),
    experience_context: z.object({
      payment_method_preference: z.enum(['UNRESTRICTED', 'IMMEDIATE_PAYMENT_REQUIRED']).optional(),
      brand_name: z.string().optional(),
      locale: z.string().optional(),
      landing_page: z.enum(['LOGIN', 'BILLING', 'NO_PREFERENCE']).optional(),
      shipping_preference: z.enum(['GET_FROM_FILE', 'NO_SHIPPING', 'SET_PROVIDED_ADDRESS']).optional(),
      user_action: z.enum(['PAY_NOW', 'CONTINUE']).optional(),
    }).optional(),
  }).optional(),
})

/**
 * Schema para método de pago
 */
export const PaymentMethodDataSchema = z.object({
  type: z.enum(['card', 'bank_transfer', 'wallet', 'bank_debit', 'crypto', 'voucher', 'gift_card', 'upi']),
  card: CardDataSchema.optional(),
  wallet: WalletDataSchema.optional(),
  bank_transfer: z.object({
    bank_code: z.string().optional(),
    country: z.string().optional(),
    bank_account_number: z.string().optional(),
    bank_routing_number: z.string().optional(),
    bic: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
  bank_debit: z.object({
    account_number: z.string().optional(),
    routing_number: z.string().optional(),
    account_holder_name: z.string().optional(),
    bank_account_type: z.enum(['checking', 'savings']).optional(),
    bank_name: z.string().optional(),
    bank_country_code: z.string().optional(),
    bic: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
  upi: z.object({
    vpa_id: z.string().optional(),
    flow: z.enum(['collect', 'intent']).optional(),
  }).optional(),
})

/**
 * Schema para información del navegador (3DS)
 */
export const BrowserInfoSchema = z.object({
  user_agent: z.string(),
  accept_header: z.string(),
  language: z.string(),
  color_depth: z.number(),
  screen_height: z.number(),
  screen_width: z.number(),
  time_zone: z.number(),
  java_enabled: z.boolean(),
  java_script_enabled: z.boolean(),
  ip_address: z.string().ip().optional(),
})

/**
 * Schema para datos de mandato
 */
export const MandateDataSchema = z.object({
  customer_acceptance: z.object({
    acceptance_type: z.enum(['online', 'offline']),
    accepted_at: z.string().optional(),
    online: z.object({
      ip_address: z.string().ip().optional(),
      user_agent: z.string().optional(),
    }).optional(),
    offline: z.object({
      contact_email: z.string().email().optional(),
    }).optional(),
  }),
  mandate_type: z.object({
    multi_use: z.object({
      amount: z.number().optional(),
      currency: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }).optional(),
    single_use: z.object({
      amount: z.number(),
      currency: z.string(),
    }).optional(),
  }),
})

/**
 * Schema para detalles de routing
 */
export const RoutingSchema = z.object({
  type: z.enum(['single', 'volume_split', 'advanced']),
  data: z.array(z.object({
    connector: z.string(),
    merchant_connector_id: z.string().optional(),
    percentage: z.number().min(0).max(100).optional(),
    priority: z.number().optional(),
  })),
})

/**
 * Schema principal para creación de pago
 */
export const PaymentCreateSchema = z.object({
  // Campos obligatorios
  amount: z.number().int().min(1, 'Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  
  // Campos opcionales básicos
  payment_id: z.string().optional(),
  merchant_id: z.string().optional(),
  profile_id: z.string().optional(),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  
  // Configuración de pago
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  capture_on: z.string().optional(),
  confirm: z.boolean().default(false),
  authentication_type: z.enum(['three_ds', 'no_three_ds']).default('three_ds'),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  off_session: z.boolean().optional(),
  
  // URLs
  return_url: z.string().url().optional(),
  
  // Método de pago
  payment_method: z.string().optional(),
  payment_method_data: PaymentMethodDataSchema.optional(),
  payment_token: z.string().optional(),
  
  // Información del cliente
  billing: BillingSchema.optional(),
  shipping: ShippingSchema.optional(),
  
  // Datos adicionales
  metadata: z.record(z.any()).optional(),
  browser_info: BrowserInfoSchema.optional(),
  mandate_data: MandateDataSchema.optional(),
  routing: RoutingSchema.optional(),
  
  // Configuración de negocio
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
  
  // Conectores específicos
  connector: z.array(z.string()).optional(),
  merchant_connector_id: z.string().optional(),
  
  // Campos de orden
  merchant_order_reference_id: z.string().optional(),
  
  // Feature flags
  incremental_authorization_allowed: z.boolean().optional(),
  manual_retry_allowed: z.boolean().optional(),
  
  // Campos de session
  session_expiry: z.string().optional(),
  client_secret: z.string().optional(),
  
  // Campos personalizados
  udf1: z.string().optional(),
  udf2: z.string().optional(),
})

/**
 * Schema para confirmación de pago
 */
export const PaymentConfirmSchema = z.object({
  payment_id: z.string(),
  payment_method: z.string().optional(),
  payment_method_data: PaymentMethodDataSchema.optional(),
  payment_token: z.string().optional(),
  return_url: z.string().url().optional(),
  client_secret: z.string().optional(),
  browser_info: BrowserInfoSchema.optional(),
  shipping: ShippingSchema.optional(),
  billing: BillingSchema.optional(),
})

/**
 * Schema para actualización de pago
 */
export const PaymentUpdateSchema = z.object({
  amount: z.number().int().min(1).optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.any()).optional(),
  shipping: ShippingSchema.optional(),
  billing: BillingSchema.optional(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  customer_id: z.string().optional(),
})

/**
 * Schema para captura de pago
 */
export const PaymentCaptureSchema = z.object({
  amount_to_capture: z.number().int().min(1).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Schema para cancelación de pago
 */
export const PaymentCancelSchema = z.object({
  cancellation_reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Type exports
// ──────────────────────────────────────────────────────────────────────────────

export type AddressDTO = z.infer<typeof AddressSchema>
export type PhoneDTO = z.infer<typeof PhoneSchema>
export type BillingDTO = z.infer<typeof BillingSchema>
export type ShippingDTO = z.infer<typeof ShippingSchema>
export type CardDataDTO = z.infer<typeof CardDataSchema>
export type WalletDataDTO = z.infer<typeof WalletDataSchema>
export type PaymentMethodDataDTO = z.infer<typeof PaymentMethodDataSchema>
export type BrowserInfoDTO = z.infer<typeof BrowserInfoSchema>
export type MandateDataDTO = z.infer<typeof MandateDataSchema>
export type RoutingDTO = z.infer<typeof RoutingSchema>
export type PaymentCreateDTO = z.infer<typeof PaymentCreateSchema>
export type PaymentConfirmDTO = z.infer<typeof PaymentConfirmSchema>
export type PaymentUpdateDTO = z.infer<typeof PaymentUpdateSchema>
export type PaymentCaptureDTO = z.infer<typeof PaymentCaptureSchema>
export type PaymentCancelDTO = z.infer<typeof PaymentCancelSchema>

// ──────────────────────────────────────────────────────────────────────────────
// DTOs específicos para diferentes casos de uso
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DTO simplificado para pagos rápidos
 */
export interface QuickPaymentCreateDTO {
  amount: number
  currency: string
  customer_id?: string
  description?: string
  payment_method_data: PaymentMethodDataDTO
  return_url?: string
  confirm?: boolean
}

/**
 * DTO para pagos recurrentes
 */
export interface RecurringPaymentCreateDTO extends PaymentCreateDTO {
  setup_future_usage: 'off_session'
  mandate_data: MandateDataDTO
  customer_id: string
}

/**
 * DTO para pagos con marketplace
 */
export interface MarketplacePaymentCreateDTO extends PaymentCreateDTO {
  application_fees?: Array<{
    account_id: string
    fee_type: string
    fee_amount: number
  }>
  on_behalf_of?: string
  transfer_data?: {
    destination: string
    amount?: number
  }
}

/**
 * DTO para respuesta de creación de pago
 */
export interface PaymentCreateResponseDTO {
  payment_id: string
  merchant_id: string
  status: string
  amount: number
  currency: string
  client_secret?: string
  next_action?: {
    type: string
    redirect_to_url?: {
      url: string
      return_url: string
    }
    display_bank_transfer_information?: any
    qr_code_information?: any
    wait_screen_information?: any
  }
  payment_method?: any
  created: string
  charges?: any
  metadata?: Record<string, any>
}

/**
 * DTO para errores de validación de pago
 */
export interface PaymentValidationErrorDTO {
  field: string
  code: string
  message: string
  value?: any
}

/**
 * Utilidades para validación y transformación
 */
export class PaymentCreateValidation {
  
  /**
   * Valida datos de creación de pago
   */
  static validatePaymentCreate(data: unknown): PaymentCreateDTO {
    return PaymentCreateSchema.parse(data)
  }
  
  /**
   * Valida datos de confirmación de pago
   */
  static validatePaymentConfirm(data: unknown): PaymentConfirmDTO {
    return PaymentConfirmSchema.parse(data)
  }
  
  /**
   * Valida datos de actualización de pago
   */
  static validatePaymentUpdate(data: unknown): PaymentUpdateDTO {
    return PaymentUpdateSchema.parse(data)
  }
  
  /**
   * Valida datos de captura de pago
   */
  static validatePaymentCapture(data: unknown): PaymentCaptureDTO {
    return PaymentCaptureSchema.parse(data)
  }
  
  /**
   * Convierte número de tarjeta para logging seguro
   */
  static maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 8) return cardNumber
    const first4 = cardNumber.slice(0, 4)
    const last4 = cardNumber.slice(-4)
    const middle = '*'.repeat(cardNumber.length - 8)
    return `${first4}${middle}${last4}`
  }
  
  /**
   * Valida que el monto esté en el rango permitido para la moneda
   */
  static validateAmountForCurrency(amount: number, currency: string): boolean {
    const currencyRules: Record<string, { min: number; max: number }> = {
      USD: { min: 50, max: 99999999 }, // $0.50 - $999,999.99
      EUR: { min: 50, max: 99999999 },
      GBP: { min: 30, max: 99999999 },
      JPY: { min: 50, max: 9999999 }, // JPY no tiene decimales
      INR: { min: 50, max: 99999999 },
    }
    
    const rule = currencyRules[currency.toUpperCase()]
    if (!rule) return true // Permitir otras monedas sin validación específica
    
    return amount >= rule.min && amount <= rule.max
  }
  
  /**
   * Sanitiza metadatos removiendo campos sensibles
   */
  static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'cvv', 'cvc']
    const sanitized = { ...metadata }
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete sanitized[key]
      }
    })
    
    return sanitized
  }
  
  /**
   * Construye request para Hyperswitch desde DTO
   */
  static buildHyperswitchRequest(dto: PaymentCreateDTO): Record<string, any> {
    const request: Record<string, any> = {
      amount: dto.amount,
      currency: dto.currency,
      capture_method: dto.capture_method,
      confirm: dto.confirm,
      authentication_type: dto.authentication_type,
    }
    
    // Añadir campos opcionales si están presentes
    if (dto.customer_id) request.customer_id = dto.customer_id
    if (dto.description) request.description = dto.description
    if (dto.return_url) request.return_url = dto.return_url
    if (dto.payment_method) request.payment_method = dto.payment_method
    if (dto.payment_method_data) request.payment_method_data = dto.payment_method_data
    if (dto.billing) request.billing = dto.billing
    if (dto.shipping) request.shipping = dto.shipping
    if (dto.metadata) request.metadata = PaymentCreateValidation.sanitizeMetadata(dto.metadata)
    if (dto.statement_descriptor_name) request.statement_descriptor_name = dto.statement_descriptor_name
    if (dto.statement_descriptor_suffix) request.statement_descriptor_suffix = dto.statement_descriptor_suffix
    
    return request
  }
  
  /**
   * Valida datos de tarjeta usando algoritmo de Luhn
   */
  static validateCardNumber(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\D/g, '')
    if (sanitized.length < 13 || sanitized.length > 19) return false
    
    let sum = 0
    let isEven = false
    
    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i])
      
      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  }
}

export default PaymentCreateValidation