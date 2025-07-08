// src/domain/entities/ReconciliationRecord.ts
// ──────────────────────────────────────────────────────────────────────────────
// ReconciliationRecord Entity - Entidad de dominio para registros de reconciliación
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { Money } from '../value-objects/Money'
import { DateRange } from '../value-objects/DateRange'

// Schema de validación para discrepancia
const DiscrepancySchema = z.object({
  type: z.enum(['amount_mismatch', 'missing_payment', 'duplicate_payment', 'status_mismatch', 'fee_mismatch', 'currency_mismatch']),
  description: z.string().min(1).max(500),
  expected_value: z.string().optional(),
  actual_value: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  resolved: z.boolean().default(false),
  resolution_notes: z.string().max(1000).optional(),
  resolved_at: z.string().datetime().optional(),
  resolved_by: z.string().optional(),
})

// Schema de validación para datos del conector
const ConnectorDataSchema = z.object({
  connector_payment_id: z.string(),
  connector_reference_id: z.string().optional(),
  connector_status: z.string(),
  connector_amount: z.number(),
  connector_currency: z.string().length(3),
  connector_fee: z.number().optional(),
  connector_fee_currency: z.string().length(3).optional(),
  connector_settlement_date: z.string().datetime().optional(),
  connector_batch_id: z.string().optional(),
  raw_data: z.record(z.string(), z.any()).optional(),
})

