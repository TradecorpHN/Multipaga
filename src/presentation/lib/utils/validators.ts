// src/presentation/lib/utils/validators.ts
// ──────────────────────────────────────────────────────────────────────────────
// Validators - Funciones de validación y sanitización para la aplicación
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { REGEX_PATTERNS } from '../constants'

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

/**
 * Monedas soportadas por Hyperswitch
 */
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'SGD', 'HKD', 'NOK', 'DKK', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN',
  'UYU', 'GTQ', 'CRC', 'HNL', 'NIO', 'PAB', 'DOP', 'BOB', 'PYG', 'VEF',
  'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD',
  'OMR', 'JOD', 'ILS', 'TRY', 'ZAR', 'KES', 'NGN', 'GHS', 'EGP', 'MAD',
  'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'MKD', 'UAH', 'RUB',
  'KZT', 'THB', 'IDR', 'MYR', 'PHP', 'VND', 'KRW', 'TWD'
] as const

/**
 * Códigos de país ISO 3166-1 alpha-2
 */
export const SUPPORTED_COUNTRIES = [
  'US', 'CA', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CO', 'VE', 'BR',
  'PE', 'EC', 'BO', 'PY', 'UY', 'AR', 'CL', 'GB', 'IE', 'FR', 'DE', 'ES',
  'IT', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI', 'IS',
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'GR', 'CY', 'MT', 'EE',
  'LV', 'LT', 'RU', 'UA', 'BY', 'MD', 'KZ', 'UZ', 'TM', 'KG', 'TJ', 'AM',
  'AZ', 'GE', 'TR', 'IL', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB',
  'EG', 'MA', 'TN', 'DZ', 'LY', 'SD', 'KE', 'UG', 'TZ', 'RW', 'BI', 'ET',
  'SO', 'ZA', 'NA', 'BW', 'ZW', 'ZM', 'MW', 'MZ', 'AO', 'NG', 'GH', 'CM',
  'SN', 'ML', 'BF', 'NE', 'TD', 'MR', 'CI', 'LR', 'SL', 'GN', 'GM', 'IN',
  'PK', 'BD', 'LK', 'NP', 'BT', 'MM', 'TH', 'VN', 'KH', 'LA', 'MY', 'SG',
  'ID', 'PH', 'TL', 'BN', 'CN', 'HK', 'MO', 'TW', 'JP', 'KR', 'KP', 'MN',
  'AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'NC', 'PF', 'TO', 'WS', 'KI', 'TV'
] as const

/**
 * Tipos de métodos de pago
 */
export const PAYMENT_METHODS = [
  'card', 'card_redirect', 'pay_later', 'wallet', 'bank_redirect',
  'bank_transfer', 'crypto', 'bank_debit', 'reward', 'upi',
  'voucher', 'gift_card', 'open_banking'
] as const

/**
 * Estados de pago válidos
 */
export const PAYMENT_STATUSES = [
  'succeeded', 'failed', 'cancelled', 'processing', 'requires_action',
  'requires_confirmation', 'requires_payment_method', 'requires_capture'
] as const

/**
 * Estados de reembolso válidos
 */
export const REFUND_STATUSES = [
  'pending', 'success', 'failure', 'manual_review'
] as const

/**
 * Estados de disputa válidos
 */
export const DISPUTE_STATUSES = [
  'dispute_opened', 'dispute_expired', 'dispute_accepted',
  'dispute_cancelled', 'dispute_challenged', 'dispute_won', 'dispute_lost'
] as const

// ============================================================================
// VALIDADORES GENERALES
// ============================================================================

/**
 * Valida una dirección de email
 */
export function isValidEmail(email: string): boolean {
  return REGEX_PATTERNS.EMAIL.test(email)
}

/**
 * Valida un número de teléfono internacional
 */
export function isValidPhone(phone: string): boolean {
  return REGEX_PATTERNS.PHONE.test(phone)
}

/**
 * Valida una URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * Valida que una URL sea HTTPS
 */
export function isValidHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Valida un UUID v4
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// ============================================================================
// VALIDADORES DE HYPERSWITCH
// ============================================================================

/**
 * Valida un ID de pago de Hyperswitch
 */
export function isValidPaymentId(id: string): boolean {
  return REGEX_PATTERNS.PAYMENT_ID.test(id)
}

/**
 * Valida un ID de reembolso de Hyperswitch
 */
export function isValidRefundId(id: string): boolean {
  return REGEX_PATTERNS.REFUND_ID.test(id)
}

