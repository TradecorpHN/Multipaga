// src/application/use-cases/auth/ValidateProfileAccess.ts
// ──────────────────────────────────────────────────────────────────────────────
// Use Case: Validate Profile Access - Validación de acceso a perfiles de merchant
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { IHttpClient } from '../../ports/IHttpClient'
import { ICache } from '../../ports/ICache'
import { ILogger } from '../../ports/ILogger'
import { IEventBus } from '../../ports/IEventBus'
import { SessionInfo } from './LoginWithMerchantId'

/**
 * Schema de validación para el request de validación
 */
export const ValidateProfileRequestSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  profile_id: z.string().min(1, 'Profile ID is required'),
  session_id: z.string().optional(),
  access_token: z.string().optional(),
  required_permissions: z.array(z.string()).optional(),
  resource_type: z.enum(['payment', 'refund', 'dispute', 'customer', 'analytics', 'settings']).optional(),
  operation: z.enum(['read', 'write', 'delete', 'admin']).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().optional(),
})

/**
 * Schema para información de perfil
 */
export const ProfileInfoSchema = z.object({
  profile_id: z.string(),
  profile_name: z.string(),
  merchant_id: z.string(),
  is_default: z.boolean(),
  status: z.enum(['active', 'inactive', 'suspended']),
  permissions: z.array(z.string()),
  access_level: z.enum(['read_only', 'standard', 'admin', 'owner']),
  allowed_operations: z.array(z.string()),
  restricted_resources: z.array(z.string()).optional(),
  business_details: z.object({
    business_country: z.string().optional(),
    business_label: z.string().optional(),
    business_type: z.string().optional(),
    industry: z.string().optional(),
  }).optional(),
  settings: z.object({
    payment_routing: z.boolean().optional(),
    fraud_detection: z.boolean().optional(),
    webhook_notifications: z.boolean().optional(),
    analytics_access: z.boolean().optional(),
  }).optional(),
  limits: z.object({
    daily_volume: z.number().optional(),
    monthly_volume: z.number().optional(),
    transaction_count: z.number().optional(),
    max_amount_per_transaction: z.number().optional(),
  }).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  last_accessed: z.string().optional(),
})

/**
 * Schema para resultado de validación
 */