// Schema de validación para datos de Hyperswitch
const HyperswitchDataSchema = z.object({
  payment_id: z.string(),
  attempt_id: z.string(),
  merchant_id: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  connector_transaction_id: z.string().optional(),
  created_at: z.string().datetime(),
  authorized_at: z.string().datetime().optional(),
  captured_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

// Schema de validación para métricas de reconciliación
const ReconciliationMetricsSchema = z.object({
  total_records_processed: z.number().min(0),
  matched_records: z.number().min(0),
  unmatched_records: z.number().min(0),
  discrepancies_found: z.number().min(0),
  discrepancies_resolved: z.number().min(0),
  total_amount_processed: z.number(),
  total_amount_matched: z.number(),
  total_amount_discrepant: z.number(),
  processing_time_ms: z.number().min(0),
  accuracy_percentage: z.number().min(0).max(100),
})

// Schema principal del registro de reconciliación
const ReconciliationRecordSchema = z.object({
  record_id: z.string().min(1),
  merchant_id: z.string().min(1),
  connector: z.string().min(1),
  reconciliation_batch_id: z.string().min(1),
  payment_id: z.string().optional(),
  connector_payment_id: z.string().optional(),
  record_type: z.enum(['payment', 'refund', 'dispute', 'fee', 'settlement']),
  status: z.enum(['pending', 'matched', 'unmatched', 'discrepant', 'manual_review', 'resolved']),
  match_score: z.number().min(0).max(100).optional(),
  hyperswitch_data: HyperswitchDataSchema.optional(),
  connector_data: ConnectorDataSchema.optional(),
  discrepancies: z.array(DiscrepancySchema).default([]),
  reconciliation_date: z.string().datetime(),
  settlement_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  processed_at: z.string().datetime().optional(),
  reviewed_by: z.string().optional(),
  review_notes: z.string().max(1000).optional(),
  auto_matched: z.boolean().default(false),
  manual_intervention_required: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type DiscrepancyType = 'amount_mismatch' | 'missing_payment' | 'duplicate_payment' | 'status_mismatch' | 'fee_mismatch' | 'currency_mismatch'
export type DiscrepancySeverity = 'low' | 'medium' | 'high' | 'critical'
export type ReconciliationStatus = 'pending' | 'matched' | 'unmatched' | 'discrepant' | 'manual_review' | 'resolved'
export type RecordType = 'payment' | 'refund' | 'dispute' | 'fee' | 'settlement'

export type Discrepancy = z.infer<typeof DiscrepancySchema>
export type ConnectorData = z.infer<typeof ConnectorDataSchema>
export type HyperswitchData = z.infer<typeof HyperswitchDataSchema>
export type ReconciliationMetrics = z.infer<typeof ReconciliationMetricsSchema>
export type ReconciliationRecordData = z.infer<typeof ReconciliationRecordSchema>

/**
 * ReconciliationRecord Entity - Representa un registro de reconciliación en el sistema
 * 
 * Esta entidad maneja la reconciliación entre datos de Hyperswitch y conectores,
 * identificando discrepancias y gestionando el proceso de resolución.
 */
export class ReconciliationRecord {
  private constructor(
    private readonly _recordId: string,
    private readonly _merchantId: string,
    private readonly _connector: string,
    private readonly _reconciliationBatchId: string,
    private readonly _recordType: RecordType,
    private readonly _reconciliationDate: Date,
    private readonly _createdAt: Date,
    private _status: ReconciliationStatus,
    private _updatedAt: Date,
    private _paymentId?: string,
    private _connectorPaymentId?: string,
    private _matchScore?: number,
    private _hyperswitchData?: HyperswitchData,
    private _connectorData?: ConnectorData,
    private _discrepancies: Discrepancy[] = [],
    private _settlementDate?: Date,
    private _processedAt?: Date,
    private _reviewedBy?: string,
    private _reviewNotes?: string,
    private _autoMatched: boolean = false,
    private _manualInterventionRequired: boolean = false,
    private _metadata?: Record<string, any>
  ) {}

  /**
   * Factory method para crear un nuevo registro de reconciliación
   */
  public static create(data: {
    record_id: string
    merchant_id: string
    connector: string
    reconciliation_batch_id: string
    record_type: RecordType
    reconciliation_date: Date
    payment_id?: string
    connector_payment_id?: string
    hyperswitch_data?: HyperswitchData
    connector_data?: ConnectorData
    metadata?: Record<string, any>
  }): ReconciliationRecord {
    const now = new Date()

    return new ReconciliationRecord(
      data.record_id,
      data.merchant_id,
      data.connector,
      data.reconciliation_batch_id,
      data.record_type,
      data.reconciliation_date,
      now,
      'pending',
      now,
      data.payment_id,
      data.connector_payment_id,
      undefined,
      data.hyperswitch_data,
      data.connector_data,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      false,
      data.metadata
    )
  }

  /**
   * Factory method para reconstruir un registro desde datos persistidos
   */
  public static fromData(data: ReconciliationRecordData): ReconciliationRecord {
    const validatedData = ReconciliationRecordSchema.parse(data)

    return new ReconciliationRecord(
      validatedData.record_id,
      validatedData.merchant_id,
      validatedData.connector,
      validatedData.reconciliation_batch_id,
      validatedData.record_type,
      new Date(validatedData.reconciliation_date),
      new Date(validatedData.created_at),
      validatedData.status,
      new Date(validatedData.updated_at),
      validatedData.payment_id,
      validatedData.connector_payment_id,
      validatedData.match_score,
      validatedData.hyperswitch_data,
      validatedData.connector_data,
      validatedData.discrepancies,
      validatedData.settlement_date ? new Date(validatedData.settlement_date) : undefined,
      validatedData.processed_at ? new Date(validatedData.processed_at) : undefined,
      validatedData.reviewed_by,
      validatedData.review_notes,
      validatedData.auto_matched,
      validatedData.manual_intervention_required,
      validatedData.metadata
    )
  }

  // Getters
  public get recordId(): string {
    return this._recordId
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get connector(): string {
    return this._connector
  }

  public get reconciliationBatchId(): string {
    return this._reconciliationBatchId
  }

  public get recordType(): RecordType {
    return this._recordType
  }

  public get status(): ReconciliationStatus {
    return this._status
  }

  public get paymentId(): string | undefined {
    return this._paymentId
  }

  public get connectorPaymentId(): string | undefined {
    return this._connectorPaymentId
  }

  public get matchScore(): number | undefined {
    return this._matchScore
  }

  public get hyperswitchData(): HyperswitchData | undefined {
    return this._hyperswitchData
  }

  public get connectorData(): ConnectorData | undefined {
    return this._connectorData
  }

  public get discrepancies(): Discrepancy[] {
    return [...this._discrepancies]
  }

  public get reconciliationDate(): Date {
    return this._reconciliationDate
  }

  public get settlementDate(): Date | undefined {
    return this._settlementDate
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get updatedAt(): Date {
    return this._updatedAt
  }

  public get processedAt(): Date | undefined {
    return this._processedAt
  }

  public get reviewedBy(): string | undefined {
    return this._reviewedBy
  }

  public get reviewNotes(): string | undefined {
    return this._reviewNotes
  }

  public get autoMatched(): boolean {
    return this._autoMatched
  }

  public get manualInterventionRequired(): boolean {
    return this._manualInterventionRequired
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  // Business methods

  /**
   * Procesa la reconciliación automática
   */
  public processAutoReconciliation(): void {
    if (this._status !== 'pending') {
      throw new Error('Solo se pueden procesar registros pendientes')
    }

    if (!this._hyperswitchData || !this._connectorData) {
      this._status = 'unmatched'
      this._manualInterventionRequired = true
    } else {
      const score = this.calculateMatchScore()
      this._matchScore = score

      if (score >= 95) {
        this._status = 'matched'
        this._autoMatched = true
      } else if (score >= 80) {
        this._status = 'discrepant'
        this.identifyDiscrepancies()
      } else {
        this._status = 'manual_review'
        this._manualInterventionRequired = true
      }
    }

    this._processedAt = new Date()
    this._updatedAt = new Date()
  }

  /**
   * Agrega una discrepancia al registro
   */
  public addDiscrepancy(discrepancy: Omit<Discrepancy, 'resolved' | 'resolved_at' | 'resolved_by'>): void {
    const newDiscrepancy: Discrepancy = {
      ...discrepancy,
      resolved: false,
    }

    const validated = DiscrepancySchema.parse(newDiscrepancy)
    this._discrepancies.push(validated)

    if (this._status === 'matched') {
      this._status = 'discrepant'
    }

    this._updatedAt = new Date()
  }

  /**
   * Resuelve una discrepancia
   */
  public resolveDiscrepancy(
    discrepancyIndex: number,
    resolutionNotes: string,
    resolvedBy: string
  ): void {
    if (discrepancyIndex < 0 || discrepancyIndex >= this._discrepancies.length) {
      throw new Error('Índice de discrepancia inválido')
    }

    const discrepancy = this._discrepancies[discrepancyIndex]
    discrepancy.resolved = true
    discrepancy.resolution_notes = resolutionNotes
    discrepancy.resolved_at = new Date().toISOString()
    discrepancy.resolved_by = resolvedBy

    // Verificar si todas las discrepancias están resueltas
    const allResolved = this._discrepancies.every(d => d.resolved)
    if (allResolved && this._status === 'discrepant') {
      this._status = 'resolved'
    }

    this._updatedAt = new Date()
  }

  /**
   * Marca el registro para revisión manual
   */
  public markForManualReview(reviewNotes?: string): void {
    this._status = 'manual_review'
    this._manualInterventionRequired = true
    this._reviewNotes = reviewNotes
    this._updatedAt = new Date()
  }

  /**
   * Completa la revisión manual
   */
  public completeManualReview(
    reviewedBy: string,
    newStatus: 'matched' | 'resolved',
    reviewNotes?: string
  ): void {
    if (this._status !== 'manual_review') {
      throw new Error('El registro no está en revisión manual')
    }

    this._status = newStatus
    this._reviewedBy = reviewedBy
    this._reviewNotes = reviewNotes
    this._manualInterventionRequired = false
    this._updatedAt = new Date()
  }

  /**
   * Establece la fecha de liquidación
   */
  public setSettlementDate(settlementDate: Date): void {
    this._settlementDate = settlementDate
    this._updatedAt = new Date()
  }

  /**
   * Actualiza los datos de Hyperswitch
   */
  public updateHyperswitchData(data: HyperswitchData): void {
    const validated = HyperswitchDataSchema.parse(data)
    this._hyperswitchData = validated
    
    // Recalcular score si también hay datos del conector
    if (this._connectorData) {
      this._matchScore = this.calculateMatchScore()
    }
    
    this._updatedAt = new Date()
  }

  /**
   * Actualiza los datos del conector
   */
  public updateConnectorData(data: ConnectorData): void {
    const validated = ConnectorDataSchema.parse(data)
    this._connectorData = validated
    
    // Recalcular score si también hay datos de Hyperswitch
    if (this._hyperswitchData) {
      this._matchScore = this.calculateMatchScore()
    }
    
    this._updatedAt = new Date()
  }

  /**
   * Calcula el score de coincidencia entre datos
   */
  private calculateMatchScore(): number {
    if (!this._hyperswitchData || !this._connectorData) {
      return 0
    }

    let score = 0
    let factors = 0

    // Comparar amounts (peso: 40%)
    if (this._hyperswitchData.amount === this._connectorData.connector_amount) {
      score += 40
    }
    factors += 40

    // Comparar currencies (peso: 20%)
    if (this._hyperswitchData.currency === this._connectorData.connector_currency) {
      score += 20
    }
    factors += 20

    // Comparar payment IDs (peso: 30%)
    if (this._hyperswitchData.payment_id === this._paymentId || 
        this._hyperswitchData.connector_transaction_id === this._connectorData.connector_payment_id) {
      score += 30
    }
    factors += 30

    // Comparar fechas (peso: 10%)
    if (this._hyperswitchData.created_at && this._connectorData.connector_settlement_date) {
      const hyperswitchDate = new Date(this._hyperswitchData.created_at)
      const connectorDate = new Date(this._connectorData.connector_settlement_date)
      const diffDays = Math.abs(hyperswitchDate.getTime() - connectorDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (diffDays <= 1) score += 10
      else if (diffDays <= 3) score += 5
    }
    factors += 10

    return Math.round((score / factors) * 100)
  }

  /**
   * Identifica automáticamente las discrepancias
   */
  private identifyDiscrepancies(): void {
    if (!this._hyperswitchData || !this._connectorData) {
      return
    }

    // Discrepancia de monto
    if (this._hyperswitchData.amount !== this._connectorData.connector_amount) {
      this.addDiscrepancy({
        type: 'amount_mismatch',
        description: 'Los montos no coinciden entre Hyperswitch y el conector',
        expected_value: this._hyperswitchData.amount.toString(),
        actual_value: this._connectorData.connector_amount.toString(),
        severity: 'high',
      })
    }

    // Discrepancia de moneda
    if (this._hyperswitchData.currency !== this._connectorData.connector_currency) {
      this.addDiscrepancy({
        type: 'currency_mismatch',
        description: 'Las monedas no coinciden entre Hyperswitch y el conector',
        expected_value: this._hyperswitchData.currency,
        actual_value: this._connectorData.connector_currency,
        severity: 'critical',
      })
    }

    // Discrepancia de estado (simplificado)
    const statusMatch = this.mapHyperswitchStatusToConnector(this._hyperswitchData.status)
    if (statusMatch !== this._connectorData.connector_status) {
      this.addDiscrepancy({
        type: 'status_mismatch',
        description: 'Los estados no coinciden entre Hyperswitch y el conector',
        expected_value: this._hyperswitchData.status,
        actual_value: this._connectorData.connector_status,
        severity: 'medium',
      })
    }
  }

  /**
   * Mapea estados de Hyperswitch a estados de conector
   */
  private mapHyperswitchStatusToConnector(hyperswitchStatus: string): string {
    const statusMap: Record<string, string> = {
      'succeeded': 'completed',
      'failed': 'failed',
      'processing': 'pending',
      'requires_capture': 'authorized',
    }

    return statusMap[hyperswitchStatus] || hyperswitchStatus
  }

  /**
   * Verifica si el registro tiene discrepancias críticas
   */
  public hasCriticalDiscrepancies(): boolean {
    return this._discrepancies.some(d => d.severity === 'critical' && !d.resolved)
  }

  /**
   * Obtiene el número de discrepancias no resueltas
   */
  public getUnresolvedDiscrepanciesCount(): number {
    return this._discrepancies.filter(d => !d.resolved).length
  }

  /**
   * Verifica si el registro está completamente reconciliado
   */
  public isFullyReconciled(): boolean {
    return this._status === 'matched' || 
           (this._status === 'resolved' && this._discrepancies.every(d => d.resolved))
  }

  /**
   * Obtiene el monto total según los datos de Hyperswitch
   */
  public getHyperswitchAmount(): Money | null {
    if (!this._hyperswitchData) {
      return null
    }
    return Money.create(this._hyperswitchData.amount, this._hyperswitchData.currency)
  }

  /**
   * Obtiene el monto total según los datos del conector
   */
  public getConnectorAmount(): Money | null {
    if (!this._connectorData) {
      return null
    }
    return Money.create(this._connectorData.connector_amount, this._connectorData.connector_currency)
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): ReconciliationRecordData {
    return {
      record_id: this._recordId,
      merchant_id: this._merchantId,
      connector: this._connector,
      reconciliation_batch_id: this._reconciliationBatchId,
      payment_id: this._paymentId,
      connector_payment_id: this._connectorPaymentId,
      record_type: this._recordType,
      status: this._status,
      match_score: this._matchScore,
      hyperswitch_data: this._hyperswitchData,
      connector_data: this._connectorData,
      discrepancies: this._discrepancies,
      reconciliation_date: this._reconciliationDate.toISOString(),
      settlement_date: this._settlementDate?.toISOString(),
      created_at: this._createdAt.toISOString(),
      updated_at: this._updatedAt.toISOString(),
      processed_at: this._processedAt?.toISOString(),
      reviewed_by: this._reviewedBy,
      review_notes: this._reviewNotes,
      auto_matched: this._autoMatched,
      manual_intervention_required: this._manualInterventionRequired,
      metadata: this._metadata,
    }
  }
}