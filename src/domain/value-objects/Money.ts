// src/domain/value-objects/Money.ts
// ──────────────────────────────────────────────────────────────────────────────
// Money Value Object - Representa valores monetarios con validaciones
// ──────────────────────────────────────────────────────────────────────────────

import { Currency } from './Currency'

/**
 * Money Value Object
 * 
 * Representa un valor monetario con su moneda asociada, manejando
 * correctamente las unidades mínimas y operaciones monetarias.
 */
export class Money {
  private constructor(
    private readonly _amountInCents: number,
    private readonly _currency: Currency
  ) {
    if (!Number.isInteger(_amountInCents)) {
      throw new Error('El monto en unidad mínima debe ser un número entero')
    }
    
    if (_amountInCents < 0) {
      throw new Error('El monto no puede ser negativo')
    }
    
    // Validar límites razonables para evitar overflow
    if (_amountInCents > Number.MAX_SAFE_INTEGER) {
      throw new Error('El monto excede el límite máximo permitido')
    }
  }

  /**
   * Crea una instancia de Money desde la unidad mínima (centavos)
   */
  public static fromMinorUnit(amountInCents: number, currencyCode: string): Money {
    const currency = Currency.fromCode(currencyCode)
    return new Money(amountInCents, currency)
  }

  /**
   * Crea una instancia de Money desde la unidad principal
   */
  public static create(amount: number, currencyCode: string): Money {
    const currency = Currency.fromCode(currencyCode)
    const amountInCents = currency.toMinorUnit(amount)
    return new Money(amountInCents, currency)
  }

  /**
   * Crea una instancia de Money con valor cero
   */
  public static zero(currencyCode: string): Money {
    return Money.fromMinorUnit(0, currencyCode)
  }

  /**
   * Obtiene el monto en unidad mínima (centavos)
   */
  public get amountInCents(): number {
    return this._amountInCents
  }

  /**
   * Obtiene el monto en unidad principal
   */
  public get amount(): number {
    return this._currency.fromMinorUnit(this._amountInCents)
  }

  /**
   * Obtiene la moneda
   */
  public get currency(): Currency {
    return this._currency
  }

  /**
   * Verifica si el monto es cero
   */
  public isZero(): boolean {
    return this._amountInCents === 0
  }

  /**
   * Verifica si el monto es positivo
   */
  public isPositive(): boolean {
    return this._amountInCents > 0
  }

  /**
   * Verifica si el monto es negativo (aunque no debería ser posible por construcción)
   */
  public isNegative(): boolean {
    return this._amountInCents < 0
  }

  /**
   * Suma otro Money del mismo tipo de moneda
   */
  public add(other: Money): Money {
    this.validateSameCurrency(other)
    return new Money(this._amountInCents + other._amountInCents, this._currency)
  }

  /**
   * Resta otro Money del mismo tipo de moneda
   */
  public subtract(other: Money): Money {
    this.validateSameCurrency(other)
    const newAmount = this._amountInCents - other._amountInCents
    
    if (newAmount < 0) {
      throw new Error('El resultado de la resta no puede ser negativo')
    }
    
    return new Money(newAmount, this._currency)
  }

