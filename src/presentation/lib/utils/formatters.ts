import { format, formatDistance, formatRelative, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Currency formatter
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`
  }
}

// Number formatter
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

// Percentage formatter
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

// Date formatters
export function formatDate(
  date: string | Date,
  formatStr: string = 'PP',
  locale: any = undefined
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale })
}

export function formatDateTime(
  date: string | Date,
  formatStr: string = 'PPpp',
  locale: any = undefined
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale })
}

export function formatRelativeTime(
  date: string | Date,
  baseDate: Date = new Date(),
  locale: any = undefined
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(dateObj, baseDate, { locale })
}

export function formatDistanceFromNow(
  date: string | Date,
  options?: { addSuffix?: boolean; locale?: any }
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), options)
}

// File size formatter
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex > 0 ? 2 : 0)} ${units[unitIndex]}`
}

// Status formatter
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    succeeded: 'Successful',
    processing: 'Processing',
    requires_payment_method: 'Awaiting Payment Method',
    requires_confirmation: 'Awaiting Confirmation',
    requires_action: 'Action Required',
    requires_capture: 'Awaiting Capture',
    cancelled: 'Cancelled',
    failed: 'Failed',
  }

  return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Payment method formatter
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    bank_debit: 'Bank Debit',
    wallet: 'Digital Wallet',
    pay_later: 'Buy Now Pay Later',
    bank_redirect: 'Bank Redirect',
    crypto: 'Cryptocurrency',
    upi: 'UPI',
    voucher: 'Voucher',
    gift_card: 'Gift Card',
    open_banking: 'Open Banking',
  }

  return methodMap[method] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Card number formatter (masks all but last 4 digits)
export function formatCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return '****'
  
  const last4 = cardNumber.slice(-4)
  return `**** **** **** ${last4}`
}

// Phone number formatter
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format based on length
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  // Return original if format is unknown
  return phone
}

// Transaction ID formatter
export function formatTransactionId(id: string, showFull: boolean = false): string {
  if (!id) return ''
  
  if (showFull || id.length <= 12) {
    return id
  }
  
  // Show first 6 and last 4 characters
  return `${id.slice(0, 6)}...${id.slice(-4)}`
}

// Amount formatter for input fields
export function formatAmountForInput(amount: number): string {
  return (amount / 100).toFixed(2)
}

// Parse amount from input (convert to cents)
export function parseAmountFromInput(value: string): number {
  const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ''))
  return Math.round((parsed || 0) * 100)
}

// Duration formatter
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Truncate text
export function truncate(str: string, length: number = 50): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Pluralize
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`)
}