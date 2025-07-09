// src/domain/entities/Refund.ts
// ──────────────────────────────────────────────────────────────────────────────
// Refund Entity - Entidad de dominio para reembolsos
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { Money } from '../value-objects/Money'
import { RefundStatus } from '../value-objects/RefundStatus'

// Schema de validación para cargos del reembolso
const RefundChargesSchema = z.object({
  charge_type: z.string(),
  charge_amount: z.number().min(0),
  charge_currency: z.string().length(3),
})

// Schema principal del reembolso
const RefundSchema = z.object({
  refund_id: z.string().min(1),
  payment_id: z.string().min(1),
  merchant_id: z.string().min(1),
  connector_transaction_id: z.string().optional(),
  connector: z.string().min(1),
  connector_refund_id: z.string().optional(),
  external_reference_id: z.string().optional(),
  refund_type: z.enum(['instant', 'regular']).default('regular'),
  total_amount: z.number().min(0),
  currency: z.string().length(3),
  refund_amount: z.number().min(0),
  refund_status: z.string(),
  sent_to_gateway: z.boolean().default(false),
  refund_reason: z.string().max(255).optional(),
  failure_reason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  error_message: z.string().optional(),
  error_code: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  description: z.string().max(255).optional(),
  attempt_id: z.string().min(1),
  refund_arn: z.string().optional(),
  charges: z.array(RefundChargesSchema).optional(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
  gateway_response_time_ms: z.number().min(0).optional(),
  processing_fee: z.number().min(0).optional(),
  refund_fee: z.number().min(0).optional(),
})

export type RefundCharges = z.infer<typeof RefundChargesSchema>
export type RefundType = 'instant' | 'regular'
export type RefundData = z.infer<typeof RefundSchema>

/**
 * Refund Entity - Representa un reembolso en el sistema
 * 
 * Esta entidad maneja todo el ciclo de vida de un reembolso, desde su
 * creación hasta su procesamiento final, incluyendo validaciones de negocio
 * y estados intermedios.
 */
export class Refund {
  private constructor(
    private readonly _refundId: string,
    private readonly _paymentId: string,
    private readonly _merchantId: string,
    private readonly _connector: string,
    private readonly _attemptId: string,
    private readonly _refundType: RefundType,
    private readonly _totalAmount: Money,
    private readonly _refundAmount: Money,
    private readonly _createdAt: Date,
    private _refundStatus: RefundStatus,
    private _updatedAt: Date,
    private _connectorTransactionId?: string,
    private _connectorRefundId?: string,
    private _externalReferenceId?: string,
    private _sentToGateway: boolean = false,
    private _refundReason?: string,
    private _failureReason?: string,
    private _metadata?: Record<string, any>,
    private _errorMessage?: string,
    private _errorCode?: string,
    private _description?: string,
    private _refundArn?: string,
    private _charges?: RefundCharges[],
    private _profileId?: string,
    private _merchantConnectorId?: string,
    private _gatewayResponseTimeMs?: number,
    private _processingFee?: number,
    private _refundFee?: number
  ) {}

  /**
   * Factory method para crear un nuevo reembolso
   */
  public static create(data: {
    refund_id: string
    payment_id: string
    merchant_id: string
    connector: string
    attempt_id: string
    total_amount: number
    currency: string
    refund_amount: number
    refund_type?: RefundType
    refund_reason?: string
    description?: string
    metadata?: Record<string, any>
    profile_id?: string
  }): Refund {
    // Validar que el monto del reembolso no exceda el total
    if (data.refund_amount > data.total_amount) {
      throw new Error('El monto del reembolso no puede exceder el monto total del pago')
    }

    const totalAmount = Money.create(data.total_amount, data.currency)
    const refundAmount = Money.create(data.refund_amount, data.currency)
    const status = RefundStatus.fromString('pending')
    const now = new Date()

    return new Refund(
      data.refund_id,
      data.payment_id,
      data.merchant_id,
      data.connector,
      data.attempt_id,
      data.refund_type || 'regular',
      totalAmount,
      refundAmount,
      now,
      status,
      now,
      undefined,
      undefined,
      undefined,
      false,
      data.refund_reason,
      undefined,
      data.metadata,
      undefined,
      undefined,
      data.description,
      undefined,
      undefined,
      data.profile_id
    )
  }

  /**
   * Factory method para reconstruir un reembolso desde datos persistidos
   */
  public static fromData(data: RefundData): Refund {
    const validatedData = RefundSchema.parse(data)
    
    const totalAmount = Money.create(validatedData.total_amount, validatedData.currency)
    const refundAmount = Money.create(validatedData.refund_amount, validatedData.currency)
    const status = RefundStatus.fromString(validatedData.refund_status)

    return new Refund(
      validatedData.refund_id,
      validatedData.payment_id,
      validatedData.merchant_id,
      validatedData.connector,
      validatedData.attempt_id,
      validatedData.refund_type,
      totalAmount,
      refundAmount,
      new Date(validatedData.created_at),
      status,
      new Date(validatedData.updated_at),
      validatedData.connector_transaction_id,
      validatedData.connector_refund_id,
      validatedData.external_reference_id,
      validatedData.sent_to_gateway,
      validatedData.refund_reason,
      validatedData.failure_reason,
      validatedData.metadata,
      validatedData.error_message,
      validatedData.error_code,
      validatedData.description,
      validatedData.refund_arn,
      validatedData.charges,
      validatedData.profile_id,
      validatedData.merchant_connector_id,
      validatedData.gateway_response_time_ms,
      validatedData.processing_fee,
      validatedData.refund_fee
    )
  }

  // Getters
  public get refundId(): string {
    return this._refundId
  }

  public get paymentId(): string {
    return this._paymentId
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get connector(): string {
    return this._connector
  }

  public get attemptId(): string {
    return this._attemptId
  }

  public get refundType(): RefundType {
    return this._refundType
  }

  public get totalAmount(): Money {
    return this._totalAmount
  }

  public get refundAmount(): Money {
    return this._refundAmount
  }

  public get refundStatus(): RefundStatus {
    return this._refundStatus
  }

  public get connectorTransactionId(): string | undefined {
    return this._connectorTransactionId
  }

  public get connectorRefundId(): string | undefined {
    return this._connectorRefundId
  }

  public get externalReferenceId(): string | undefined {
    return this._externalReferenceId
  }

  public get sentToGateway(): boolean {
    return this._sentToGateway
  }

  public get refundReason(): string | undefined {
    return this._refundReason
  }

  public get failureReason(): string | undefined {
    return this._failureReason
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  public get errorMessage(): string | undefined {
    return this._errorMessage
  }

  public get errorCode(): string | undefined {
    return this._errorCode
  }

  public get description(): string | undefined {
    return this._description
  }

  public get refundArn(): string | undefined {
    return this._refundArn
  }

  public get charges(): RefundCharges[] | undefined {
    return this._charges ? [...this._charges] : undefined
  }

  public get profileId(): string | undefined {
    return this._profileId
  }

  public get merchantConnectorId(): string | undefined {
    return this._merchantConnectorId
  }

  public get gatewayResponseTimeMs(): number | undefined {
    return this._gatewayResponseTimeMs
  }

  public get processingFee(): number | undefined {
    return this._processingFee
  }

  public get refundFee(): number | undefined {
    return this._refundFee
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get updatedAt(): Date {
    return this._updatedAt
  }

  // Business methods

  /**
   * Actualiza el estado del reembolso
   */
  public updateStatus(newStatus: string, errorMessage?: string, errorCode?: string): void {
    const status = RefundStatus.fromString(newStatus)
    
    // Validar transición de estado válida
    if (!this.isValidStatusTransition(this._refundStatus, status)) {
      throw new Error(`Transición de estado inválida: ${this._refundStatus.value} -> ${status.value}`)
    }

    this._refundStatus = status
    
    // Si el estado es de fallo, guardar información del error
    if (status.isFailed()) {
      this._errorMessage = errorMessage
      this._errorCode = errorCode
      this._failureReason = errorMessage || 'Error no especificado'
    }

    this._updatedAt = new Date()
  }

  /**
   * Marca el reembolso como enviado al gateway
   */
  public markAsSentToGateway(connectorRefundId?: string): void {
    if (this._sentToGateway) {
      throw new Error('El reembolso ya fue enviado al gateway')
    }

    this._sentToGateway = true
    this._connectorRefundId = connectorRefundId
    this._refundStatus = RefundStatus.fromString('manual_review')
    this._updatedAt = new Date()
  }

  /**
   * Establece el ID de transacción del conector
   */
  public setConnectorTransactionId(transactionId: string): void {
    this._connectorTransactionId = transactionId
    this._updatedAt = new Date()
  }

  /**
   * Establece el ARN del reembolso
   */
  public setRefundArn(arn: string): void {
    this._refundArn = arn
    this._updatedAt = new Date()
  }

  /**
   * Establece el tiempo de respuesta del gateway
   */
  public setGatewayResponseTime(timeMs: number): void {
    this._gatewayResponseTimeMs = timeMs
    this._updatedAt = new Date()
  }

  /**
   * Añade cargos al reembolso
   */
  public addCharges(charges: RefundCharges[]): void {
    const validatedCharges = charges.map(charge => RefundChargesSchema.parse(charge))
    
    if (!this._charges) {
      this._charges = []
    }
    
    this._charges.push(...validatedCharges)
    this._updatedAt = new Date()
  }

  /**
   * Establece las comisiones de procesamiento
   */
  public setFees(processingFee?: number, refundFee?: number): void {
    if (processingFee !== undefined && processingFee < 0) {
      throw new Error('La comisión de procesamiento no puede ser negativa')
    }
    
    if (refundFee !== undefined && refundFee < 0) {
      throw new Error('La comisión de reembolso no puede ser negativa')
    }

    this._processingFee = processingFee
    this._refundFee = refundFee
    this._updatedAt = new Date()
  }

  /**
   * Actualiza los metadatos del reembolso
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._updatedAt = new Date()
  }

  /**
   * Establece información de referencia externa
   */
  public setExternalReference(referenceId: string): void {
    this._externalReferenceId = referenceId
    this._updatedAt = new Date()
  }

  /**
   * Confirma el éxito del reembolso
   */
  public confirmSuccess(): void {
    if (!this._refundStatus.canTransitionTo(RefundStatus.fromString('success'))) {
      throw new Error('No se puede confirmar el éxito desde el estado actual')
    }

    this._refundStatus = RefundStatus.fromString('success')
    this._updatedAt = new Date()
  }

  /**
   * Marca el reembolso como fallido
   */
  public markAsFailed(failureReason: string, errorCode?: string): void {
    if (!this._refundStatus.canTransitionTo(RefundStatus.fromString('failure'))) {
      throw new Error('No se puede marcar como fallido desde el estado actual')
    }

    this._refundStatus = RefundStatus.fromString('failure')
    this._failureReason = failureReason
    this._errorCode = errorCode
    this._errorMessage = failureReason
    this._updatedAt = new Date()
  }

  /**
   * Cancela el reembolso (solo si está pendiente)
   */
  public cancel(reason: string): void {
    if (!this._refundStatus.isPending()) {
      throw new Error('Solo se pueden cancelar reembolsos pendientes')
    }

    // Nota: No hay estado "cancelled" en RefundStatus según Hyperswitch,
    // por lo que lo marcamos como fallido con la razón de cancelación
    this.markAsFailed(`Cancelado: ${reason}`, 'CANCELLED')
  }

  /**
   * Verifica si el reembolso es instantáneo
   */
  public isInstant(): boolean {
    return this._refundType === 'instant'
  }

  /**
   * Verifica si el reembolso es parcial
   */
  public isPartialRefund(): boolean {
    return this._refundAmount.amountInCents < this._totalAmount.amountInCents
  }

  /**
   * Verifica si el reembolso es total
   */
  public isFullRefund(): boolean {
    return this._refundAmount.amountInCents === this._totalAmount.amountInCents
  }

  /**
   * Verifica si el reembolso está en estado final
   */
  public isInFinalState(): boolean {
    return this._refundStatus.isFinal()
  }

  /**
   * Verifica si el reembolso puede ser cancelado
   */
  public canBeCancelled(): boolean {
    return this._refundStatus.isPending() && !this._sentToGateway
  }

  /**
   * Verifica si el reembolso puede ser reintentado
   */
  public canBeRetried(): boolean {
    return this._refundStatus.isFailed() && this._errorCode !== 'CANCELLED'
  }

  /**
   * Calcula el porcentaje de reembolso respecto al total
   */
  public getRefundPercentage(): number {
    if (this._totalAmount.amountInCents === 0) {
      return 0
    }
    return Math.round((this._refundAmount.amountInCents / this._totalAmount.amountInCents) * 100)
  }

  /**
   * Obtiene el monto neto del reembolso (descontando comisiones)
   */
  public getNetRefundAmount(): Money {
    let netAmount = this._refundAmount.amountInCents
    
    if (this._processingFee) {
      netAmount -= this._processingFee
    }
    
    if (this._refundFee) {
      netAmount -= this._refundFee
    }

    return Money.create(Math.max(0, netAmount), this._refundAmount.currency.code)
  }

  /**
   * Obtiene el total de comisiones
   */
  public getTotalFees(): Money {
    const totalFees = (this._processingFee || 0) + (this._refundFee || 0)
    return Money.create(totalFees, this._refundAmount.currency.code)
  }

  /**
   * Verifica si la transición de estado es válida
   */
  private isValidStatusTransition(from: RefundStatus, to: RefundStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['manual_review', 'success', 'failure'],
      'manual_review': ['success', 'failure'],
      'success': [],
      'failure': ['pending'], // Permitir retry
    }

    return validTransitions[from.value]?.includes(to.value) ?? false
  }

  /**
   * Calcula el tiempo transcurrido desde la creación
   */
  public getProcessingDurationMs(): number {
    return Date.now() - this._createdAt.getTime()
  }

  /**
   * Verifica si el reembolso ha excedido el tiempo límite
   */
  public hasExceededTimeLimit(limitMs: number = 3600000): boolean { // 1 hora por defecto
    return this.getProcessingDurationMs() > limitMs && !this.isInFinalState()
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): RefundData {
    return {
      refund_id: this._refundId,
      payment_id: this._paymentId,
      merchant_id: this._merchantId,
      connector_transaction_id: this._connectorTransactionId,
      connector: this._connector,
      connector_refund_id: this._connectorRefundId,
      external_reference_id: this._externalReferenceId,
      refund_type: this._refundType,
      total_amount: this._totalAmount.amountInCents,
      currency: this._totalAmount.currency.code,
      refund_amount: this._refundAmount.amountInCents,
      refund_status: this._refundStatus.value,
      sent_to_gateway: this._sentToGateway,
      refund_reason: this._refundReason,
      failure_reason: this._failureReason,
      metadata: this._metadata,
      error_message: this._errorMessage,
      error_code: this._errorCode,
      created_at: this._createdAt.toISOString(),
      updated_at: this._updatedAt.toISOString(),
      description: this._description,
      attempt_id: this._attemptId,
      refund_arn: this._refundArn,
      charges: this._charges,
      profile_id: this._profileId,
      merchant_connector_id: this._merchantConnectorId,
      gateway_response_time_ms: this._gatewayResponseTimeMs,
      processing_fee: this._processingFee,
      refund_fee: this._refundFee,
    }
  }

  /**
   * Convierte a formato para Hyperswitch API
   */
  public toHyperswitchFormat() {
    return {
      refund_id: this._refundId,
      payment_id: this._paymentId,
      merchant_id: this._merchantId,
      connector_transaction_id: this._connectorTransactionId,
      connector: this._connector,
      connector_refund_id: this._connectorRefundId,
      external_reference_id: this._externalReferenceId,
      refund_type: this._refundType,
      total_amount: this._totalAmount.amountInCents,
      currency: this._totalAmount.currency.code,
      refund_amount: this._refundAmount.amountInCents,
      refund_status: this._refundStatus.value,
      sent_to_gateway: this._sentToGateway,
      refund_reason: this._refundReason,
      metadata: this._metadata,
      description: this._description,
      attempt_id: this._attemptId,
      refund_arn: this._refundArn,
      charges: this._charges,
      created_at: this._createdAt.toISOString(),
      updated_at: this._updatedAt.toISOString(),
    }
  }
}

export const RefundResponseSchema = RefundSchema