export const ValidationResultSchema = z.object({
  is_valid: z.boolean(),
  access_granted: z.boolean(),
  profile_info: ProfileInfoSchema.optional(),
  permissions: z.array(z.string()),
  restrictions: z.array(z.string()).optional(),
  session_valid: z.boolean(),
  token_valid: z.boolean(),
  validation_errors: z.array(z.string()).optional(),
  expires_at: z.string().optional(),
  validated_at: z.string(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ValidateProfileRequest = z.infer<typeof ValidateProfileRequestSchema>
export type ProfileInfo = z.infer<typeof ProfileInfoSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>

/**
 * Resultado del use case
 */
export interface ValidateProfileResult {
  success: boolean
  data?: ValidationResult
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  profile?: ProfileInfo
  accessLevel?: 'denied' | 'limited' | 'full'
}

/**
 * Errores específicos de validación de perfil
 */
export class ProfileValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 403,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ProfileValidationError'
  }

  static profileNotFound(profileId: string): ProfileValidationError {
    return new ProfileValidationError(
      'PROFILE_NOT_FOUND',
      `Profile ${profileId} not found`,
      404,
      { profileId }
    )
  }

  static accessDenied(profileId: string, reason?: string): ProfileValidationError {
    return new ProfileValidationError(
      'ACCESS_DENIED',
      `Access denied to profile ${profileId}${reason ? `: ${reason}` : ''}`,
      403,
      { profileId, reason }
    )
  }

  static insufficientPermissions(
    required: string[],
    actual: string[]
  ): ProfileValidationError {
    return new ProfileValidationError(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions for this operation',
      403,
      { required, actual }
    )
  }

  static profileSuspended(profileId: string): ProfileValidationError {
    return new ProfileValidationError(
      'PROFILE_SUSPENDED',
      `Profile ${profileId} is suspended`,
      403,
      { profileId }
    )
  }

  static sessionExpired(): ProfileValidationError {
    return new ProfileValidationError(
      'SESSION_EXPIRED',
      'Session has expired',
      401
    )
  }

  static invalidToken(): ProfileValidationError {
    return new ProfileValidationError(
      'INVALID_TOKEN',
      'Invalid access token',
      401
    )
  }

  static operationNotAllowed(
    operation: string,
    resource: string
  ): ProfileValidationError {
    return new ProfileValidationError(
      'OPERATION_NOT_ALLOWED',
      `Operation '${operation}' not allowed on resource '${resource}'`,
      403,
      { operation, resource }
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Use Case: Validate Profile Access
 * 
 * Valida si un merchant tiene acceso a un perfil específico,
 * verificando permisos, estado de sesión y restricciones.
 */
export class ValidateProfileAccess {
  private readonly CACHE_PREFIX = 'auth:profile'
  private readonly SESSION_CACHE_PREFIX = 'auth:session'
  private readonly PROFILE_TTL = 300 // 5 minutos
  private readonly VALIDATION_TTL = 60 // 1 minuto

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly cache: ICache,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Ejecuta la validación de acceso al perfil
   */
  async execute(request: ValidateProfileRequest): Promise<ValidateProfileResult> {
    const correlationId = this.generateCorrelationId()
    const context = {
      correlationId,
      merchantId: request.merchant_id,
      profileId: request.profile_id,
      component: 'ValidateProfileAccess',
    }

    this.logger.info('Starting profile access validation', context)

    try {
      // 1. Validar request
      const validatedRequest = this.validateRequest(request)
      
      // 2. Verificar caché de validación previa
      const cachedValidation = await this.getCachedValidation(validatedRequest)
      if (cachedValidation && this.isCachedValidationValid(cachedValidation)) {
        this.logger.debug('Returning cached validation result', context)
        // No profileInfo available from cache, so pass undefined
        return this.buildSuccessResponse(cachedValidation, undefined)
      }
      
      // 3. Validar sesión si se proporciona
      let sessionValid = true
      if (validatedRequest.session_id || validatedRequest.access_token) {
        sessionValid = await this.validateSession(validatedRequest, context)
      }
      
      // 4. Obtener información del perfil
      const profileInfo = await this.getProfileInfo(validatedRequest, context)
      
      // 5. Validar acceso al perfil
      const accessValidation = this.validateProfileAccess(
        profileInfo,
        validatedRequest,
        sessionValid
      )
      
      // 6. Verificar permisos específicos si se requieren
      const permissionValidation = this.validatePermissions(
        profileInfo,
        validatedRequest
      )
      
      // 7. Construir resultado de validación
      const validationResult = this.buildValidationResult(
        profileInfo,
        accessValidation,
        permissionValidation,
        sessionValid,
        validatedRequest
      )
      
      // 8. Guardar en caché
      await this.cacheValidationResult(validatedRequest, validationResult)
      
      // 9. Registrar acceso
      await this.logProfileAccess(profileInfo, validatedRequest, validationResult, context)
      
      // 10. Emitir evento si es necesario
      await this.emitValidationEvent(profileInfo, validationResult, context)
      
      this.logger.info('Profile access validation completed', {
        ...context,
        accessGranted: validationResult.access_granted,
      })
      
      return this.buildSuccessResponse(validationResult, profileInfo)

    } catch (error) {
      return this.handleError(error, request, context)
    }
  }

  /**
   * Valida el request de entrada
   */
  private validateRequest(request: ValidateProfileRequest): ValidateProfileRequest {
    try {
      return ValidateProfileRequestSchema.parse(request)
    } catch (error) {
      throw new ProfileValidationError(
        'INVALID_REQUEST',
        'Invalid validation request format',
        400,
        { validationErrors: error }
      )
    }
  }

  /**
   * Obtiene validación previa del cache
   */
  private async getCachedValidation(
    request: ValidateProfileRequest
  ): Promise<ValidationResult | null> {
    const cacheKey = this.buildValidationCacheKey(request)
    return await this.cache.get<ValidationResult>(cacheKey)
  }

  /**
   * Verifica si la validación en cache sigue siendo válida
   */
  private isCachedValidationValid(validation: ValidationResult): boolean {
    if (!validation.expires_at) return false
    
    const expiresAt = typeof validation.expires_at === 'string' ? new Date(validation.expires_at) : null
    return !!expiresAt && expiresAt > new Date()
  }

  /**
   * Valida la sesión actual
   */
  private async validateSession(
    request: ValidateProfileRequest,
    context: Record<string, any>
  ): Promise<boolean> {
    try {
      // Verificar sesión en cache primero
      if (request.session_id) {
        const sessionKey = `${this.SESSION_CACHE_PREFIX}:${request.merchant_id}`
        const session = await this.cache.get<SessionInfo>(sessionKey)
        
        if (session && session.session_id === request.session_id) {
          if (session.expires_at > new Date() && session.is_active) {
            return true
          }
        }
      }

      // Si hay access token, validar con Hyperswitch
      if (request.access_token) {
        return await this.validateTokenWithHyperswitch(request, context)
      }

      return false

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.warn('Session validation failed', { ...context, error: errorMessage })
      return false
    }
  }

  /**
   * Valida token con Hyperswitch
   */
  private async validateTokenWithHyperswitch(
    request: ValidateProfileRequest,
    context: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/auth/validate', {
        headers: {
          'Authorization': `Bearer ${request.access_token}`,
          'X-Correlation-ID': context.correlationId,
        },
        timeout: 5000,
      })

      return response.status === 200

    } catch (error: any) {
      if (error.status === 401) {
        throw ProfileValidationError.invalidToken()
      }
      return false
    }
  }

  /**
   * Obtiene información del perfil
   */
  private async getProfileInfo(
    request: ValidateProfileRequest,
    context: Record<string, any>
  ): Promise<ProfileInfo> {
    // Verificar cache primero
    const cacheKey = `${this.CACHE_PREFIX}:${request.merchant_id}:${request.profile_id}`
    let profileInfo = await this.cache.get<ProfileInfo>(cacheKey)

    if (!profileInfo) {
      // Obtener de Hyperswitch
      profileInfo = await this.fetchProfileFromHyperswitch(request, context)
      
      // Guardar en cache
      await this.cache.set(cacheKey, profileInfo, {
        ttl: this.PROFILE_TTL,
        tags: ['profile', request.merchant_id, request.profile_id],
      })
    }

    return profileInfo
  }

  /**
   * Obtiene perfil desde Hyperswitch
   */
  private async fetchProfileFromHyperswitch(
    request: ValidateProfileRequest,
    context: Record<string, any>
  ): Promise<ProfileInfo> {
    try {
      const response = await this.httpClient.get<ProfileInfo>(
        `/merchants/${request.merchant_id}/business_profile/${request.profile_id}`,
        {
          headers: {
            'Authorization': `Bearer ${request.access_token}`,
            'X-Correlation-ID': context.correlationId,
          },
          timeout: 10000,
        }
      )

      return ProfileInfoSchema.parse(response.data)

    } catch (error: any) {
      if (error.status === 404) {
        throw ProfileValidationError.profileNotFound(request.profile_id)
      } else if (error.status === 403) {
        throw ProfileValidationError.accessDenied(request.profile_id, 'API access denied')
      }

      throw new ProfileValidationError(
        'PROFILE_FETCH_FAILED',
        'Failed to fetch profile information',
        error.status || 500,
        { originalError: error.message }
      )
    }
  }

  /**
   * Valida acceso general al perfil
   */
  private validateProfileAccess(
    profileInfo: ProfileInfo,
    request: ValidateProfileRequest,
    sessionValid: boolean
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Verificar que el perfil pertenece al merchant
    if (profileInfo.merchant_id !== request.merchant_id) {
      errors.push('Profile does not belong to merchant')
    }

    // Verificar estado del perfil
    if (profileInfo.status === 'suspended') {
      errors.push('Profile is suspended')
    } else if (profileInfo.status === 'inactive') {
      errors.push('Profile is inactive')
    }

    // Verificar sesión si es requerida
    if ((request.session_id || request.access_token) && !sessionValid) {
      errors.push('Invalid or expired session')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Valida permisos específicos
   */
  private validatePermissions(
    profileInfo: ProfileInfo,
    request: ValidateProfileRequest
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Verificar permisos requeridos
    if (request.required_permissions?.length) {
      const missingPermissions = request.required_permissions.filter(
        permission => !profileInfo.permissions.includes(permission)
      )
      
      if (missingPermissions.length > 0) {
        errors.push(`Missing permissions: ${missingPermissions.join(', ')}`)
      }
    }

    // Verificar operación específica
    if (request.operation && request.resource_type) {
      const operationKey = `${request.resource_type}:${request.operation}`
      
      if (!profileInfo.allowed_operations.includes(operationKey)) {
        errors.push(`Operation '${request.operation}' not allowed on '${request.resource_type}'`)
      }

      // Verificar recursos restringidos
      if (profileInfo.restricted_resources?.includes(request.resource_type)) {
        errors.push(`Access to '${request.resource_type}' is restricted`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Construye el resultado de validación
   */
  private buildValidationResult(
    profileInfo: ProfileInfo,
    accessValidation: { valid: boolean; errors: string[] },
    permissionValidation: { valid: boolean; errors: string[] },
    sessionValid: boolean,
    request: ValidateProfileRequest
  ): ValidationResult {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.VALIDATION_TTL * 1000)

    const allErrors = [...accessValidation.errors, ...permissionValidation.errors]
    const isValid = accessValidation.valid && permissionValidation.valid
    const accessGranted = isValid && sessionValid

    return {
      is_valid: isValid,
      access_granted: accessGranted,
      profile_info: profileInfo,
      permissions: profileInfo.permissions,
      restrictions: profileInfo.restricted_resources,
      session_valid: sessionValid,
      token_valid: !!request.access_token && sessionValid,
      validation_errors: allErrors.length > 0 ? allErrors : undefined,
      expires_at: expiresAt.toISOString(),
      validated_at: now.toISOString(),
    }
  }

  /**
   * Guarda resultado de validación en cache
   */
  private async cacheValidationResult(
    request: ValidateProfileRequest,
    result: ValidationResult
  ): Promise<void> {
    const cacheKey = this.buildValidationCacheKey(request)
    
    await this.cache.set(cacheKey, result, {
      ttl: this.VALIDATION_TTL,
      tags: ['validation', request.merchant_id, request.profile_id],
    })
  }

  /**
   * Registra el acceso al perfil
   */
  private async logProfileAccess(
    profileInfo: ProfileInfo,
    request: ValidateProfileRequest,
    result: ValidationResult,
    context: Record<string, any>
  ): Promise<void> {
    if (result.access_granted) {
      // Actualizar último acceso en cache
      const profileKey = `${this.CACHE_PREFIX}:${request.merchant_id}:${request.profile_id}`
      const updatedProfile = {
        ...profileInfo,
        last_accessed: new Date().toISOString(),
      }
      
      await this.cache.set(profileKey, updatedProfile, {
        ttl: this.PROFILE_TTL,
        tags: ['profile', request.merchant_id, request.profile_id],
      })
    }
  }

  /**
   * Emite evento de validación si es necesario
   */
  private async emitValidationEvent(
    profileInfo: ProfileInfo,
    result: ValidationResult,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const eventType = result.access_granted 
        ? 'auth.profile_access_granted' 
        : 'auth.profile_access_denied'

      await this.eventBus.publish(eventType, {
        merchantId: profileInfo.merchant_id,
        profileId: profileInfo.profile_id,
        accessLevel: profileInfo.access_level,
        permissions: profileInfo.permissions,
        validationErrors: result.validation_errors,
        sessionValid: result.session_valid,
        timestamp: result.validated_at,
      }, {
        priority: result.access_granted ? 'normal' : 'high',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (error) {
      this.logger.warn('Failed to emit validation event', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Construye respuesta exitosa
   */
  private buildSuccessResponse(
    validationResult: ValidationResult,
    profileInfo?: ProfileInfo
  ): ValidateProfileResult {
    const restrictions = validationResult.restrictions;
    const accessLevel: 'denied' | 'limited' | 'full' =
      !validationResult.access_granted ? 'denied' :
      (Array.isArray(restrictions) && restrictions.length > 0) ? 'limited' : 'full';

    return {
      success: true,
      data: validationResult,
      profile: profileInfo,
      accessLevel,
    }
  }

  /**
   * Maneja errores y construye respuesta de error
   */
  private async handleError(
    error: any,
    request: ValidateProfileRequest,
    context: Record<string, any>
  ): Promise<ValidateProfileResult> {
    // Emitir evento de error de validación
    await this.emitValidationErrorEvent(request, error, context)

    // Log del error
    this.logger.error('Profile validation failed', error, {
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
      },
      accessLevel: 'denied',
    }
  }

  /**
   * Emite evento de error de validación
   */
  private async emitValidationErrorEvent(
    request: ValidateProfileRequest,
    error: any,
    context: Record<string, any>
  ): Promise<void> {
    try {
      await this.eventBus.publish('auth.profile_validation_error', {
        merchantId: request.merchant_id,
        profileId: request.profile_id,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        ipAddress: request.ip_address,
        userAgent: request.user_agent,
        timestamp: new Date().toISOString(),
      }, {
        priority: 'high',
        headers: {
          'X-Correlation-ID': context.correlationId,
        }
      })
    } catch (eventError) {
      this.logger.warn('Failed to emit validation error event', {
        ...context,
        error: eventError instanceof Error ? eventError.message : String(eventError),
      })
    }
  }

  /**
   * Construye clave de cache para validación
   */
  private buildValidationCacheKey(request: ValidateProfileRequest): string {
    const parts = [
      'validation',
      request.merchant_id,
      request.profile_id,
      request.session_id || 'no_session',
      request.required_permissions?.join(',') || 'no_perms',
      request.operation || 'no_op',
      request.resource_type || 'no_resource',
    ]
    
    return parts.join(':')
  }

  /**
   * Genera ID de correlación único
   */
  private generateCorrelationId(): string {
    return `validate_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory para crear instancia del use case
 */
export function createValidateProfileAccess(
  httpClient: IHttpClient,
  cache: ICache,
  logger: ILogger,
  eventBus: IEventBus
): ValidateProfileAccess {
  return new ValidateProfileAccess(httpClient, cache, logger, eventBus)
}

export default ValidateProfileAccess