// src/domain/value-objects/Currency.ts
// ──────────────────────────────────────────────────────────────────────────────
// Currency Value Object - Representa códigos de moneda ISO 4217
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Currency Value Object
 * 
 * Representa códigos de moneda según el estándar ISO 4217,
 * incluyendo información sobre decimales, formateo y validaciones.
 */
export class Currency {
  private static readonly SUPPORTED_CURRENCIES = {
    // Monedas principales
    'USD': { name: 'US Dollar', symbol: '$', decimals: 2, region: 'North America' },
    'EUR': { name: 'Euro', symbol: '€', decimals: 2, region: 'Europe' },
    'GBP': { name: 'British Pound', symbol: '£', decimals: 2, region: 'Europe' },
    'JPY': { name: 'Japanese Yen', symbol: '¥', decimals: 0, region: 'Asia' },
    'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimals: 2, region: 'North America' },
    'AUD': { name: 'Australian Dollar', symbol: 'A$', decimals: 2, region: 'Oceania' },
    'CHF': { name: 'Swiss Franc', symbol: 'CHF', decimals: 2, region: 'Europe' },
    'CNY': { name: 'Chinese Yuan', symbol: '¥', decimals: 2, region: 'Asia' },
    'SEK': { name: 'Swedish Krona', symbol: 'kr', decimals: 2, region: 'Europe' },
    'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, region: 'Oceania' },
    'SGD': { name: 'Singapore Dollar', symbol: 'S$', decimals: 2, region: 'Asia' },
    'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, region: 'Asia' },
    'NOK': { name: 'Norwegian Krone', symbol: 'kr', decimals: 2, region: 'Europe' },
    'DKK': { name: 'Danish Krone', symbol: 'kr', decimals: 2, region: 'Europe' },
    
    // Monedas de América Latina
    'MXN': { name: 'Mexican Peso', symbol: '$', decimals: 2, region: 'Latin America' },
    'BRL': { name: 'Brazilian Real', symbol: 'R$', decimals: 2, region: 'Latin America' },
    'ARS': { name: 'Argentine Peso', symbol: '$', decimals: 2, region: 'Latin America' },
    'CLP': { name: 'Chilean Peso', symbol: '$', decimals: 0, region: 'Latin America' },
    'COP': { name: 'Colombian Peso', symbol: '$', decimals: 2, region: 'Latin America' },
    'PEN': { name: 'Peruvian Sol', symbol: 'S/', decimals: 2, region: 'Latin America' },
    'UYU': { name: 'Uruguayan Peso', symbol: '$U', decimals: 2, region: 'Latin America' },
    'GTQ': { name: 'Guatemalan Quetzal', symbol: 'Q', decimals: 2, region: 'Central America' },
    'CRC': { name: 'Costa Rican Colón', symbol: '₡', decimals: 2, region: 'Central America' },
    'HNL': { name: 'Honduran Lempira', symbol: 'L', decimals: 2, region: 'Central America' },
    'NIO': { name: 'Nicaraguan Córdoba', symbol: 'C$', decimals: 2, region: 'Central America' },
    'PAB': { name: 'Panamanian Balboa', symbol: 'B/.', decimals: 2, region: 'Central America' },
    'SVC': { name: 'Salvadoran Colón', symbol: '₡', decimals: 2, region: 'Central America' },
    'DOP': { name: 'Dominican Peso', symbol: 'RD$', decimals: 2, region: 'Caribbean' },
    'JMD': { name: 'Jamaican Dollar', symbol: 'J$', decimals: 2, region: 'Caribbean' },
    
    // Monedas de Asia
    'INR': { name: 'Indian Rupee', symbol: '₹', decimals: 2, region: 'Asia' },
    'KRW': { name: 'South Korean Won', symbol: '₩', decimals: 0, region: 'Asia' },
    'THB': { name: 'Thai Baht', symbol: '฿', decimals: 2, region: 'Asia' },
    'MYR': { name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, region: 'Asia' },
    'IDR': { name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2, region: 'Asia' },
    'PHP': { name: 'Philippine Peso', symbol: '₱', decimals: 2, region: 'Asia' },
    'VND': { name: 'Vietnamese Dong', symbol: '₫', decimals: 0, region: 'Asia' },
    'TWD': { name: 'Taiwan Dollar', symbol: 'NT$', decimals: 2, region: 'Asia' },
    
    // Monedas del Medio Oriente y África
    'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, region: 'Middle East' },
    'SAR': { name: 'Saudi Riyal', symbol: '﷼', decimals: 2, region: 'Middle East' },
    'QAR': { name: 'Qatari Riyal', symbol: '﷼', decimals: 2, region: 'Middle East' },
    'ILS': { name: 'Israeli Shekel', symbol: '₪', decimals: 2, region: 'Middle East' },
    'EGP': { name: 'Egyptian Pound', symbol: '£', decimals: 2, region: 'Africa' },
    'ZAR': { name: 'South African Rand', symbol: 'R', decimals: 2, region: 'Africa' },
    'NGN': { name: 'Nigerian Naira', symbol: '₦', decimals: 2, region: 'Africa' },
    'KES': { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, region: 'Africa' },
    'GHS': { name: 'Ghanaian Cedi', symbol: '₵', decimals: 2, region: 'Africa' },
    
    // Monedas de Europa del Este
    'PLN': { name: 'Polish Zloty', symbol: 'zł', decimals: 2, region: 'Europe' },
    'CZK': { name: 'Czech Koruna', symbol: 'Kč', decimals: 2, region: 'Europe' },
    'HUF': { name: 'Hungarian Forint', symbol: 'Ft', decimals: 2, region: 'Europe' },
    'RON': { name: 'Romanian Leu', symbol: 'lei', decimals: 2, region: 'Europe' },
    'BGN': { name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, region: 'Europe' },
    'HRK': { name: 'Croatian Kuna', symbol: 'kn', decimals: 2, region: 'Europe' },
    'RSD': { name: 'Serbian Dinar', symbol: 'дин', decimals: 2, region: 'Europe' },
    'RUB': { name: 'Russian Ruble', symbol: '₽', decimals: 2, region: 'Europe' },
    'UAH': { name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, region: 'Europe' },
    'TRY': { name: 'Turkish Lira', symbol: '₺', decimals: 2, region: 'Europe' },
    
    // Criptomonedas principales
    'BTC': { name: 'Bitcoin', symbol: '₿', decimals: 8, region: 'Crypto' },
    'ETH': { name: 'Ethereum', symbol: 'Ξ', decimals: 18, region: 'Crypto' },
    'LTC': { name: 'Litecoin', symbol: 'Ł', decimals: 8, region: 'Crypto' },
    'BCH': { name: 'Bitcoin Cash', symbol: '₿', decimals: 8, region: 'Crypto' },
    'XRP': { name: 'Ripple', symbol: 'XRP', decimals: 6, region: 'Crypto' },
  } as const

