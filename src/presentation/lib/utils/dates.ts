// src/presentation/lib/utils/dates.ts
// ──────────────────────────────────────────────────────────────────────────────
// Date Utilities - Funciones utilitarias para manejo de fechas
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Configuración de locales soportados
 */
export const SUPPORTED_LOCALES = {
  'es-ES': 'Español (España)',
  'es-MX': 'Español (México)', 
  'es-HN': 'Español (Honduras)',
  'es-GT': 'Español (Guatemala)',
  'es-CR': 'Español (Costa Rica)',
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'pt-BR': 'Português (Brasil)',
  'fr-FR': 'Français (France)'
} as const

/**
 * Formatos de fecha predefinidos
 */
export const DATE_FORMATS = {
  SHORT: 'short',
  MEDIUM: 'medium', 
  LONG: 'long',
  FULL: 'full',
  ISO: 'iso',
  ISO_DATE: 'iso-date',
  ISO_TIME: 'iso-time',
  RELATIVE: 'relative',
  CUSTOM: 'custom'
} as const

/**
 * Zonas horarias comunes para América Latina
 */
export const LATIN_AMERICA_TIMEZONES = {
  'America/Tegucigalpa': 'Honduras',
  'America/Guatemala': 'Guatemala', 
  'America/Costa_Rica': 'Costa Rica',
  'America/Managua': 'Nicaragua',
  'America/Panama': 'Panamá',
  'America/El_Salvador': 'El Salvador',
  'America/Belize': 'Belice',
  'America/Mexico_City': 'México',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Perú',
  'America/Santiago': 'Chile',
  'America/Buenos_Aires': 'Argentina',
  'America/Sao_Paulo': 'Brasil',
  'America/Caracas': 'Venezuela'
} as const

/**
 * Obtiene la fecha actual con zona horaria específica
 */
export function getCurrentDate(timezone?: string): Date {
  const date = new Date()
  if (timezone) {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  }
  return date
}

/**
 * Obtiene la fecha actual en Honduras (zona horaria por defecto)
 */
export function getCurrentHondurasDate(): Date {
  return getCurrentDate('America/Tegucigalpa')
}

/**
 * Formatea una fecha con opciones personalizables
 */
export function formatDate(
  date: Date | string,
  options: {
    format?: keyof typeof DATE_FORMATS
    locale?: keyof typeof SUPPORTED_LOCALES
    timezone?: string
    customFormat?: Intl.DateTimeFormatOptions
  } = {}
): string {
  const {
    format = 'MEDIUM',
    locale = 'es-HN',
    timezone = 'America/Tegucigalpa',
    customFormat
  } = options

  const targetDate = typeof date === 'string' ? new Date(date) : date

  if (isNaN(targetDate.getTime())) {
    throw new Error('Fecha inválida proporcionada')
  }

  // Formatos ISO
  if (format === 'ISO') {
    return targetDate.toISOString()
  }
  
  if (format === 'ISO_DATE') {
    return targetDate.toISOString().split('T')[0]
  }
  
  if (format === 'ISO_TIME') {
    return targetDate.toISOString().split('T')[1].split('.')[0]
  }

  // Formato relativo
  if (format === 'RELATIVE') {
    return formatRelativeDate(targetDate, locale)
  }

  // Formato personalizado
  if (format === 'CUSTOM' && customFormat) {
    return new Intl.DateTimeFormat(locale, {
      ...customFormat,
      timeZone: timezone
    }).format(targetDate)
  }

  // Formatos predefinidos
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    SHORT: {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    },
    MEDIUM: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    LONG: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    },
    FULL: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }
  }

  const dateFormatOptions = formatOptions[format] || formatOptions.MEDIUM

  return new Intl.DateTimeFormat(locale, {
    ...dateFormatOptions,
    timeZone: timezone
  }).format(targetDate)
}

/**
 * Formatea una fecha de manera relativa (hace X tiempo)
 */
