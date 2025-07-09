// src/application/use-cases/auth/LoginWithMerchantId.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: Login con Merchant ID - Autenticación usando credenciales de comerciante
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'

/**
 * Schema de validación para el request de login
 */
export const LoginRequestSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  api_key: z.string().min(1, 'API key is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  profile_id: z.string().optional(),
  remember_me: z.boolean().default(false),
  user_agent: z.string().optional(),
  ip_address: z.string().ip().optional(),
})

/**
 * Schema de validación para la respuesta de login
 */
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
  scope: z.string().optional(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  profile_id: z.string().optional(),
  profile_name: z.string().optional(),
  permissions: z.array(z.string()),
  environment: z.enum(['sandbox', 'production']),
  session_id: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  last_login: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Schema para información de sesión
 */
export const SessionInfoSchema = z.object({
  session_id: z.string(),
  merchant_id: z.string(),
  profile_id: z.string().optional(),
  user_id: z.string().optional(),
  environment: z.enum(['sandbox', 'production']),
  permissions: z.array(z.string()),
  created_at: z.date(),
  expires_at: z.date(),
  last_activity: z.date(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  is_active: z.boolean(),
  metadata: z.record(z.any()).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type SessionInfo = z.infer<typeof SessionInfoSchema>

/**
 * Resultado del use case
 */
export interface LoginResult {
  success: boolean
  data?: LoginResponse
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  session?: SessionInfo
}

/**
 * Errores específicos del login
 */
export class LoginError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'LoginError'
  }

  static invalidCredentials(details?: Record<string, any>): LoginError {
    return new LoginError(
      'INVALID_CREDENTIALS',
      'Invalid merchant ID or API key',
      401,
      details
    )
  }

  static merchantNotFound(merchantId: string): LoginError {
    return new LoginError(
      'MERCHANT_NOT_FOUND',
      `Merchant ${merchantId} not found`,
      404,
      { merchantId }
    )
  }

  static accountDisabled(merchantId: string): LoginError {
    return new LoginError(
      'ACCOUNT_DISABLED',
      `Merchant account ${merchantId} is disabled`,
      403,
      { merchantId }
    )
  }

  static rateLimitExceeded(retryAfter?: number): LoginError {
    return new LoginError(
      'RATE_LIMIT_EXCEEDED',
      'Too many login attempts. Please try again later.',
      429,
      { retryAfter }
    )
  }

  static invalidEnvironment(environment: string): LoginError {
    return new LoginError(
      'INVALID_ENVIRONMENT',
      `Invalid environment: ${environment}`,
      400,
      { environment }
    )
  }

  static serviceUnavailable(): LoginError {
    return new LoginError(
      'SERVICE_UNAVAILABLE',
      'Authentication service is temporarily unavailable',
      503
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: Login con Merchant ID
 * 
 * Autentica un comerciante usando su merchant_id y api_key,
 * creando una sesión válida y tokens de acceso.
 */
export class LoginWithMerchantId {
  private readonly CACHE_PREFIX = 'auth:session'
  private readonly RATE_LIMIT_PREFIX = 'auth:rate_limit'
  private readonly SESSION_TTL = 3600 // 1 hora
  private readonly RATE_LIMIT_WINDOW = 900 // 15 minutos
  private readonly MAX_ATTEMPTS = 5

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta el login con merchant ID
   */
  async execute(request: LoginRequest): Promise<LoginResult> {
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      environment: request.environment,
      component: 'LoginWithMerchantId',
    }

    this.logger.info('Starting login process', context)

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Verificar rate limiting
      await this.checkRateLimit(validatedRequest.merchant_id, validatedRequest.ip_address)
      
      // 3. Verificar si ya existe una sesión activa
      const existingSession = await this.getExistingSession(validatedRequest.merchant_id)
      if (existingSession && this.isSessionValid(existingSession)) {
        this.logger.info('Returning existing valid session', context)
        return this.buildSuccessResponse(existingSession, context)
      }
      
      // 4. Autenticar con Hyperswitch
      const authResponse = await this.authenticateWithHyperswitch(validatedRequest, context)
      
      // 5. Crear sesión
      const session = await this.createSession(authResponse, validatedRequest, context)
      
      // 6. Guardar en cache
      await this.cacheSession(session)
      
      // 7. Emitir evento de login exitoso
      await this.emitLoginSuccessEvent(session, context)
      
      // 8. Limpiar rate limit en login exitoso
      await this.clearRateLimit(validatedRequest.merchant_id)
      
      this.logger.info('Login completed successfully', context)
      
      return this.buildSuccessResponse(authResponse, context, session)

    } catch (error) {
      return this.handleError(error, request, context)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: LoginRequest): LoginRequest {
    try {
      return LoginRequestSchema.parse(request)
    } catch (error) {
      throw new LoginError(
        'INVALID_REQUEST',
        'Invalid login request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Verifica rate limiting por merchant
   */
  private async checkRateLimit(merchantId: string, ipAddress?: string): Promise<void> {
    const merchantKey = `${this.RATE_LIMIT_PREFIX}:merchant:${merchantId}`
    const ipKey = ipAddress ? `${this.RATE_LIMIT_PREFIX}:ip:${ipAddress}` : null

    const [merchantAttemptsRaw, ipAttemptsRaw] = await Promise.all([
      this.cache.get<number>(merchantKey),
      ipKey ? this.cache.get<number>(ipKey) : Promise.resolve(null)
    ])
    const merchantAttempts = merchantAttemptsRaw ?? 0
    const ipAttempts = ipAttemptsRaw ?? 0

    if (merchantAttempts >= this.MAX_ATTEMPTS || ipAttempts >= this.MAX_ATTEMPTS) {
      const retryAfter = await this.cache.getTtl(merchantKey) || this.RATE_LIMIT_WINDOW
      throw LoginError.rateLimitExceeded(retryAfter)
    }
  }

  /**
   * Incrementa contador de rate limiting
   */
  private async incrementRateLimit(merchantId: string, ipAddress?: string): Promise<void> {
    const merchantKey = `${this.RATE_LIMIT_PREFIX}:merchant:${merchantId}`
    const ipKey = ipAddress ? `${this.RATE_LIMIT_PREFIX}:ip:${ipAddress}` : null

    const operations = [
      this.cache.increment(merchantKey, 1, { ttl: this.RATE_LIMIT_WINDOW })
    ]

    if (ipKey) {
      operations.push(
        this.cache.increment(ipKey, 1, { ttl: this.RATE_LIMIT_WINDOW })
      )
    }

    await Promise.all(operations)
  }

  /**
   * Limpia rate limit tras login exitoso
   */
  private async clearRateLimit(merchantId: string): Promise<void> {
    const merchantKey = `${this.RATE_LIMIT_PREFIX}:merchant:${merchantId}`
    await this.cache.delete(merchantKey)
  }

  /**
   * Obtiene sesión existente del cache
   */
  private async getExistingSession(merchantId: string): Promise<LoginResponse | null> {
    const sessionKey = `${this.CACHE_PREFIX}:${merchantId}`
    return await this.cache.get<LoginResponse>(sessionKey)
  }

  /**
   * Verifica si una sesión es válida
   */
  private isSessionValid(session: LoginResponse): boolean {
    const expiresAt = new Date(session.expires_at)
    const now = new Date()
    const bufferMinutes = 5 // Renovar 5 minutos antes de expirar
    
    return expiresAt.getTime() > (now.getTime() + bufferMinutes * 60 * 1000)
  }

  /**
   * Autentica con la API de Hyperswitch
   */
  private async authenticateWithHyperswitch(
    request: LoginRequest,
    context: Record<string, any>
  ): Promise<LoginResponse> {
    try {
      const response = await this.httpClient.post<LoginResponse>(
        '/auth/login',
        {
          merchant_id: request.merchant_id,
          api_key: request.api_key,
          environment: request.environment,
          profile_id: request.profile_id,
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

      return LoginResponseSchema.parse(response.data)

    } catch (error: any) {
      if (error.status === 401) {
        throw LoginError.invalidCredentials({ merchantId: request.merchant_id })
      } else if (error.status === 404) {
        throw LoginError.merchantNotFound(request.merchant_id)
      } else if (error.status === 403) {
        throw LoginError.accountDisabled(request.merchant_id)
      } else if (error.status >= 500) {
        throw LoginError.serviceUnavailable()
      }
      
      throw new LoginError(
        'AUTHENTICATION_FAILED',
        'Authentication failed',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Crea información de sesión local
   */
  private async createSession(
    authResponse: LoginResponse,
    request: LoginRequest,
    context: Record<string, any>
  ): Promise<SessionInfo> {
    const now = new Date()
    const expiresAt = new Date(authResponse.expires_at)

    return SessionInfoSchema.parse({
      session_id: authResponse.session_id,
      merchant_id: authResponse.merchant_id,
      profile_id: authResponse.profile_id,
      environment: authResponse.environment,
      permissions: authResponse.permissions,
      created_at: now,
      expires_at: expiresAt,
      last_activity: now,
      ip_address: request.ip_address,
      user_agent: request.user_agent,
      is_active: true,
      metadata: {
        correlationId: context.correlationId,
        rememberMe: request.remember_me,
        loginMethod: 'merchant_id',
      }
    })
  }

  /**
   * Guarda sesión en cache
   */
  private async cacheSession(session: SessionInfo): Promise<void> {
    const sessionKey = `${this.CACHE_PREFIX}:${session.merchant_id}`
    const sessionTtl = Math.floor((session.expires_at.getTime() - Date.now()) / 1000)
    
    await this.cache.set(sessionKey, session, {
      ttl: Math.min(sessionTtl, this.SESSION_TTL),
      tags: ['auth', 'session', session.merchant_id],
    })
  }

  /**
   * Emite evento de login exitoso
   */
  private async emitLoginSuccessEvent(
    session: SessionInfo,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('auth.login_succeeded', {
        merchantId: session.merchant_id,
        profileId: session.profile_id,
        environment: session.environment,
        sessionId: session.session_id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        timestamp: session.created_at.toISOString(),
      }, {
        priority: 'normal',
        persistent: true,
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (error) {
      // Log error pero no fallar el login
      this.logger.warn('Failed to emit login success event', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    authResponse: LoginResponse,
    context: Record<string, any>,
    session?: SessionInfo
  ): LoginResult {
    return {
      success: true,
      data: authResponse,
      session: session || undefined,
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: LoginRequest,
    context: Record<string, any>
  ): Promise<LoginResult> {
    // Incrementar rate limit en errores de autenticación
    if (error instanceof LoginError && error.code === 'INVALID_CREDENTIALS') {
      await this.incrementRateLimit(request.merchant_id, request.ip_address)
    }

    // Emitir evento de login fallido
    await this.emitLoginFailedEvent(request, error, context)

    // Log del error
    this.logger.error('Login failed', error, {
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
   * Emite evento de login fallido
   */
  private async emitLoginFailedEvent(
    request: LoginRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('auth.login_failed', {
        merchantId: request.merchant_id,
        environment: request.environment,
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
      this.logger.warn('Failed to emit login failed event', {
        ...context,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      })
    }
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `login_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createLoginWithMerchantId(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): LoginWithMerchantId {
  return new LoginWithMerchantId(httpClient, cache, logger, eventBus)
}

export default LoginWithMerchantId