/**
 * Valida un ID de cliente de Hyperswitch
 */
export function isValidCustomerId(id: string): boolean {
  return REGEX_PATTERNS.CUSTOMER_ID.test(id)
}

/**
 * Valida un API Key de Hyperswitch
 */
export function isValidApiKey(key: string): boolean {
  return REGEX_PATTERNS.API_KEY.test(key)
}

/**
 * Valida un ID genérico de Hyperswitch
 */
export function isValidHyperswitchId(id: string, prefix?: string): boolean {
  const baseRegex = /^[a-zA-Z0-9_-]+$/
  
  if (prefix) {
    const prefixRegex = new RegExp(`^${prefix}_[a-zA-Z0-9_-]{20,}$`)
    return prefixRegex.test(id)
  }
  
  return baseRegex.test(id) && id.length >= 1 && id.length <= 64
}

/**
 * Valida un merchant ID
 */
export function isValidMerchantId(id: string): boolean {
  return id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * Valida un profile ID
 */
export function isValidProfileId(id: string): boolean {
  return id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id)
}

// ============================================================================
// VALIDADORES DE PAGO
// ============================================================================

/**
 * Valida un número de tarjeta usando el algoritmo de Luhn
 */
export function isValidCardNumber(cardNumber: string): boolean {
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
  
  const patterns: Record<string, RegExp> = {
    visa: /^4/,
    mastercard: /^5[1-5]|^2[2-7]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3[0689]/,
    jcb: /^35/,
    unionpay: /^62/,
  }
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanNumber)) {
      return type
    }
  }
  
  return 'unknown'
}

/**
 * Valida CVV según el tipo de tarjeta
 */
export function isValidCvv(cvv: string, cardType?: string): boolean {
  const cleanCvv = cvv.replace(/\D/g, '')
  
  if (cardType === 'amex') {
    return cleanCvv.length === 4
  }
  
  return cleanCvv.length === 3
}

/**
 * Valida fecha de expiración de tarjeta
 */
export function isValidCardExpiry(month: string, year: string): boolean {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  
  const expMonth = parseInt(month, 10)
  const expYear = parseInt(year, 10)
  
  // Validar formato
  if (!REGEX_PATTERNS.EXPIRY_MONTH.test(month)) return false
  if (!REGEX_PATTERNS.EXPIRY_YEAR.test(year)) return false
  
  // Convertir año de 2 dígitos a 4 dígitos si es necesario
  const fullYear = expYear < 100 ? 2000 + expYear : expYear
  
  // Verificar si la tarjeta ha expirado
  if (fullYear < currentYear) return false
  if (fullYear === currentYear && expMonth < currentMonth) return false
  
  // Verificar que no sea más de 20 años en el futuro
  if (fullYear > currentYear + 20) return false
  
  return true
}

// ============================================================================
// VALIDADORES DE MONEDA Y MONTO
// ============================================================================

/**
 * Valida un código de moneda ISO 4217
 */
export function isValidCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase() as any)
}

/**
 * Valida un monto monetario
 */
export function isValidAmount(amount: number, currency?: string): boolean {
  if (amount <= 0) return false
  
  // Validar decimales según la moneda
  if (currency) {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'VND', 'IDR']
    
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Number.isInteger(amount)
    }
  }
  
  // Validar máximo 2 decimales para otras monedas
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  return decimalPlaces <= 2
}

/**
 * Valida límites de monto por moneda
 */
export function isValidAmountForCurrency(amount: number, currency: string): boolean {
  const limits: Record<string, { min: number; max: number }> = {
    USD: { min: 50, max: 99999999 }, // $0.50 - $999,999.99
    EUR: { min: 50, max: 99999999 },
    GBP: { min: 30, max: 99999999 },
    JPY: { min: 50, max: 9999999 }, // JPY no tiene decimales
    INR: { min: 50, max: 99999999 },
    MXN: { min: 1000, max: 99999999 }, // $10.00 MXN
    HNL: { min: 1000, max: 99999999 }, // L10.00 HNL
  }
  
  const limit = limits[currency.toUpperCase()]
  if (!limit) return isValidAmount(amount, currency)
  
  return amount >= limit.min && amount <= limit.max
}

// ============================================================================
// VALIDADORES DE PAÍS Y DIRECCIÓN
// ============================================================================

/**
 * Valida un código de país ISO 3166-1 alpha-2
 */
