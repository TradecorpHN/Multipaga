// src/infrastructure/api/interceptors/AuthInterceptor.ts
// ──────────────────────────────────────────────────────────────────────────────
// Interceptor de autenticación para requests hacia Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Esquemas de validación
const AuthContextSchema = z.object({
  merchantId: z.string().min(1),
  profileId: z.string().min(1),
  apiKey: z.string().min(1),
  publishableKey: z.string().optional(),
})

const AuthHeadersSchema = z.object({
  'api-key': z.string(),
  'Authorization': z.string().optional(),
  'X-Merchant-Id': z.string().optional(),
  'X-Profile-Id': z.string().optional(),
  'X-Publishable-Key': z.string().optional(),
})

// Tipos exportados
export type AuthContext = z.infer<typeof AuthContextSchema>
export type AuthHeaders = z.infer<typeof AuthHeadersSchema>

// Interfaz para configuración del interceptor
export interface AuthInterceptorConfig {
  apiKey?: string
  merchantId?: string
  profileId?: string
  publishableKey?: string
  tokenRefreshCallback?: () => Promise<string>
  unauthorizedCallback?: (error: AuthError) => void
  debug?: boolean
}

// Tipos de error de autenticación
export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'EXPIRED_TOKEN' | 'INSUFFICIENT_PERMISSIONS' | 'INVALID_CONTEXT',
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// Interceptor de autenticación
export class AuthInterceptor {
  private authContext: AuthContext | null = null
  private config: AuthInterceptorConfig
  private tokenRefreshPromise: Promise<string> | null = null

  constructor(config: AuthInterceptorConfig = {}) {
    this.config = {
      debug: false,
      ...config
    }

    // Inicializar contexto si se proporciona configuración
    if (config.apiKey && config.merchantId && config.profileId) {
      this.setAuthContext({
        apiKey: config.apiKey,
        merchantId: config.merchantId,
        profileId: config.profileId,
        publishableKey: config.publishableKey,
      })
    }
  }

  /**
   * Establece el contexto de autenticación
   */
  setAuthContext(context: Partial<AuthContext>): void {
    try {
      // Validar contexto mínimo requerido
      if (!context.apiKey || !context.merchantId || !context.profileId) {
        throw new AuthError(
          'Contexto de autenticación incompleto: se requiere apiKey, merchantId y profileId',
          'INVALID_CONTEXT'
        )
      }

      this.authContext = AuthContextSchema.parse(context)

      if (this.config.debug) {
        console.log('[AuthInterceptor] Contexto de autenticación establecido:', {
          merchantId: this.authContext.merchantId,
          profileId: this.authContext.profileId,
          hasApiKey: !!this.authContext.apiKey,
          hasPublishableKey: !!this.authContext.publishableKey,
        })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AuthError(
          `Contexto de autenticación inválido: ${error.errors.map(e => e.message).join(', ')}`,
          'INVALID_CONTEXT'
        )
      }
      throw error
    }
  }

  /**
   * Obtiene el contexto de autenticación actual
   */
  getAuthContext(): AuthContext | null {
    return this.authContext
  }

  /**
   * Limpia el contexto de autenticación
   */
  clearAuthContext(): void {
    this.authContext = null
    this.tokenRefreshPromise = null

    if (this.config.debug) {
      console.log('[AuthInterceptor] Contexto de autenticación limpiado')
    }
  }

  /**
   * Intercepta request y añade headers de autenticación
   */
  async interceptRequest(request: RequestInit): Promise<RequestInit> {
    try {
      const headers = await this.buildAuthHeaders(request.headers)
      
      const interceptedRequest: RequestInit = {
        ...request,
        headers: {
          ...request.headers,
          ...headers,
        },
      }

      if (this.config.debug) {
        console.log('[AuthInterceptor] Request interceptado:', {
          url: (request as any).url,
          method: request.method || 'GET',
          hasAuthHeaders: !!(headers['api-key']),
          merchantId: headers['X-Merchant-Id'],
          profileId: headers['X-Profile-Id'],
        })
      }

      return interceptedRequest
    } catch (error) {
      if (this.config.debug) {
        console.error('[AuthInterceptor] Error interceptando request:', error)
      }
      throw error
    }
  }

