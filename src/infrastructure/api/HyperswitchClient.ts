import { env } from '@/presentation/lib/env-config'
import { getAuthToken } from '@/lib/auth'

// Error class for Hyperswitch API errors
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

// Request configuration interface
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  query?: Record<string, any>
  timeout?: number
  skipAuth?: boolean
}

// Response interface
interface HyperswitchResponse<T = any> {
  data: T
  headers: Headers
  status: number
}

// Retry configuration
interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
}

// Hyperswitch API Client class
class HyperswitchClient {
  private baseUrl: string
  private timeout: number
  private merchantId: string | null = null
  private profileId: string | null = null

  constructor() {
    this.baseUrl = env.HYPERSWITCH_BASE_URL
    this.timeout = env.HYPERSWITCH_TIMEOUT || 30000
  }

  // Set auth context
  public setAuthContext(merchantId: string, profileId: string) {
    this.merchantId = merchantId
    this.profileId = profileId
  }

  // Clear auth context
  public clearAuthContext() {
    this.merchantId = null
    this.profileId = null
  }

  // Build query string
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)))
        } else if (typeof value === 'object') {
          searchParams.append(key, JSON.stringify(value))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
    
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  // Execute request with retry logic
  private async executeRequest<T>(
    url: string,
    config: RequestConfig,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<HyperswitchResponse<T>> {
    let lastError: Error | null = null
    let delay = retryConfig.initialDelay

    for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
      try {
        // Get auth token if needed
        let authHeader: string | null = null
        if (!config.skipAuth) {
          authHeader = await getAuthToken()
          if (!authHeader) {
            throw new HyperswitchError('No authentication token available', 401)
          }
        }

        // Build headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Version': '1.0.0',
          'X-Merchant-ID': this.merchantId || '',
          'X-Profile-ID': this.profileId || '',
          ...config.headers,
        }

        if (authHeader) {
          headers['api-key'] = authHeader
        }

        // Build request options
        const requestOptions: RequestInit = {
          method: config.method || 'GET',
          headers,
          signal: AbortSignal.timeout(config.timeout || this.timeout),
        }

        // Add body if present
        if (config.body && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method!)) {
          requestOptions.body = JSON.stringify(config.body)
        }

        // Execute request
        const response = await fetch(url, requestOptions)

        // Parse response
        const contentType = response.headers.get('content-type')
        let data: any

        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }

        // Handle errors
        if (!response.ok) {
          const error = new HyperswitchError(
            data.error?.message || data.message || response.statusText,
            response.status,
            data.error?.code || data.error_code,
            data.error?.type || data.error_type,
            data
          )

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw error
          }

          // Retry on server errors (5xx)
          lastError = error
        } else {
          // Success
          return {
            data,
            headers: response.headers,
            status: response.status,
          }
        }
      } catch (error) {
        // Handle network errors
        if (error instanceof HyperswitchError) {
          throw error
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new HyperswitchError('Request timeout', 408)
          }
          lastError = error
        }
      }

      // Wait before retry
      if (attempt < retryConfig.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay)
      }
    }

    // All retries failed
    throw new HyperswitchError(
      lastError?.message || 'Request failed after all retries',
      500,
      'MAX_RETRIES_EXCEEDED'
    )
  }

  // GET request
  public async get<T = any>(
    endpoint: string,
    query?: Record<string, any>,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${query ? this.buildQueryString(query) : ''}`
    const response = await this.executeRequest<T>(url, {
      ...config,
      method: 'GET',
    })
    return response.data
  }

  // POST request
  public async post<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${config?.query ? this.buildQueryString(config.query) : ''}`
    const response = await this.executeRequest<T>(url, {
      ...config,
      method: 'POST',
      body,
    })
    return response.data
  }

  // PUT request
  public async put<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${config?.query ? this.buildQueryString(config.query) : ''}`
    const response = await this.executeRequest<T>(url, {
      ...config,
      method: 'PUT',
      body,
    })
    return response.data
  }

  // PATCH request
  public async patch<T = any>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${config?.query ? this.buildQueryString(config.query) : ''}`
    const response = await this.executeRequest<T>(url, {
      ...config,
      method: 'PATCH',
      body,
    })
    return response.data
  }

  // DELETE request
  public async delete<T = any>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method'>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${config?.query ? this.buildQueryString(config.query) : ''}`
    const response = await this.executeRequest<T>(url, {
      ...config,
      method: 'DELETE',
    })
    return response.data
  }

  // Upload file
  public async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      })
    }

    const url = `${this.baseUrl}${endpoint}`
    const authHeader = await getAuthToken()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': authHeader || '',
        'X-Merchant-ID': this.merchantId || '',
        'X-Profile-ID': this.profileId || '',
        ...config?.headers,
      },
      body: formData,
      signal: AbortSignal.timeout(config?.timeout || this.timeout),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new HyperswitchError(
        errorData.error?.message || response.statusText,
        response.status,
        errorData.error?.code,
        errorData.error?.type,
        errorData
      )
    }

    return response.json()
  }
}

// Create singleton instance
export const hyperswitchClient = new HyperswitchClient()

// Export types
export type { RequestConfig, HyperswitchResponse }