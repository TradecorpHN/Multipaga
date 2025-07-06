import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/presentation/lib/env-config'
import { z } from 'zod'

// Error Response Schema
const ErrorResponseSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    code: z.string().optional(),
    reason: z.string().optional(),
  }),
})

type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// Custom Error Class
export class HyperswitchError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly type?: string,
    public readonly reason?: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = 'HyperswitchError'
  }
}

// Request Configuration
interface HyperswitchRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean
  merchantId?: string
  profileId?: string
}

// Response interceptor type
interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
}

export class HyperswitchClient {
  private static instance: HyperswitchClient
  private axiosInstance: AxiosInstance
  private merchantId: string | null = null
  private profileId: string | null = null

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: env.HYPERSWITCH_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  public static getInstance(): HyperswitchClient {
    if (!HyperswitchClient.instance) {
      HyperswitchClient.instance = new HyperswitchClient()
    }
    return HyperswitchClient.instance
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add API Key
        if (!config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${env.HYPERSWITCH_API_KEY}`
        }

        // Add Merchant ID if available
        if (this.merchantId && !config.headers['X-Merchant-Id']) {
          config.headers['X-Merchant-Id'] = this.merchantId
        }

        // Add Profile ID if available
        if (this.profileId && !config.headers['X-Profile-Id']) {
          config.headers['X-Profile-Id'] = this.profileId
        }

        // Log request in development
        if (env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          })
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log response in development
        if (env.NODE_ENV === 'development') {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          })
        }

        return response
      },
      async (error: AxiosError) => {
        // Handle network errors
        if (!error.response) {
          throw new HyperswitchError(
            'Network error. Please check your internet connection.',
            'NETWORK_ERROR',
            'network_error',
            undefined,
            0
          )
        }

        // Parse error response
        let errorData: ErrorResponse | null = null
        try {
          errorData = ErrorResponseSchema.parse(error.response.data)
        } catch {
          // If error doesn't match schema, use generic error
          errorData = null
        }

        const hyperswitchError = new HyperswitchError(
          errorData?.error.message || error.message || 'An unexpected error occurred',
          errorData?.error.code || error.code,
          errorData?.error.type || 'unknown_error',
          errorData?.error.reason,
          error.response.status
        )

        // Log error in development
        if (env.NODE_ENV === 'development') {
          console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response.status,
            error: hyperswitchError,
          })
        }

        throw hyperswitchError
      }
    )
  }

  // Set authentication context
  public setAuthContext(merchantId: string, profileId: string): void {
    this.merchantId = merchantId
    this.profileId = profileId
  }

  // Clear authentication context
  public clearAuthContext(): void {
    this.merchantId = null
    this.profileId = null
  }

  // Generic request method
  private async request<T>(config: HyperswitchRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.request<T>(config)
    
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    }
  }

  // HTTP Methods
  public async get<T>(url: string, config?: HyperswitchRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'GET', url })
    return response.data
  }

  public async post<T>(url: string, data?: any, config?: HyperswitchRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'POST', url, data })
    return response.data
  }

  public async put<T>(url: string, data?: any, config?: HyperswitchRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'PUT', url, data })
    return response.data
  }

  public async patch<T>(url: string, data?: any, config?: HyperswitchRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'PATCH', url, data })
    return response.data
  }

  public async delete<T>(url: string, config?: HyperswitchRequestConfig): Promise<T> {
    const response = await this.request<T>({ ...config, method: 'DELETE', url })
    return response.data
  }
}

// Export singleton instance
export const hyperswitchClient = HyperswitchClient.getInstance()