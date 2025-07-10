// src/presentation/lib/axios-config.ts
// ──────────────────────────────────────────────────────────────────────────────
// Axios Configuration - Configuración de cliente HTTP para Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios'
import { API_ENDPOINTS, TIMEOUTS, ERROR_MESSAGES } from './constants'

/**
 * Tipos para configuración de request extendido
 */
export interface MultipagaRequestConfig extends AxiosRequestConfig {
  merchantId?: string
  profileId?: string
  skipAuthRefresh?: boolean
  retryCount?: number
  timeout?: number
}

/**
 * Tipo para respuesta de error de Hyperswitch
 */
export interface HyperswitchErrorResponse {
  error: {
    type: string
    message: string
    code?: string
    reason?: string
    metadata?: Record<string, any>
  }
}

/**
 * Tipo para respuesta estándar de la API
 */
export interface APIResponse<T = any> {
  data: T
  status: number
  message?: string
  timestamp: string
}

/**
 * Configuración base para el cliente HTTP
 */
const createAxiosConfig = (): AxiosRequestConfig => ({
  timeout: TIMEOUTS.API_REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web'
  },
  withCredentials: false,
  validateStatus: (status) => status >= 200 && status < 300
})

/**
 * Cliente principal para Hyperswitch API
 */
export const hyperswitchApi: AxiosInstance = axios.create({
  baseURL: API_ENDPOINTS.HYPERSWITCH_BASE,
  ...createAxiosConfig()
})

/**
 * Cliente para API interna (proxy)
 */
export const internalApi: AxiosInstance = axios.create({
  baseURL: API_ENDPOINTS.INTERNAL_API_BASE,
  ...createAxiosConfig()
})

/**
 * Cliente para webhooks
 */
export const webhookApi: AxiosInstance = axios.create({
  ...createAxiosConfig(),
  timeout: TIMEOUTS.WEBHOOK_TIMEOUT_MS
})

/**
 * Interceptor de request para cliente Hyperswitch
 */
hyperswitchApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Añadir API key si está disponible
    const apiKey = getApiKey()
    if (apiKey && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${apiKey}`
    }
    // Añadir headers de contexto merchant
    const merchantId = getMerchantId()
    const profileId = getProfileId()
    if (merchantId) config.headers['X-Merchant-Id'] = merchantId
    if (profileId) config.headers['X-Profile-Id'] = profileId
    config.headers['X-Request-Timestamp'] = new Date().toISOString()
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: config.headers,
        data: config.data
      })
    }
    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

/**
 * Interceptor de request para API interna
 */
internalApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Añadir headers de autenticación de sesión
    const sessionToken = getSessionToken()
    if (sessionToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${sessionToken}`
    }
    const userId = getUserId()
    if (userId) config.headers['X-User-Id'] = userId
    config.headers['X-Request-Id'] = generateRequestId()
    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error)
  }
)

/**
 * Interceptor de response para manejo de errores común
 */
