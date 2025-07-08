// src/domain/value-objects/DateRange.ts
// ──────────────────────────────────────────────────────────────────────────────
// DateRange Value Object - Representa un rango de fechas con validaciones
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DateRange Value Object
 * 
 * Representa un rango de fechas inmutable con validaciones y utilidades
 * para consultas de fechas en el sistema de pagos.
 */
export class DateRange {
  private constructor(
    private readonly _startDate: Date,
    private readonly _endDate: Date
  ) {
    if (_startDate > _endDate) {
      throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin')
    }
  }

  /**
   * Crea un DateRange con fechas específicas
   */
  public static create(startDate: Date, endDate: Date): DateRange {
    return new DateRange(new Date(startDate), new Date(endDate))
  }

  /**
   * Crea un DateRange desde strings ISO
   */
  public static fromStrings(startDateStr: string, endDateStr: string): DateRange {
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Fechas inválidas proporcionadas')
    }
    
    return new DateRange(startDate, endDate)
  }

  /**
   * Crea un DateRange para hoy
   */
  public static today(): DateRange {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    return new DateRange(startOfDay, endOfDay)
  }

  /**
   * Crea un DateRange para ayer
   */
  public static yesterday(): DateRange {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
    return new DateRange(startOfDay, endOfDay)
  }

  /**
   * Crea un DateRange para esta semana (lunes a domingo)
   */
  public static thisWeek(): DateRange {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return new DateRange(startOfWeek, endOfWeek)
  }

  /**
   * Crea un DateRange para la semana pasada
   */
  public static lastWeek(): DateRange {
    const thisWeek = DateRange.thisWeek()
    const startOfLastWeek = new Date(thisWeek._startDate)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
    
    const endOfLastWeek = new Date(thisWeek._endDate)
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 7)
    
    return new DateRange(startOfLastWeek, endOfLastWeek)
  }

  /**
   * Crea un DateRange para este mes
   */
  public static thisMonth(): DateRange {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    return new DateRange(startOfMonth, endOfMonth)
  }

  /**
   * Crea un DateRange para el mes pasado
   */
  public static lastMonth(): DateRange {
    const today = new Date()
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
    return new DateRange(startOfLastMonth, endOfLastMonth)
  }

  /**
   * Crea un DateRange para este año
   */
  public static thisYear(): DateRange {
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
    return new DateRange(startOfYear, endOfYear)
  }

  /**
   * Crea un DateRange para el año pasado
   */
  public static lastYear(): DateRange {
    const today = new Date()
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1)
    const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
    return new DateRange(startOfLastYear, endOfLastYear)
  }

  /**
   * Crea un DateRange para los últimos N días
   */
  public static lastDays(days: number): DateRange {
    if (days <= 0) {
      throw new Error('El número de días debe ser positivo')
    }
    
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)
    
    return new DateRange(startDate, endDate)
  }

  /**
   * Crea un DateRange para las últimas N semanas
   */
  public static lastWeeks(weeks: number): DateRange {
    if (weeks <= 0) {
      throw new Error('El número de semanas debe ser positivo')
    }
    
    const thisWeek = DateRange.thisWeek()
    const startDate = new Date(thisWeek._startDate)
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7)
    
    return new DateRange(startDate, thisWeek._endDate)
  }

  /**
   * Crea un DateRange para los últimos N meses
   */
  public static lastMonths(months: number): DateRange {
    if (months <= 0) {
      throw new Error('El número de meses debe ser positivo')
    }
    
    const today = new Date()
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    const startOfRangeMonth = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
    
    return new DateRange(startOfRangeMonth, endOfCurrentMonth)
  }

  /**
   * Crea un DateRange para un trimestre específico
   */
  public static quarter(year: number, quarter: 1 | 2 | 3 | 4): DateRange {
    const startMonth = (quarter - 1) * 3
    const startDate = new Date(year, startMonth, 1)
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
    
    return new DateRange(startDate, endDate)
  }

  /**
   * Crea un DateRange para el trimestre actual
   */
  public static currentQuarter(): DateRange {
    const today = new Date()
    const currentQuarter = Math.floor(today.getMonth() / 3) + 1 as 1 | 2 | 3 | 4
    return DateRange.quarter(today.getFullYear(), currentQuarter)
  }

  /**
   * Crea un DateRange personalizado con tiempo transcurrido
   */
  public static fromNow(milliseconds: number): DateRange {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - milliseconds)
    return new DateRange(startDate, endDate)
  }

  /**
   * Obtiene la fecha de inicio
   */
  public get startDate(): Date {
    return new Date(this._startDate)
  }

  /**
   * Obtiene la fecha de fin
   */
  public get endDate(): Date {
    return new Date(this._endDate)
  }

  /**
   * Obtiene la duración en milisegundos
   */
  public getDurationMs(): number {
    return this._endDate.getTime() - this._startDate.getTime()
  }

  /**
   * Obtiene la duración en días
   */
  public getDurationDays(): number {
    return Math.ceil(this.getDurationMs() / (1000 * 60 * 60 * 24))
  }

  /**
   * Obtiene la duración en horas
   */
  public getDurationHours(): number {
    return Math.ceil(this.getDurationMs() / (1000 * 60 * 60))
  }

  /**
   * Verifica si una fecha está dentro del rango
   */
  public contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate
  }

  /**
   * Verifica si otro DateRange se superpone con este
   */
  public overlaps(other: DateRange): boolean {
    return this._startDate <= other._endDate && this._endDate >= other._startDate
  }

  /**
   * Verifica si este rango está completamente contenido en otro
   */
  public isContainedIn(other: DateRange): boolean {
    return other._startDate <= this._startDate && other._endDate >= this._endDate
  }

  /**
   * Verifica si este rango contiene completamente a otro
   */
  public contains(other: DateRange): boolean {
    return this._startDate <= other._startDate && this._endDate >= other._endDate
  }

  /**
   * Combina este rango con otro para crear un rango que los contenga a ambos
   */
  public union(other: DateRange): DateRange {
    const startDate = this._startDate < other._startDate ? this._startDate : other._startDate
    const endDate = this._endDate > other._endDate ? this._endDate : other._endDate
    return new DateRange(startDate, endDate)
  }

  /**
   * Obtiene la intersección con otro rango
   */
  public intersection(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) {
      return null
    }
    
    const startDate = this._startDate > other._startDate ? this._startDate : other._startDate
    const endDate = this._endDate < other._endDate ? this._endDate : other._endDate
    
    return new DateRange(startDate, endDate)
  }

  /**
   * Extiende el rango por un número específico de días
   */
  public extendByDays(startDays: number, endDays: number): DateRange {
    const newStartDate = new Date(this._startDate)
    newStartDate.setDate(newStartDate.getDate() - startDays)
    
    const newEndDate = new Date(this._endDate)
    newEndDate.setDate(newEndDate.getDate() + endDays)
    
    return new DateRange(newStartDate, newEndDate)
  }

  /**
   * Divide el rango en subrangos de duración específica
   */
  public splitByDays(dayInterval: number): DateRange[] {
    if (dayInterval <= 0) {
      throw new Error('El intervalo de días debe ser positivo')
    }
    
    const ranges: DateRange[] = []
    let currentStart = new Date(this._startDate)
    
    while (currentStart < this._endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + dayInterval - 1)
      currentEnd.setHours(23, 59, 59, 999)
      
      if (currentEnd > this._endDate) {
        currentEnd.setTime(this._endDate.getTime())
      }
      
      ranges.push(new DateRange(new Date(currentStart), currentEnd))
      
      currentStart.setDate(currentStart.getDate() + dayInterval)
      currentStart.setHours(0, 0, 0, 0)
    }
    
    return ranges
  }

  /**
   * Verifica si el rango está en el pasado
   */
  public isInPast(): boolean {
    return this._endDate < new Date()
  }

  /**
   * Verifica si el rango está en el futuro
   */
  public isInFuture(): boolean {
    return this._startDate > new Date()
  }

  /**
   * Verifica si el rango incluye el momento actual
   */
  public includesNow(): boolean {
    return this.contains(new Date())
  }

  /**
   * Verifica si es el mismo día
   */
  public isSameDay(): boolean {
    return this._startDate.toDateString() === this._endDate.toDateString()
  }

  /**
   * Verifica si es una semana completa
   */
  public isFullWeek(): boolean {
    const duration = this.getDurationDays()
    return duration === 7
  }

  /**
   * Verifica si es un mes completo
   */
  public isFullMonth(): boolean {
    const startIsFirstDayOfMonth = this._startDate.getDate() === 1
    const endIsLastDayOfMonth = this._endDate.getDate() === new Date(
      this._endDate.getFullYear(),
      this._endDate.getMonth() + 1,
      0
    ).getDate()
    
    return startIsFirstDayOfMonth && endIsLastDayOfMonth &&
           this._startDate.getMonth() === this._endDate.getMonth()
  }

  /**
   * Convierte a formato ISO para APIs
   */
  public toISOStrings(): { start: string; end: string } {
    return {
      start: this._startDate.toISOString(),
      end: this._endDate.toISOString()
    }
  }

  /**
   * Convierte a formato de fecha simple (YYYY-MM-DD)
   */
  public toDateStrings(): { start: string; end: string } {
    return {
      start: this._startDate.toISOString().split('T')[0],
      end: this._endDate.toISOString().split('T')[0]
    }
  }

  /**
   * Formatea el rango para mostrar al usuario
   */
  public format(locale: string = 'es-ES', options: Intl.DateTimeFormatOptions = {}): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }
    
    const formatter = new Intl.DateTimeFormat(locale, defaultOptions)
    
    if (this.isSameDay()) {
      return formatter.format(this._startDate)
    }
    
    return `${formatter.format(this._startDate)} - ${formatter.format(this._endDate)}`
  }

  /**
   * Obtiene una descripción legible del rango
   */
  public getDescription(locale: string = 'es-ES'): string {
    const now = new Date()
    
    // Verificar rangos predefinidos comunes
    if (this.equals(DateRange.today())) {
      return 'Hoy'
    }
    
    if (this.equals(DateRange.yesterday())) {
      return 'Ayer'
    }
    
    if (this.equals(DateRange.thisWeek())) {
      return 'Esta semana'
    }
    
    if (this.equals(DateRange.lastWeek())) {
      return 'Semana pasada'
    }
    
    if (this.equals(DateRange.thisMonth())) {
      return 'Este mes'
    }
    
    if (this.equals(DateRange.lastMonth())) {
      return 'Mes pasado'
    }
    
    const duration = this.getDurationDays()
    
    if (duration <= 30) {
      return `Últimos ${duration} días`
    }
    
    return this.format(locale)
  }

  /**
   * Compara con otro DateRange
   */
  public equals(other: DateRange): boolean {
    return this._startDate.getTime() === other._startDate.getTime() &&
           this._endDate.getTime() === other._endDate.getTime()
  }

  /**
   * Obtiene el rango anterior del mismo tamaño
   */
  public getPreviousRange(): DateRange {
    const duration = this.getDurationMs()
    const newEndDate = new Date(this._startDate.getTime() - 1)
    const newStartDate = new Date(newEndDate.getTime() - duration + 1)
    
    return new DateRange(newStartDate, newEndDate)
  }

  /**
   * Obtiene el rango siguiente del mismo tamaño
   */
  public getNextRange(): DateRange {
    const duration = this.getDurationMs()
    const newStartDate = new Date(this._endDate.getTime() + 1)
    const newEndDate = new Date(newStartDate.getTime() + duration - 1)
    
    return new DateRange(newStartDate, newEndDate)
  }

  /**
   * Serialización JSON
   */
  public toJSON(): { start: string; end: string } {
    return this.toISOStrings()
  }

  /**
   * Representación en string
   */
  public toString(): string {
    return `DateRange(${this._startDate.toISOString()} - ${this._endDate.toISOString()})`
  }
}