export function formatRelativeDate(
  date: Date | string,
  locale: keyof typeof SUPPORTED_LOCALES = 'es-HN'
): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Usar Intl.RelativeTimeFormat si está disponible
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      
      if (diffMinutes < 1) {
        return rtf.format(0, 'minute')
      } else if (diffMinutes < 60) {
        return rtf.format(-diffMinutes, 'minute')
      } else if (diffHours < 24) {
        return rtf.format(-diffHours, 'hour')
      } else if (diffDays < 7) {
        return rtf.format(-diffDays, 'day')
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return rtf.format(-weeks, 'week')
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return rtf.format(-months, 'month')
      } else {
        const years = Math.floor(diffDays / 365)
        return rtf.format(-years, 'year')
      }
    } catch (error) {
      // Fallback manual si Intl.RelativeTimeFormat falla
    }
  }

  // Fallback manual
  const isSpanish = locale.startsWith('es')
  
  if (diffMinutes < 1) {
    return isSpanish ? 'ahora' : 'now'
  } else if (diffMinutes < 60) {
    return isSpanish 
      ? `hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`
      : `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return isSpanish 
      ? `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
      : `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return isSpanish 
      ? `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
      : `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return formatDate(targetDate, { format: 'MEDIUM', locale })
  }
}

/**
 * Formatea tiempo con hora incluida
 */
export function formatDateTime(
  date: Date | string,
  options: {
    locale?: keyof typeof SUPPORTED_LOCALES
    timezone?: string
    includeSeconds?: boolean
    use24Hour?: boolean
  } = {}
): string {
  const {
    locale = 'es-HN',
    timezone = 'America/Tegucigalpa',
    includeSeconds = false,
    use24Hour = false
  } = options

  const targetDate = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: !use24Hour,
    timeZone: timezone
  }).format(targetDate)
}

/**
 * Formatea solo la hora
 */
export function formatTime(
  date: Date | string,
  options: {
    locale?: keyof typeof SUPPORTED_LOCALES
    timezone?: string
    includeSeconds?: boolean
    use24Hour?: boolean
  } = {}
): string {
  const {
    locale = 'es-HN',
    timezone = 'America/Tegucigalpa',
    includeSeconds = false,
    use24Hour = false
  } = options

  const targetDate = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: !use24Hour,
    timeZone: timezone
  }).format(targetDate)
}

/**
 * Calcula la diferencia entre dos fechas
 */
export function getDateDifference(
  startDate: Date | string,
  endDate: Date | string,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' = 'days'
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const diffMs = end.getTime() - start.getTime()
  
  switch (unit) {
    case 'milliseconds':
      return diffMs
    case 'seconds':
      return Math.floor(diffMs / 1000)
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60))
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60))
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
    case 'months':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)) // Promedio de días por mes
    case 'years':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)) // Considerando años bisiestos
    default:
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }
}

/**
 * Verifica si una fecha está en el pasado
 */
export function isInPast(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate < new Date()
}

/**
 * Verifica si una fecha está en el futuro
 */
export function isInFuture(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate > new Date()
}

/**
 * Verifica si una fecha es hoy
 */
export function isToday(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  return targetDate.getDate() === today.getDate() &&
         targetDate.getMonth() === today.getMonth() &&
         targetDate.getFullYear() === today.getFullYear()
}

/**
 * Verifica si una fecha fue ayer
 */
export function isYesterday(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  return targetDate.getDate() === yesterday.getDate() &&
         targetDate.getMonth() === yesterday.getMonth() &&
         targetDate.getFullYear() === yesterday.getFullYear()
}

/**
 * Verifica si una fecha es de esta semana
 */
export function isThisWeek(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const startOfWeek = new Date(today)
  const dayOfWeek = today.getDay()
  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  
  return targetDate >= startOfWeek && targetDate <= endOfWeek
}

/**
 * Obtiene el inicio del día para una fecha
 */
export function getStartOfDay(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate
}

/**
 * Obtiene el final del día para una fecha
 */
export function getEndOfDay(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  targetDate.setHours(23, 59, 59, 999)
  return targetDate
}

/**
 * Obtiene el inicio de la semana (lunes)
 */
export function getStartOfWeek(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  const dayOfWeek = targetDate.getDay()
  const startOfWeek = new Date(targetDate)
  startOfWeek.setDate(targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return getStartOfDay(startOfWeek)
}

/**
 * Obtiene el final de la semana (domingo)
 */
export function getEndOfWeek(date: Date | string): Date {
  const startOfWeek = getStartOfWeek(date)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  return getEndOfDay(endOfWeek)
}

/**
 * Obtiene el inicio del mes
 */
export function getStartOfMonth(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  return new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
}

/**
 * Obtiene el final del mes
 */
export function getEndOfMonth(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  return getEndOfDay(new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0))
}

/**
 * Añade tiempo a una fecha
 */
export function addTime(
  date: Date | string,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
  
  switch (unit) {
    case 'milliseconds':
      targetDate.setMilliseconds(targetDate.getMilliseconds() + amount)
      break
    case 'seconds':
      targetDate.setSeconds(targetDate.getSeconds() + amount)
      break
    case 'minutes':
      targetDate.setMinutes(targetDate.getMinutes() + amount)
      break
    case 'hours':
      targetDate.setHours(targetDate.getHours() + amount)
      break
    case 'days':
      targetDate.setDate(targetDate.getDate() + amount)
      break
    case 'weeks':
      targetDate.setDate(targetDate.getDate() + (amount * 7))
      break
    case 'months':
      targetDate.setMonth(targetDate.getMonth() + amount)
      break
    case 'years':
      targetDate.setFullYear(targetDate.getFullYear() + amount)
      break
  }
  
  return targetDate
}

/**
 * Resta tiempo a una fecha
 */
export function subtractTime(
  date: Date | string,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  return addTime(date, -amount, unit)
}

/**
 * Convierte una fecha a zona horaria específica
 */
export function convertToTimezone(date: Date | string, timezone: string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }))
}

/**
 * Obtiene la diferencia de zona horaria en minutos
 */
export function getTimezoneOffset(timezone: string): number {
  const date = new Date()
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const targetTime = new Date(utc + (getTimezoneOffsetMs(timezone)))
  return targetTime.getTimezoneOffset()
}

/**
 * Obtiene la diferencia de zona horaria en milisegundos
 */
function getTimezoneOffsetMs(timezone: string): number {
  const date = new Date()
  const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  const localDate = new Date(date.toLocaleString('en-US'))
  return targetDate.getTime() - localDate.getTime()
}

/**
 * Valida si un string es una fecha válida
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Parsea una fecha desde diferentes formatos
 */
export function parseDate(dateInput: string | number | Date): Date | null {
  try {
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput
    }
    
    if (typeof dateInput === 'number') {
      return new Date(dateInput)
    }
    
    if (typeof dateInput === 'string') {
      // Intentar parsear ISO, formato común, y otros formatos
      const date = new Date(dateInput)
      return isNaN(date.getTime()) ? null : date
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Obtiene fechas comunes para filtros rápidos
 */
export function getCommonDateRanges(): Record<string, { start: Date; end: Date; label: string }> {
  const now = new Date()
  
  return {
    today: {
      start: getStartOfDay(now),
      end: getEndOfDay(now),
      label: 'Hoy'
    },
    yesterday: {
      start: getStartOfDay(subtractTime(now, 1, 'days')),
      end: getEndOfDay(subtractTime(now, 1, 'days')),
      label: 'Ayer'
    },
    last7days: {
      start: getStartOfDay(subtractTime(now, 6, 'days')),
      end: getEndOfDay(now),
      label: 'Últimos 7 días'
    },
    last30days: {
      start: getStartOfDay(subtractTime(now, 29, 'days')),
      end: getEndOfDay(now),
      label: 'Últimos 30 días'
    },
    thisWeek: {
      start: getStartOfWeek(now),
      end: getEndOfWeek(now),
      label: 'Esta semana'
    },
    lastWeek: {
      start: getStartOfWeek(subtractTime(now, 1, 'weeks')),
      end: getEndOfWeek(subtractTime(now, 1, 'weeks')),
      label: 'Semana pasada'
    },
    thisMonth: {
      start: getStartOfMonth(now),
      end: getEndOfMonth(now),
      label: 'Este mes'
    },
    lastMonth: {
      start: getStartOfMonth(subtractTime(now, 1, 'months')),
      end: getEndOfMonth(subtractTime(now, 1, 'months')),
      label: 'Mes pasado'
    },
    thisYear: {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      label: 'Este año'
    }
  }
}