  /**
   * Multiplica por un factor
   */
  public multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('El factor de multiplicación no puede ser negativo')
    }
    
    const newAmount = Math.round(this._amountInCents * factor)
    return new Money(newAmount, this._currency)
  }

  /**
   * Divide por un factor
   */
  public divide(factor: number): Money {
    if (factor <= 0) {
      throw new Error('El factor de división debe ser positivo')
    }
    
    const newAmount = Math.round(this._amountInCents / factor)
    return new Money(newAmount, this._currency)
  }

  /**
   * Calcula el porcentaje del monto
   */
  public percentage(percent: number): Money {
    if (percent < 0) {
      throw new Error('El porcentaje no puede ser negativo')
    }
    
    return this.multiply(percent / 100)
  }

  /**
   * Distribuye el monto en partes iguales
   */
  public distribute(parts: number): Money[] {
    if (parts <= 0 || !Number.isInteger(parts)) {
      throw new Error('El número de partes debe ser un entero positivo')
    }
    
    const baseAmount = Math.floor(this._amountInCents / parts)
    const remainder = this._amountInCents % parts
    
    const result: Money[] = []
    
    for (let i = 0; i < parts; i++) {
      const amount = baseAmount + (i < remainder ? 1 : 0)
      result.push(new Money(amount, this._currency))
    }
    
    return result
  }

  /**
   * Distribuye el monto según proporciones específicas
   */
  public allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new Error('Debe proporcionar al menos una proporción')
    }
    
    if (ratios.some(ratio => ratio < 0)) {
      throw new Error('Las proporciones no pueden ser negativas')
    }
    
    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0)
    
    if (totalRatio === 0) {
      throw new Error('La suma de las proporciones debe ser mayor a cero')
    }
    
    const result: Money[] = []
    let allocated = 0
    
    for (let i = 0; i < ratios.length; i++) {
      if (i === ratios.length - 1) {
        // Último elemento recibe el remanente para evitar errores de redondeo
        result.push(new Money(this._amountInCents - allocated, this._currency))
      } else {
        const amount = Math.floor((this._amountInCents * ratios[i]) / totalRatio)
        result.push(new Money(amount, this._currency))
        allocated += amount
      }
    }
    
    return result
  }

  /**
   * Compara con otro Money
   */
  public compareTo(other: Money): number {
    this.validateSameCurrency(other)
    
    if (this._amountInCents < other._amountInCents) return -1
    if (this._amountInCents > other._amountInCents) return 1
    return 0
  }

  /**
   * Verifica si es igual a otro Money
   */
  public equals(other: Money): boolean {
    return this.compareTo(other) === 0
  }

  /**
   * Verifica si es menor que otro Money
   */
  public lessThan(other: Money): boolean {
    return this.compareTo(other) < 0
  }

  /**
   * Verifica si es menor o igual que otro Money
   */
  public lessThanOrEqual(other: Money): boolean {
    return this.compareTo(other) <= 0
  }

  /**
   * Verifica si es mayor que otro Money
   */
  public greaterThan(other: Money): boolean {
    return this.compareTo(other) > 0
  }

  /**
   * Verifica si es mayor o igual que otro Money
   */
  public greaterThanOrEqual(other: Money): boolean {
    return this.compareTo(other) >= 0
  }

  /**
   * Obtiene el valor mínimo entre este y otro Money
   */
  public min(other: Money): Money {
    return this.lessThanOrEqual(other) ? this : other
  }

  /**
   * Obtiene el valor máximo entre este y otro Money
   */
  public max(other: Money): Money {
    return this.greaterThanOrEqual(other) ? this : other
  }

  /**
   * Suma una lista de Money del mismo tipo de moneda
   */
  public static sum(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Debe proporcionar al menos un monto para sumar')
    }
    
    const firstCurrency = amounts[0]._currency
    let total = 0
    
    for (const amount of amounts) {
      if (!amount._currency.equals(firstCurrency)) {
        throw new Error('Todos los montos deben tener la misma moneda')
      }
      total += amount._amountInCents
    }
    
    return new Money(total, firstCurrency)
  }

  /**
   * Obtiene el promedio de una lista de Money
   */
  public static average(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Debe proporcionar al menos un monto para calcular el promedio')
    }
    
    const sum = Money.sum(amounts)
    return sum.divide(amounts.length)
  }

  /**
   * Redondea el monto hacia arriba
   */
  public roundUp(): Money {
    // Para monedas sin decimales, no hay nada que redondear
    if (this._currency.decimals === 0) {
      return this
    }
    
    const factor = this._currency.getMinorUnitFactor()
    const amountInMajor = this._amountInCents / factor
    const roundedAmount = Math.ceil(amountInMajor) * factor
    
    return new Money(roundedAmount, this._currency)
  }

  /**
   * Redondea el monto hacia abajo
   */
  public roundDown(): Money {
    if (this._currency.decimals === 0) {
      return this
    }
    
    const factor = this._currency.getMinorUnitFactor()
    const amountInMajor = this._amountInCents / factor
    const roundedAmount = Math.floor(amountInMajor) * factor
    
    return new Money(roundedAmount, this._currency)
  }

  /**
   * Redondea el monto al valor más cercano
   */
  public round(): Money {
    if (this._currency.decimals === 0) {
      return this
    }
    
    const factor = this._currency.getMinorUnitFactor()
    const amountInMajor = this._amountInCents / factor
    const roundedAmount = Math.round(amountInMajor) * factor
    
    return new Money(roundedAmount, this._currency)
  }

  /**
   * Formatea el monto para mostrar al usuario
   */
  public format(locale?: string): string {
    return this._currency.formatFromMinorUnit(this._amountInCents, locale)
  }

  /**
   * Formatea solo el número sin símbolo de moneda
   */
  public formatAmount(locale?: string): string {
    const targetLocale = locale || this._currency.getPreferredLocale()
    
    try {
      return new Intl.NumberFormat(targetLocale, {
        minimumFractionDigits: this._currency.decimals,
        maximumFractionDigits: this._currency.decimals
      }).format(this.amount)
    } catch (error) {
      return this.amount.toFixed(this._currency.decimals)
    }
  }

  /**
   * Convierte a otra moneda (requiere tasa de cambio)
   */
  public convertTo(targetCurrencyCode: string, exchangeRate: number): Money {
    if (exchangeRate <= 0) {
      throw new Error('La tasa de cambio debe ser positiva')
    }
    
    const targetCurrency = Currency.fromCode(targetCurrencyCode)
    const amountInMajor = this.amount
    const convertedAmount = amountInMajor * exchangeRate
    
    return Money.create(convertedAmount, targetCurrencyCode)
  }

  /**
   * Valida que otro Money tenga la misma moneda
   */
  private validateSameCurrency(other: Money): void {
    if (!this._currency.equals(other._currency)) {
      throw new Error(`Las monedas no coinciden: ${this._currency.code} vs ${other._currency.code}`)
    }
  }

  /**
   * Obtiene información para análisis
   */
  public getAnalysisInfo(): {
    amountInCents: number
    amount: number
    currencyCode: string
    currencySymbol: string
    isZero: boolean
    isPositive: boolean
    formatted: string
  } {
    return {
      amountInCents: this._amountInCents,
      amount: this.amount,
      currencyCode: this._currency.code,
      currencySymbol: this._currency.symbol,
      isZero: this.isZero(),
      isPositive: this.isPositive(),
      formatted: this.format()
    }
  }

  /**
   * Serialización para APIs (en unidad mínima)
   */
  public toAPIFormat(): {
    amount: number
    currency: string
  } {
    return {
      amount: this._amountInCents,
      currency: this._currency.code
    }
  }

  /**
   * Serialización para mostrar (en unidad principal)
   */
  public toDisplayFormat(): {
    amount: number
    currency: string
    formatted: string
  } {
    return {
      amount: this.amount,
      currency: this._currency.code,
      formatted: this.format()
    }
  }

  /**
   * Representación en string
   */
  public toString(): string {
    return this.format()
  }

  /**
   * Serialización JSON (en unidad mínima para precisión)
   */
  public toJSON(): {
    amountInCents: number
    currency: string
  } {
    return {
      amountInCents: this._amountInCents,
      currency: this._currency.code
    }
  }

  /**
   * Crea una copia de este Money
   */
  public copy(): Money {
    return new Money(this._amountInCents, this._currency)
  }

  /**
   * Verifica si el monto está dentro de un rango
   */
  public isBetween(min: Money, max: Money): boolean {
    this.validateSameCurrency(min)
    this.validateSameCurrency(max)
    
    return this.greaterThanOrEqual(min) && this.lessThanOrEqual(max)
  }

  /**
   * Calcula la diferencia absoluta con otro Money
   */
  public absoluteDifference(other: Money): Money {
    this.validateSameCurrency(other)
    
    const diff = Math.abs(this._amountInCents - other._amountInCents)
    return new Money(diff, this._currency)
  }

  /**
   * Calcula el porcentaje de diferencia con otro Money
   */
  public percentageDifference(other: Money): number {
    this.validateSameCurrency(other)
    
    if (other._amountInCents === 0) {
      throw new Error('No se puede calcular diferencia porcentual con monto cero')
    }
    
    return ((this._amountInCents - other._amountInCents) / other._amountInCents) * 100
  }
}