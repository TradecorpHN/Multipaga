// src/domain/entities/Dispute.ts
// ──────────────────────────────────────────────────────────────────────────────
// Dispute Entity - Entidad de dominio para disputas de pagos
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { DisputeStatus } from '../value-objects/DisputeStatus'
import { Money } from '../value-objects/Money'

// Schema de validación para evidencia de disputa
const DisputeEvidenceSchema = z.object({
  evidence_id: z.string().min(1),
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication', 
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other'
  ]),
  evidence_description: z.string().min(10).max(1000),
  customer_email: z.string().email().optional(),
  shipping_tracking_number: z.string().max(100).optional(),
  refund_amount: z.number().min(0).optional(),
  additional_notes: z.string().max(2000).optional(),
  evidence_files: z.array(z.string()),
  submitted_at: z.string().datetime(),
  status: z.enum(['pending', 'submitted', 'accepted', 'rejected']).default('pending'),
})

// Schema principal de la disputa
const DisputeSchema = z.object({
  dispute_id: z.string().min(1),
  payment_id: z.string().min(1),
  attempt_id: z.string().min(1),
  merchant_id: z.string().min(1),
  connector_dispute_id: z.string().min(1),
  connector: z.string().min(1),
  dispute_stage: z.enum(['pre_dispute', 'dispute', 'pre_arbitration']),
  dispute_status: z.string(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  dispute_reason: z.string().optional(),
  connector_reason: z.string().optional(),
  connector_reason_code: z.string().optional(),
  challenge_required_by: z.string().datetime().optional(),
  connector_created_at: z.string().datetime().optional(),
  connector_updated_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
  evidence: z.array(DisputeEvidenceSchema).default([]),
})

export type DisputeEvidence = z.infer<typeof DisputeEvidenceSchema>
export type DisputeStage = 'pre_dispute' | 'dispute' | 'pre_arbitration'
export type DisputeData = z.infer<typeof DisputeSchema>

/**
 * Dispute Entity - Representa una disputa de pago en el sistema
 * 
 * Esta entidad maneja todo el ciclo de vida de una disputa, desde su creación
 * hasta la resolución, incluyendo la gestión de evidencias y comunicaciones.
 */
export class Dispute {
  private constructor(
    private readonly _disputeId: string,
    private readonly _paymentId: string,
    private readonly _attemptId: string,
    private readonly _merchantId: string,
    private readonly _connectorDisputeId: string,
    private readonly _connector: string,
    private readonly _disputeStage: DisputeStage,
    private _disputeStatus: DisputeStatus,
    private readonly _amount: Money,
    private readonly _createdAt: Date,
    private _disputeReason?: string,
    private _connectorReason?: string,
    private _connectorReasonCode?: string,
    private _challengeRequiredBy?: Date,
    private _connectorCreatedAt?: Date,
    private _connectorUpdatedAt?: Date,
    private _profileId?: string,
    private _merchantConnectorId?: string,
    private _evidence: DisputeEvidence[] = []
  ) {}

  /**
   * Factory method para crear una nueva disputa
   */
  public static create(data: {
    dispute_id: string
    payment_id: string
    attempt_id: string
    merchant_id: string
    connector_dispute_id: string
    connector: string
    dispute_stage: DisputeStage
    dispute_status: string
    amount: number
    currency: string
    dispute_reason?: string
    connector_reason?: string
    connector_reason_code?: string
    challenge_required_by?: string
    profile_id?: string
    merchant_connector_id?: string
  }): Dispute {
    const amount = Money.create(data.amount, data.currency)
    const status = DisputeStatus.fromString(data.dispute_status)
    const now = new Date()

    return new Dispute(
      data.dispute_id,
      data.payment_id,
      data.attempt_id,
      data.merchant_id,
      data.connector_dispute_id,
      data.connector,
      data.dispute_stage,
      status,
      amount,
      now,
      data.dispute_reason,
      data.connector_reason,
      data.connector_reason_code,
      data.challenge_required_by ? new Date(data.challenge_required_by) : undefined,
      undefined,
      undefined,
      data.profile_id,
      data.merchant_connector_id
    )
  }

  /**
   * Factory method para reconstruir una disputa desde datos persistidos
   */
  public static fromData(data: DisputeData): Dispute {
    const validatedData = DisputeSchema.parse(data)
    const amount = Money.create(validatedData.amount, validatedData.currency)
    const status = DisputeStatus.fromString(validatedData.dispute_status)

    return new Dispute(
      validatedData.dispute_id,
      validatedData.payment_id,
      validatedData.attempt_id,
      validatedData.merchant_id,
      validatedData.connector_dispute_id,
      validatedData.connector,
      validatedData.dispute_stage,
      status,
      amount,
      new Date(validatedData.created_at),
      validatedData.dispute_reason,
      validatedData.connector_reason,
      validatedData.connector_reason_code,
      validatedData.challenge_required_by ? new Date(validatedData.challenge_required_by) : undefined,
      validatedData.connector_created_at ? new Date(validatedData.connector_created_at) : undefined,
      validatedData.connector_updated_at ? new Date(validatedData.connector_updated_at) : undefined,
      validatedData.profile_id,
      validatedData.merchant_connector_id,
      validatedData.evidence
    )
  }

  // Getters
  public get disputeId(): string {
    return this._disputeId
  }

  public get paymentId(): string {
    return this._paymentId
  }

  public get attemptId(): string {
    return this._attemptId
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get connectorDisputeId(): string {
    return this._connectorDisputeId
  }

  public get connector(): string {
    return this._connector
  }

  public get disputeStage(): DisputeStage {
    return this._disputeStage
  }

  public get disputeStatus(): DisputeStatus {
    return this._disputeStatus
  }

  public get amount(): Money {
    return this._amount
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get disputeReason(): string | undefined {
    return this._disputeReason
  }

  public get connectorReason(): string | undefined {
    return this._connectorReason
  }

  public get connectorReasonCode(): string | undefined {
    return this._connectorReasonCode
  }

  public get challengeRequiredBy(): Date | undefined {
    return this._challengeRequiredBy
  }

  public get connectorCreatedAt(): Date | undefined {
    return this._connectorCreatedAt
  }

  public get connectorUpdatedAt(): Date | undefined {
    return this._connectorUpdatedAt
  }

  public get profileId(): string | undefined {
    return this._profileId
  }

  public get merchantConnectorId(): string | undefined {
    return this._merchantConnectorId
  }

  public get evidence(): DisputeEvidence[] {
    return [...this._evidence]
  }

  // Business methods

  /**
   * Actualiza el estado de la disputa
   */
  public updateStatus(newStatus: string): void {
    const status = DisputeStatus.fromString(newStatus)
    
    // Validar transición de estado válida
    if (!this.isValidStatusTransition(this._disputeStatus, status)) {
      throw new Error(`Transición de estado inválida: ${this._disputeStatus.value} -> ${status.value}`)
    }

    this._disputeStatus = status
  }

  /**
   * Añade evidencia a la disputa
   */
  public addEvidence(evidence: Omit<DisputeEvidence, 'evidence_id' | 'submitted_at' | 'status'>): void {
    if (!this.canAddEvidence()) {
      throw new Error('No se puede añadir evidencia en el estado actual de la disputa')
    }

    const newEvidence: DisputeEvidence = {
      ...evidence,
      evidence_id: this.generateEvidenceId(),
      submitted_at: new Date().toISOString(),
      status: 'pending'
    }

    const validatedEvidence = DisputeEvidenceSchema.parse(newEvidence)
    this._evidence.push(validatedEvidence)
  }

  /**
   * Actualiza el estado de una evidencia
   */
  public updateEvidenceStatus(evidenceId: string, status: 'pending' | 'submitted' | 'accepted' | 'rejected'): void {
    const evidence = this._evidence.find(e => e.evidence_id === evidenceId)
    if (!evidence) {
      throw new Error(`Evidencia con ID ${evidenceId} no encontrada`)
    }

    evidence.status = status
  }

  /**
   * Envía todas las evidencias pendientes
   */
  public submitEvidence(): void {
    if (!this.canSubmitEvidence()) {
      throw new Error('No se puede enviar evidencia en el estado actual de la disputa')
    }

    const pendingEvidence = this._evidence.filter(e => e.status === 'pending')
    if (pendingEvidence.length === 0) {
      throw new Error('No hay evidencia pendiente para enviar')
    }

    pendingEvidence.forEach(evidence => {
      evidence.status = 'submitted'
    })

    this.updateStatus('dispute_challenged')
  }

  /**
   * Acepta la disputa
   */
  public accept(): void {
    if (!this.canAccept()) {
      throw new Error('La disputa no puede ser aceptada en su estado actual')
    }

    this.updateStatus('dispute_accepted')
  }

  /**
   * Verifica si se puede añadir evidencia
   */
  public canAddEvidence(): boolean {
    return this._disputeStatus.canAddEvidence()
  }

  /**
   * Verifica si se puede enviar evidencia
   */
  public canSubmitEvidence(): boolean {
    return this._disputeStatus.canSubmitEvidence() && 
           this._evidence.some(e => e.status === 'pending')
  }

  /**
   * Verifica si se puede aceptar la disputa
   */
  public canAccept(): boolean {
    return this._disputeStatus.canAccept()
  }

  /**
   * Verifica si la disputa está expirada
   */
  public isExpired(): boolean {
    if (!this._challengeRequiredBy) {
      return false
    }
    return new Date() > this._challengeRequiredBy
  }

  /**
   * Obtiene los días restantes para responder
   */
  public getDaysToRespond(): number | null {
    if (!this._challengeRequiredBy) {
      return null
    }

    const now = new Date()
    const diffTime = this._challengeRequiredBy.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  /**
   * Verifica si la transición de estado es válida
   */
  private isValidStatusTransition(from: DisputeStatus, to: DisputeStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'dispute_opened': ['dispute_challenged', 'dispute_accepted', 'dispute_expired'],
      'dispute_challenged': ['dispute_won', 'dispute_lost'],
      'dispute_accepted': [],
      'dispute_expired': [],
      'dispute_won': [],
      'dispute_lost': [],
      'dispute_cancelled': []
    }

    return validTransitions[from.value]?.includes(to.value) ?? false
  }

  /**
   * Genera un ID único para la evidencia
   */
  private generateEvidenceId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 15)
    return `evidence_${timestamp}_${random}`
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): DisputeData {
    return {
      dispute_id: this._disputeId,
      payment_id: this._paymentId,
      attempt_id: this._attemptId,
      merchant_id: this._merchantId,
      connector_dispute_id: this._connectorDisputeId,
      connector: this._connector,
      dispute_stage: this._disputeStage,
      dispute_status: this._disputeStatus.value,
      amount: this._amount.amountInCents,
      currency: this._amount.currency.code,
      dispute_reason: this._disputeReason,
      connector_reason: this._connectorReason,
      connector_reason_code: this._connectorReasonCode,
      challenge_required_by: this._challengeRequiredBy?.toISOString(),
      connector_created_at: this._connectorCreatedAt?.toISOString(),
      connector_updated_at: this._connectorUpdatedAt?.toISOString(),
      created_at: this._createdAt.toISOString(),
      profile_id: this._profileId,
      merchant_connector_id: this._merchantConnectorId,
      evidence: this._evidence,
    }
  }

  /**
   * Convierte a formato para Hyperswitch API
   */
  public toHyperswitchFormat() {
    return {
      dispute_id: this._disputeId,
      payment_id: this._paymentId,
      attempt_id: this._attemptId,
      merchant_id: this._merchantId,
      connector_dispute_id: this._connectorDisputeId,
      connector: this._connector,
      dispute_stage: this._disputeStage,
      dispute_status: this._disputeStatus.value,
      amount: this._amount.amountInCents.toString(),
      currency: this._amount.currency.code,
      dispute_reason: this._disputeReason,
      connector_reason: this._connectorReason,
      connector_reason_code: this._connectorReasonCode,
      challenge_required_by: this._challengeRequiredBy?.toISOString(),
      created_at: this._createdAt.toISOString(),
    }
  }
}

export const DisputeResponseSchema = DisputeSchema