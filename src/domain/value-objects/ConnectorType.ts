// src/domain/value-objects/ConnectorType.ts
// ──────────────────────────────────────────────────────────────────────────────
// ConnectorType Value Object - Representa los tipos de conectores disponibles
// ──────────────────────────────────────────────────────────────────────────────

/**
 * ConnectorType Value Object
 * 
 * Representa los diferentes tipos de conectores disponibles en Hyperswitch,
 * incluyendo procesadores de pago, métodos de pago alternativos, y conectores especializados.
 */
export class ConnectorType {
  private static readonly VALID_TYPES = [
    // Conectores de procesamiento de pagos principales
    'adyenplatform',
    'stripe_billing_test',
    'phonypay',
    'fauxpay', 
    'pretendpay',
    'stripe_test',
    'adyen_test',
    'checkout_test',
    'paypal_test',
    
    // Conectores de producción
    'aci',
    'adyen',
    'airwallex',
    'archipel',
    'authorizedotnet',
    'bambora',
    'bamboraapac',
    'bankofamerica',
    'barclaycard',
    'billwerk',
    'bitpay',
    'bluesnap',
    'boku',
    'braintree',
    'cashtocode',
    'chargebee',
    'checkout',
    'coinbase',
    'coingate',
    'cryptopay',
    'ctp_mastercard',
    'ctp_visa',
    'cybersource',
    'datatrans',
    'deutschebank',
    'digitalvirgo',
    'dlocal',
    'ebanx',
    'elavon',
    'facilitapay',
    'fiserv',
    'fiservemea',
    'fiuu',
    'forte',
    'getnet',
    'globalpay',
    'globepay',
    'gocardless',
    'gpayments',
    'hipay',
    'helcim',
    'hyperswitch_vault',
    'inespay',
    'iatapay',
    'itaubank',
    'jpmorgan',
    'juspaythreedsserver',
    'klarna',
    'lafise',
    'mifinity',
    'mollie',
    'moneris',
    'multisafepay',
    'netcetera',
    'nexinets',
    'nexixpay',
    'nmi',
    'nomupay',
    'noon',
    'novalnet',
    'nuvei',
    'opennode',
    'paybox',
    'payme',
    'payone',
    'paypal',
    'paystack',
    'payu',
    'placetopay',
    'powertranz',
    'prophetpay',
    'rapyd',
    'razorpay',
    'recurly',
    'redsys',
    'riskified',
    'shift4',
    'signifyd',
    'square',
    'stax',
    'stripe',
    'stripebilling',
    'trustpay',
    'tokenio',
    'tsys',
    'volt',
    'wellsfargo',
    'wise',
    'worldline',
    'worldpay',
    'worldpayvantiv',
    'worldpayxml',
    'xendit',
    'zen',
    'plaid',
    'zsl'
  ] as const

  private static readonly TYPE_CATEGORIES = {
    // Conectores de tarjetas principales
    credit_card_processors: [
      'stripe', 'adyen', 'checkout', 'cybersource', 'worldpay', 'braintree',
      'authorizedotnet', 'square', 'nuvei', 'bluesnap', 'elavon', 'fiserv'
    ],
    
    // Conectores de métodos de pago alternativos
    alternative_payments: [
      'paypal', 'klarna', 'afterpay', 'affirm', 'gocardless', 'wise',
      'mollie', 'multisafepay', 'trustpay'
    ],
    
    // Conectores de criptomonedas
    crypto_processors: [
      'bitpay', 'coinbase', 'coingate', 'cryptopay', 'opennode'
    ],
    
    // Conectores de pagos móviles
    mobile_payments: [
      'razorpay', 'payu', 'paystack', 'dlocal', 'ebanx'
    ],
    
    // Conectores bancarios
    banking_connectors: [
      'bankofamerica', 'jpmorgan', 'deutschebank', 'itaubank', 'wellsfargo'
    ],
    
    // Conectores regionales/locales
    regional_connectors: [
      'redsys', 'getnet', 'facilitapay', 'placetopay', 'lafise', 'nexixpay'
    ],
    
    // Conectores de test
    test_connectors: [
      'stripe_test', 'adyen_test', 'checkout_test', 'paypal_test', 
      'phonypay', 'fauxpay', 'pretendpay'
    ],
    
    // Conectores especializados
    specialized: [
      'hyperswitch_vault', 'riskified', 'signifyd', 'netcetera', 
      'juspaythreedsserver', 'plaid'
    ]
  } as const

