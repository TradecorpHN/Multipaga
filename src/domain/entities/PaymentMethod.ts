// src/domain/entities/PaymentMethod.ts
// ──────────────────────────────────────────────────────────────────────────────
// PaymentMethod Entity - Entidad de dominio para métodos de pago
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Schema de validación para detalles de tarjeta
const CardDetailsSchema = z.object({
  card_number: z.string().regex(/^\d{13,19}$/, 'Número de tarjeta inválido').optional(),
  card_exp_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mes de expiración inválido').optional(),
  card_exp_year: z.string().regex(/^\d{2,4}$/, 'Año de expiración inválido').optional(),
  card_holder_name: z.string().min(1).max(100).optional(),
  card_cvc: z.string().regex(/^\d{3,4}$/, 'CVC inválido').optional(),
  card_issuer: z.string().optional(),
  card_network: z.enum(['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay']).optional(),
  card_type: z.enum(['credit', 'debit', 'prepaid']).optional(),
  card_issuing_country: z.string().length(2).optional(),
  bank_code: z.string().optional(),
  nick_name: z.string().max(50).optional(),
  last_four_digits: z.string().regex(/^\d{4}$/).optional(),
})

// Schema de validación para detalles de wallet
const WalletDetailsSchema = z.object({
  type: z.enum(['apple_pay', 'google_pay', 'paypal', 'samsung_pay', 'ali_pay', 'we_chat_pay']),
  wallet_token: z.string().optional(),
  payment_data: z.string().optional(),
})

// Schema de validación para detalles de transferencia bancaria
const BankTransferDetailsSchema = z.object({
  bank_name: z.string().min(1).max(255),
  bank_code: z.string().min(1).max(20),
  account_number: z.string().min(1).max(50),
  routing_number: z.string().optional(),
  iban: z.string().optional(),
  swift_code: z.string().optional(),
})

