// src/presentation/lib/utils/formatters.ts
// Utilidades de formateo completas para la aplicación Multipaga

import { format, formatDistance, formatRelative, parseISO, isValid, type Locale } from 'date-fns'
import { es } from 'date-fns/locale'

// ================================
// FORMATEO DE MONEDA
// ================================

interface CurrencyOptions {
  currency?: string
  locale?: string
  compact?: boolean
  showCurrency?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function formatCurrency(
  amount: number, 
  currency: string = 'HNL',
  options: CurrencyOptions = {}
): string {
  const {
    locale = 'es-HN',
    compact = false,
    showCurrency = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showCurrency ? 'currency' : 'decimal',
      currency: showCurrency ? currency : undefined,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits,
      maximumFractionDigits,
    })

    return formatter.format(amount)
  } catch (error) {
    console.warn('Error formatting currency:', error)
    return `${currency} ${amount.toFixed(2)}`
  }
}

// Formateo específico para Honduras
export function formatHNLCurrency(amount: number, compact: boolean = false): string {
  return formatCurrency(amount, 'HNL', { 
    locale: 'es-HN', 
    compact,
    showCurrency: true 
  })
}

// Formateo para USD
export function formatUSDCurrency(amount: number, compact: boolean = false): string {
  return formatCurrency(amount, 'USD', { 
    locale: 'en-US', 
    compact,
    showCurrency: true 
  })
}

// ================================
// FORMATEO DE NÚMEROS
// ================================

interface NumberOptions {
  locale?: string
  compact?: boolean
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact'
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function formatNumber(
  value: number,
  options: NumberOptions = {}
): string {
  const {
    locale = 'es-HN',
    compact = false,
    notation = compact ? 'compact' : 'standard',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options

  try {
    const formatter = new Intl.NumberFormat(locale, {
      notation,
      minimumFractionDigits,
      maximumFractionDigits,
    })

    return formatter.format(value)
  } catch (error) {
    console.warn('Error formatting number:', error)
    return value.toString()
  }
}

// Formateo de porcentajes
export function formatPercentage(
  value: number,
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const {
    locale = 'es-HN',
    minimumFractionDigits = 1,
    maximumFractionDigits = 2,
  } = options

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits,
    })

    return formatter.format(value / 100)
  } catch (error) {
    console.warn('Error formatting percentage:', error)
    return `${value.toFixed(1)}%`
  }
}

// Formateo compacto de números grandes
export function formatCompactNumber(value: number): string {
  return formatNumber(value, { compact: true })
}

// ================================
// FORMATEO DE FECHAS
// ================================

interface DateFormatOptions {
  locale?: Locale
  includeTime?: boolean
  format?: string
  relative?: boolean
  distance?: boolean
}

export function formatDate(
  date: string | Date | number,
  options: DateFormatOptions = {}
): string {
  const {
    locale = es,
    includeTime = false,
    format: customFormat,
    relative = false,
    distance = false,
  } = options

  try {
    let parsedDate: Date

    if (typeof date === 'string') {
      parsedDate = parseISO(date)
    } else if (typeof date === 'number') {
      parsedDate = new Date(date)
    } else {
      parsedDate = date
    }

    if (!isValid(parsedDate)) {
      return 'Fecha inválida'
    }

    if (relative) {
      return formatRelative(parsedDate, new Date(), { locale })
    }

    if (distance) {
      return formatDistance(parsedDate, new Date(), { locale, addSuffix: true })
    }

    if (customFormat) {
      return format(parsedDate, customFormat, { locale })
    }

    const defaultFormat = includeTime ? 'PPp' : 'PP'
    return format(parsedDate, defaultFormat, { locale })
  } catch (error) {
    console.warn('Error formatting date:', error)
    return 'Fecha inválida'
  }
}

// Formateo específico de fecha y hora
export function formatDateTime(
  date: string | Date | number,
  options: DateFormatOptions = {}
): string {
  return formatDate(date, { ...options, includeTime: true })
}