const createResponseInterceptor = (apiName: string) => ({
  onFulfilled: (response: AxiosResponse): AxiosResponse => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${apiName} Response:`, {
        status: response.status,
        data: response.data,
        headers: response.headers
      })
    }
    return response
  },
  onRejected: async (error: AxiosError): Promise<never> => {
    console.error(`❌ ${apiName} Error:`, error)

    // Cast para acceder a tus props personalizadas
    const config = error.config as MultipagaRequestConfig

    // Manejo específico de errores de Hyperswitch
    if (error.response?.data) {
      const errorData = error.response.data as HyperswitchErrorResponse

      // Si es error de autenticación, intentar refrescar token
      if (error.response.status === 401 && !config.retryCount) {
        const refreshed = await attemptTokenRefresh()
        if (refreshed && error.config) {
          config.retryCount = (config.retryCount || 0) + 1
          return axios.request(error.config)
        }
      }

      // Si es error de rate limiting, añadir delay
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after']
        if (
          retryAfter &&
          error.config &&
          !config.skipAuthRefresh
        ) {
          await delay(parseInt(retryAfter) * 1000)
          return axios.request(error.config)
        }
      }

      // Crear error personalizado con información de Hyperswitch
      const customError = new MultipagaApiError(
        errorData.error?.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error.response.status,
        errorData.error?.code,
        errorData.error?.type,
        errorData.error?.metadata
      )
      throw customError
    }

    // Error de red o timeout
    if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
      throw new MultipagaApiError(
        ERROR_MESSAGES.NETWORK_ERROR,
        0,
        error.code
      )
    }

    // Error genérico
    throw new MultipagaApiError(
      error.message || ERROR_MESSAGES.INTERNAL_ERROR,
      error.response?.status || 0
    )
  }
})

// Aplicar interceptors
const hyperswitchInterceptor = createResponseInterceptor('Hyperswitch')
hyperswitchApi.interceptors.response.use(
  hyperswitchInterceptor.onFulfilled,
  hyperswitchInterceptor.onRejected
)

const internalInterceptor = createResponseInterceptor('Internal')
internalApi.interceptors.response.use(
  internalInterceptor.onFulfilled,
  internalInterceptor.onRejected
)

const webhookInterceptor = createResponseInterceptor('Webhook')
webhookApi.interceptors.response.use(
  webhookInterceptor.onFulfilled,
  webhookInterceptor.onRejected
)

/**
 * Clase de error personalizada para la API
 */
export class MultipagaApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly type?: string
  public readonly metadata?: Record<string, any>
  public readonly timestamp: string

  constructor(
    message: string,
    status: number,
    code?: string,
    type?: string,
    metadata?: Record<string, any>
  ) {
    super(message)
    this.name = 'MultipagaApiError'
    this.status = status
    this.code = code
    this.type = type
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MultipagaApiError)
    }
  }

  public isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
  public isValidationError(): boolean {
    return this.status === 400 || this.type === 'validation_error'
  }
  public isRateLimitError(): boolean {
    return this.status === 429
  }
  public isNetworkError(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR' || this.code === 'ECONNABORTED'
  }
  public isServerError(): boolean {
    return this.status >= 500
  }
  public getUserMessage(): string {
    if (this.isNetworkError()) return ERROR_MESSAGES.NETWORK_ERROR
    if (this.isAuthError()) return ERROR_MESSAGES.UNAUTHORIZED
    if (this.isValidationError()) return ERROR_MESSAGES.VALIDATION_ERROR
    if (this.isRateLimitError()) return ERROR_MESSAGES.RATE_LIMITED
    if (this.isServerError()) return ERROR_MESSAGES.INTERNAL_ERROR
    return this.message || ERROR_MESSAGES.INTERNAL_ERROR
  }
  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      type: this.type,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }
}

/**
 * Funciones de utilidad para obtener tokens y contexto
 */
function getApiKey(): string | null {
  return process.env.HYPERSWITCH_API_KEY || null
}
function getSessionToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('session_token')
  return null
}
function getMerchantId(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('merchant_id')
  return null
}
function getProfileId(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('profile_id')
  return null
}
function getUserId(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('user_id')
  return null
}
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Función para intentar refrescar el token
 */
async function attemptTokenRefresh(): Promise<boolean> {
  try {
    // Implementa tu lógica real de refresh aquí
    return false
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return false
  }
}

/**
 * Función de delay para retry con rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Helpers para crear requests tipados
 */
export const createHyperswitchRequest = <T = any>(
  config: MultipagaRequestConfig
): Promise<AxiosResponse<T>> => {
  return hyperswitchApi.request<T>(config)
}

export const createInternalRequest = <T = any>(
  config: MultipagaRequestConfig
): Promise<AxiosResponse<T>> => {
  return internalApi.request<T>(config)
}

/**
 * Función para configurar contexto de merchant dinámicamente
 */
export const setMerchantContext = (merchantId: string, profileId?: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('merchant_id', merchantId)
    if (profileId) localStorage.setItem('profile_id', profileId)
  }
}

/**
 * Función para limpiar contexto
 */
export const clearMerchantContext = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('merchant_id')
    localStorage.removeItem('profile_id')
    localStorage.removeItem('session_token')
    localStorage.removeItem('user_id')
  }
}

/**
 * Función para verificar conectividad
 */
export const checkApiHealth = async (): Promise<{
  hyperswitch: boolean
  internal: boolean
  latency: number
}> => {
  const startTime = Date.now()
  try {
    const [hyperswitchHealth, internalHealth] = await Promise.allSettled([
      hyperswitchApi.get('/health', { timeout: 5000 }),
      internalApi.get('/health', { timeout: 5000 })
    ])
    const latency = Date.now() - startTime
    return {
      hyperswitch: hyperswitchHealth.status === 'fulfilled',
      internal: internalHealth.status === 'fulfilled',
      latency
    }
  } catch (error) {
    return {
      hyperswitch: false,
      internal: false,
      latency: Date.now() - startTime
    }
  }
}

/**
 * Exportar instancias y utilidades
 */
export default {
  hyperswitch: hyperswitchApi,
  internal: internalApi,
  webhook: webhookApi,
  MultipagaApiError,
  setMerchantContext,
  clearMerchantContext,
  checkApiHealth,
  createHyperswitchRequest,
  createInternalRequest
}
