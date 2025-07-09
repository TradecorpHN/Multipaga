import { z } from 'zod'

// ============================================================================
// BASE SCHEMAS - Esquemas base reutilizables
// ============================================================================

/**
 * Schema para montos monetarios
 * Valida que sean números positivos con hasta 2 decimales
 */
export const AmountSchema = z.number()
  .positive('El monto debe ser mayor a cero')
  .max(999999999, 'El monto excede el límite máximo')
  .refine(
    (val) => Number(val.toFixed(2)) === val,
    'El monto no puede tener más de 2 decimales'
  )

/**
 * Schema para códigos de moneda ISO 4217
 */
export const CurrencySchema = z.string()
  .length(3, 'El código de moneda debe tener 3 caracteres')
  .regex(/^[A-Z]{3}$/, 'Código de moneda inválido')
  .refine(
    (val) => ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'HNL', 'MXN', 'COP', 'PEN'].includes(val),
    'Moneda no soportada'
  )

/**
 * Schema para IDs de Hyperswitch
 */
export const HyperswitchIdSchema = z.string()
  .min(1, 'ID requerido')
  .max(64, 'ID demasiado largo')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID contiene caracteres inválidos')

/**
 * Schema para emails
 */
export const EmailSchema = z.string()
  .email('Email inválido')
  .max(320, 'Email demasiado largo')
  .toLowerCase()

/**
 * Schema para URLs
 */
export const UrlSchema = z.string()
  .url('URL inválida')
  .max(2048, 'URL demasiado larga')

/**
 * Schema para metadatos
 */
export const MetadataSchema = z.record(
  z.string().max(40, 'Clave de metadata demasiado larga'),
  z.string().max(500, 'Valor de metadata demasiado largo')
).refine(
  (val) => Object.keys(val).length <= 50,
  'Máximo 50 campos de metadata permitidos'
)

// ============================================================================
// CUSTOMER SCHEMAS - Esquemas para información de clientes
// ============================================================================

/**
 * Schema para información de direcciones
 */
export const AddressSchema = z.object({
  line1: z.string().max(200, 'Línea 1 demasiado larga').optional(),
  line2: z.string().max(200, 'Línea 2 demasiado larga').optional(),
  city: z.string().max(100, 'Ciudad demasiado larga').optional(),
  state: z.string().max(100, 'Estado demasiado largo').optional(),
  zip: z.string().max(20, 'Código postal demasiado largo').optional(),
  country: z.string()
    .length(2, 'Código de país debe tener 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Código de país inválido')
    .optional(),
})

/**
 * Schema para información de clientes
 */
export const CustomerSchema = z.object({
  customer_id: HyperswitchIdSchema.optional(),
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(255, 'Nombre demasiado largo')
    .optional(),
  email: EmailSchema.optional(),
  phone: z.string()
    .max(20, 'Teléfono demasiado largo')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .optional(),
  phone_country_code: z.string()
    .max(5, 'Código de país demasiado largo')
    .regex(/^\+\d{1,4}$/, 'Formato de código de país inválido')
    .optional(),
  description: z.string().max(1000, 'Descripción demasiado larga').optional(),
  metadata: MetadataSchema.optional(),
})

/**
 * Schema para detalles de envío
 */
export const ShippingSchema = z.object({
  address: AddressSchema.required(),
  name: z.string().max(255, 'Nombre demasiado largo').optional(),
  carrier: z.string().max(100, 'Transportista demasiado largo').optional(),
  phone: z.string().max(20, 'Teléfono demasiado largo').optional(),
  tracking_number: z.string().max(100, 'Número de seguimiento demasiado largo').optional(),
})

/**
 * Schema para detalles de facturación
 */
export const BillingSchema = z.object({
  address: AddressSchema.required(),
  name: z.string().max(255, 'Nombre demasiado largo').optional(),
  email: EmailSchema.optional(),
  phone: z.string().max(20, 'Teléfono demasiado largo').optional(),
})

// ============================================================================
// PAYMENT METHOD SCHEMAS - Esquemas para métodos de pago
// ============================================================================

/**
 * Schema para datos de tarjeta
 */