// Schema de validación para dirección de facturación
const BillingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  line3: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  zip: z.string().min(1).max(20),
  country: z.string().length(2).toUpperCase(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

// Schema principal del método de pago
const PaymentMethodSchema = z.object({
  payment_method_id: z.string().min(1),
  merchant_id: z.string().min(1),
  customer_id: z.string().min(1).max(64),
  payment_method: z.enum(['card', 'wallet', 'bank_transfer', 'bank_redirect', 'pay_later', 'crypto', 'upi', 'voucher']),
  payment_method_type: z.string().optional(),
  payment_method_issuer: z.string().optional(),
  payment_method_issuer_code: z.string().optional(),
  scheme: z.string().optional(),
  card_details: CardDetailsSchema.optional(),
  wallet_details: WalletDetailsSchema.optional(),
  bank_transfer_details: BankTransferDetailsSchema.optional(),
  billing_address: BillingAddressSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  connector_customer_id: z.string().optional(),
  connector_payment_method_id: z.string().optional(),
  network_transaction_id: z.string().optional(),
  is_stored: z.boolean().default(false),
  swift_code: z.string().optional(),
  direct_debit_token: z.string().optional(),
  created_at: z.string().datetime(),
  last_modified: z.string().datetime(),
  last_used_at: z.string().datetime().optional(),
})

export type CardDetails = z.infer<typeof CardDetailsSchema>
export type WalletDetails = z.infer<typeof WalletDetailsSchema>
export type BankTransferDetails = z.infer<typeof BankTransferDetailsSchema>
export type BillingAddress = z.infer<typeof BillingAddressSchema>
export type PaymentMethodType = 'card' | 'wallet' | 'bank_transfer' | 'bank_redirect' | 'pay_later' | 'crypto' | 'upi' | 'voucher'
export type PaymentMethodData = z.infer<typeof PaymentMethodSchema>

/**
 * PaymentMethod Entity - Representa un método de pago en el sistema
 * 
 * Esta entidad encapsula toda la información relacionada con un método de pago,
 * incluyendo detalles específicos del tipo de pago y configuraciones de seguridad.
 */
export class PaymentMethod {
  private constructor(
    private readonly _paymentMethodId: string,
    private readonly _merchantId: string,
    private readonly _customerId: string,
    private readonly _paymentMethod: PaymentMethodType,
    private readonly _createdAt: Date,
    private _lastModified: Date,
    private _paymentMethodType?: string,
    private _paymentMethodIssuer?: string,
    private _paymentMethodIssuerCode?: string,
    private _scheme?: string,
    private _cardDetails?: CardDetails,
    private _walletDetails?: WalletDetails,
    private _bankTransferDetails?: BankTransferDetails,
    private _billingAddress?: BillingAddress,
    private _metadata?: Record<string, any>,
    private _connectorCustomerId?: string,
    private _connectorPaymentMethodId?: string,
    private _networkTransactionId?: string,
    private _isStored: boolean = false,
    private _swiftCode?: string,
    private _directDebitToken?: string,
    private _lastUsedAt?: Date
  ) {}

  /**
   * Factory method para crear un nuevo método de pago
   */
  public static create(data: {
    payment_method_id: string
    merchant_id: string
    customer_id: string
    payment_method: PaymentMethodType
    payment_method_type?: string
    card_details?: CardDetails
    wallet_details?: WalletDetails
    bank_transfer_details?: BankTransferDetails
    billing_address?: BillingAddress
    metadata?: Record<string, any>
    is_stored?: boolean
  }): PaymentMethod {
    const now = new Date()

    return new PaymentMethod(
      data.payment_method_id,
      data.merchant_id,
      data.customer_id,
      data.payment_method,
      now,
      now,
      data.payment_method_type,
      undefined,
      undefined,
      undefined,
      data.card_details,
      data.wallet_details,
      data.bank_transfer_details,
      data.billing_address,
      data.metadata,
      undefined,
      undefined,
      undefined,
      data.is_stored || false
    )
  }

  /**
   * Factory method para reconstruir un método de pago desde datos persistidos
   */
  public static fromData(data: PaymentMethodData): PaymentMethod {
    const validatedData = PaymentMethodSchema.parse(data)

    return new PaymentMethod(
      validatedData.payment_method_id,
      validatedData.merchant_id,
      validatedData.customer_id,
      validatedData.payment_method,
      new Date(validatedData.created_at),
      new Date(validatedData.last_modified),
      validatedData.payment_method_type,
      validatedData.payment_method_issuer,
      validatedData.payment_method_issuer_code,
      validatedData.scheme,
      validatedData.card_details,
      validatedData.wallet_details,
      validatedData.bank_transfer_details,
      validatedData.billing_address,
      validatedData.metadata,
      validatedData.connector_customer_id,
      validatedData.connector_payment_method_id,
      validatedData.network_transaction_id,
      validatedData.is_stored,
      validatedData.swift_code,
      validatedData.direct_debit_token,
      validatedData.last_used_at ? new Date(validatedData.last_used_at) : undefined
    )
  }

  // Getters
  public get paymentMethodId(): string {
    return this._paymentMethodId
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get customerId(): string {
    return this._customerId
  }

  public get paymentMethod(): PaymentMethodType {
    return this._paymentMethod
  }

  public get paymentMethodType(): string | undefined {
    return this._paymentMethodType
  }

  public get paymentMethodIssuer(): string | undefined {
    return this._paymentMethodIssuer
  }

  public get paymentMethodIssuerCode(): string | undefined {
    return this._paymentMethodIssuerCode
  }

  public get scheme(): string | undefined {
    return this._scheme
  }

  public get cardDetails(): CardDetails | undefined {
    return this._cardDetails
  }

  public get walletDetails(): WalletDetails | undefined {
    return this._walletDetails
  }

  public get bankTransferDetails(): BankTransferDetails | undefined {
    return this._bankTransferDetails
  }

  public get billingAddress(): BillingAddress | undefined {
    return this._billingAddress
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  public get connectorCustomerId(): string | undefined {
    return this._connectorCustomerId
  }

  public get connectorPaymentMethodId(): string | undefined {
    return this._connectorPaymentMethodId
  }

  public get networkTransactionId(): string | undefined {
    return this._networkTransactionId
  }

  public get isStored(): boolean {
    return this._isStored
  }

  public get swiftCode(): string | undefined {
    return this._swiftCode
  }

  public get directDebitToken(): string | undefined {
    return this._directDebitToken
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get lastModified(): Date {
    return this._lastModified
  }

  public get lastUsedAt(): Date | undefined {
    return this._lastUsedAt
  }

  // Business methods

  /**
   * Actualiza los detalles de la tarjeta
   */
  public updateCardDetails(cardDetails: Partial<CardDetails>): void {
    if (this._paymentMethod !== 'card') {
      throw new Error('Solo se pueden actualizar detalles de tarjeta para métodos de pago tipo card')
    }

    const updatedDetails = { ...this._cardDetails, ...cardDetails }
    const validated = CardDetailsSchema.parse(updatedDetails)
    this._cardDetails = validated
    this._lastModified = new Date()
  }

  /**
   * Actualiza los detalles del wallet
   */
  public updateWalletDetails(walletDetails: WalletDetails): void {
    if (this._paymentMethod !== 'wallet') {
      throw new Error('Solo se pueden actualizar detalles de wallet para métodos de pago tipo wallet')
    }

    const validated = WalletDetailsSchema.parse(walletDetails)
    this._walletDetails = validated
    this._lastModified = new Date()
  }

  /**
   * Actualiza la dirección de facturación
   */
  public updateBillingAddress(billingAddress: BillingAddress): void {
    const validated = BillingAddressSchema.parse(billingAddress)
    this._billingAddress = validated
    this._lastModified = new Date()
  }

  /**
   * Actualiza los metadatos
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._lastModified = new Date()
  }

  /**
   * Marca el método como almacenado/guardado
   */
  public markAsStored(): void {
    this._isStored = true
    this._lastModified = new Date()
  }

  /**
   * Registra el uso del método de pago
   */
  public recordUsage(): void {
    this._lastUsedAt = new Date()
    this._lastModified = new Date()
  }

  /**
   * Establece información del conector
   */
  public setConnectorInfo(customerId: string, paymentMethodId: string): void {
    this._connectorCustomerId = customerId
    this._connectorPaymentMethodId = paymentMethodId
    this._lastModified = new Date()
  }

  /**
   * Establece el ID de transacción de red
   */
  public setNetworkTransactionId(transactionId: string): void {
    this._networkTransactionId = transactionId
    this._lastModified = new Date()
  }

  /**
   * Verifica si el método de pago es válido para uso
   */
  public isValid(): boolean {
    switch (this._paymentMethod) {
      case 'card':
        return !!(this._cardDetails?.last_four_digits && this._cardDetails?.card_exp_month && this._cardDetails?.card_exp_year)
      case 'wallet':
        return !!(this._walletDetails?.type)
      case 'bank_transfer':
        return !!(this._bankTransferDetails?.bank_name && this._bankTransferDetails?.account_number)
      default:
        return true
    }
  }

  /**
   * Verifica si la tarjeta está próxima a expirar (dentro de 30 días)
   */
  public isCardExpiringSoon(): boolean {
    if (this._paymentMethod !== 'card' || !this._cardDetails?.card_exp_month || !this._cardDetails?.card_exp_year) {
      return false
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    const cardYear = parseInt(this._cardDetails.card_exp_year) < 100 
      ? 2000 + parseInt(this._cardDetails.card_exp_year)
      : parseInt(this._cardDetails.card_exp_year)
    const cardMonth = parseInt(this._cardDetails.card_exp_month)

    const cardExpiryDate = new Date(cardYear, cardMonth - 1) // month is 0-indexed
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    return cardExpiryDate <= thirtyDaysFromNow
  }

  /**
   * Verifica si la tarjeta está expirada
   */
  public isCardExpired(): boolean {
    if (this._paymentMethod !== 'card' || !this._cardDetails?.card_exp_month || !this._cardDetails?.card_exp_year) {
      return false
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    const cardYear = parseInt(this._cardDetails.card_exp_year) < 100 
      ? 2000 + parseInt(this._cardDetails.card_exp_year)
      : parseInt(this._cardDetails.card_exp_year)
    const cardMonth = parseInt(this._cardDetails.card_exp_month)

    return cardYear < currentYear || (cardYear === currentYear && cardMonth < currentMonth)
  }

  /**
   * Obtiene una representación enmascarada del método de pago
   */
  public getMaskedDisplay(): string {
    switch (this._paymentMethod) {
      case 'card':
        if (this._cardDetails?.last_four_digits) {
          const network = this._cardDetails.card_network || 'Card'
          return `${network} ****${this._cardDetails.last_four_digits}`
        }
        return 'Tarjeta terminada en ****'
      case 'wallet':
        return this._walletDetails?.type || 'Wallet'
      case 'bank_transfer':
        if (this._bankTransferDetails?.account_number) {
          const lastFour = this._bankTransferDetails.account_number.slice(-4)
          return `${this._bankTransferDetails.bank_name || 'Bank'} ****${lastFour}`
        }
        return 'Transferencia Bancaria'
      default:
        return this._paymentMethod
    }
  }

  /**
   * Verifica si el método de pago requiere autenticación 3DS
   */
  public requires3DS(): boolean {
    return this._paymentMethod === 'card' && this._cardDetails?.card_network !== 'amex'
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): PaymentMethodData {
    return {
      payment_method_id: this._paymentMethodId,
      merchant_id: this._merchantId,
      customer_id: this._customerId,
      payment_method: this._paymentMethod,
      payment_method_type: this._paymentMethodType,
      payment_method_issuer: this._paymentMethodIssuer,
      payment_method_issuer_code: this._paymentMethodIssuerCode,
      scheme: this._scheme,
      card_details: this._cardDetails,
      wallet_details: this._walletDetails,
      bank_transfer_details: this._bankTransferDetails,
      billing_address: this._billingAddress,
      metadata: this._metadata,
      connector_customer_id: this._connectorCustomerId,
      connector_payment_method_id: this._connectorPaymentMethodId,
      network_transaction_id: this._networkTransactionId,
      is_stored: this._isStored,
      swift_code: this._swiftCode,
      direct_debit_token: this._directDebitToken,
      created_at: this._createdAt.toISOString(),
      last_modified: this._lastModified.toISOString(),
      last_used_at: this._lastUsedAt?.toISOString(),
    }
  }

  /**
   * Convierte a formato para Hyperswitch API (sin datos sensibles)
   */
  public toHyperswitchFormat() {
    // Crear una copia de los detalles de tarjeta sin datos sensibles
    const safeCardDetails = this._cardDetails ? {
      card_holder_name: this._cardDetails.card_holder_name,
      card_network: this._cardDetails.card_network,
      card_type: this._cardDetails.card_type,
      card_issuing_country: this._cardDetails.card_issuing_country,
      last_four_digits: this._cardDetails.last_four_digits,
      nick_name: this._cardDetails.nick_name,
    } : undefined

    return {
      payment_method_id: this._paymentMethodId,
      customer_id: this._customerId,
      payment_method: this._paymentMethod,
      payment_method_type: this._paymentMethodType,
      card: safeCardDetails,
      wallet: this._walletDetails,
      bank_transfer: this._bankTransferDetails,
      billing: this._billingAddress,
      metadata: this._metadata,
    }
  }
}