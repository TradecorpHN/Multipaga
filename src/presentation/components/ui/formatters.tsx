// /home/kali/multipaga/src/presentation/components/ui/formatters.tsx

import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Locale } from 'date-fns'  // CORRECCIÓN PRINCIPAL

// -- Formateo de moneda --
export interface CurrencyFormatOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showCurrency?: boolean
  showSymbol?: boolean
  compact?: boolean
}

export function formatCurrency(
  amount: number | string,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = 'HNL',
    locale = 'es-HN',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrency = true,
    showSymbol = true,
    compact = false,
  } = options

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '0.00'
  if (compact) return formatCompactCurrency(numAmount, { currency, locale, showSymbol })

  const formatter = new Intl.NumberFormat(locale, {
    style: showCurrency ? 'currency' : 'decimal',
    currency: showCurrency ? currency : undefined,
    minimumFractionDigits,
    maximumFractionDigits,
  } as Intl.NumberFormatOptions)

  let formatted = formatter.format(numAmount)
  if (!showCurrency && showSymbol) {
    const symbols: Record<string, string> = {
      HNL: 'L', USD: '$', EUR: '€', GBP: '£',
    }
    formatted = `${symbols[currency] || currency} ${formatted}`
  }
  return formatted
}

export function formatCompactCurrency(
  amount: number,
  options: Pick<CurrencyFormatOptions, 'currency' | 'locale' | 'showSymbol'> = {}
): string {
  const { currency = 'HNL', locale = 'es-HN', showSymbol = true } = options
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
  } as Intl.NumberFormatOptions)
  return formatter.format(amount)
}

export function formatCurrencyRange(
  min: number, max: number, options: CurrencyFormatOptions = {}
): string {
  return `${formatCurrency(min, options)} - ${formatCurrency(max, options)}`
}

export function formatCurrencyDifference(
  amount: number, options: CurrencyFormatOptions = {}
): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${formatCurrency(amount, options)}`
}

// -- Porcentajes --
export interface PercentageFormatOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showSign?: boolean
  multiplier?: number
}

export function formatPercentage(
  value: number,
  options: PercentageFormatOptions = {}
): string {
  const {
    locale = 'es-HN',
    minimumFractionDigits = 1,
    maximumFractionDigits = 2,
    showSign = false,
    multiplier = 1,
  } = options

  const adjustedValue = value * multiplier
  if (isNaN(adjustedValue)) return '0%'
  const formatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  })
  let formatted = formatter.format(adjustedValue / 100)
  if (showSign && adjustedValue > 0) formatted = `+${formatted}`
  return formatted
}

export function formatPercentageDifference(
  value: number,
  options: PercentageFormatOptions = {}
): string {
  return formatPercentage(value, { ...options, showSign: true })
}

// -- Números --
export interface NumberFormatOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  compact?: boolean
  unit?: string
  style?: 'decimal' | 'currency' | 'percent' | 'unit'
}

export function formatNumber(
  value: number,
  options: NumberFormatOptions = {}
): string {
  const {
    locale = 'es-HN',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
    unit,
    style = 'decimal',
  } = options

  if (isNaN(value)) return '0'
  const formatter = new Intl.NumberFormat(locale, {
    style,
    minimumFractionDigits,
    maximumFractionDigits,
    notation: compact ? 'compact' : 'standard',
    ...(unit ? { unit } : {}),
  } as Intl.NumberFormatOptions)
  return formatter.format(value)
}

export function formatCompactNumber(value: number, locale = 'es-HN'): string {
  return formatNumber(value, { locale, compact: true })
}

export function formatOrdinal(value: number, locale = 'es-HN'): string {
  const formatter = new Intl.PluralRules(locale, { type: 'ordinal' })
  const rule = formatter.select(value)
  const suffixes: Record<string, string> = { one: 'ro', two: 'do', few: 'ro', other: 'to' }
  return `${value}${suffixes[rule] || 'to'}`
}

// -- Fechas --
export interface DateFormatOptions {
  locale?: Locale
  format?: string
  includeTime?: boolean
  relative?: boolean
  distance?: boolean
}

export function formatDate(
  date: Date | string,
  options: DateFormatOptions = {}
): string {
  const {
    locale = es,
    format: formatStr = 'dd/MM/yyyy',
    includeTime = false,
    relative = false,
    distance = false,
  } = options

  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Fecha inválida'
  if (distance) return formatDistance(dateObj, new Date(), { locale, addSuffix: true })
  if (relative) return formatRelative(dateObj, new Date(), { locale })
  const finalFormat = includeTime ? `${formatStr} HH:mm:ss` : formatStr
  return format(dateObj, finalFormat, { locale })
}

export function formatRelativeDate(date: Date | string): string {
  return formatDate(date, { relative: true })
}

export function formatTimeDistance(date: Date | string): string {
  return formatDate(date, { distance: true })
}

export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  options: DateFormatOptions = {}
): string {
  return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`
}

