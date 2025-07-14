// src/infrastructure/repositories/HttpDisputeRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// Repositorio HTTP para gestión de disputas con Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { StructuredLogger } from '../logging/LoggerFactory'
import type { MemoryCache } from '../cache/MemoryCache'
import { CacheKeys } from '../cache/CacheKeys'
import { DisputeEndpoints, type DisputeListParams, type DisputeEvidenceData } from '../api/endpoints/DisputeEndpoints'

// Interfaces del dominio (basadas en Hyperswitch)
export interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'
  connector: string
  connector_status: string
  connector_dispute_id: string
  connector_reason?: string
  connector_reason_code?: string
  challenge_required_by?: string
  connector_created_at?: string
  connector_updated_at?: string
  created_at: string
  profile_id?: string
  merchant_connector_id?: string
}

export interface DisputeListResponse {
  disputes: DisputeResponse[]
  total_count: number
  has_more: boolean
}

export interface DisputeEvidenceFile {
  file_id: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  download_url?: string
}

export interface DisputeEvidenceResponse {
  dispute_id: string
  evidence_type: string
  evidence_description: string
  customer_email?: string
  shipping_tracking_number?: string
  refund_amount?: number
  additional_notes?: string
  evidence_files: DisputeEvidenceFile[]
  submitted_at: string
  status: 'pending' | 'submitted' | 'accepted' | 'rejected'
}

export interface DisputeAcceptRequest {
  dispute_id: string
  reason?: string
  metadata?: Record<string, any>
}

