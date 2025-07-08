// src/domain/entities/Transaction.ts
// ──────────────────────────────────────────────────────────────────────────────
// Transaction Entity - Entidad de dominio para transacciones de pago
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { Money } from '../value-objects/Money'
import { PaymentStatus } from '../value-objects/PaymentStatus'

// Schema de validación para detalles del pedido
const OrderDetailsSchema = z.object({
  product_name: z.string().min(1).max(255),
  quantity: z.number().min(1),
  amount: z.number().min(0),
  product_img_link: z.string().url().optional(),
  product_id: z.string().optional(),
  category: z.string().max(100).optional(),
  sub_category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  product_type: z.string().max(50).optional(),
})

// Schema de validación para datos de autenticación 3DS
const ThreeDSDataSchema = z.object({
  three_ds_requestor_url: z.string().url().optional(),
  three_ds_method_url: z.string().url().optional(),
  three_ds_method_data: z.string().optional(),
  acs_url: z.string().url().optional(),
  challenge_request: z.string().optional(),
  acs_reference_number: z.string().optional(),
  acs_trans_id: z.string().optional(),
  three_ds_server_trans_id: z.string().optional(),
  authentication_type: z.enum(['three_ds', 'no_three_ds']).default('three_ds'),
})

// Schema de validación para información del navegador
const BrowserInfoSchema = z.object({
  user_agent: z.string().optional(),
  accept_header: z.string().optional(),
  language: z.string().optional(),
  color_depth: z.number().optional(),
  screen_height: z.number().optional(),
  screen_width: z.number().optional(),
  time_zone: z.number().optional(),
  java_enabled: z.boolean().optional(),
  java_script_enabled: z.boolean().optional(),
  ip_address: z.string().optional(),
})

// Schema de validación para dirección
const AddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  line3: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  zip: z.string().min(1).max(20),
  country: z.string().length(2).toUpperCase(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

// Schema de validación para datos del cliente
const CustomerDetailsSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(255).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().optional(),
  phone_country_code: z.string().length(2).optional(),
})