export function isValidCountryCode(code: string): boolean {
  return SUPPORTED_COUNTRIES.includes(code.toUpperCase() as any)
}

/**
 * Valida un código postal según el país
 */
export function isValidPostalCode(postalCode: string, country: string): boolean {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/i,
    GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    ES: /^\d{5}$/,
    IT: /^\d{5}$/,
    MX: /^\d{5}$/,
    HN: /^\d{5}$/,
    GT: /^\d{5}$/,
    CR: /^\d{5}$/,
    AR: /^[A-Z]\d{4}[A-Z]{3}$/,
    BR: /^\d{5}-?\d{3}$/,
    CL: /^\d{7}$/,
    CO: /^\d{6}$/,
    PE: /^\d{5}$/,
    JP: /^\d{3}-?\d{4}$/,
    CN: /^\d{6}$/,
    IN: /^\d{6}$/,
    AU: /^\d{4}$/,
  }
  
  const pattern = patterns[country.toUpperCase()]
  return pattern ? pattern.test(postalCode) : true
}

/**
 * Valida un estado/provincia según el país
 */
export function isValidState(state: string, country: string): boolean {
  // Estados de USA
  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]
  
  // Provincias de Canadá
  const caProvinces = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ]
  
  if (country === 'US') {
    return usStates.includes(state.toUpperCase())
  }
  
  if (country === 'CA') {
    return caProvinces.includes(state.toUpperCase())
  }
  
  // Para otros países, aceptar cualquier estado no vacío
  return state.length > 0
}

// ============================================================================
// VALIDADORES DE FECHA Y TIEMPO
// ============================================================================

/**
 * Valida si una fecha es válida
 */
export function isValidDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return !isNaN(dateObj.getTime())
}

/**
 * Valida si una fecha está en el futuro
 */
export function isFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj > new Date()
}

/**
 * Valida si una fecha está en el pasado
 */
export function isPastDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj < new Date()
}

/**
 * Valida un rango de fechas
 */
export function isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  return isValidDate(start) && isValidDate(end) && start <= end
}

// ============================================================================
// VALIDADORES DE METADATOS
// ============================================================================

/**
 * Valida metadata según las restricciones de Hyperswitch
 */
export function isValidMetadata(metadata: Record<string, any>): boolean {
  const keys = Object.keys(metadata)
  
  // Máximo 50 claves
  if (keys.length > 50) return false
  
  // Validar cada clave y valor
  for (const [key, value] of Object.entries(metadata)) {
    // Clave máximo 40 caracteres
    if (key.length > 40) return false
    
    // Valor debe ser string y máximo 500 caracteres
    if (typeof value !== 'string' || value.length > 500) return false
  }
  
  return true
}

/**
 * Sanitiza metadata removiendo campos sensibles
 */
export function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'ssn', 'cvv', 'cvc',
    'card_number', 'api_key', 'private_key', 'access_token'
  ]
  
  const sanitized = { ...metadata }
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      delete sanitized[key]
    }
  })
  
  return sanitized
}

// ============================================================================
// VALIDADORES DE ESTADO
// ============================================================================

/**
 * Valida un estado de pago
 */
export function isValidPaymentStatus(status: string): boolean {
  return PAYMENT_STATUSES.includes(status as any)
}

/**
 * Valida un estado de reembolso
 */
export function isValidRefundStatus(status: string): boolean {
  return REFUND_STATUSES.includes(status as any)
}

/**
 * Valida un estado de disputa
 */
export function isValidDisputeStatus(status: string): boolean {
  return DISPUTE_STATUSES.includes(status as any)
}

/**
 * Valida un método de pago
 */
export function isValidPaymentMethod(method: string): boolean {
  return PAYMENT_METHODS.includes(method as any)
}

// ============================================================================
// UTILIDADES DE FORMATEO
// ============================================================================

/**
 * Formatea un número de tarjeta para mostrar
 */
export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '')
  const type = detectCardType(cleanNumber)
  
  if (type === 'amex') {
    // Amex: 4-6-5
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim()
  }
  
  // Otros: grupos de 4
  return cleanNumber.replace(/(\d{4})/g, '$1 ').trim()
}

/**
 * Formatea un número de teléfono
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (countryCode === 'US' || countryCode === 'CA') {
    // Formato norteamericano: (123) 456-7890
    return cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }
  
  // Formato internacional genérico
  return cleanPhone
}

/**
 * Formatea un monto monetario
 */
