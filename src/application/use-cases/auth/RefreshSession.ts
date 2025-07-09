// src/application/use-cases/auth/RefreshSession.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: Refresh Session - Renovación de tokens de acceso usando refresh token
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'
import { LoginResponse, SessionInfo, SessionInfoSchema } from './LoginWithMerchantId'

/**
 * Schema de validación para el request de refresh
 */
export const RefreshRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  session_id: z.string().optional(),
  force_refresh: z.boolean().default(false),
  extend_session: z.boolean().default(false),
  user_agent: z.string().optional(),
  ip_address: z.string().ip().optional(),
})

/**
 * Schema de validación para la respuesta de refresh
 */
export const RefreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
  scope: z.string().optional(),
  merchant_id: z.string(),
  profile_id: z.string().optional(),
  session_id: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  refreshed_at: z.string(),
  refresh_count: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Schema para información de refresh
 */
export const RefreshInfoSchema = z.object({
  session_id: z.string(),
  merchant_id: z.string(),
  previous_token: z.string(),
  new_token: z.string(),
  refreshed_at: z.date(),
  expires_at: z.date(),
  refresh_count: z.number(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  reason: z.enum(['expired', 'manual', 'forced', 'scheduled']),
  metadata: z.record(z.any()).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
export type RefreshInfo = z.infer<typeof RefreshInfoSchema>

/**
 * Resultado del use case
 */
export interface RefreshResult {
  success: boolean
  data?: RefreshResponse
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  session?: SessionInfo
  refreshInfo?: RefreshInfo
}

/**
 * Errores específicos del refresh
 */
export class RefreshError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'RefreshError'
  }

  static invalidRefreshToken(details?: Record<string, any>): RefreshError {
    return new RefreshError(
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token',
      401,
      details
    )
  }

  static sessionNotFound(sessionId?: string): RefreshError {
    return new RefreshError(
      'SESSION_NOT_FOUND',
      'Session not found or expired',
      404,
      { sessionId }
    )
  }

  static sessionRevoked(sessionId: string): RefreshError {
    return new RefreshError(
      'SESSION_REVOKED',
      'Session has been revoked',
      403,
      { sessionId }
    )
  }

  static tooManyRefreshes(maxRefreshes: number): RefreshError {
    return new RefreshError(
      'TOO_MANY_REFRESHES',
      `Maximum number of refreshes (${maxRefreshes}) exceeded`,
      429,
      { maxRefreshes }
    )
  }

  static merchantMismatch(expectedMerchant: string, actualMerchant: string): RefreshError {
    return new RefreshError(
      'MERCHANT_MISMATCH',
      'Merchant ID mismatch',
      403,
      { expectedMerchant, actualMerchant }
    )
  }

  static refreshTooSoon(nextRefreshTime: Date): RefreshError {
    return new RefreshError(
      'REFRESH_TOO_SOON',
      'Token refresh attempted too soon',
      429,
      { nextRefreshTime: nextRefreshTime.toISOString() }
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: Refresh Session
 * 
 * Renueva los tokens de acceso usando un refresh token válido,
 * manteniendo la sesión activa y actualizando la información en cache.
 */
export class RefreshSession {
  private readonly CACHE_PREFIX = 'auth:session'
  private readonly REFRESH_HISTORY_PREFIX = 'auth:refresh_history'
  private readonly REVOKED_TOKENS_PREFIX = 'auth:revoked'
  private readonly SESSION_TTL = 3600 // 1 hora
  private readonly MAX_REFRESHES_PER_SESSION = 100
  private readonly MIN_REFRESH_INTERVAL = 60 // 1 minuto entre refreshes

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta el refresh de sesión
   */
  async execute(request: RefreshRequest): Promise<RefreshResult> {
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      sessionId: request.session_id,
      component: 'RefreshSession',
    }

    this.logger.info('Starting session refresh', context)

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Verificar si el token está revocado
      await this.checkTokenRevocation(validatedRequest.refresh_token)
      
      // 3. Obtener sesión actual del cache
      const currentSession = await this.getCurrentSession(validatedRequest.merchant_id)
      
      // 4. Validar sesión y merchant
      this.validateSession(currentSession, validatedRequest)
      
  
      // 6. Realizar refresh con Hyperswitch
      const refreshResponse = await this.refreshWithHyperswitch(validatedRequest, context)
      
      // 7. Actualizar sesión
      const updatedSession = await this.updateSession(
        currentSession!,
        refreshResponse,
        validatedRequest,
        context
      )
      
      // 8. Guardar en cache
      await this.cacheUpdatedSession(updatedSession)
      
      // 9. Registrar en historial de refreshes
      const refreshInfo = await this.recordRefreshHistory(
        currentSession!,
        refreshResponse,
        validatedRequest,
        context
      )
      

      // 11. Emitir evento de refresh exitoso
      await this.emitRefreshSuccessEvent(updatedSession, refreshInfo, context)
      
      this.logger.info('Session refresh completed successfully', context)
      
      return this.buildSuccessResponse(refreshResponse, updatedSession, refreshInfo)

    } catch (error) {
      return this.handleError(error, request, context)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: RefreshRequest): RefreshRequest {
    try {
      return RefreshRequestSchema.parse(request)
    } catch (error) {
      throw new RefreshError(
        'INVALID_REQUEST',
        'Invalid refresh request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Verifica si el token está revocado
   */
  private async checkTokenRevocation(refreshToken: string): Promise<void> {
    const revokedKey = `${this.REVOKED_TOKENS_PREFIX}:${this.hashToken(refreshToken)}`
    const isRevoked = await this.cache.has(revokedKey)
    
    if (isRevoked) {
      throw RefreshError.sessionRevoked('token')
    }
  }

  /**
   * Obtiene la sesión actual del cache
   */
  private async getCurrentSession(merchantId: string): Promise<SessionInfo | null> {
    const sessionKey = `${this.CACHE_PREFIX}:${merchantId}`
    return await this.cache.get<SessionInfo>(sessionKey)
  }

  /**
   * Valida la sesión y el merchant
   */
  private validateSession(session: SessionInfo | null, request: RefreshRequest): void {
    if (!session) {
      throw RefreshError.sessionNotFound(request.session_id)
    }

    if (session.merchant_id !== request.merchant_id) {
      throw RefreshError.merchantMismatch(request.merchant_id, session.merchant_id)
    }

    if (!session.is_active) {
      throw RefreshError.sessionRevoked(session.session_id)
    }

    // Verificar si la sesión ha expirado completamente
    if (session.expires_at < new Date()) {
      throw RefreshError.sessionNotFound(session.session_id)
    }
  }

  /**
   * Verifica límites de refresh
   */
  private async checkRefreshLimits(
    session: SessionInfo,
    request: RefreshRequest
  ): Promise<void> {
    // Verificar número máximo de refreshes
    const refreshCountKey = `${this.REFRESH_HISTORY_PREFIX}:count:${session.session_id}`
    const refreshCount = await this.cache.get<number>(refreshCountKey) || 0
    
    if (refreshCount >= this.MAX_REFRESHES_PER_SESSION) {
      throw RefreshError.tooManyRefreshes(this.MAX_REFRESHES_PER_SESSION)
    }

    // Verificar intervalo mínimo entre refreshes
    if (!request.force_refresh) {
      const lastRefreshKey = `${this.REFRESH_HISTORY_PREFIX}:last:${session.session_id}`
      const lastRefresh = await this.cache.get<string>(lastRefreshKey)
      
      if (lastRefresh) {
        const lastRefreshTime = new Date(lastRefresh)
        const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime()
        
        if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL * 1000) {
          const nextRefreshTime = new Date(lastRefreshTime.getTime() + this.MIN_REFRESH_INTERVAL * 1000)
          throw RefreshError.refreshTooSoon(nextRefreshTime)
        }
      }
    }
  }

  /**
   * Realiza refresh con la API de Hyperswitch
   */
  private async refreshWithHyperswitch(
    request: RefreshRequest,
    context: Record<string, any>
  ): Promise<RefreshResponse> {
    try {
      const response = await this.httpClient.post<RefreshResponse>(
        '/auth/refresh',
        {
          refresh_token: request.refresh_token,
          merchant_id: request.merchant_id,
          extend_session: request.extend_session,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': context.correlationId,
            'User-Agent': request.user_agent || 'Multipaga-Client/1.0',
          }
        }
      )

      return RefreshResponseSchema.parse(response.data)

    } catch (error: any) {
      if (error.status === 401) {
        throw RefreshError.invalidRefreshToken({ originalError: error.message })
      } else if (error.status === 404) {
        throw RefreshError.sessionNotFound()
      } else if (error.status === 403) {
        throw RefreshError.sessionRevoked('api')
      } else if (error.status >= 500) {
        throw new RefreshError(
          'SERVICE_UNAVAILABLE',
          'Authentication service is temporarily unavailable',
          503,
          { originalError: error.message }
        )
      }
      
      throw new RefreshError(
        'REFRESH_FAILED',
        'Token refresh failed',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Actualiza la información de sesión
   */
  private async updateSession(
    currentSession: SessionInfo,
    refreshResponse: RefreshResponse,
    request: RefreshRequest,
    context: Record<string, any>
  ): Promise<SessionInfo> {
    const now = new Date()
    const expiresAt = new Date(refreshResponse.expires_at)

    return SessionInfoSchema.parse({
      ...currentSession,
      expires_at: expiresAt,
      last_activity: now,
      ip_address: request.ip_address || currentSession.ip_address,
      user_agent: request.user_agent || currentSession.user_agent,
      metadata: {
        ...currentSession.metadata,
        lastRefreshAt: now.toISOString(),
        refreshCorrelationId: context.correlationId,
        refreshCount: (currentSession.metadata?.refreshCount || 0) + 1,
      }
    })
  }

  /**
   * Guarda sesión actualizada en cache
   */
  private async cacheUpdatedSession(session: SessionInfo): Promise<void> {
    const sessionKey = `${this.CACHE_PREFIX}:${session.merchant_id}`
    const sessionTtl = Math.floor((session.expires_at.getTime() - Date.now()) / 1000)
    
    await this.cache.set(sessionKey, session, {
      ttl: Math.min(sessionTtl, this.SESSION_TTL),
      tags: ['auth', 'session', session.merchant_id],
    })
  }

  /**
   * Registra en historial de refreshes
   */
  private async recordRefreshHistory(
    currentSession: SessionInfo,
    refreshResponse: RefreshResponse,
    request: RefreshRequest,
    context: Record<string, any>
  ): Promise<RefreshInfo> {
    const now = new Date()
    const refreshCount = (currentSession.metadata?.refreshCount || 0) + 1

    const refreshInfo: RefreshInfo = {
      session_id: currentSession.session_id,
      merchant_id: currentSession.merchant_id,
      previous_token: 'hidden', // No guardar tokens completos por seguridad
      new_token: 'hidden',
      refreshed_at: now,
      expires_at: new Date(refreshResponse.expires_at),
      refresh_count: refreshCount,
      ip_address: request.ip_address,
      user_agent: request.user_agent,
      reason: request.force_refresh ? 'forced' : 'manual',
      metadata: {
        correlationId: context.correlationId,
        previousExpiry: currentSession.expires_at.toISOString(),
      }
    }

    // Guardar contador de refreshes
    const refreshCountKey = `${this.REFRESH_HISTORY_PREFIX}:count:${currentSession.session_id}`
    await this.cache.set(refreshCountKey, refreshCount, { ttl: 86400 }) // 24 horas

    // Guardar timestamp del último refresh
    const lastRefreshKey = `${this.REFRESH_HISTORY_PREFIX}:last:${currentSession.session_id}`
    await this.cache.set(lastRefreshKey, now.toISOString(), { ttl: 3600 }) // 1 hora

    return refreshInfo
  }

  /**
   * Revoca el token anterior
   */
  private async revokeOldToken(oldToken: string): Promise<void> {
    const revokedKey = `${this.REVOKED_TOKENS_PREFIX}:${this.hashToken(oldToken)}`
    await this.cache.set(revokedKey, true, { ttl: 86400 }) // Mantener 24 horas
  }

  /**
   * Emite evento de refresh exitoso
   */
  private async emitRefreshSuccessEvent(
    session: SessionInfo,
    refreshInfo: RefreshInfo,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('auth.session_refreshed', {
        sessionId: session.session_id,
        merchantId: session.merchant_id,
        profileId: session.profile_id,
        refreshCount: refreshInfo.refresh_count,
        refreshedAt: refreshInfo.refreshed_at.toISOString(),
        expiresAt: refreshInfo.expires_at.toISOString(),
        ipAddress: refreshInfo.ip_address,
        userAgent: refreshInfo.user_agent,
        reason: refreshInfo.reason,
      }, {
        priority: 'normal',
        persistent: true,
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (error) {
      this.logger.warn('Failed to emit refresh success event', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    refreshResponse: RefreshResponse,
    session: SessionInfo,
    refreshInfo: RefreshInfo
  ): RefreshResult {
    return {
      success: true,
      data: refreshResponse,
      session,
      refreshInfo,
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: RefreshRequest,
    context: Record<string, any>
  ): Promise<RefreshResult> {
    // Emitir evento de refresh fallido
    await this.emitRefreshFailedEvent(request, error, context)

    // Log del error
    this.logger.error('Session refresh failed', error, {
      ...context,
      errorCode: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
    })

    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details,
      }
    }
  }

  /**
   * Emite evento de refresh fallido
   */
  private async emitRefreshFailedEvent(
    request: RefreshRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('auth.session_refresh_failed', {
        merchantId: request.merchant_id,
        sessionId: request.session_id,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        ipAddress: request.ip_address,
        userAgent: request.user_agent,
        timestamp: new Date().toISOString(),
      }, {
        priority: 'high',
        persistent: true,
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (eventError) {
      this.logger.warn('Failed to emit refresh failed event', {
        ...context,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      })
    }
  }

  /**
   * Genera hash seguro del token para identificación
   */
  private hashToken(token: string): string {
    // En implementación real usar crypto.createHash('sha256')
    return Buffer.from(token).toString('base64').substring(0, 32)
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createRefreshSession(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): RefreshSession {
  return new RefreshSession(httpClient, cache, logger, eventBus)
}

export default RefreshSession