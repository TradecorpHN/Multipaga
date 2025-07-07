import { cookies } from 'next/headers'

// Configuración base de Hyperswitch
export const hyperswitchConfig = {
  baseUrl: process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io',
  apiVersion: 'v1',
  timeout: 30000, // 30 segundos
}

// Tipos de error de Hyperswitch
export interface HyperswitchError {
  error_code?: string
  error_message?: string
  status_code: number
  type?: string
}

// Cliente de Hyperswitch
export class HyperswitchClient {
  private baseUrl: string
  private apiKey: string | null = null

  constructor(apiKey?: string) {
    this.baseUrl = hyperswitchConfig.baseUrl
    this.apiKey = apiKey || null
  }

  // Obtener API key de cookies si no se proporciona
  private async getApiKey(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey
    }

    // En el servidor, intentar obtener de cookies
    try {
      const cookieStore = cookies()
      const sessionToken = cookieStore.get('session_token')?.value
      
      if (sessionToken) {
        const { verify } = await import('jsonwebtoken')
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev'
        const decoded = verify(sessionToken, jwtSecret) as any
        
        if (decoded.api_key) {
          return decoded.api_key
        }
      }
    } catch (error) {
      console.warn('No se pudo obtener API key de la sesión:', error)
    }

    throw new Error('API key no disponible')
  }

  // Realizar petición HTTP a Hyperswitch
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const apiKey = await this.getApiKey()
    
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'User-Agent': 'TradecorpHN-Multipaga/1.0.0',
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      timeout: hyperswitchConfig.timeout,
    }

    try {
      const response = await fetch(url, requestOptions)
      
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
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout: La petición a Hyperswitch tardó demasiado')
      }
      
      if (typeof error === 'object' && error !== null && 'status_code' in error) {
        throw error // Re-lanzar errores de Hyperswitch
      }
      
      throw new Error(`Error de conexión con Hyperswitch: ${error}`)
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
    const endpoint = query ? `/disputes/list?${query}` : '/disputes/list'
    
    return this.makeRequest(endpoint)
  }

  async submitDisputeEvidence(disputeId: string, evidenceData: any) {
    return this.makeRequest(`/disputes/${disputeId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(evidenceData),
    })
  }

  // Métodos para Customers
  async createCustomer(customerData: any) {
    return this.makeRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    })
  }

  async getCustomer(customerId: string) {
    return this.makeRequest(`/customers/${customerId}`)
  }

  async updateCustomer(customerId: string, updateData: any) {
    return this.makeRequest(`/customers/${customerId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    })
  }

  async deleteCustomer(customerId: string) {
    return this.makeRequest(`/customers/${customerId}`, {
      method: 'DELETE',
    })
  }

  // Métodos para Payment Methods
  async listPaymentMethods(customerId: string) {
    return this.makeRequest(`/customers/${customerId}/payment_methods`)
  }

  async getPaymentMethod(paymentMethodId: string) {
    return this.makeRequest(`/payment_methods/${paymentMethodId}`)
  }

  async deletePaymentMethod(paymentMethodId: string) {
    return this.makeRequest(`/payment_methods/${paymentMethodId}`, {
      method: 'DELETE',
    })
  }

  // Métodos para Account/Merchant
  async getMerchantAccount() {
    return this.makeRequest('/account')
  }

  async getBusinessProfile(profileId: string) {
    const account = await this.getMerchantAccount()
    return this.makeRequest(`/account/${account.merchant_id}/business_profile/${profileId}`)
  }

  // Métodos para Connectors
  async listConnectors() {
    const account = await this.getMerchantAccount()
    return this.makeRequest(`/account/${account.merchant_id}/connectors`)
  }

  async getConnector(connectorId: string) {
    const account = await this.getMerchantAccount()
    return this.makeRequest(`/account/${account.merchant_id}/connectors/${connectorId}`)
  }

  // Métodos para Analytics/Reports
  async getPaymentAnalytics(params?: any) {
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
    
    return this.makeRequest(endpoint)
  }

  // Métodos para Webhooks
  async createWebhook(webhookData: any) {
    return this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhookData),
    })
  }

  async listWebhooks() {
    return this.makeRequest('/webhooks')
  }

  async getWebhook(webhookId: string) {
    return this.makeRequest(`/webhooks/${webhookId}`)
  }

  async updateWebhook(webhookId: string, updateData: any) {
    return this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })
  }

  async deleteWebhook(webhookId: string) {
    return this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    })
  }
}

// Instancia singleton del cliente
let hyperswitchClient: HyperswitchClient | null = null

export function getHyperswitchClient(apiKey?: string): HyperswitchClient {
  if (!hyperswitchClient) {
    hyperswitchClient = new HyperswitchClient(apiKey)
  }
  return hyperswitchClient
}

// Utilidades para formateo
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