export const CardSchema = z.object({
  card_number: z.string()
    .min(13, 'Número de tarjeta demasiado corto')
    .max(19, 'Número de tarjeta demasiado largo')
    .regex(/^\d+$/, 'Solo se permiten números'),
  card_exp_month: z.string()
    .length(2, 'Mes debe tener 2 dígitos')
    .regex(/^(0[1-9]|1[0-2])$/, 'Mes inválido'),
  card_exp_year: z.string()
    .length(4, 'Año debe tener 4 dígitos')
    .regex(/^\d{4}$/, 'Año inválido')
    .refine(
      (val) => parseInt(val) >= new Date().getFullYear(),
      'La tarjeta está vencida'
    ),
  card_holder_name: z.string()
    .min(2, 'Nombre del titular requerido')
    .max(255, 'Nombre demasiado largo'),
  card_cvc: z.string()
    .min(3, 'CVC debe tener al menos 3 dígitos')
    .max(4, 'CVC debe tener máximo 4 dígitos')
    .regex(/^\d+$/, 'CVC solo puede contener números'),
})

/**
 * Schema para tipos de métodos de pago
 */
export const PaymentMethodTypeSchema = z.enum([
  'card',
  'wallet',
  'bank_transfer',
  'bank_debit',
  'bank_redirect',
  'crypto',
  'klarna',
  'affirm',
  'afterpay_clearpay',
  'apple_pay',
  'google_pay',
  'paypal',
  'venmo',
  'ideal',
  'sofort',
  'giropay',
  'eps',
  'przelewy24',
  'bancontact',
])

/**
 * Schema para datos de métodos de pago
 */
export const PaymentMethodDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('card'),
    card: CardSchema,
  }),
  z.object({
    type: z.literal('wallet'),
    wallet_type: z.enum(['apple_pay', 'google_pay', 'paypal', 'venmo']),
  }),
  z.object({
    type: z.literal('bank_transfer'),
    bank_name: z.string().optional(),
    bank_code: z.string().optional(),
  }),
])

// ============================================================================
// PAYMENT CREATION SCHEMAS - Esquemas para crear pagos
// ============================================================================

/**
 * Schema base para crear un pago
 */
export const PaymentCreateSchema = z.object({
  // Información básica del pago
  amount: AmountSchema,
  currency: CurrencySchema,
  description: z.string().max(1000, 'Descripción demasiado larga').optional(),
  
  // Método de captura
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  
  // Métodos de pago aceptados
  payment_method_types: z.array(PaymentMethodTypeSchema)
    .min(1, 'Debe especificar al menos un método de pago')
    .max(10, 'Demasiados métodos de pago'),
  
  // Datos del método de pago (opcional para payment intents)
  payment_method_data: PaymentMethodDataSchema.optional(),
  
  // ID del método de pago guardado
  payment_method_id: HyperswitchIdSchema.optional(),
  
  // Configuración para uso futuro
  setup_future_usage: z.enum(['none', 'on_session', 'off_session']).optional(),
  
  // URLs de redirección
  return_url: UrlSchema.optional(),
  cancel_url: UrlSchema.optional(),
  
  // Información del cliente
  customer: CustomerSchema.optional(),
  customer_id: HyperswitchIdSchema.optional(),
  
  // Detalles de envío y facturación
  shipping: ShippingSchema.optional(),
  billing: BillingSchema.optional(),
  
  // Configuración de negocio
  statement_descriptor: z.string()
    .max(22, 'Descriptor demasiado largo')
    .regex(/^[a-zA-Z0-9\s\*\.\-]+$/, 'Descriptor contiene caracteres inválidos')
    .optional(),
  
  // Metadatos
  metadata: MetadataSchema.optional(),
  
  // Configuración avanzada
  application_fee_amount: AmountSchema.optional(),
  transfer_data: z.object({
    destination: HyperswitchIdSchema,
    amount: AmountSchema.optional(),
  }).optional(),
  
  // Configuración de autenticación
  authentication_type: z.enum(['no_three_ds', 'three_ds']).optional(),
  
  // Configuración de webhooks
  webhook_endpoint_id: HyperswitchIdSchema.optional(),
})

/**
 * Schema para confirmar un pago
 */
export const PaymentConfirmSchema = z.object({
  payment_method_data: PaymentMethodDataSchema.optional(),
  payment_method_id: HyperswitchIdSchema.optional(),
  customer: CustomerSchema.optional(),
  shipping: ShippingSchema.optional(),
  billing: BillingSchema.optional(),
  return_url: UrlSchema.optional(),
  browser_info: z.object({
    user_agent: z.string().optional(),
    accept_header: z.string().optional(),
    language: z.string().optional(),
    color_depth: z.number().optional(),
    screen_height: z.number().optional(),
    screen_width: z.number().optional(),
    time_zone: z.number().optional(),
    java_enabled: z.boolean().optional(),
    java_script_enabled: z.boolean().optional(),
    ip_address: z.string().ip().optional(),
  }).optional(),
})