  private static readonly PAYMENT_METHOD_SUPPORT = {
    card: [
      'stripe', 'adyen', 'checkout', 'cybersource', 'worldpay', 'braintree',
      'authorizedotnet', 'square', 'nuvei', 'bluesnap', 'elavon', 'fiserv'
    ],
    wallet: [
      'stripe', 'adyen', 'checkout', 'paypal', 'square', 'braintree'
    ],
    bank_redirect: [
      'adyen', 'mollie', 'trustpay', 'checkout', 'wise'
    ],
    bank_transfer: [
      'wise', 'gocardless', 'plaid', 'trustpay'
    ],
    pay_later: [
      'klarna', 'adyen', 'checkout'
    ],
    crypto: [
      'bitpay', 'coinbase', 'coingate', 'cryptopay', 'opennode'
    ],
    upi: [
      'razorpay', 'payu'
    ]
  } as const

  private constructor(private readonly _value: string) {
    if (!ConnectorType.isValid(_value)) {
      throw new Error(`Tipo de conector inválido: ${_value}`)
    }
  }

  /**
   * Crea una instancia de ConnectorType desde un string
   */
  public static fromString(value: string): ConnectorType {
    return new ConnectorType(value.toLowerCase())
  }

  /**
   * Verifica si un valor es un tipo de conector válido
   */
  public static isValid(value: string): value is typeof ConnectorType.VALID_TYPES[number] {
    return ConnectorType.VALID_TYPES.includes(value.toLowerCase() as any)
  }

  /**
   * Obtiene todos los tipos de conectores válidos
   */
  public static getAllTypes(): readonly string[] {
    return ConnectorType.VALID_TYPES
  }

  /**
   * Obtiene conectores por categoría
   */
  public static getByCategory(category: keyof typeof ConnectorType.TYPE_CATEGORIES): readonly string[] {
    return ConnectorType.TYPE_CATEGORIES[category] || []
  }

  /**
   * Obtiene todas las categorías disponibles
   */
  public static getCategories(): (keyof typeof ConnectorType.TYPE_CATEGORIES)[] {
    return Object.keys(ConnectorType.TYPE_CATEGORIES) as (keyof typeof ConnectorType.TYPE_CATEGORIES)[]
  }

  /**
   * Obtiene conectores que soportan un método de pago específico
   */
  public static getByPaymentMethod(paymentMethod: keyof typeof ConnectorType.PAYMENT_METHOD_SUPPORT): readonly string[] {
    return ConnectorType.PAYMENT_METHOD_SUPPORT[paymentMethod] || []
  }

  /**
   * Obtiene conectores de test
   */
  public static getTestConnectors(): readonly string[] {
    return ConnectorType.TYPE_CATEGORIES.test_connectors
  }

  /**
   * Obtiene conectores de producción
   */
  public static getProductionConnectors(): readonly string[] {
    return ConnectorType.VALID_TYPES.filter(
      type => !ConnectorType.TYPE_CATEGORIES.test_connectors.includes(type as any)
    )
  }

  /**
   * Obtiene el valor del tipo de conector
   */
  public get value(): string {
    return this._value
  }

  /**
   * Verifica si es un conector de test
   */
  public isTest(): boolean {
    return ConnectorType.TYPE_CATEGORIES.test_connectors.includes(this._value as any)
  }

  /**
   * Verifica si es un conector de producción
   */
  public isProduction(): boolean {
    return !this.isTest()
  }

  /**
   * Obtiene la categoría del conector
   */
  public getCategory(): string | null {
    for (const [category, connectors] of Object.entries(ConnectorType.TYPE_CATEGORIES)) {
      if ((connectors as readonly string[]).includes(this._value)) {
        return category
      }
    }
    return null
  }