  /**
   * Intercepta response y maneja errores de autenticación
   */
  async interceptResponse(response: Response, originalRequest: RequestInit): Promise<Response> {
    try {
      // Verificar si es un error de autenticación
      if (response.status === 401) {
        const errorData = await this.safeParseErrorResponse(response.clone())
        
        if (this.config.debug) {
          console.warn('[AuthInterceptor] Error 401 detectado:', errorData)
        }

        // Intentar refresh del token si está configurado
        if (this.config.tokenRefreshCallback && !this.tokenRefreshPromise) {
          return await this.handleTokenRefresh(originalRequest)
        }

        // Notificar error de autenticación
        const authError = new AuthError(
          errorData.error_message || 'No autorizado',
          this.determineErrorCode(errorData),
          401
        )

        if (this.config.unauthorizedCallback) {
          this.config.unauthorizedCallback(authError)
        }

        throw authError
      }

      // Verificar otros errores relacionados con autenticación
      if (response.status === 403) {
        const errorData = await this.safeParseErrorResponse(response.clone())
        
        const authError = new AuthError(
          errorData.error_message || 'Permisos insuficientes',
          'INSUFFICIENT_PERMISSIONS',
          403
        )

        if (this.config.unauthorizedCallback) {
          this.config.unauthorizedCallback(authError)
        }

        throw authError
      }

      return response
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      if (this.config.debug) {
        console.error('[AuthInterceptor] Error interceptando response:', error)
      }

      throw error
    }
  }