// Formateo de fecha corta (dd/MM/yyyy)
export function formatShortDate(date: string | Date | number): string {
  return formatDate(date, { format: 'dd/MM/yyyy' })
}

// Formateo de fecha larga (ej: 15 de julio de 2025)
export function formatLongDate(date: string | Date | number): string {
  return formatDate(date, { format: 'PPP' })
}

// Formateo de hora (HH:mm)
export function formatTime(date: string | Date | number): string {
  return formatDate(date, { format: 'HH:mm' })
}

// Formateo de fecha y hora completa (dd/MM/yyyy HH:mm)
export function formatFullDateTime(date: string | Date | number): string {
  return formatDate(date, { format: 'dd/MM/yyyy HH:mm' })
}

// Formateo relativo (hace 2 horas, ayer, etc.)
export function formatRelativeDate(date: string | Date | number): string {
  return formatDate(date, { relative: true })
}

// Formateo de distancia (hace 2 horas, en 3 días, etc.)
export function formatDistanceDate(date: string | Date | number): string {
  return formatDate(date, { distance: true })
}

// ================================
// FORMATEO DE TEXTOS
// ================================

// Capitalizar primera letra
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Formateo de nombres propios
export function formatName(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

// Truncar texto con elipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Formateo de ID de pagos (mostrar solo los primeros y últimos caracteres)
export function formatPaymentId(paymentId: string, showChars: number = 8): string {
  if (!paymentId || paymentId.length <= showChars * 2) return paymentId
  
  const start = paymentId.substring(0, showChars)
  const end = paymentId.substring(paymentId.length - showChars)
  return `${start}...${end}`
}

// ================================
// FORMATEO DE TAMAÑOS
// ================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ================================
// FORMATEO DE CÓDIGOS
// ================================

// Formatear códigos de error
export function formatErrorCode(code: string | number): string {
  return `ERR_${String(code).padStart(4, '0')}`
}

// Formatear códigos de transacción
export function formatTransactionCode(code: string): string {
  if (!code) return ''
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// ================================
// FORMATEO DE ESTADOS
// ================================

interface StatusConfig {
  [key: string]: {
    label: string
    color: string
    bgColor: string
    icon?: string
  }
}

const PAYMENT_STATUS_CONFIG: StatusConfig = {
  succeeded: {
    label: 'Exitoso',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  failed: {
    label: 'Fallido',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  processing: {
    label: 'Procesando',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  requires_payment_method: {
    label: 'Requiere método de pago',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  requires_confirmation: {
    label: 'Requiere confirmación',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  requires_action: {
    label: 'Requiere acción',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  captured: {
    label: 'Capturado',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  partially_captured: {
    label: 'Parcialmente capturado',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
}

export function formatPaymentStatus(status: string): {
  label: string
  color: string
  bgColor: string
} {
  const config = PAYMENT_STATUS_CONFIG[status] || {
    label: capitalize(status.replace('_', ' ')),
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  }

  return config
}

// ================================
// FORMATEO DE VALIDACIONES
// ================================

export function formatValidationError(error: any): string {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (Array.isArray(error) && error.length > 0) {
    return error[0]?.message || 'Error de validación'
  }
  return 'Error de validación desconocido'
}

// ================================
// FORMATEO DE URLs
// ================================

export function formatApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/api${cleanPath}`
}

// ================================
// EXPORTACIONES ADICIONALES
// ================================

// Objeto con todos los formateadores para fácil importación
export const formatters = {
  currency: formatCurrency,
  number: formatNumber,
  percentage: formatPercentage,
  date: formatDate,
  dateTime: formatDateTime,
  shortDate: formatShortDate,
  longDate: formatLongDate,
  time: formatTime,
  fullDateTime: formatFullDateTime,
  relativeDate: formatRelativeDate,
  distanceDate: formatDistanceDate,
  name: formatName,
  paymentId: formatPaymentId,
  fileSize: formatFileSize,
  errorCode: formatErrorCode,
  transactionCode: formatTransactionCode,
  paymentStatus: formatPaymentStatus,
  validationError: formatValidationError,
  apiUrl: formatApiUrl,
}

export default formatters