// -- Texto --
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase())
}
export function capitalizeFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}
export function formatLabel(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
  if (cleaned.length === 11 && cleaned.startsWith('504')) return `+504 ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  return phone
}

// -- Archivos --
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// -- Datos de pago --
export function formatPaymentId(id: string, prefix = 'PAY'): string {
  return `${prefix}-${id.toUpperCase()}`
}
export function formatRefundId(id: string): string {
  return formatPaymentId(id, 'REF')
}
export function formatDisputeId(id: string): string {
  return formatPaymentId(id, 'DIS')
}
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    succeeded: 'Exitoso',
    failed: 'Fallido',
    pending: 'Pendiente',
    processing: 'Procesando',
    cancelled: 'Cancelado',
    requires_action: 'Requiere Acción',
    requires_capture: 'Requiere Captura',
    requires_confirmation: 'Requiere Confirmación',
    requires_payment_method: 'Requiere Método de Pago',
  }
  return statusMap[status] || capitalizeFirst(status)
}
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    card: 'Tarjeta', bank_transfer: 'Transferencia Bancaria', wallet: 'Billetera Digital',
    cash: 'Efectivo', crypto: 'Criptomoneda', ach: 'ACH', sepa: 'SEPA', ideal: 'iDEAL', sofort: 'SOFORT',
    klarna: 'Klarna', paypal: 'PayPal', apple_pay: 'Apple Pay', google_pay: 'Google Pay', samsung_pay: 'Samsung Pay',
  }
  return methodMap[method] || capitalizeFirst(method.replace(/_/g, ' '))
}
export function formatCardNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '')
  if (cleaned.length !== 16) return number
  return `**** **** **** ${cleaned.slice(-4)}`
}

// -- Direcciones --
export interface Address {
  street?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}
export function formatAddress(address: Address): string {
  return [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(', ')
}

// -- Validación --
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}
export function isValidDate(date: any): date is Date {
  return date instanceof Date && isValid(date)
}

// -- Constantes --
export const FORMAT_PATTERNS = {
  DATE: 'dd/MM/yyyy',
  DATE_TIME: 'dd/MM/yyyy HH:mm',
  DATE_TIME_SECONDS: 'dd/MM/yyyy HH:mm:ss',
  TIME: 'HH:mm',
  TIME_SECONDS: 'HH:mm:ss',
  MONTH_YEAR: 'MM/yyyy',
  YEAR: 'yyyy',
} as const

export const CURRENCY_CODES = {
  HNL: 'Lempira Hondureño',
  USD: 'Dólar Estadounidense',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  JPY: 'Yen Japonés',
  CAD: 'Dólar Canadiense',
  AUD: 'Dólar Australiano',
  CHF: 'Franco Suizo',
  CNY: 'Yuan Chino',
  INR: 'Rupia India',
} as const

export const LOCALE_CODES = {
  ES_HN: 'es-HN',
  ES: 'es',
  EN_US: 'en-US',
  EN: 'en',
} as const

// --- NO DEFAULT EXPORT: Solo exports nombrados para intellisense, imports rápidos y evitar bugs ---