export function formatAmount(amount: number, currency: string): string {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'VND', 'IDR']
  const decimals = zeroDecimalCurrencies.includes(currency) ? 0 : 2
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount / (decimals === 0 ? 1 : 100))
}

/**
 * Convierte monto a unidad mínima (centavos)
 */
export function toMinorUnit(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'VND', 'IDR']
  
  if (zeroDecimalCurrencies.includes(currency)) {
    return Math.round(amount)
  }
  
  return Math.round(amount * 100)
}

/**
 * Convierte de unidad mínima a monto normal
 */
export function fromMinorUnit(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'VND', 'IDR']
  
  if (zeroDecimalCurrencies.includes(currency)) {
    return amount
  }
  
  return amount / 100
}

// ============================================================================
// VALIDADORES COMPUESTOS
// ============================================================================

/**
 * Valida datos completos de tarjeta
 */
export function validateCardData(data: {
  number: string
  expMonth: string
  expYear: string
  cvv: string
  holderName?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!isValidCardNumber(data.number)) {
    errors.push('Número de tarjeta inválido')
  }
  
  if (!isValidCardExpiry(data.expMonth, data.expYear)) {
    errors.push('Fecha de expiración inválida')
  }
  
  const cardType = detectCardType(data.number)
  if (!isValidCvv(data.cvv, cardType)) {
    errors.push('CVV inválido')
  }
  
  if (data.holderName && data.holderName.length < 2) {
    errors.push('Nombre del titular debe tener al menos 2 caracteres')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida dirección completa
 */
export function validateAddress(address: {
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!address.line1 || address.line1.length < 3) {
    errors.push('Dirección línea 1 es requerida')
  }
  
  if (!address.city || address.city.length < 2) {
    errors.push('Ciudad es requerida')
  }
  
  if (!isValidCountryCode(address.country)) {
    errors.push('Código de país inválido')
  }
  
  if (address.postalCode && !isValidPostalCode(address.postalCode, address.country)) {
    errors.push('Código postal inválido para el país seleccionado')
  }
  
  if (address.state && !isValidState(address.state, address.country)) {
    errors.push('Estado/provincia inválido para el país seleccionado')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================================
// SCHEMAS DE VALIDACIÓN CON ZOD
// ============================================================================

/**
 * Schema para validar configuración de webhook
 */
export const webhookConfigSchema = z.object({
  url: z.string().url().refine(isValidHttpsUrl, 'URL debe usar HTTPS'),
  events: z.array(z.string()).min(1, 'Debe seleccionar al menos un evento'),
  secret: z.string().min(32, 'Secret debe tener al menos 32 caracteres'),
  active: z.boolean().default(true)
})

/**
 * Schema para validar request de pago
 */
export const paymentRequestSchema = z.object({
  amount: z.number().positive().refine(
    val => Number(val.toFixed(2)) === val,
    'Monto no puede tener más de 2 decimales'
  ),
  currency: z.string().refine(isValidCurrency, 'Moneda no soportada'),
  payment_method: z.string().refine(isValidPaymentMethod, 'Método de pago no soportado'),
  customer_id: z.string().optional().refine(
    val => !val || isValidCustomerId(val),
    'ID de cliente inválido'
  ),
  metadata: z.record(z.string()).optional().refine(
    val => !val || isValidMetadata(val),
    'Metadata inválida'
  )
})

/**
 * Schema para validar filtros de búsqueda
 */
export const searchFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  amount_gte: z.number().optional(),
  amount_lte: z.number().optional(),
  currency: z.array(z.string()).optional(),
  payment_method: z.array(z.string()).optional(),
  date_from: z.string().optional().refine(
    val => !val || isValidDate(val),
    'Fecha desde inválida'
  ),
  date_to: z.string().optional().refine(
    val => !val || isValidDate(val),
    'Fecha hasta inválida'
  ),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
}).refine(
  data => {
    if (data.date_from && data.date_to) {
      return isValidDateRange(data.date_from, data.date_to)
    }
    return true
  },
  'Fecha desde debe ser anterior a fecha hasta'
)

// ============================================================================
// EXPORTACIONES ADICIONALES
// ============================================================================

export type Currency = typeof SUPPORTED_CURRENCIES[number]
export type Country = typeof SUPPORTED_COUNTRIES[number]
export type PaymentMethod = typeof PAYMENT_METHODS[number]
export type PaymentStatus = typeof PAYMENT_STATUSES[number]
export type RefundStatus = typeof REFUND_STATUSES[number]
export type DisputeStatus = typeof DISPUTE_STATUSES[number]