/**
 * Schema para capturar un pago
 */
export const PaymentCaptureSchema = z.object({
  amount: AmountSchema.optional(),
  statement_descriptor: z.string()
    .max(22, 'Descriptor demasiado largo')
    .optional(),
  metadata: MetadataSchema.optional(),
})

/**
 * Schema para cancelar un pago
 */
export const PaymentCancelSchema = z.object({
  cancellation_reason: z.enum([
    'duplicate',
    'fraudulent', 
    'requested_by_customer',
    'abandoned',
    'other'
  ]).optional(),
  metadata: MetadataSchema.optional(),
})

/**
 * Schema para actualizar un pago
 */
export const PaymentUpdateSchema = z.object({
  description: z.string().max(1000, 'Descripción demasiado larga').optional(),
  customer: CustomerSchema.optional(),
  shipping: ShippingSchema.optional(),
  billing: BillingSchema.optional(),
  metadata: MetadataSchema.optional(),
})

// ============================================================================
// FILTERS AND SEARCH SCHEMAS - Esquemas para filtros y búsqueda
// ============================================================================

/**
 * Schema para filtros de pagos
 */
export const PaymentFiltersSchema = z.object({
  // Filtros por estado
  status: z.array(z.enum([
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
  ])).optional(),
  
  // Filtros por monto
  amount_gte: AmountSchema.optional(),
  amount_lte: AmountSchema.optional(),
  
  // Filtros por moneda
  currency: z.array(CurrencySchema).optional(),
  
  // Filtros por método de pago
  payment_method_types: z.array(PaymentMethodTypeSchema).optional(),
  
  // Filtros por fechas
  created_gte: z.string().datetime().optional(),
  created_lte: z.string().datetime().optional(),
  
  // Filtros por cliente
  customer_id: HyperswitchIdSchema.optional(),
  customer_email: EmailSchema.optional(),
  
  // Filtros por conector
  connector: z.string().optional(),
  
  // Metadatos
  metadata: z.record(z.string()).optional(),
  
  // Paginación
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  
  // Ordenamiento
  sort_by: z.enum(['created', 'amount', 'status']).default('created'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Schema para búsqueda de pagos
 */
export const PaymentSearchSchema = z.object({
  query: z.string().min(1, 'Query de búsqueda requerido').max(100),
  fields: z.array(z.enum([
    'payment_id',
    'customer_email',
    'customer_name', 
    'description',
    'metadata'
  ])).optional(),
  ...PaymentFiltersSchema.omit({ limit: true, offset: true }).shape,
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// EXPORTS - Tipos TypeScript inferidos
// ============================================================================

export type PaymentCreateData = z.infer<typeof PaymentCreateSchema>
export type PaymentConfirmData = z.infer<typeof PaymentConfirmSchema>
export type PaymentCaptureData = z.infer<typeof PaymentCaptureSchema>
export type PaymentCancelData = z.infer<typeof PaymentCancelSchema>
export type PaymentUpdateData = z.infer<typeof PaymentUpdateSchema>
export type PaymentFilters = z.infer<typeof PaymentFiltersSchema>
export type PaymentSearchParams = z.infer<typeof PaymentSearchSchema>
export type CustomerData = z.infer<typeof CustomerSchema>
export type PaymentMethodData = z.infer<typeof PaymentMethodDataSchema>
export type Address = z.infer<typeof AddressSchema>
export type ShippingDetails = z.infer<typeof ShippingSchema>
export type BillingDetails = z.infer<typeof BillingSchema>

// ============================================================================
// VALIDATION HELPERS - Funciones auxiliares de validación
// ============================================================================

/**
 * Valida si una tarjeta de crédito es válida usando el algoritmo de Luhn
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '')
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false
  }
  
  let sum = 0
  let isEven = false
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10)
    
    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

/**
 * Detecta el tipo de tarjeta basado en el número
 */
export function detectCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '')
  
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]|^2[2-7]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3[0689]/,
    jcb: /^35/,
  }
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanNumber)) {
      return type
    }
  }
  
  return 'unknown'
}

/**
 * Formatea un número de tarjeta para mostrar
 */
export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '')
  return cleanNumber.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Valida un código postal por país
 */
export function validatePostalCode(postalCode: string, country: string): boolean {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    GB: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    MX: /^\d{5}$/,
    HN: /^\d{5}$/,
  }
  
  const pattern = patterns[country.toUpperCase()]
  return pattern ? pattern.test(postalCode) : true
}