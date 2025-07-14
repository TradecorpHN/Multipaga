// src/lib/hyperswitch-client.ts
// Cliente Hyperswitch para Client Components (sin next/headers)

// Configuración base de Hyperswitch
export const hyperswitchConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  timeout: 30000, // 30 segundos
}

// Tipos de error de Hyperswitch
export interface HyperswitchError {
  error_code?: string
  error_message?: string
  status_code: number
  type?: string
}

// Cliente de Hyperswitch para Client Components
export class HyperswitchClientSide {
  private baseUrl: string

  constructor() {
    this.baseUrl = hyperswitchConfig.baseUrl
  }

  // Realizar petición HTTP usando las rutas API del proxy
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Usar el proxy API que maneja la autenticación
    const url = `${this.baseUrl}/api/hyperswitch${endpoint}`

    const defaultHeaders = {
      'Content-Type': 'application/json',
    }

    // Timeout con AbortController
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), hyperswitchConfig.timeout)

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    }

    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeout)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error: HyperswitchError = {
          status_code: response.status,
          error_code: errorData.error_code || 'UNKNOWN_ERROR',
          error_message: errorData.error_message || response.statusText,
          type: errorData.type || 'api_error',
        }
        throw error
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout: La petición a Hyperswitch tardó demasiado')
      }
      if (typeof error === 'object' && error !== null && 'status_code' in error) {
        throw error // Re-lanzar errores de Hyperswitch
      }
      throw new Error(`Error de conexión: ${error}`)
    }
  }

  // Métodos para Pagos
  async createPayment(paymentData: any) {
    return this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    })
  }

  async getPayment(paymentId: string) {
    return this.makeRequest(`/payments/${paymentId}`)
  }

  async updatePayment(paymentId: string, updateData: any) {
    return this.makeRequest(`/payments/${paymentId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    })
  }

  async confirmPayment(paymentId: string, confirmData: any) {
    return this.makeRequest(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(confirmData),
    })
  }

  async capturePayment(paymentId: string, captureData: any) {
    return this.makeRequest(`/payments/${paymentId}/capture`, {
      method: 'POST',
      body: JSON.stringify(captureData),
    })
  }

  async cancelPayment(paymentId: string, cancelData?: any) {
    return this.makeRequest(`/payments/${paymentId}/cancel`, {
      method: 'POST',
      body: cancelData ? JSON.stringify(cancelData) : undefined,
    })
  }

  // Métodos para Reembolsos
  async createRefund(refundData: any) {
    return this.makeRequest('/refunds', {
      method: 'POST',
      body: JSON.stringify(refundData),
    })
  }

  async getRefund(refundId: string) {
    return this.makeRequest(`/refunds/${refundId}`)
  }

  async updateRefund(refundId: string, updateData: any) {
    return this.makeRequest(`/refunds/${refundId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    })
  }

  // Método para listar pagos usando el endpoint directo de la API
  async listPayments(params: any) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const query = searchParams.toString()
    const endpoint = query ? `/payments/list?${query}` : '/payments/list'
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    })
  }

  // Método para listar reembolsos
  async listRefunds(params?: any) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const query = searchParams.toString()
    const endpoint = query ? `/refunds?${query}` : '/refunds'
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    })
  }

  // Métodos para Disputas
  async getDispute(disputeId: string) {
    return this.makeRequest(`/disputes/${disputeId}`)
  }

  async listDisputes(params?: any) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const query = searchParams.toString()
    const endpoint = query ? `/disputes?${query}` : '/disputes'
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    })
  }

  // Métodos para Analytics
  async getAnalytics(params?: any) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    const query = searchParams.toString()
    const endpoint = query ? `/analytics/v1/payments?${query}` : '/analytics/v1/payments'
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    })
  }
}

// Instancia singleton del cliente para componentes cliente
let hyperswitchClientSide: HyperswitchClientSide | null = null

export function getHyperswitchClient(): HyperswitchClientSide {
  if (!hyperswitchClientSide) {
    hyperswitchClientSide = new HyperswitchClientSide()
  }
  return hyperswitchClientSide
}

// Utilidades para formateo (sin dependencias de server-side)
export function formatAmount(amount: number, currency: string = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency,
  }).format(amount / 100) // Hyperswitch usa centavos
}

export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'requires_payment_method': 'Requiere Método de Pago',
    'requires_confirmation': 'Requiere Confirmación',
    'requires_action': 'Requiere Acción',
    'processing': 'Procesando',
    'requires_capture': 'Requiere Captura',
    'cancelled': 'Cancelado',
    'succeeded': 'Exitoso',
    'failed': 'Fallido',
    'partially_captured': 'Parcialmente Capturado',
    'partially_captured_and_capturable': 'Parcialmente Capturado y Capturable',
  }
  return statusMap[status] || status
}

export function formatDisputeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'dispute_opened': 'Disputa Abierta',
    'dispute_expired': 'Disputa Expirada',
    'dispute_accepted': 'Disputa Aceptada',
    'dispute_cancelled': 'Disputa Cancelada',
    'dispute_challenged': 'Disputa Disputada',
    'dispute_won': 'Disputa Ganada',
    'dispute_lost': 'Disputa Perdida',
  }
  return statusMap[status] || status
}

// Validaciones
export function isValidCurrency(currency: string): boolean {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'HNL', 'MXN', 'GTQ']
  return validCurrencies.includes(currency.toUpperCase())
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 999999999 // Máximo ~$10M
}

// Manejo de errores
export function getErrorMessage(error: any): string {
  if (typeof error === 'object' && error !== null) {
    if ('error_message' in error) {
      return error.error_message
    }
    if ('message' in error) {
      return error.message
    }
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Error desconocido'
}

export function isHyperswitchError(error: any): error is HyperswitchError {
  return typeof error === 'object' && 
         error !== null && 
         'status_code' in error
}