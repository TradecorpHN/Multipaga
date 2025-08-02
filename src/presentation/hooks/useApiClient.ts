
'use client';

import { useCallback, useRef } from 'react';
import { useAuth, useCustomer } from '@/presentation/contexts/AuthContext';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export class ApiRequestError extends Error implements ApiError {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function useApiClient() {
  const { fetchWithAuth } = useAuth();
  const { merchantId, profileId, isAuthenticated } = useCustomer();
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const BASE_URL = process.env.NEXT_PUBLIC_HYPERSWITCH_URL || 'https://sandbox.hyperswitch.io';

  // Cleanup function to cancel specific or all requests
  const cleanup = useCallback((requestId?: string) => {
    if (requestId) {
      const controller = abortControllersRef.current.get(requestId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(requestId);
      }
    } else {
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    }
  }, []);

  const makeRequest = useCallback(
    async <T = unknown>(
      url: string,
      options: ApiRequestOptions = {},
      requestId: string = crypto.randomUUID()
    ): Promise<T> => {
      const {
        skipAuth = false,
        timeout = 30000,
        retries = 2,
        retryDelay = 1000,
        ...fetchOptions
      } = options;

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllersRef.current.set(requestId, abortController);

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
        abortControllersRef.current.delete(requestId);
      }, timeout);

      try {
        // Prepare headers
        const headers = new Headers(fetchOptions.headers);
        if (!headers.has('Content-Type') && fetchOptions.body) {
          headers.set('Content-Type', 'application/json');
        }
        headers.set('Accept', 'application/json');

        // Add merchant headers if authenticated and not skipped
        if (!skipAuth && isAuthenticated && merchantId && profileId) {
          headers.set('x-merchant-id', merchantId);
          headers.set('x-profile-id', profileId);
        }

        // Log request details (mask sensitive headers in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 API Request:', {
            requestId,
            url: `${BASE_URL}${url}`,
            method: fetchOptions.method || 'GET',
            headers: Object.fromEntries(
              Array.from(headers.entries()).map(([key, value]) =>
                key.toLowerCase() === 'api-key' ? [key, '[REDACTED]'] : [key, value]
              )
            ),
            hasBody: !!fetchOptions.body,
            auth: { isAuthenticated, merchantId, profileId },
          });
        }

        // Execute request with retries
        const executeRequest = async (attempt: number): Promise<T> => {
          try {
            // Use raw fetch for non-authenticated requests, fetchWithAuth for authenticated ones
            const response: Response = skipAuth
              ? await fetch(`${BASE_URL}${url}`, {
                  ...fetchOptions,
                  headers,
                  signal: abortController.signal,
                })
              : await fetchWithAuth(`${BASE_URL}${url}`, {
                  ...fetchOptions,
                  headers,
                  signal: abortController.signal,
                });

            // Log response details
            if (process.env.NODE_ENV === 'development') {
              console.log('📡 API Response:', {
                requestId,
                url: `${BASE_URL}${url}`,
                status: response.status,
                statusText: response.statusText,
                attempt: attempt + 1,
                headers: Object.fromEntries(response.headers.entries()),
              });
            }

            if (!response.ok) {
              let errorData: any;
              try {
                const responseText = await response.text();
                errorData = responseText ? JSON.parse(responseText) : {};
              } catch {
                errorData = { message: 'Error desconocido del servidor' };
              }

              // Hyperswitch-specific error mapping
              const errorCode = errorData.error?.code || `HTTP_${response.status}`;
              const errorMessage =
                errorData.error?.message ||
                errorData.message ||
                `HTTP ${response.status}: ${response.statusText}`;

              console.error('❌ API Error Response:', {
                requestId,
                url: `${BASE_URL}${url}`,
                status: response.status,
                statusText: response.statusText,
                errorData,
                attempt: attempt + 1,
              });

              throw new ApiRequestError(response.status, errorMessage, errorCode, errorData);
            }

            const responseText = await response.text();
            let responseData: T;
            try {
              responseData = responseText ? JSON.parse(responseText) : ({} as T);
            } catch {
              responseData = responseText as unknown as T;
            }

            if (process.env.NODE_ENV === 'development') {
              console.log('✅ API Request Success:', { requestId, url: `${BASE_URL}${url}`, result: responseData });
            }

            return responseData;
          } catch (error) {
            if (
              attempt < retries &&
              error instanceof Error &&
              (error.message.includes('fetch') || error instanceof DOMException)
            ) {
              console.warn(`🔄 Retrying request (attempt ${attempt + 2}/${retries + 1})`, { requestId });
              await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
              return executeRequest(attempt + 1);
            }
            throw error;
          }
        };

        return await executeRequest(0);
      } catch (error) {
        console.error('❌ API Request Failed:', {
          requestId,
          url: `${BASE_URL}${url}`,
          error: error instanceof Error ? error.message : error,
          auth: { isAuthenticated, merchantId, profileId },
        });

        if (error instanceof ApiRequestError) {
          throw error;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new ApiRequestError(408, 'Request timeout', 'TIMEOUT');
        }
        if (error instanceof Error && error.message.includes('fetch')) {
          throw new ApiRequestError(503, 'Network error', 'NETWORK_ERROR');
        }

        throw new ApiRequestError(
          500,
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR'
        );
      } finally {
        clearTimeout(timeoutId);
        abortControllersRef.current.delete(requestId);
      }
    },
    [fetchWithAuth, isAuthenticated, merchantId, profileId]
  );

  // Convenience methods
  const get = useCallback(<T = unknown>(url: string, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, { ...options, method: 'GET' });
  }, [makeRequest]);

  const post = useCallback(<T = unknown>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const put = useCallback(<T = unknown>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const patch = useCallback(<T = unknown>(url: string, data?: any, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const del = useCallback(<T = unknown>(url: string, options?: ApiRequestOptions) => {
    return makeRequest<T>(url, { ...options, method: 'DELETE' });
  }, [makeRequest]);

  return {
    makeRequest,
    get,
    post,
    put,
    patch,
    delete: del,
    cleanup,
    isAuthenticated,
  };
}
