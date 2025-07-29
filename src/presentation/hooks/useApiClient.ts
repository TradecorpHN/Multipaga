// hooks/useApiClient.ts - FIXED VERSION
'use client'

import { useCallback, useRef } from 'react'
import { useAuth } from '@/presentation/contexts/AuthContext'

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: any
}

export class ApiRequestError extends Error implements ApiError {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export function useApiClient() {
  const { authState } = useAuth()
  const abortControllersRef = useRef<Set<AbortController>>(new Set())

  // Cleanup function para cancelar requests pendientes
  const cleanup = useCallback(() => {
    abortControllersRef.current.forEach(controller => {
      controller.abort()
    })
    abortControllersRef.current.clear()
  }, [])

  const makeRequest = useCallback(async <T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const {
      skipAuth = false,
      timeout = 30000,
      retries = 2,
      retryDelay = 1000,
      ...fetchOptions
    } = options

    // Crear AbortController para este request
    const abortController = new AbortController()
    abortControllersRef.current.add(abortController)

    // Setup de timeout
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, timeout)

    try {
      // Preparar headers
      const headers = new Headers(fetchOptions.headers)
      
      // Headers de contenido por defecto
      if (!headers.has('Content-Type') && fetchOptions.body) {
        headers.set('Content-Type', 'application/json')
      }
      
      headers.set('Accept', 'application/json')

      // Headers de autenticación si están disponibles y no se omiten
      if (!skipAuth && authState?.isAuthenticated) {
        const { merchantId, profileId } = authState
        
        if (!merchantId || !profileId) {
          throw new ApiRequestError(
            401,
            'Faltan credenciales de autenticación',
            'MISSING_AUTH_CREDENTIALS',
            { merchantId: !!merchantId, profileId: !!profileId }
          )
        }

        headers.set('x-merchant-id', merchantId)
        headers.set('x-profile-id', profileId)
        
        // Incluir API key si está disponible
        const apiKey = localStorage.getItem('hyperswitch_api_key')
        if (apiKey) {
          headers.set('Authorization', `Bearer ${apiKey}`)
        }
      }

      // Log de debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 API Request:', {
          url,
          method: fetchOptions.method || 'GET',
          headers: Object.fromEntries(headers.entries()),
          hasBody: !!fetchOptions.body,
          auth: {
            merchantId: authState?.merchantId,
            profileId: authState?.profileId,
            isAuthenticated: authState?.isAuthenticated
          }
        })
      }

      // Función para realizar el request
      const executeRequest = async (attempt: number): Promise<T> => {
        try {
          const response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: abortController.signal,
          })

          // Log de respuesta en desarrollo
          if (process.env.NODE_ENV === 'development') {
            console.log(`📡 API Response:`, {
              url,
              status: response.status,
              statusText: response.statusText,
              attempt: attempt + 1,
              headers: Object.fromEntries(response.headers.entries())
            })
          }

          // Verificar si la respuesta es exitosa
          if (!response.ok) {
            let errorData: any
            
            try {
              const responseText = await response.text()
              errorData = responseText ? JSON.parse(responseText) : {}
            } catch {
              errorData = { message: 'Error desconocido del servidor' }
            }

            // Log de error detallado
            console.error('❌ API Error Response:', {
              url,
              status: response.status,
              statusText: response.statusText,
              errorData,
              attempt: attempt + 1
            })

            throw new ApiRequestError(
              response.status,
              errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
              errorData.error?.code || `HTTP_${response.status}`,
              errorData
            )
          }

          // Procesar respuesta exitosa
          const responseText = await response.text()
          let responseData: T

          try {
            responseData = responseText ? JSON.parse(responseText) : ({} as T)
          } catch {
            responseData = responseText as unknown as T
          }

          return responseData

        } catch (error) {
          // Si es un error de red y tenemos retries disponibles
          if (
            attempt < retries && 
            error instanceof TypeError && 
            error.message.includes('fetch')
          ) {
            console.warn(`🔄 Retrying request (attempt ${attempt + 2}/${retries + 1})`)
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
            return executeRequest(attempt + 1)
          }
          
          throw error
        }
      }

      const result = await executeRequest(0)
      
      // Success log
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ API Request Success:', { url, result })
      }
      
      return result

    } catch (error) {
      console.error('❌ API Request Failed:', {
        url,
        error: error instanceof Error ? error.message : error,
        auth: {
          isAuthenticated: authState?.isAuthenticated,
          merchantId: !!authState?.merchantId,
          profileId: !!authState?.profileId
        }
      })
      
      // Re-throw error con información adicional si es necesario
      if (error instanceof ApiRequestError) {
        throw error
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiRequestError(408, 'Request timeout', 'TIMEOUT')
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiRequestError(503, 'Network error', 'NETWORK_ERROR')
      }
      
      throw new ApiRequestError(
        500,
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      )
      
    } finally {
      clearTimeout(timeoutId)
      abortControllersRef.current.delete(abortController)
    }
  }, [authState])

  // Métodos convenientes para diferentes tipos de requests
  const get = useCallback(<T = any>(url: string, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, { ...options, method: 'GET' })
  }, [makeRequest])

  const post = useCallback(<T = any>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const put = useCallback(<T = any>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const patch = useCallback(<T = any>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const del = useCallback(<T = any>(url: string, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, { ...options, method: 'DELETE' })
  }, [makeRequest])

  return {
    makeRequest,
    get,
    post,
    put,
    patch,
    delete: del,
    cleanup,
    isAuthenticated: authState?.isAuthenticated || false,
    authState
  }
}