// Schema principal de la transacción
const TransactionSchema = z.object({
  payment_id: z.string().min(1),
  merchant_id: z.string().min(1),
  status: z.string(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  amount_capturable: z.number().min(0).optional(),
  amount_received: z.number().min(0).optional(),
  amount_to_capture: z.number().min(0).optional(),
  connector: z.string().optional(),
  client_secret: z.string().optional(),
  created: z.string().datetime(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  order_details: z.array(OrderDetailsSchema).optional(),
  customer_id: z.string().max(64).optional(),
  customer: CustomerDetailsSchema.optional(),
  connector_transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  payment_method_id: z.string().optional(),
  payment_method_type: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  cancellation_reason: z.string().optional(),
  authentication_type: z.enum(['three_ds', 'no_three_ds']).default('three_ds'),
  statement_descriptor: z.string().max(22).optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  setup_future_usage: z.enum(['off_session', 'on_session']).optional(),
  billing: AddressSchema.optional(),
  shipping: AddressSchema.optional(),
  browser_info: BrowserInfoSchema.optional(),
  three_ds_data: ThreeDSDataSchema.optional(),
  return_url: z.string().url().optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().max(64).optional(),
  profile_id: z.string().optional(),
  attempt_count: z.number().min(1).default(1),
  merchant_decision: z.string().optional(),
  feature_metadata: z.record(z.string(), z.any()).optional(),
  payment_experience: z.array(z.string()).optional(),
  payment_method_data: z.record(z.string(), z.any()).optional(),
  charges: z.array(z.object({
    charge_type: z.string(),
    charge_amount: z.number(),
    charge_currency: z.string(),
  })).optional(),
  frm_message: z.record(z.string(), z.any()).optional(),
  updated: z.string().datetime(),
  authorized_at: z.string().datetime().optional(),
  captured_at: z.string().datetime().optional(),
  voided_at: z.string().datetime().optional(),
  failed_at: z.string().datetime().optional(),
})

export type OrderDetails = z.infer<typeof OrderDetailsSchema>
export type ThreeDSData = z.infer<typeof ThreeDSDataSchema>
export type BrowserInfo = z.infer<typeof BrowserInfoSchema>
export type Address = z.infer<typeof AddressSchema>
export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>
export type CaptureMethod = 'automatic' | 'manual'
export type SetupFutureUsage = 'off_session' | 'on_session'
export type TransactionData = z.infer<typeof TransactionSchema>

/**
 * Transaction Entity - Representa una transacción de pago en el sistema
 * 
 * Esta entidad encapsula todo el ciclo de vida de una transacción, desde
 * su creación hasta su finalización, incluyendo autorización, captura,
 * y gestión de estados.
 */
export class Transaction {
  private constructor(
    private readonly _paymentId: string,
    private readonly _merchantId: string,
    private readonly _amount: Money,
    private readonly _captureMethod: CaptureMethod,
    private readonly _created: Date,
    private _status: PaymentStatus,
    private _updated: Date,
    private _amountCapturable?: Money,
    private _amountReceived?: Money,
    private _amountToCapture?: Money,
    private _connector?: string,
    private _clientSecret?: string,
    private _description?: string,
    private _metadata?: Record<string, any>,
    private _orderDetails?: OrderDetails[],
    private _customerId?: string,
    private _customer?: CustomerDetails,
    private _connectorTransactionId?: string,
    private _paymentMethod?: string,
    private _paymentMethodId?: string,
    private _paymentMethodType?: string,
    private _errorCode?: string,
    private _errorMessage?: string,
    private _cancellationReason?: string,
    private _authenticationType: 'three_ds' | 'no_three_ds' = 'three_ds',
    private _statementDescriptor?: string,
    private _confirm: boolean = false,
    private _setupFutureUsage?: SetupFutureUsage,
    private _billing?: Address,
    private _shipping?: Address,
    private _browserInfo?: BrowserInfo,
    private _threeDSData?: ThreeDSData,
    private _returnUrl?: string,
    private _businessCountry?: string,
    private _businessLabel?: string,
    private _profileId?: string,
    private _attemptCount: number = 1,
    private _merchantDecision?: string,
    private _featureMetadata?: Record<string, any>,
    private _paymentExperience?: string[],
    private _paymentMethodData?: Record<string, any>,
    private _charges?: Array<{ charge_type: string; charge_amount: number; charge_currency: string }>,
    private _frmMessage?: Record<string, any>,
    private _authorizedAt?: Date,
    private _capturedAt?: Date,
    private _voidedAt?: Date,
    private _failedAt?: Date
  ) {}

  /**
   * Factory method para crear una nueva transacción
   */
  public static create(data: {
    payment_id: string
    merchant_id: string
    amount: number
    currency: string
    capture_method?: CaptureMethod
    description?: string
    customer_id?: string
    payment_method?: string
    billing?: Address
    shipping?: Address
    return_url?: string
    metadata?: Record<string, any>
    profile_id?: string
  }): Transaction {
    const amount = Money.create(data.amount, data.currency)
    const status = PaymentStatus.fromString('requires_payment_method')
    const now = new Date()

    return new Transaction(
      data.payment_id,
      data.merchant_id,
      amount,
      data.capture_method || 'automatic',
      now,
      status,
      now,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      data.description,
      data.metadata,
      undefined,
      data.customer_id,
      undefined,
      undefined,
      data.payment_method,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'three_ds',
      undefined,
      false,
      undefined,
      data.billing,
      data.shipping,
      undefined,
      undefined,
      data.return_url,
      undefined,
      undefined,
      data.profile_id
    )
  }

  /**
   * Factory method para reconstruir una transacción desde datos persistidos
   */
  public static fromData(data: TransactionData): Transaction {
    const validatedData = TransactionSchema.parse(data)
    
    const amount = Money.create(validatedData.amount, validatedData.currency)
    const status = PaymentStatus.fromString(validatedData.status)
    
    const amountCapturable = validatedData.amount_capturable 
      ? Money.create(validatedData.amount_capturable, validatedData.currency)
      : undefined
    
    const amountReceived = validatedData.amount_received
      ? Money.create(validatedData.amount_received, validatedData.currency)
      : undefined
    
    const amountToCapture = validatedData.amount_to_capture
      ? Money.create(validatedData.amount_to_capture, validatedData.currency)
      : undefined

    return new Transaction(
      validatedData.payment_id,
      validatedData.merchant_id,
      amount,
      validatedData.capture_method,
      new Date(validatedData.created),
      status,
      new Date(validatedData.updated),
      amountCapturable,
      amountReceived,
      amountToCapture,
      validatedData.connector,
      validatedData.client_secret,
      validatedData.description,
      validatedData.metadata,
      validatedData.order_details,
      validatedData.customer_id,
      validatedData.customer,
      validatedData.connector_transaction_id,
      validatedData.payment_method,
      validatedData.payment_method_id,
      validatedData.payment_method_type,
      validatedData.error_code,
      validatedData.error_message,
      validatedData.cancellation_reason,
      validatedData.authentication_type,
      validatedData.statement_descriptor,
      validatedData.confirm,
      validatedData.setup_future_usage,
      validatedData.billing,
      validatedData.shipping,
      validatedData.browser_info,
      validatedData.three_ds_data,
      validatedData.return_url,
      validatedData.business_country,
      validatedData.business_label,
      validatedData.profile_id,
      validatedData.attempt_count,
      validatedData.merchant_decision,
      validatedData.feature_metadata,
      validatedData.payment_experience,
      validatedData.payment_method_data,
      validatedData.charges,
      validatedData.frm_message,
      validatedData.authorized_at ? new Date(validatedData.authorized_at) : undefined,
      validatedData.captured_at ? new Date(validatedData.captured_at) : undefined,
      validatedData.voided_at ? new Date(validatedData.voided_at) : undefined,
      validatedData.failed_at ? new Date(validatedData.failed_at) : undefined
    )
  }

  // Getters
  public get paymentId(): string {
    return this._paymentId
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get status(): PaymentStatus {
    return this._status
  }

  public get amount(): Money {
    return this._amount
  }

  public get amountCapturable(): Money | undefined {
    return this._amountCapturable
  }

  public get amountReceived(): Money | undefined {
    return this._amountReceived
  }

  public get amountToCapture(): Money | undefined {
    return this._amountToCapture
  }

  public get connector(): string | undefined {
    return this._connector
  }

  public get clientSecret(): string | undefined {
    return this._clientSecret
  }

  public get created(): Date {
    return this._created
  }

  public get updated(): Date {
    return this._updated
  }

  public get description(): string | undefined {
    return this._description
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  public get orderDetails(): OrderDetails[] | undefined {
    return this._orderDetails ? [...this._orderDetails] : undefined
  }

  public get customerId(): string | undefined {
    return this._customerId
  }

  public get customer(): CustomerDetails | undefined {
    return this._customer
  }

  public get connectorTransactionId(): string | undefined {
    return this._connectorTransactionId
  }

  public get paymentMethod(): string | undefined {
    return this._paymentMethod
  }

  public get paymentMethodId(): string | undefined {
    return this._paymentMethodId
  }

  public get paymentMethodType(): string | undefined {
    return this._paymentMethodType
  }

  public get errorCode(): string | undefined {
    return this._errorCode
  }

  public get errorMessage(): string | undefined {
    return this._errorMessage
  }

  public get cancellationReason(): string | undefined {
    return this._cancellationReason
  }

  public get authenticationType(): 'three_ds' | 'no_three_ds' {
    return this._authenticationType
  }

  public get statementDescriptor(): string | undefined {
    return this._statementDescriptor
  }

  public get captureMethod(): CaptureMethod {
    return this._captureMethod
  }

  public get confirm(): boolean {
    return this._confirm
  }

  public get setupFutureUsage(): SetupFutureUsage | undefined {
    return this._setupFutureUsage
  }

  public get billing(): Address | undefined {
    return this._billing
  }

  public get shipping(): Address | undefined {
    return this._shipping
  }

  public get browserInfo(): BrowserInfo | undefined {
    return this._browserInfo
  }

  public get threeDSData(): ThreeDSData | undefined {
    return this._threeDSData
  }

  public get returnUrl(): string | undefined {
    return this._returnUrl
  }

  public get businessCountry(): string | undefined {
    return this._businessCountry
  }

  public get businessLabel(): string | undefined {
    return this._businessLabel
  }

  public get profileId(): string | undefined {
    return this._profileId
  }

  public get attemptCount(): number {
    return this._attemptCount
  }

  public get authorizedAt(): Date | undefined {
    return this._authorizedAt
  }

  public get capturedAt(): Date | undefined {
    return this._capturedAt
  }

  public get voidedAt(): Date | undefined {
    return this._voidedAt
  }

  public get failedAt(): Date | undefined {
    return this._failedAt
  }

  // Business methods

  /**
   * Actualiza el estado de la transacción
   */
  public updateStatus(newStatus: string, errorMessage?: string, errorCode?: string): void {
    const status = PaymentStatus.fromString(newStatus)
    
    // Validar transición de estado
    if (!this.isValidStatusTransition(this._status, status)) {
      throw new Error(`Transición de estado inválida: ${this._status.value} -> ${status.value}`)
    }

    this._status = status
    this._updated = new Date()

    // Establecer timestamps específicos según el estado
    switch (status.value) {
      case 'succeeded':
        if (this._captureMethod === 'automatic') {
          this._capturedAt = new Date()
        }
        if (!this._authorizedAt) {
          this._authorizedAt = new Date()
        }
        break
      case 'requires_capture':
        this._authorizedAt = new Date()
        break
      case 'failed':
        this._failedAt = new Date()
        this._errorMessage = errorMessage
        this._errorCode = errorCode
        break
      case 'cancelled':
        this._voidedAt = new Date()
        break
    }
  }

  /**
   * Autoriza la transacción
   */
  public authorize(connectorTransactionId?: string): void {
    if (!this._status.canAuthorize()) {
      throw new Error('La transacción no puede ser autorizada en su estado actual')
    }

    this._connectorTransactionId = connectorTransactionId
    
    if (this._captureMethod === 'automatic') {
      this.updateStatus('succeeded')
    } else {
      this.updateStatus('requires_capture')
      this._amountCapturable = this._amount
    }
  }

  /**
   * Captura la transacción
   */
  public capture(amountToCapture?: number): void {
    if (!this._status.canCapture()) {
      throw new Error('La transacción no puede ser capturada en su estado actual')
    }

    const captureAmount = amountToCapture || this._amount.amountInCents
    
    if (captureAmount > this._amount.amountInCents) {
      throw new Error('El monto a capturar no puede exceder el monto autorizado')
    }

    this._amountToCapture = Money.create(captureAmount, this._amount.currency.code)
    this._amountReceived = this._amountToCapture
    this._capturedAt = new Date()
    
    if (captureAmount === this._amount.amountInCents) {
      this.updateStatus('succeeded')
    } else {
      this.updateStatus('partially_captured')
      const remaining = this._amount.amountInCents - captureAmount
      this._amountCapturable = Money.create(remaining, this._amount.currency.code)
    }
  }

  /**
   * Cancela/anula la transacción
   */
  public cancel(reason?: string): void {
    if (!this._status.canCancel()) {
      throw new Error('La transacción no puede ser cancelada en su estado actual')
    }

    this._cancellationReason = reason
    this.updateStatus('cancelled')
  }

  /**
   * Marca la transacción como fallida
   */
  public markAsFailed(errorMessage: string, errorCode?: string): void {
    this._errorMessage = errorMessage
    this._errorCode = errorCode
    this.updateStatus('failed', errorMessage, errorCode)
  }

  /**
   * Establece la información del método de pago
   */
  public setPaymentMethod(
    paymentMethod: string,
    paymentMethodId?: string,
    paymentMethodType?: string
  ): void {
    this._paymentMethod = paymentMethod
    this._paymentMethodId = paymentMethodId
    this._paymentMethodType = paymentMethodType
    this._updated = new Date()
  }

  /**
   * Establece el conector utilizado
   */
  public setConnector(connector: string): void {
    this._connector = connector
    this._updated = new Date()
  }

  /**
   * Establece el client secret
   */
  public setClientSecret(clientSecret: string): void {
    this._clientSecret = clientSecret
    this._updated = new Date()
  }

  /**
   * Actualiza la información del cliente
   */
  public updateCustomer(customer: CustomerDetails): void {
    const validated = CustomerDetailsSchema.parse(customer)
    this._customer = validated
    this._customerId = validated.id
    this._updated = new Date()
  }

  /**
   * Actualiza la dirección de facturación
   */
  public updateBilling(billing: Address): void {
    const validated = AddressSchema.parse(billing)
    this._billing = validated
    this._updated = new Date()
  }

  /**
   * Actualiza la dirección de envío
   */
  public updateShipping(shipping: Address): void {
    const validated = AddressSchema.parse(shipping)
    this._shipping = validated
    this._updated = new Date()
  }

  /**
   * Actualiza la información del navegador
   */
  public updateBrowserInfo(browserInfo: BrowserInfo): void {
    const validated = BrowserInfoSchema.parse(browserInfo)
    this._browserInfo = validated
    this._updated = new Date()
  }

  /**
   * Actualiza los datos de 3DS
   */
  public updateThreeDSData(threeDSData: ThreeDSData): void {
    const validated = ThreeDSDataSchema.parse(threeDSData)
    this._threeDSData = threeDSData
    this._updated = new Date()
  }

  /**
   * Añade detalles del pedido
   */
  public addOrderDetails(orderDetails: OrderDetails[]): void {
    const validated = orderDetails.map(detail => OrderDetailsSchema.parse(detail))
    this._orderDetails = [...(this._orderDetails || []), ...validated]
    this._updated = new Date()
  }

  /**
   * Actualiza los metadatos
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._updated = new Date()
  }

  /**
   * Incrementa el contador de intentos
   */
  public incrementAttemptCount(): void {
    this._attemptCount += 1
    this._updated = new Date()
  }

  /**
   * Verifica si la transacción requiere acción del usuario
   */
  public requiresAction(): boolean {
    return this._status.requiresAction()
  }

  /**
   * Verifica si la transacción está completada
   */
  public isCompleted(): boolean {
    return this._status.isSuccessful()
  }

  /**
   * Verifica si la transacción ha fallado
   */
  public hasFailed(): boolean {
    return this._status.isFailed()
  }

  /**
   * Verifica si la transacción puede ser capturada
   */
  public canBeCaptured(): boolean {
    return this._status.canCapture()
  }

  /**
   * Verifica si la transacción puede ser cancelada
   */
  public canBeCancelled(): boolean {
    return this._status.canCancel()
  }

  /**
   * Verifica si la transacción puede ser reembolsada
   */
  public canBeRefunded(): boolean {
    return this._status.isSuccessful() && this._amountReceived && this._amountReceived.amountInCents > 0
  }

  /**
   * Obtiene el monto disponible para reembolso
   */
  public getRefundableAmount(): Money | null {
    if (!this.canBeRefunded()) {
      return null
    }
    return this._amountReceived || this._amount
  }

  /**
   * Verifica si la transacción requiere 3DS
   */
  public requires3DS(): boolean {
    return this._authenticationType === 'three_ds'
  }

  /**
   * Verifica si es una captura automática
   */
  public isAutomaticCapture(): boolean {
    return this._captureMethod === 'automatic'
  }

  /**
   * Obtiene la duración del procesamiento
   */
  public getProcessingDurationMs(): number {
    const endTime = this._capturedAt || this._failedAt || this._voidedAt || new Date()
    return endTime.getTime() - this._created.getTime()
  }

  /**
   * Verifica si la transición de estado es válida
   */
  private isValidStatusTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'requires_payment_method': ['requires_confirmation', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled'],
      'requires_confirmation': ['requires_action', 'processing', 'requires_capture', 'succeeded', 'failed', 'cancelled'],
      'requires_action': ['processing', 'requires_capture', 'succeeded', 'failed', 'cancelled'],
      'processing': ['requires_capture', 'succeeded', 'failed', 'cancelled'],
      'requires_capture': ['succeeded', 'partially_captured', 'cancelled'],
      'partially_captured': ['partially_captured_and_capturable', 'succeeded', 'cancelled'],
      'partially_captured_and_capturable': ['succeeded', 'cancelled'],
      'succeeded': [],
      'failed': [],
      'cancelled': [],
    }

    return validTransitions[from.value]?.includes(to.value) ?? false
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): TransactionData {
    return {
      payment_id: this._paymentId,
      merchant_id: this._merchantId,
      status: this._status.value,
      amount: this._amount.amountInCents,
      currency: this._amount.currency.code,
      amount_capturable: this._amountCapturable?.amountInCents,
      amount_received: this._amountReceived?.amountInCents,
      amount_to_capture: this._amountToCapture?.amountInCents,
      connector: this._connector,
      client_secret: this._clientSecret,
      created: this._created.toISOString(),
      updated: this._updated.toISOString(),
      description: this._description,
      metadata: this._metadata,
      order_details: this._orderDetails,
      customer_id: this._customerId,
      customer: this._customer,
      connector_transaction_id: this._connectorTransactionId,
      payment_method: this._paymentMethod,
      payment_method_id: this._paymentMethodId,
      payment_method_type: this._paymentMethodType,
      error_code: this._errorCode,
      error_message: this._errorMessage,
      cancellation_reason: this._cancellationReason,
      authentication_type: this._authenticationType,
      statement_descriptor: this._statementDescriptor,
      capture_method: this._captureMethod,
      confirm: this._confirm,
      setup_future_usage: this._setupFutureUsage,
      billing: this._billing,
      shipping: this._shipping,
      browser_info: this._browserInfo,
      three_ds_data: this._threeDSData,
      return_url: this._returnUrl,
      business_country: this._businessCountry,
      business_label: this._businessLabel,
      profile_id: this._profileId,
      attempt_count: this._attemptCount,
      merchant_decision: this._merchantDecision,
      feature_metadata: this._featureMetadata,
      payment_experience: this._paymentExperience,
      payment_method_data: this._paymentMethodData,
      charges: this._charges,
      frm_message: this._frmMessage,
      authorized_at: this._authorizedAt?.toISOString(),
      captured_at: this._capturedAt?.toISOString(),
      voided_at: this._voidedAt?.toISOString(),
      failed_at: this._failedAt?.toISOString(),
    }
  }

  /**
   * Convierte a formato para Hyperswitch API
   */
  public toHyperswitchFormat() {
    return {
      payment_id: this._paymentId,
      merchant_id: this._merchantId,
      status: this._status.value,
      amount: this._amount.amountInCents,
      currency: this._amount.currency.code,
      amount_capturable: this._amountCapturable?.amountInCents,
      amount_received: this._amountReceived?.amountInCents,
      connector: this._connector,
      client_secret: this._clientSecret,
      created: this._created.toISOString(),
      description: this._description,
      metadata: this._metadata,
      order_details: this._orderDetails,
      customer_id: this._customerId,
      customer: this._customer,
      connector_transaction_id: this._connectorTransactionId,
      payment_method: this._paymentMethod,
      payment_method_id: this._paymentMethodId,
      payment_method_type: this._paymentMethodType,
      authentication_type: this._authenticationType,
      statement_descriptor: this._statementDescriptor,
      capture_method: this._captureMethod,
      billing: this._billing,
      shipping: this._shipping,
      browser_info: this._browserInfo,
      return_url: this._returnUrl,
      business_country: this._businessCountry,
      business_label: this._businessLabel,
      profile_id: this._profileId,
    }
  }
}