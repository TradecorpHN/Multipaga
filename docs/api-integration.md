# API Integration Guide - Multipaga

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Configuración Inicial](#configuración-inicial)
- [Integración con Hyperswitch](#integración-con-hyperswitch)
- [Autenticación](#autenticación)
- [Endpoints Principales](#endpoints-principales)
- [Manejo de Errores](#manejo-de-errores)
- [Webhooks](#webhooks)
- [Rate Limiting](#rate-limiting)
- [Ejemplos de Código](#ejemplos-de-código)
- [Testing](#testing)
- [Mejores Prácticas](#mejores-prácticas)

## Descripción General

Multipaga integra con **Hyperswitch** como procesador principal de pagos, proporcionando una interfaz unificada para múltiples conectores de pago. Esta documentación cubre todos los aspectos de la integración API.

### Arquitectura de Integración

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Multipaga     │    │   Hyperswitch    │    │   Conectores    │
│   Dashboard     │◄──►│      API         │◄──►│   de Pago       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuración Inicial

### Variables de Entorno

```bash
# .env.local
HYPERSWITCH_API_KEY=your_api_key_here
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_VERSION=v1
HYPERSWITCH_PUBLISHABLE_KEY=pk_snd_your_publishable_key
HYPERSWITCH_SECRET_KEY=sk_snd_your_secret_key

# Configuración de ambiente
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Configuración de proxy
PROXY_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000
```

### Instalación de Dependencias

```bash
npm install @hyperswitch/hyperswitch-web
npm install axios
npm install react-query
npm install zod
```

## Integración con Hyperswitch

### Cliente HTTP Base

```typescript
// src/infrastructure/api/HttpClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export class HyperswitchClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.HYPERSWITCH_BASE_URL,
      timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.HYPERSWITCH_API_KEY,
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config)
    return response.data
  }
}
```

### Configuración de Proxy API Routes

```typescript
// app/api/hyperswitch/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { HyperswitchClient } from '@/infrastructure/api/HttpClient'

const client = new HyperswitchClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    const searchParams = request.nextUrl.searchParams
    
    const data = await client.request({
      method: 'GET',
      url: `/${path}?${searchParams.toString()}`,
    })

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    const body = await request.json()
    
    const data = await client.request({
      method: 'POST',
      url: `/${path}`,
      data: body,
    })

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}

function handleApiError(error: any) {
  const status = error.response?.status || 500
  const message = error.response?.data?.error?.message || 'Internal Server Error'
  
  return NextResponse.json(
    { error: { message, code: error.response?.data?.error?.code } },
    { status }
  )
}
```

## Autenticación

### API Key Authentication

Hyperswitch utiliza autenticación basada en API keys:

```typescript
// Headers requeridos
const headers = {
  'api-key': process.env.HYPERSWITCH_API_KEY,
  'Content-Type': 'application/json',
}
```

### JWT Token para Sesiones de Cliente

```typescript
// Para operaciones del lado del cliente
const clientHeaders = {
  'Authorization': `Bearer ${jwt_token}`,
  'Content-Type': 'application/json',
}
```

### Rotación de Keys

```typescript
// src/infrastructure/security/KeyRotation.ts
export class KeyRotationService {
  private currentKey: string
  private backupKey: string

  async rotateKey(): Promise<void> {
    try {
      // Implementar lógica de rotación
      const newKey = await this.generateNewKey()
      this.backupKey = this.currentKey
      this.currentKey = newKey
      
      // Actualizar configuración
      await this.updateEnvironmentConfig(newKey)
    } catch (error) {
      console.error('Key rotation failed:', error)
      throw error
    }
  }

  private async generateNewKey(): Promise<string> {
    // Llamada a Hyperswitch para generar nueva key
    const response = await fetch('/api/hyperswitch/accounts/keys/generate', {
      method: 'POST',
      headers: { 'api-key': this.currentKey }
    })
    
    const { api_key } = await response.json()
    return api_key
  }
}
```

## Endpoints Principales

### Payments

```typescript
// Crear un pago
POST /api/hyperswitch/payments
{
  "amount": 1000,
  "currency": "HNL",
  "customer_id": "cust_123",
  "payment_method": "card",
  "payment_method_data": {
    "card": {
      "card_number": "4111111111111111",
      "card_exp_month": "12",
      "card_exp_year": "2025",
      "card_holder_name": "John Doe",
      "card_cvc": "123"
    }
  },
  "description": "Payment for order #12345",
  "return_url": "https://multipaga.com/payments/return",
  "metadata": {
    "order_id": "order_12345",
    "customer_email": "customer@example.com"
  }
}

// Confirmar un pago
POST /api/hyperswitch/payments/{payment_id}/confirm
{
  "payment_method": "card",
  "return_url": "https://multipaga.com/payments/return"
}

// Capturar un pago
POST /api/hyperswitch/payments/{payment_id}/capture
{
  "amount_to_capture": 1000
}

// Obtener un pago
GET /api/hyperswitch/payments/{payment_id}

// Listar pagos
GET /api/hyperswitch/payments?limit=20&offset=0&created[gte]=2024-01-01
```

### Refunds

```typescript
// Crear un reembolso
POST /api/hyperswitch/refunds
{
  "payment_id": "pay_123",
  "amount": 500,
  "reason": "requested_by_customer",
  "metadata": {
    "refund_reason": "Customer request",
    "agent_id": "agent_456"
  }
}

// Obtener un reembolso
GET /api/hyperswitch/refunds/{refund_id}

// Listar reembolsos
GET /api/hyperswitch/refunds?payment_id=pay_123
```

### Customers

```typescript
// Crear un cliente
POST /api/hyperswitch/customers
{
  "customer_id": "cust_unique_123",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+50412345678",
  "phone_country_code": "+504",
  "description": "Premium customer",
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Tegucigalpa",
    "state": "Francisco Morazán",
    "zip": "11101",
    "country": "HN"
  },
  "metadata": {
    "segment": "premium",
    "acquisition_channel": "web"
  }
}

// Actualizar un cliente
POST /api/hyperswitch/customers/{customer_id}
{
  "name": "Juan Carlos Pérez",
  "email": "juan.carlos@example.com"
}

// Obtener un cliente
GET /api/hyperswitch/customers/{customer_id}
```

### Payment Methods

```typescript
// Crear un método de pago
POST /api/hyperswitch/payment_methods
{
  "customer_id": "cust_123",
  "payment_method": "card",
  "payment_method_data": {
    "card": {
      "card_number": "4111111111111111",
      "card_exp_month": "12",
      "card_exp_year": "2025",
      "card_holder_name": "Juan Pérez",
      "card_cvc": "123"
    }
  },
  "metadata": {
    "nickname": "Mi tarjeta principal"
  }
}

// Listar métodos de pago de un cliente
GET /api/hyperswitch/customers/{customer_id}/payment_methods
```

### Connectors

```typescript
// Crear un conector
POST /api/hyperswitch/account/{merchant_id}/connectors
{
  "connector_type": "payment_processor",
  "connector_name": "stripe",
  "connector_account_details": {
    "auth_type": "HeaderKey",
    "api_key": "sk_test_..."
  },
  "test_mode": true,
  "disabled": false,
  "payment_methods_enabled": [
    {
      "payment_method": "card",
      "payment_method_types": ["visa", "mastercard"]
    }
  ],
  "metadata": {
    "integration_version": "2023-10-16"
  }
}

// Listar conectores
GET /api/hyperswitch/account/{merchant_id}/connectors

// Actualizar un conector
POST /api/hyperswitch/account/{merchant_id}/connectors/{connector_id}
{
  "disabled": false,
  "connector_account_details": {
    "auth_type": "HeaderKey",
    "api_key": "sk_live_..."
  },
  "test_mode": false
}
```

## Manejo de Errores

### Estructura de Errores

```typescript
interface HyperswitchError {
  error: {
    type: string
    code: string
    message: string
    param?: string
    payment_method?: string
    charge?: string
  }
}
```

### Códigos de Error Comunes

```typescript
// src/infrastructure/api/ErrorHandler.ts
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'HE_00',
  INVALID_API_KEY: 'HE_01',
  
  // Payment errors
  CARD_DECLINED: 'HE_02',
  INSUFFICIENT_FUNDS: 'HE_03',
  EXPIRED_CARD: 'HE_04',
  INVALID_CVC: 'HE_05',
  
  // Processing errors
  PROCESSING_ERROR: 'HE_06',
  CONNECTOR_ERROR: 'HE_07',
  
  // Validation errors
  INVALID_REQUEST: 'HE_08',
  MISSING_REQUIRED_PARAM: 'HE_09',
  
  // Rate limiting
  RATE_LIMITED: 'HE_10',
} as const

export class ApiErrorHandler {
  static handle(error: any): {
    message: string
    code: string
    retryable: boolean
  } {
    const errorCode = error.response?.data?.error?.code
    const errorMessage = error.response?.data?.error?.message
    
    switch (errorCode) {
      case ERROR_CODES.CARD_DECLINED:
        return {
          message: 'Su tarjeta fue rechazada. Por favor, verifique los datos o use otra tarjeta.',
          code: errorCode,
          retryable: true
        }
      
      case ERROR_CODES.INSUFFICIENT_FUNDS:
        return {
          message: 'Fondos insuficientes en su cuenta.',
          code: errorCode,
          retryable: false
        }
      
      case ERROR_CODES.RATE_LIMITED:
        return {
          message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
          code: errorCode,
          retryable: true
        }
      
      default:
        return {
          message: errorMessage || 'Error inesperado. Por favor, intente nuevamente.',
          code: errorCode || 'UNKNOWN',
          retryable: true
        }
    }
  }
}
```

### Retry Logic

```typescript
// src/infrastructure/api/RetryService.ts
export class RetryService {
  private maxRetries = 3
  private baseDelay = 1000 // 1 second

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryable: boolean = true
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (!retryable || attempt === this.maxRetries) {
          throw error
        }

        const delay = this.calculateDelay(attempt)
        await this.wait(delay)
        
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`)
      }
    }

    throw lastError!
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return exponentialDelay + jitter
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Webhooks

### Configuración de Webhooks

```typescript
// Crear un webhook
POST /api/hyperswitch/webhooks
{
  "webhook_url": "https://multipaga.com/api/webhooks/hyperswitch",
  "webhook_events": [
    "payment_succeeded",
    "payment_failed",
    "refund_succeeded",
    "refund_failed",
    "dispute_opened"
  ],
  "webhook_username": "multipaga_webhook",
  "webhook_password": "secure_password_123",
  "webhook_headers": {
    "X-Webhook-Source": "hyperswitch"
  }
}
```

### Manejo de Webhooks

```typescript
// app/api/webhooks/hyperswitch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/infrastructure/webhooks/WebhookVerifier'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-webhook-signature')
    
    // Verificar firma del webhook
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    
    // Procesar evento
    await processWebhookEvent(event)
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent(event: any) {
  switch (event.event_type) {
    case 'payment_succeeded':
      await handlePaymentSucceeded(event.content)
      break
    
    case 'payment_failed':
      await handlePaymentFailed(event.content)
      break
    
    case 'refund_succeeded':
      await handleRefundSucceeded(event.content)
      break
    
    default:
      console.log(`Unhandled webhook event: ${event.event_type}`)
  }
}
```

### Verificación de Firma

```typescript
// src/infrastructure/webhooks/WebhookVerifier.ts
import crypto from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false

  const secret = process.env.HYPERSWITCH_WEBHOOK_SECRET
  if (!secret) return false

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

## Rate Limiting

### Límites de API

| Endpoint | Límite | Ventana de Tiempo |
|----------|---------|-------------------|
| `/payments` | 100 req/min | 1 minuto |
| `/refunds` | 50 req/min | 1 minuto |
| `/customers` | 200 req/min | 1 minuto |
| `/webhooks` | Sin límite | - |

### Implementación de Rate Limiting

```typescript
// src/infrastructure/api/RateLimiter.ts
export class RateLimiter {
  private requests = new Map<string, number[]>()
  private limits = {
    '/payments': { max: 100, window: 60000 },
    '/refunds': { max: 50, window: 60000 },
    '/customers': { max: 200, window: 60000 },
  }

  canMakeRequest(endpoint: string, clientId: string): boolean {
    const key = `${clientId}:${endpoint}`
    const now = Date.now()
    const limit = this.limits[endpoint as keyof typeof this.limits]
    
    if (!limit) return true

    const requests = this.requests.get(key) || []
    const validRequests = requests.filter(
      time => now - time < limit.window
    )

    if (validRequests.length >= limit.max) {
      return false
    }

    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }

  getRetryAfter(endpoint: string, clientId: string): number {
    const key = `${clientId}:${endpoint}`
    const requests = this.requests.get(key) || []
    const limit = this.limits[endpoint as keyof typeof this.limits]
    
    if (!limit || requests.length === 0) return 0

    const oldestRequest = Math.min(...requests)
    return Math.max(0, limit.window - (Date.now() - oldestRequest))
  }
}
```

## Ejemplos de Código

### Hook para Pagos

```typescript
// src/presentation/hooks/usePayments.ts
import { useMutation, useQuery } from 'react-query'
import { PaymentRequest, PaymentResponse } from '@/types/hyperswitch'

export const useCreatePayment = () => {
  return useMutation<PaymentResponse, Error, PaymentRequest>(
    async (paymentData) => {
      const response = await fetch('/api/hyperswitch/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        throw new Error('Payment creation failed')
      }

      return response.json()
    },
    {
      onSuccess: (data) => {
        console.log('Payment created:', data.payment_id)
      },
      onError: (error) => {
        console.error('Payment error:', error)
      },
    }
  )
}

export const usePayment = (paymentId: string) => {
  return useQuery<PaymentResponse>(
    ['payment', paymentId],
    async () => {
      const response = await fetch(`/api/hyperswitch/payments/${paymentId}`)
      return response.json()
    },
    {
      enabled: !!paymentId,
      refetchInterval: 5000, // Poll every 5 seconds
    }
  )
}
```

### Componente de Pago

```typescript
// src/presentation/components/payments/PaymentForm.tsx
import { useCreatePayment } from '@/presentation/hooks/usePayments'

export function PaymentForm() {
  const createPayment = useCreatePayment()

  const handleSubmit = async (data: PaymentFormData) => {
    try {
      const payment = await createPayment.mutateAsync({
        amount: data.amount * 100, // Convert to cents
        currency: 'HNL',
        customer_id: data.customerId,
        payment_method: 'card',
        payment_method_data: {
          card: {
            card_number: data.cardNumber,
            card_exp_month: data.expMonth,
            card_exp_year: data.expYear,
            card_holder_name: data.holderName,
            card_cvc: data.cvc,
          },
        },
        description: data.description,
        return_url: `${window.location.origin}/payments/return`,
      })

      // Redirect to confirmation page
      window.location.href = `/payments/${payment.payment_id}/confirm`
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

## Testing

### Tests de Integración

```typescript
// tests/api/payments.test.ts
import { HyperswitchClient } from '@/infrastructure/api/HttpClient'

describe('Payments API', () => {
  let client: HyperswitchClient

  beforeEach(() => {
    client = new HyperswitchClient()
  })

  test('should create a payment', async () => {
    const paymentData = {
      amount: 1000,
      currency: 'HNL',
      payment_method: 'card',
      // ... other fields
    }

    const payment = await client.request({
      method: 'POST',
      url: '/payments',
      data: paymentData,
    })

    expect(payment.payment_id).toBeDefined()
    expect(payment.status).toBe('requires_confirmation')
  })

  test('should handle payment errors', async () => {
    const invalidPaymentData = {
      amount: -100, // Invalid amount
      currency: 'INVALID',
    }

    await expect(
      client.request({
        method: 'POST',
        url: '/payments',
        data: invalidPaymentData,
      })
    ).rejects.toThrow()
  })
})
```

### Mock del Cliente API

```typescript
// tests/mocks/HyperswitchMock.ts
export class MockHyperswitchClient {
  async request<T>(config: any): Promise<T> {
    // Simular respuestas basadas en la URL y método
    if (config.url === '/payments' && config.method === 'POST') {
      return {
        payment_id: 'pay_mock_123',
        status: 'requires_confirmation',
        amount: config.data.amount,
        currency: config.data.currency,
      } as T
    }

    throw new Error('Mock not implemented for this endpoint')
  }
}
```

## Mejores Prácticas

### 1. Seguridad

```typescript
// Nunca exponer keys secretas en el frontend
const publicKey = process.env.NEXT_PUBLIC_HYPERSWITCH_PUBLISHABLE_KEY
// ✅ Correcto para frontend

const secretKey = process.env.HYPERSWITCH_SECRET_KEY
// ❌ Solo usar en backend
```

### 2. Caching

```typescript
// Usar React Query para caching automático
const { data: payment, isLoading } = useQuery(
  ['payment', paymentId],
  () => fetchPayment(paymentId),
  {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  }
)
```

### 3. Logging

```typescript
// Implementar logging estructurado
import { logger } from '@/infrastructure/logging/Logger'

logger.info('Payment created', {
  paymentId: payment.payment_id,
  amount: payment.amount,
  currency: payment.currency,
  customerId: payment.customer_id,
})
```

### 4. Monitoreo

```typescript
// Métricas de API
import { metrics } from '@/infrastructure/monitoring/Metrics'

metrics.increment('api.payments.created')
metrics.histogram('api.payments.response_time', responseTime)
metrics.gauge('api.payments.active_count', activePayments)
```

### 5. Idempotencia

```typescript
// Usar idempotency keys para operaciones críticas
const idempotencyKey = generateIdempotencyKey()

const payment = await client.request({
  method: 'POST',
  url: '/payments',
  data: paymentData,
  headers: {
    'Idempotency-Key': idempotencyKey,
  },
})
```

---

## Recursos Adicionales

- [Documentación de Hyperswitch API](https://docs.hyperswitch.io/api-reference)
- [Postman Collection](./postman/hyperswitch-collection.json)
- [Códigos de Error Completos](./error-codes.md)
- [Ejemplos de Webhooks](./webhook-examples.md)

Para preguntas específicas sobre la integración, consulte el [documento de troubleshooting](./troubleshooting.md) o contacte al equipo de desarrollo.