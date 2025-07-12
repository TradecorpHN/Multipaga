// src/infrastructure/api/HyperswitchClient.ts

import { env } from '../../../presentation/lib/env-config'
import { getAuthHeaders } from '../../../lib/auth'

/**
 * Error específico para errores de Hyperswitch API.
 */
export class HyperswitchError extends Error {
  public readonly statusCode: number
  public readonly errorCode?: string
  public readonly errorType?: string
  public readonly details?: any

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    errorType?: string,
    details?: any
  ) {
    super(message)
    this.name = 'HyperswitchError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.errorType = errorType
    this.details = details
  }
}

/** Configura los parámetros de una petición. */
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  query?: Record<string, any>
  timeout?: number
  skipAuth?: boolean
}

/** Resultado interno tras cada petición. */
interface HyperswitchResponse<T = any> {
  data: T
  headers: Headers
  status: number
}

/** Parámetros para lógica de reintentos. */
interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
}

/**
 * Cliente para interactuar con Hyperswitch.
 * Gestiona autenticación, timeouts, reintentos y parsing.
 */
export class HyperswitchClient {
  private baseUrl: string
  private timeout: number
  private merchantId: string | null = null
  private profileId: string | null = null
  private apiKey: string


constructor(options?: { baseURL?: string; apiKey?: string; timeout?: number }) {
  this.baseUrl = options?.baseURL ?? env.HYPERSWITCH_BASE_URL
  this.timeout = options?.timeout ?? 30000
  this.apiKey = options?.apiKey ?? env.HYPERSWITCH_API_KEY // si quieres guardar el apiKey
}



  /** Define el contexto de autenticación (merchant y profile). */
  public setAuthContext(merchantId: string, profileId: string) {
    this.merchantId = merchantId
    this.profileId = profileId
  }

  /** Limpia el contexto de autenticación. */
  public clearAuthContext() {
    this.merchantId = null
    this.profileId = null
  }

  /** Construye cadena de query params a partir de un objeto. */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) return
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)))
      } else if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value))
      } else {
        searchParams.append(key, String(value))
      }
    })
    const qs = searchParams.toString()
    return qs ? `?${qs}` : ''
  }

  /** Ejecuta la petición HTTP con reintentos y manejo de errores. */
  private async executeRequest<T>(
    url: string,
    cfg: RequestConfig,
    retryCfg: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<HyperswitchResponse<T>> {
    let lastError: Error | null = null
    let delay = retryCfg.initialDelay

    for (let attempt = 0; attempt < retryCfg.maxAttempts; attempt++) {
      try {
        // Headers de autenticación (o none si skipAuth)
        const authHeaders = cfg.skipAuth ? {} : getAuthHeaders()

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Client-Version': '1.0.0',
          'X-Merchant-ID': this.merchantId || '',
          'X-Profile-ID': this.profileId || '',
          ...authHeaders,
          ...cfg.headers,
        }

        const reqOpts: RequestInit = {
          method: cfg.method || 'GET',
          headers,
          signal: AbortSignal.timeout(cfg.timeout ?? this.timeout),
        }

        if (
          cfg.body != null &&
          ['POST', 'PUT', 'PATCH'].includes(reqOpts.method!)
        ) {
          reqOpts.body = JSON.stringify(cfg.body)
        }

        const res = await fetch(url, reqOpts)

        const ct = res.headers.get('content-type') || ''
        const data = ct.includes('application/json')
          ? await res.json()
          : await res.text()

        if (!res.ok) {
          const errObj = typeof data === 'object' ? data : {}
          const err = new HyperswitchError(
            (errObj as any).error?.message ||
              (errObj as any).message ||
              res.statusText,
            res.status,
            (errObj as any).error?.code,
            (errObj as any).error?.type,
            data
          )
          if (res.status >= 400 && res.status < 500) throw err
          lastError = err
        } else {
          return { data, headers: res.headers, status: res.status }
        }
      } catch (e: any) {
        if (e instanceof HyperswitchError) throw e
        if (e.name === 'AbortError') {
          throw new HyperswitchError('Request timeout', 408)
        }
        lastError = e
      }

      if (attempt < retryCfg.maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * retryCfg.backoffMultiplier, retryCfg.maxDelay)
      }
    }

    throw new HyperswitchError(
      lastError?.message || 'Request failed after retries',
      500,
      'MAX_RETRIES_EXCEEDED'
    )
  }

  // Métodos HTTP expuestos:

  public async get<T = any>(
    endpoint: string,
    query?: Record<string, any>,
    cfg?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${
      query ? this.buildQueryString(query) : ''
    }`
    const res = await this.executeRequest<T>(url, { ...cfg, method: 'GET' })
    return res.data
  }

  public async post<T = any>(
    endpoint: string,
    body?: any,
    cfg?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${
      cfg?.query ? this.buildQueryString(cfg.query!) : ''
    }`
    const res = await this.executeRequest<T>(url, {
      ...cfg,
      method: 'POST',
      body,
    })
    return res.data
  }

  public async put<T = any>(
    endpoint: string,
    body?: any,
    cfg?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${
      cfg?.query ? this.buildQueryString(cfg.query!) : ''
    }`
    const res = await this.executeRequest<T>(url, {
      ...cfg,
      method: 'PUT',
      body,
    })
    return res.data
  }

  public async patch<T = any>(
    endpoint: string,
    body?: any,
    cfg?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${
      cfg?.query ? this.buildQueryString(cfg.query!) : ''
    }`
    const res = await this.executeRequest<T>(url, {
      ...cfg,
      method: 'PATCH',
      body,
    })
    return res.data
  }

  public async delete<T = any>(
    endpoint: string,
    cfg?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${
      cfg?.query ? this.buildQueryString(cfg.query!) : ''
    }`
    const res = await this.executeRequest<T>(url, {
      ...cfg,
      method: 'DELETE',
    })
    return res.data
  }

  /** Sube un archivo usando multipart/form-data. */
  public async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    cfg?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    const form = new FormData()
    form.append('file', file)
    if (additionalData) {
      Object.entries(additionalData).forEach(([k, v]) =>
        form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
      )
    }

    const url = `${this.baseUrl}${endpoint}`
    const authHeaders = getAuthHeaders()
    const headers: Record<string, string> = {
      'X-Merchant-ID': this.merchantId || '',
      'X-Profile-ID': this.profileId || '',
      ...cfg?.headers,
      ...authHeaders,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
      signal: AbortSignal.timeout(cfg?.timeout ?? this.timeout),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new HyperswitchError(
        errData.error?.message || res.statusText,
        res.status,
        errData.error?.code,
        errData.error?.type,
        errData
      )
    }

    return (await res.json()) as T
  }
}

// Instancia única
export const hyperswitchClient = new HyperswitchClient()

// Exporta también los tipos
export type { RequestConfig, HyperswitchResponse }