  /**
   * Verifica si el conector soporta un método de pago específico
   */
  public supportsPaymentMethod(paymentMethod: keyof typeof ConnectorType.PAYMENT_METHOD_SUPPORT): boolean {
    const supportedConnectors = ConnectorType.PAYMENT_METHOD_SUPPORT[paymentMethod]
    return supportedConnectors ? (supportedConnectors as readonly string[]).includes(this._value) : false
  }

  /**
   * Obtiene los métodos de pago soportados por este conector
   */
  public getSupportedPaymentMethods(): string[] {
    const supportedMethods: string[] = []
    
    for (const [method, connectors] of Object.entries(ConnectorType.PAYMENT_METHOD_SUPPORT)) {
      if ((connectors as readonly string[]).includes(this._value)) {
        supportedMethods.push(method)
      }
    }
    
    return supportedMethods
  }

  /**
   * Obtiene información descriptiva del conector
   */
  public getDisplayInfo(): {
    name: string
    description: string
    category: string
    region: string
    supportedMethods: string[]
    isTest: boolean
  } {
    const displayNames: Record<string, string> = {
      'stripe': 'Stripe',
      'adyen': 'Adyen',
      'checkout': 'Checkout.com',
      'paypal': 'PayPal',
      'square': 'Square',
      'braintree': 'Braintree',
      'cybersource': 'Cybersource',
      'worldpay': 'Worldpay',
      'authorizedotnet': 'Authorize.Net',
      'klarna': 'Klarna',
      'razorpay': 'Razorpay',
      'payu': 'PayU',
      'paystack': 'Paystack',
      'mollie': 'Mollie',
      'wise': 'Wise',
      'gocardless': 'GoCardless',
      'bitpay': 'BitPay',
      'coinbase': 'Coinbase Commerce'
    }

    const regions: Record<string, string> = {
      'stripe': 'Global',
      'adyen': 'Global', 
      'checkout': 'Global',
      'paypal': 'Global',
      'square': 'North America',
      'razorpay': 'India',
      'payu': 'Global',
      'paystack': 'Africa',
      'redsys': 'Spain',
      'getnet': 'Brazil',
      'dlocal': 'Latin America',
      'ebanx': 'Latin America'
    }

    return {
      name: displayNames[this._value] || this._value.charAt(0).toUpperCase() + this._value.slice(1),
      description: `${displayNames[this._value] || this._value} payment processor`,
      category: this.getCategory() || 'unknown',
      region: regions[this._value] || 'Unknown',
      supportedMethods: this.getSupportedPaymentMethods(),
      isTest: this.isTest()
    }
  }

  /**
   * Compara con otro ConnectorType
   */
  public equals(other: ConnectorType): boolean {
    return this._value === other._value
  }

  /**
   * Representación en string
   */
  public toString(): string {
    return this._value
  }

  /**
   * Serialización JSON
   */
  public toJSON(): string {
    return this._value
  }

  /**
   * Obtiene conectores similares o relacionados
   */
  public getSimilarConnectors(): ConnectorType[] {
    const category = this.getCategory()
    if (!category) return []

    const similarConnectors = ConnectorType.TYPE_CATEGORIES[category as keyof typeof ConnectorType.TYPE_CATEGORIES]
    return similarConnectors
      .filter(connector => connector !== this._value)
      .map(connector => ConnectorType.fromString(connector))
  }

  /**
   * Verifica si es un conector recomendado para una región específica
   */
  public isRecommendedForRegion(region: string): boolean {
    const regionalRecommendations: Record<string, string[]> = {
      'north_america': ['stripe', 'square', 'authorizedotnet', 'braintree'],
      'europe': ['adyen', 'checkout', 'stripe', 'mollie', 'trustpay'],
      'asia': ['razorpay', 'payu', 'adyen', 'stripe'],
      'latin_america': ['dlocal', 'ebanx', 'payu', 'getnet', 'facilitapay'],
      'africa': ['paystack', 'flutterwave', 'dlocal'],
      'global': ['stripe', 'adyen', 'checkout', 'paypal']
    }

    return regionalRecommendations[region.toLowerCase()]?.includes(this._value) || false
  }
}