  private static readonly LOCALE_MAPPINGS = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'INR': 'en-IN',
    'MXN': 'es-MX',
    'BRL': 'pt-BR',
    'HNL': 'es-HN',
    'GTQ': 'es-GT',
    'CRC': 'es-CR',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'COP': 'es-CO',
    'PEN': 'es-PE'
  } as const

  private constructor(private readonly _code: string) {
    if (!Currency.isValid(_code)) {
      throw new Error(`Código de moneda inválido: ${_code}`)
    }
  }

  /**
   * Crea una instancia de Currency desde un código ISO 4217
   */
  public static fromCode(code: string): Currency {
    return new Currency(code.toUpperCase())
  }

  /**
   * Verifica si un código de moneda es válido
   */
  public static isValid(code: string): code is keyof typeof Currency.SUPPORTED_CURRENCIES {
    return code.toUpperCase() in Currency.SUPPORTED_CURRENCIES
  }

  /**
   * Obtiene todas las monedas soportadas
   */
  public static getAllCurrencies(): readonly string[] {
    return Object.keys(Currency.SUPPORTED_CURRENCIES)
  }

  /**
   * Obtiene monedas por región
   */
  public static getCurrenciesByRegion(region: string): string[] {
    return Object.entries(Currency.SUPPORTED_CURRENCIES)
      .filter(([_, info]) => info.region.toLowerCase() === region.toLowerCase())
      .map(([code, _]) => code)
  }

  /**
   * Obtiene todas las regiones disponibles
   */
  public static getRegions(): string[] {
    const regions = new Set(
      Object.values(Currency.SUPPORTED_CURRENCIES).map(info => info.region)
    )
    return Array.from(regions)
  }

  /**
   * Obtiene monedas fiat (no criptomonedas)
   */
  public static getFiatCurrencies(): string[] {
    return Currency.getCurrenciesByRegion('Crypto').length > 0
      ? Object.keys(Currency.SUPPORTED_CURRENCIES).filter(code => 
          Currency.SUPPORTED_CURRENCIES[code as keyof typeof Currency.SUPPORTED_CURRENCIES].region !== 'Crypto'
        )
      : Object.keys(Currency.SUPPORTED_CURRENCIES)
  }

  /**
   * Obtiene criptomonedas
   */
  public static getCryptoCurrencies(): string[] {
    return Currency.getCurrenciesByRegion('Crypto')
  }

  /**
   * Obtiene monedas principales (más utilizadas)
   */
  public static getMajorCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY']
  }

  /**
   * Obtiene monedas de América Latina
   */
  public static getLatinAmericaCurrencies(): string[] {
    return [
      ...Currency.getCurrenciesByRegion('Latin America'),
      ...Currency.getCurrenciesByRegion('Central America'),
      ...Currency.getCurrenciesByRegion('Caribbean')
    ]
  }

  /**
   * Obtiene el código de la moneda
   */
  public get code(): string {
    return this._code
  }

  /**
   * Obtiene el nombre completo de la moneda
   */
  public get name(): string {
    return Currency.SUPPORTED_CURRENCIES[this._code as keyof typeof Currency.SUPPORTED_CURRENCIES].name
  }

  /**
   * Obtiene el símbolo de la moneda
   */
  public get symbol(): string {
    return Currency.SUPPORTED_CURRENCIES[this._code as keyof typeof Currency.SUPPORTED_CURRENCIES].symbol
  }

  /**
   * Obtiene el número de decimales para esta moneda
   */
  public get decimals(): number {
    return Currency.SUPPORTED_CURRENCIES[this._code as keyof typeof Currency.SUPPORTED_CURRENCIES].decimals
  }

  /**
   * Obtiene la región de la moneda
   */
  public get region(): string {
    return Currency.SUPPORTED_CURRENCIES[this._code as keyof typeof Currency.SUPPORTED_CURRENCIES].region
  }

  /**
   * Verifica si es una criptomoneda
   */
  public isCrypto(): boolean {
    return this.region === 'Crypto'
  }

  /**
   * Verifica si es una moneda fiat
   */
  public isFiat(): boolean {
    return !this.isCrypto()
  }

  /**
   * Verifica si es una moneda principal
   */
  public isMajor(): boolean {
    return Currency.getMajorCurrencies().includes(this._code)
  }

  /**
   * Verifica si es una moneda de América Latina
   */
  public isLatinAmerica(): boolean {
    return Currency.getLatinAmericaCurrencies().includes(this._code)
  }

  /**
   * Verifica si no tiene decimales (moneda entera)
   */
  public isZeroDecimal(): boolean {
    return this.decimals === 0
  }

  /**
   * Convierte un monto de la unidad mínima (centavos) a la unidad principal
   */
  public fromMinorUnit(amount: number): number {
    if (this.decimals === 0) {
      return amount
    }
    return amount / Math.pow(10, this.decimals)
  }

  /**
   * Convierte un monto de la unidad principal a la unidad mínima (centavos)
   */
  public toMinorUnit(amount: number): number {
    if (this.decimals === 0) {
      return Math.round(amount)
    }
    return Math.round(amount * Math.pow(10, this.decimals))
  }

  /**
   * Formatea un monto en la unidad principal con el símbolo de la moneda
   */
  public format(amount: number, locale?: string): string {
    const targetLocale = locale || 
      Currency.LOCALE_MAPPINGS[this._code as keyof typeof Currency.LOCALE_MAPPINGS] || 
      'en-US'

    try {
      return new Intl.NumberFormat(targetLocale, {
        style: 'currency',
        currency: this._code,
        minimumFractionDigits: this.decimals,
        maximumFractionDigits: this.decimals
      }).format(amount)
    } catch (error) {
      // Fallback en caso de que el locale no soporte la moneda
      return `${this.symbol}${amount.toFixed(this.decimals)}`
    }
  }

  /**
   * Formatea un monto desde la unidad mínima
   */
  public formatFromMinorUnit(minorAmount: number, locale?: string): string {
    const majorAmount = this.fromMinorUnit(minorAmount)
    return this.format(majorAmount, locale)
  }

  /**
   * Obtiene el factor de conversión a la unidad mínima
   */
  public getMinorUnitFactor(): number {
    return Math.pow(10, this.decimals)
  }

  /**
   * Valida si un monto es válido para esta moneda
   */
  public isValidAmount(amount: number): boolean {
    if (amount < 0) return false
    if (!Number.isFinite(amount)) return false
    
    // Para monedas sin decimales, el monto debe ser entero
    if (this.decimals === 0) {
      return Number.isInteger(amount)
    }
    
    // Para otras monedas, verificar que no tenga más decimales de los permitidos
    const factor = this.getMinorUnitFactor()
    return Number.isInteger(amount * factor)
  }

  /**
   * Redondea un monto a la precisión correcta para esta moneda
   */
  public round(amount: number): number {
    if (this.decimals === 0) {
      return Math.round(amount)
    }
    const factor = this.getMinorUnitFactor()
    return Math.round(amount * factor) / factor
  }

  /**
   * Compara con otra moneda
   */
  public equals(other: Currency): boolean {
    return this._code === other._code
  }

  /**
   * Obtiene información completa de la moneda
   */
  public getInfo(): {
    code: string
    name: string
    symbol: string
    decimals: number
    region: string
    isCrypto: boolean
    isMajor: boolean
    isLatinAmerica: boolean
  } {
    return {
      code: this._code,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      region: this.region,
      isCrypto: this.isCrypto(),
      isMajor: this.isMajor(),
      isLatinAmerica: this.isLatinAmerica()
    }
  }

  /**
   * Representación en string
   */
  public toString(): string {
    return this._code
  }

  /**
   * Serialización JSON
   */
  public toJSON(): string {
    return this._code
  }

  /**
   * Obtiene el locale más apropiado para esta moneda
   */
  public getPreferredLocale(): string {
    return Currency.LOCALE_MAPPINGS[this._code as keyof typeof Currency.LOCALE_MAPPINGS] || 'en-US'
  }

  /**
   * Obtiene monedas relacionadas (misma región)
   */
  public getRelatedCurrencies(): Currency[] {
    return Currency.getCurrenciesByRegion(this.region)
      .filter(code => code !== this._code)
      .map(code => Currency.fromCode(code))
  }

  /**
   * Verifica si es una moneda comúnmente usada en comercio electrónico
   */
  public isEcommercePopular(): boolean {
    const ecommercePopular = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
      'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'HNL', 'GTQ', 'CRC'
    ]
    return ecommercePopular.includes(this._code)
  }
}