  /**
   * Construye headers de autenticación
   */
  private async buildAuthHeaders(existingHeaders?: HeadersInit): Promise<AuthHeaders> {
    // Verificar que tenemos contexto de autenticación
    if (!this.authContext) {
      throw new AuthError(
        'No hay contexto de autenticación establecido',
        'MISSING_API_KEY'
      )
    }

    const headers: AuthHeaders = {
      'api-key': this.authContext.apiKey,
    }

    // Añadir headers de contexto de merchant
    if (this.authContext.merchantId) {
      headers['X-Merchant-Id'] = this.authContext.merchantId
    }

    if (this.authContext.profileId) {
      headers['X-Profile-Id'] = this.authContext.profileId
    }

    if (this.authContext.publishableKey) {
      headers['X-Publishable-Key'] = this.authContext.publishableKey
    }

    // Validar headers construidos
    try {
      return AuthHeadersSchema.parse(headers)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AuthError(
          `Headers de autenticación inválidos: ${error.errors.map(e => e.message).join(', ')}`,
          'INVALID_CONTEXT'
        )
      }
      throw error
    }
  }

  /**
   * Maneja refresh de token cuando se recibe 401
   */
  private async handleTokenRefresh(originalRequest: RequestInit): Promise<Response> {
    try {
      // Evitar múltiples refreshes simultáneos
      if (!this.tokenRefreshPromise) {
        this.tokenRefreshPromise = this.config.tokenRefreshCallback!()
      }

      const newApiKey = await this.tokenRefreshPromise
      this.tokenRefreshPromise = null

      // Actualizar contexto con nuevo token
      if (this.authContext) {
        this.authContext.apiKey = newApiKey
      }

      if (this.config.debug) {
        console.log('[AuthInterceptor] Token refreshed exitosamente')
      }

      // Reintentar request original con nuevo token
      const newHeaders = await this.buildAuthHeaders()
      const retryRequest: RequestInit = {
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          ...newHeaders,
        },
      }

      // Aquí normalmente se haría el fetch, pero como es un interceptor
      // devolvemos una response indicando que debe reintentar
      return new Response(JSON.stringify({ retry: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      this.tokenRefreshPromise = null

      if (this.config.debug) {
        console.error('[AuthInterceptor] Error refreshing token:', error)
      }

      throw new AuthError(
        'Error renovando token de autenticación',
        'EXPIRED_TOKEN'
      )
    }
  }

  /**
   * Parsea response de error de forma segura
   */
  private async safeParseErrorResponse(response: Response): Promise<any> {
    try {
      return await response.json()
    } catch {
      return {
        error_message: response.statusText || 'Error desconocido',
        error_code: 'UNKNOWN_ERROR'
      }
    }
  }

  /**
   * Determina el código de error basado en la respuesta
   */
  private determineErrorCode(errorData: any): AuthError['code'] {
    const errorCode = errorData.error_code?.toLowerCase() || ''
    const errorMessage = errorData.error_message?.toLowerCase() || ''

    if (errorCode.includes('api_key') || errorMessage.includes('api key')) {
      return 'INVALID_API_KEY'
    }

    if (errorCode.includes('expired') || errorMessage.includes('expired')) {
      return 'EXPIRED_TOKEN'
    }

    if (errorCode.includes('permission') || errorMessage.includes('permission')) {
      return 'INSUFFICIENT_PERMISSIONS'
    }

    return 'INVALID_API_KEY'
  }

  /**
   * Valida si el contexto actual es válido
   */
  validateContext(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.authContext) {
      errors.push('No hay contexto de autenticación establecido')
      return { isValid: false, errors }
    }

    if (!this.authContext.apiKey) {
      errors.push('API Key es requerida')
    }

    if (!this.authContext.merchantId) {
      errors.push('Merchant ID es requerido')
    }

    if (!this.authContext.profileId) {
      errors.push('Profile ID es requerido')
    }

    // Validar formato de API key
    if (this.authContext.apiKey && this.authContext.apiKey.length < 10) {
      errors.push('API Key parece ser inválida (muy corta)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Obtiene información de debug del interceptor
   */
  getDebugInfo(): {
    hasContext: boolean;
    contextInfo?: {
      merchantId: string;
      profileId: string;
      hasApiKey: boolean;
      hasPublishableKey: boolean;
    };
    config: AuthInterceptorConfig;
  } {
    return {
      hasContext: !!this.authContext,
      contextInfo: this.authContext ? {
        merchantId: this.authContext.merchantId,
        profileId: this.authContext.profileId,
        hasApiKey: !!this.authContext.apiKey,
        hasPublishableKey: !!this.authContext.publishableKey,
      } : undefined,
      config: { ...this.config, apiKey: this.config.apiKey ? '[REDACTED]' : undefined }
    }
  }
}

// Utilidades para manejo de autenticación
export class AuthUtils {
  /**
   * Extrae información de un JWT (sin verificar)
   */
  static decodeJWT(token: string): any | null {
    try {
      const payload = token.split('.')[1]
      const decoded = atob(payload)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  /**
   * Verifica si un token está expirado
   */
  static isTokenExpired(token: string): boolean {
    const decoded = AuthUtils.decodeJWT(token)
    if (!decoded || !decoded.exp) return true

    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  }

  /**
   * Calcula tiempo restante de un token en segundos
   */
  static getTokenTimeToExpiry(token: string): number {
    const decoded = AuthUtils.decodeJWT(token)
    if (!decoded || !decoded.exp) return 0

    const currentTime = Math.floor(Date.now() / 1000)
    return Math.max(0, decoded.exp - currentTime)
  }

  /**
   * Genera un token temporal para testing
   */
  static generateTestToken(merchantId: string, profileId: string, expiryMinutes: number = 60): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      merchant_id: merchantId,
      profile_id: profileId,
      exp: Math.floor(Date.now() / 1000) + (expiryMinutes * 60),
      iat: Math.floor(Date.now() / 1000),
      test: true
    }))
    const signature = btoa('test-signature')

    return `${header}.${payload}.${signature}`
  }

  /**
   * Sanitiza headers para logging (oculta información sensible)
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers }
    const sensitiveHeaders = ['api-key', 'authorization', 'x-api-key']

    sensitiveHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase()
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '[REDACTED]'
        }
      })
    })

    return sanitized
  }
}

// Constantes de autenticación
export const AUTH_CONSTANTS = {
  HEADER_NAMES: {
    API_KEY: 'api-key',
    AUTHORIZATION: 'Authorization',
    MERCHANT_ID: 'X-Merchant-Id',
    PROFILE_ID: 'X-Profile-Id',
    PUBLISHABLE_KEY: 'X-Publishable-Key',
  } as const,
  ERROR_CODES: {
    MISSING_API_KEY: 'MISSING_API_KEY',
    INVALID_API_KEY: 'INVALID_API_KEY',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    INVALID_CONTEXT: 'INVALID_CONTEXT',
  } as const,
  TOKEN_REFRESH_BUFFER_SECONDS: 300, // Renovar token 5 minutos antes de expirar
  MAX_RETRY_ATTEMPTS: 1,
  RETRY_DELAY_MS: 1000,
} as const

export default AuthInterceptor