// Schemas de validación
const DisputeResponseSchema = z.object({
  dispute_id: z.string(),
  payment_id: z.string(),
  attempt_id: z.string(),
  amount: z.string(),
  currency: z.string(),
  dispute_stage: z.enum(['pre_dispute', 'dispute', 'pre_arbitration']),
  dispute_status: z.enum(['dispute_opened', 'dispute_expired', 'dispute_accepted', 'dispute_cancelled', 'dispute_challenged', 'dispute_won', 'dispute_lost']),
  connector: z.string(),
  connector_status: z.string(),
  connector_dispute_id: z.string(),
  connector_reason: z.string().optional(),
  connector_reason_code: z.string().optional(),
  challenge_required_by: z.string().optional(),
  connector_created_at: z.string().optional(),
  connector_updated_at: z.string().optional(),
  created_at: z.string(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
})

const DisputeEvidenceResponseSchema = z.object({
  dispute_id: z.string(),
  evidence_type: z.string(),
  evidence_description: z.string(),
  customer_email: z.string().optional(),
  shipping_tracking_number: z.string().optional(),
  refund_amount: z.number().optional(),
  additional_notes: z.string().optional(),
  evidence_files: z.array(z.object({
    file_id: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    file_type: z.string(),
    uploaded_at: z.string(),
    download_url: z.string().optional(),
  })),
  submitted_at: z.string(),
  status: z.enum(['pending', 'submitted', 'accepted', 'rejected']),
})

// Interfaz del repositorio
export interface IDisputeRepository {
  getById(disputeId: string): Promise<DisputeResponse | null>
  list(merchantId: string, profileId: string, params?: DisputeListParams): Promise<DisputeListResponse>
  submitEvidence(disputeId: string, evidence: DisputeEvidenceData): Promise<DisputeEvidenceResponse>
  getEvidence(disputeId: string): Promise<DisputeEvidenceResponse | null>
  acceptDispute(disputeId: string, request: DisputeAcceptRequest): Promise<DisputeResponse>
  uploadEvidenceFile(disputeId: string, file: File): Promise<DisputeEvidenceFile>
  downloadEvidenceFile(disputeId: string, fileId: string): Promise<Blob>
  getStatistics(merchantId: string, profileId: string, dateRange?: { from: string; to: string }): Promise<DisputeStatistics>
}

export interface DisputeStatistics {
  total_disputes: number
  disputes_by_status: Record<string, number>
  disputes_by_stage: Record<string, number>
  total_amount: number
  average_amount: number
  win_rate: number
  time_to_respond_avg: number
  disputes_by_connector: Record<string, number>
  monthly_trend: Array<{
    month: string
    count: number
    amount: number
  }>
}

// Configuración del repositorio
interface HttpDisputeRepositoryConfig {
  baseUrl: string
  timeout: number
  retries: number
  enableCache: boolean
  enableLogging: boolean
  maxFileSize: number
}

// Implementación del repositorio HTTP
export class HttpDisputeRepository implements IDisputeRepository {
  private config: HttpDisputeRepositoryConfig
  private logger: StructuredLogger
  private cache?: MemoryCache<any>

  constructor(
    config: HttpDisputeRepositoryConfig,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ) {
    this.config = config
    this.logger = logger.child({ repository: 'HttpDisputeRepository' })
    this.cache = cache
  }

  /**
   * Obtiene una disputa por ID
   */
  async getById(disputeId: string): Promise<DisputeResponse | null> {
    const startTime = Date.now()
    this.logger.debug('Getting dispute by ID', { disputeId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.dispute(disputeId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Dispute found in cache', { disputeId })
          return cached
        }
      }

      // Construir URL
      const url = DisputeEndpoints.getDispute.buildUrl(this.config.baseUrl, disputeId)

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeResponse>('GET', url)

      // Validar response
      const dispute = DisputeResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.dispute(disputeId)
        await this.cache.set(cacheKey.key, dispute, cacheKey.ttl)
      }

      this.logger.debug('Dispute retrieved successfully', {
        disputeId,
        status: dispute.dispute_status,
        stage: dispute.dispute_stage,
        duration: Date.now() - startTime,
      })

      return dispute

    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.debug('Dispute not found', { disputeId })
        return null
      }

      this.logger.error('Failed to get dispute', {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Lista disputas con filtros
   */
async list(
  merchantId: string, 
  profileId: string, 
  params: DisputeListParams = { offset: 0, limit: 20 }
): Promise<DisputeListResponse> {
  const startTime = Date.now()
  this.logger.debug('Listing disputes', { merchantId, profileId, params })


    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputesList({ merchantId, profileId, ...params })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Disputes list found in cache', { merchantId, profileId })
          return cached
        }
      }

      // Construir URL
      const url = DisputeEndpoints.listDisputes.buildUrl(this.config.baseUrl, params)

      // Hacer petición HTTP
    const response = await this.makeRequest<DisputeResponse[]>('GET', url, {
      headers: {
        'X-Merchant-Id': merchantId,
        'X-Profile-Id': profileId,
      },
    })

      // Validar response
      const disputes = z.array(DisputeResponseSchema).parse(response)

      const result: DisputeListResponse = {
        disputes,
        total_count: disputes.length,
        has_more: disputes.length === (params.limit || 20),
      }

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputesList({ merchantId, profileId, ...params })
        await this.cache.set(cacheKey.key, result, cacheKey.ttl)

        // Cachear disputas individuales
        for (const dispute of disputes) {
          const disputeCacheKey = CacheKeys.dispute(dispute.dispute_id)
          await this.cache.set(disputeCacheKey.key, dispute, disputeCacheKey.ttl)
        }
      }

      this.logger.debug('Disputes listed successfully', {
        merchantId,
        profileId,
        count: disputes.length,
        duration: Date.now() - startTime,
      })

      return result

    } catch (error) {
      this.logger.error('Failed to list disputes', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Envía evidencia para una disputa
   */
  async submitEvidence(disputeId: string, evidence: DisputeEvidenceData): Promise<DisputeEvidenceResponse> {
    const startTime = Date.now()
    this.logger.info('Submitting dispute evidence', { disputeId, evidenceType: evidence.evidence_type })

    try {
      // Validar evidencia
      const validatedEvidence = DisputeEndpoints.submitEvidence.validateBody(evidence)

      // Construir URL
      const url = DisputeEndpoints.submitEvidence.buildUrl(this.config.baseUrl, disputeId)

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeEvidenceResponse>('POST', url, {
        body: validatedEvidence,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const evidenceResponse = DisputeEvidenceResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateDisputeCache(disputeId)
      }

      this.logger.info('Dispute evidence submitted successfully', {
        disputeId,
        evidenceType: evidence.evidence_type,
        filesCount: evidence.evidence_files.length,
        duration: Date.now() - startTime,
      })

      return evidenceResponse

    } catch (error) {
      this.logger.error('Failed to submit dispute evidence', {
        disputeId,
        evidenceType: evidence.evidence_type,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene evidencia de una disputa
   */
  async getEvidence(disputeId: string): Promise<DisputeEvidenceResponse | null> {
    const startTime = Date.now()
    this.logger.debug('Getting dispute evidence', { disputeId })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputeEvidence(disputeId)
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Dispute evidence found in cache', { disputeId })
          return cached
        }
      }

      // Construir URL
      const url = DisputeEndpoints.getEvidence.buildUrl(this.config.baseUrl, disputeId)

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeEvidenceResponse>('GET', url)

      // Validar response
      const evidence = DisputeEvidenceResponseSchema.parse(response)

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputeEvidence(disputeId)
        await this.cache.set(cacheKey.key, evidence, cacheKey.ttl)
      }

      this.logger.debug('Dispute evidence retrieved successfully', {
        disputeId,
        evidenceType: evidence.evidence_type,
        status: evidence.status,
        duration: Date.now() - startTime,
      })

      return evidence

    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.debug('Dispute evidence not found', { disputeId })
        return null
      }

      this.logger.error('Failed to get dispute evidence', {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Acepta una disputa (no disputar)
   */
  async acceptDispute(disputeId: string, request: DisputeAcceptRequest): Promise<DisputeResponse> {
    const startTime = Date.now()
    this.logger.info('Accepting dispute', { disputeId })

    try {
      // Construir URL
      const url = DisputeEndpoints.acceptDispute.buildUrl(this.config.baseUrl, disputeId)

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeResponse>('PUT', url, {
        body: request,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Validar response
      const dispute = DisputeResponseSchema.parse(response)

      // Invalidar caché
      if (this.cache) {
        await this.invalidateDisputeCache(disputeId)
      }

      this.logger.info('Dispute accepted successfully', {
        disputeId,
        newStatus: dispute.dispute_status,
        duration: Date.now() - startTime,
      })

      return dispute

    } catch (error) {
      this.logger.error('Failed to accept dispute', {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Sube un archivo de evidencia
   */
  async uploadEvidenceFile(disputeId: string, file: File): Promise<DisputeEvidenceFile> {
    const startTime = Date.now()
    this.logger.info('Uploading evidence file', { 
      disputeId, 
      fileName: file.name, 
      fileSize: file.size 
    })

    try {
      // Validar tamaño del archivo
      if (file.size > this.config.maxFileSize) {
        throw new Error(`File size ${file.size} exceeds maximum ${this.config.maxFileSize}`)
      }

      // Preparar FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dispute_id', disputeId)

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeEvidenceFile>('POST', `/disputes/${disputeId}/evidence/files`, {
        body: formData,
        isFormData: true,
      })

      this.logger.info('Evidence file uploaded successfully', {
        disputeId,
        fileName: file.name,
        fileId: response.file_id,
        duration: Date.now() - startTime,
      })

      return response

    } catch (error) {
      this.logger.error('Failed to upload evidence file', {
        disputeId,
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Descarga un archivo de evidencia
   */
  async downloadEvidenceFile(disputeId: string, fileId: string): Promise<Blob> {
    const startTime = Date.now()
    this.logger.debug('Downloading evidence file', { disputeId, fileId })

    try {
      // Hacer petición HTTP
      const response = await fetch(`${this.config.baseUrl}/disputes/${disputeId}/evidence/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()

      this.logger.debug('Evidence file downloaded successfully', {
        disputeId,
        fileId,
        size: blob.size,
        duration: Date.now() - startTime,
      })

      return blob

    } catch (error) {
      this.logger.error('Failed to download evidence file', {
        disputeId,
        fileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Obtiene estadísticas de disputas
   */
  async getStatistics(
    merchantId: string, 
    profileId: string, 
    dateRange?: { from: string; to: string }
  ): Promise<DisputeStatistics> {
    const startTime = Date.now()
    this.logger.debug('Getting dispute statistics', { merchantId, profileId, dateRange })

    try {
      // Verificar caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputesStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        const cached = await this.cache.get(cacheKey.key)
        if (cached) {
          this.logger.debug('Dispute statistics found in cache', { merchantId, profileId })
          return cached
        }
      }

      // Construir query parameters
      const queryParams = new URLSearchParams()
      if (dateRange) {
        queryParams.append('from', dateRange.from)
        queryParams.append('to', dateRange.to)
      }

      // Hacer petición HTTP
      const response = await this.makeRequest<DisputeStatistics>('GET', `/disputes/statistics?${queryParams}`, {
        headers: {
          'X-Merchant-Id': merchantId,
          'X-Profile-Id': profileId,
        },
      })

      // Guardar en caché
      if (this.cache) {
        const cacheKey = CacheKeys.disputesStats({ 
          merchantId, 
          profileId, 
          dateRange: dateRange ? `${dateRange.from}_${dateRange.to}` : undefined 
        })
        await this.cache.set(cacheKey.key, response, cacheKey.ttl)
      }

      this.logger.debug('Dispute statistics retrieved successfully', {
        merchantId,
        profileId,
        totalDisputes: response.total_disputes,
        winRate: response.win_rate,
        duration: Date.now() - startTime,
      })

      return response

    } catch (error) {
      this.logger.error('Failed to get dispute statistics', {
        merchantId,
        profileId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      throw error
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────────────────────────────────────────────────────

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    urlOrEndpoint: string,
    options: {
      body?: any
      headers?: Record<string, string>
      timeout?: number
      isFormData?: boolean
    } = {}
  ): Promise<T> {
    const url = urlOrEndpoint.startsWith('http') ? urlOrEndpoint : `${this.config.baseUrl}${urlOrEndpoint}`
    const requestTimeout = options.timeout || this.config.timeout

    const requestInit: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    }

    if (options.body && (method === 'POST' || method === 'PUT')) {
      if (options.isFormData) {
        // Para FormData, no establecer Content-Type
        requestInit.body = options.body
      } else {
        requestInit.headers = {
          ...requestInit.headers,
          'Content-Type': 'application/json',
        }
        requestInit.body = JSON.stringify(options.body)
      }
    }

    // Crear timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), requestTimeout)
    })

    try {
      const response = await Promise.race([
        fetch(url, requestInit),
        timeoutPromise
      ])

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).status = response.status
        ;(error as any).statusCode = response.status
        ;(error as any).response = errorData
        throw error
      }

      // Si es DELETE, puede no tener contenido
      if (method === 'DELETE' && response.status === 204) {
        return {} as T
      }

      return await response.json() as T

    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        const timeoutError = new Error(`Request to ${urlOrEndpoint} timed out after ${requestTimeout}ms`)
        ;(timeoutError as any).code = 'TIMEOUT'
        throw timeoutError
      }
      throw error
    }
  }

  private isNotFoundError(error: any): boolean {
    return error?.status === 404 || error?.statusCode === 404
  }

  private async invalidateDisputeCache(disputeId?: string): Promise<void> {
    if (!this.cache) return

    try {
      // Invalidar disputa específica si se proporciona
      if (disputeId) {
        const disputeCacheKey = CacheKeys.dispute(disputeId)
        await this.cache.delete(disputeCacheKey.key)

        const evidenceCacheKey = CacheKeys.disputeEvidence(disputeId)
        await this.cache.delete(evidenceCacheKey.key)
      }

      // Invalidar listas y estadísticas usando patrón
      const listPattern = CacheKeys.pattern('disputes', 'list')
      const statsPattern = CacheKeys.pattern('disputes', 'stats')

      // En una implementación real, aquí se usaría cache.deletePattern()
      this.logger.debug('Dispute cache invalidated', { disputeId })

    } catch (error) {
      this.logger.warn('Failed to invalidate dispute cache', {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// Utilidades para disputas
export class DisputeUtils {
  /**
   * Determina si una disputa puede ser disputada
   */
  static canChallenge(dispute: DisputeResponse): boolean {
    return (
      dispute.dispute_status === 'dispute_opened' &&
      dispute.dispute_stage !== 'pre_arbitration' &&
      dispute.challenge_required_by !== undefined &&
      new Date(dispute.challenge_required_by) > new Date()
    )
  }

  /**
   * Determina si una disputa puede ser aceptada
   */
  static canAccept(dispute: DisputeResponse): boolean {
    return (
      dispute.dispute_status === 'dispute_opened' &&
      dispute.dispute_stage !== 'pre_arbitration'
    )
  }

  /**
   * Calcula días restantes para responder
   */
  static getDaysToRespond(dispute: DisputeResponse): number | null {
    if (!dispute.challenge_required_by) return null
    
    const deadline = new Date(dispute.challenge_required_by)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  /**
   * Determina la prioridad de una disputa
   */
  static getPriority(dispute: DisputeResponse): 'high' | 'medium' | 'low' {
    const amount = parseFloat(dispute.amount)
    const daysToRespond = DisputeUtils.getDaysToRespond(dispute)
    
    // Alta prioridad: montos altos o poco tiempo
    if (amount > 100000 || (daysToRespond !== null && daysToRespond <= 3)) {
      return 'high'
    }
    
    // Media prioridad: montos medios o tiempo medio
    if (amount > 50000 || (daysToRespond !== null && daysToRespond <= 7)) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Valida tipos de archivo de evidencia
   */
  static validateEvidenceFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const maxSize = 25 * 1024 * 1024 // 25MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum ${maxSize} bytes`)
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`)
    }

    if (file.name.length > 255) {
      errors.push('File name too long')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Formatea monto de disputa
   */
  static formatAmount(amount: string, currency: string = 'HNL'): string {
    const numAmount = parseFloat(amount)
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency,
    }).format(numAmount / 100) // Hyperswitch usa centavos
  }

  /**
   * Calcula tiempo transcurrido desde creación
   */
  static getTimeSinceCreated(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} días`
    } else if (hours > 0) {
      return `${hours} horas`
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${minutes} minutos`
    }
  }

  /**
   * Obtiene tipos de evidencia recomendados por motivo
   */
  static getRecommendedEvidenceTypes(reason?: string): string[] {
    const evidenceMap: Record<string, string[]> = {
      'fraudulent': ['transaction_receipt', 'customer_communication'],
      'duplicate': ['transaction_receipt'],
      'subscription_canceled': ['cancellation_policy', 'customer_communication'],
      'product_unacceptable': ['shipping_documentation', 'refund_policy'],
      'product_not_received': ['shipping_documentation'],
      'unrecognized': ['transaction_receipt', 'customer_communication'],
      'credit_not_processed': ['refund_policy', 'customer_communication']
    }
    
    return evidenceMap[reason || ''] || ['transaction_receipt', 'customer_communication']
  }
}

// Factory para crear HttpDisputeRepository
export class DisputeRepositoryFactory {
  /**
   * Crea repositorio configurado para diferentes entornos
   */
  static createForEnvironment(
    environment: 'development' | 'production' | 'test',
    baseUrl: string,
    logger: StructuredLogger,
    cache?: MemoryCache<any>
  ): HttpDisputeRepository {
    const envConfigs = {
      development: {
        baseUrl,
        timeout: 30000,
        retries: 3,
        enableCache: true,
        enableLogging: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB en desarrollo
      },
      production: {
        baseUrl,
        timeout: 20000,
        retries: 2,
        enableCache: true,
        enableLogging: true,
        maxFileSize: 25 * 1024 * 1024, // 25MB en producción
      },
      test: {
        baseUrl,
        timeout: 10000,
        retries: 1,
        enableCache: false,
        enableLogging: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB en tests
      },
    }

    const config = envConfigs[environment]
    return new HttpDisputeRepository(config, logger, cache)
  }
}

// Constantes
export const DISPUTE_CONSTANTS = {
  STATUSES: [
    'dispute_opened',
    'dispute_expired',
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ] as const,

  STAGES: [
    'pre_dispute',
    'dispute',
    'pre_arbitration'
  ] as const,

  EVIDENCE_TYPES: [
    'transaction_receipt',
    'customer_communication',
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other'
  ] as const,

  EVIDENCE_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ] as const,

  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_FILES_PER_EVIDENCE: 10,
  MAX_EVIDENCE_DESCRIPTION_LENGTH: 1000,
  MAX_ADDITIONAL_NOTES_LENGTH: 2000,

  DEFAULT_TIMEOUT: 30000, // 30 segundos
  DEFAULT_RETRIES: 3,

  CACHE_TTL: {
    DISPUTE: 1800, // 30 minutos
    LIST: 900, // 15 minutos
    EVIDENCE: 1800, // 30 minutos
    STATISTICS: 900, // 15 minutos
  } as const,

  PRIORITIES: ['low', 'medium', 'high'] as const,
} as const

export default HttpDisputeRepository