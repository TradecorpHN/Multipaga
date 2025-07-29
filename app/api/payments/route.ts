import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ======================================================================
// CONFIGURACIÓN Y UTILIDADES
// ======================================================================

// Helper para obtener variables de entorno
const env = {
  HYPERSWITCH_BASE_URL: process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io',
  HYPERSWITCH_API_KEY: process.env.HYPERSWITCH_API_KEY,
}

// Validación de la API key
if (!env.HYPERSWITCH_API_KEY) {
  throw new Error('HYPERSWITCH_API_KEY is required')
}

// Helper para respuestas de error estandarizadas
function errorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'api_error',
        message,
        code: code || 'INVALID_REQUEST',
      },
    },
    { status }
  )
}

// Cliente HTTP personalizado para Hyperswitch
async function hyperswitchRequest<T = any>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    queryParams?: Record<string, any>
    merchantId?: string
    profileId?: string
  } = {}
): Promise<T> {
  const { method = 'GET', body, queryParams, merchantId, profileId } = options

  // Construir URL
  const url = new URL(endpoint, env.HYPERSWITCH_BASE_URL)
  
  // Añadir query parameters
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  // Configurar headers
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${env.HYPERSWITCH_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // Añadir headers de contexto de merchant
  if (merchantId) headers['X-Merchant-Id'] = merchantId
  if (profileId) headers['X-Profile-Id'] = profileId

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      throw {
        status: response.status,
        error: data.error || data,
        message: data.error?.message || data.message || response.statusText,
      }
    }

    return data
  } catch (error: any) {
    console.error('Hyperswitch API Error:', error)
    throw error
  }
}

// ======================================================================
// SCHEMAS DE VALIDACIÓN (Basados en documentación Hyperswitch)
// ======================================================================

// Schema para crear pagos - Siguiendo la documentación oficial
const createPaymentSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1').max(999999999),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor: z.string().max(22).optional(),
  payment_method_type: z.enum([
    'card', 'wallet', 'bank_redirect', 'bank_transfer', 
    'pay_later', 'crypto', 'bank_debit', 'reward'
  ]).optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  return_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  customer: z.object({
    name: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    phone_country_code: z.string().max(5).optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().max(100).optional(),
      line2: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
      state: z.string().max(50).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().max(50).optional(),
      last_name: z.string().max(50).optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  shipping: z.object({
    address: z.object({
      line1: z.string().max(100).optional(),
      line2: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
      state: z.string().max(50).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    }).optional(),
    name: z.string().max(100).optional(),
    email: z.string().email().optional(),
  }).optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().max(50).optional(),
  profile_id: z.string().optional(),
})

// Schema para listar pagos
const listPaymentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  customer_id: z.string().optional(),
  payment_id: z.string().optional(),
  profile_id: z.string().optional(),
  created: z.string().optional(),
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  status: z.enum([
    'requires_payment_method',
    'requires_confirmation', 
    'requires_action',
    'processing',
    'requires_capture',
    'cancelled',
    'succeeded',
    'failed',
    'partially_captured',
    'partially_captured_and_capturable'
  ]).optional(),
  currency: z.string().length(3).optional(),
  amount: z.coerce.number().int().optional(),
  connector: z.string().optional(),
})

// ======================================================================
// HANDLERS DE API
// ======================================================================

// GET /api/payments - Listar pagos
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // Validar parámetros
    const validatedParams = listPaymentsSchema.parse(searchParams)
    
    // Obtener headers de contexto
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    // Realizar petición a Hyperswitch
    const payments = await hyperswitchRequest('/payments/list', {
      method: 'GET',
      queryParams: validatedParams,
      merchantId: merchantId || undefined,
      profileId: profileId || undefined,
    })
    
    return NextResponse.json({
      success: true,
      data: payments.data || [],
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: payments.has_more || false,
        total_count: payments.total_count || 0,
      }
    })

  } catch (error: any) {
    console.error('Error listing payments:', error)

    if (error instanceof z.ZodError) {
      return errorResponse('Invalid parameters', 400, 'VALIDATION_ERROR')
    }

    // Error de Hyperswitch
    if (error.status) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            type: 'hyperswitch_error',
            message: error.message || 'Hyperswitch API error',
            code: error.error?.code || 'API_ERROR'
          }
        },
        { status: error.status }
      )
    }

    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

// POST /api/payments - Crear pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos de entrada
    const validatedData = createPaymentSchema.parse(body)
    
    // Obtener headers de contexto
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    // Preparar datos del pago
    const paymentData = {
      ...validatedData,
      // Valores por defecto para Honduras
      business_country: validatedData.business_country || 'HN',
      business_label: validatedData.business_label || 'Multipaga',
    }
    
    // Si no se especifica return_url, usar una por defecto
    if (!paymentData.return_url) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin')
      paymentData.return_url = `${baseUrl}/payments/complete`
    }
    
    // Crear pago en Hyperswitch
    const payment = await hyperswitchRequest('/payments', {
      method: 'POST',
      body: paymentData,
      merchantId: merchantId || undefined,
      profileId: profileId || undefined,
    })
    
    // Log del pago creado
    console.info('Payment created:', {
      payment_id: payment.payment_id,
      merchant_id: merchantId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    })
    
    return NextResponse.json({
      success: true,
      data: payment
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating payment:', error)

    if (error instanceof z.ZodError) {
      return errorResponse('Invalid payment data', 400, 'VALIDATION_ERROR')
    }

    // Error de Hyperswitch
    if (error.status) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            type: 'hyperswitch_error',
            message: error.message || 'Payment creation failed',
            code: error.error?.code || 'PAYMENT_ERROR'
          }
        },
        { status: error.status }
      )
    }

    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

// PUT /api/payments - Operaciones en lote
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar operación de batch
    if (!body.operation || !body.payment_ids || !Array.isArray(body.payment_ids)) {
      return errorResponse('Invalid batch operation. Requires operation and payment_ids.')
    }
    
    const { operation, payment_ids, ...operationData } = body
    
    if (payment_ids.length === 0 || payment_ids.length > 50) {
      return errorResponse('Invalid number of payment_ids (1-50).')
    }
    
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    const results = []
    const errors = []
    
    // Procesar operaciones en batch
    for (const paymentId of payment_ids) {
      try {
        let result
        
        switch (operation) {
          case 'cancel':
            result = await hyperswitchRequest(`/payments/${paymentId}/cancel`, {
              method: 'POST',
              body: operationData,
              merchantId: merchantId || undefined,
              profileId: profileId || undefined,
            })
            break
          case 'capture':
            result = await hyperswitchRequest(`/payments/${paymentId}/capture`, {
              method: 'POST',
              body: operationData,
              merchantId: merchantId || undefined,
              profileId: profileId || undefined,
            })
            break
          default:
            throw new Error(`Operation '${operation}' not supported`)
        }
        
        results.push({
          payment_id: paymentId,
          success: true,
          data: result
        })
        
      } catch (error: any) {
        errors.push({
          payment_id: paymentId,
          success: false,
          error: error.message || String(error)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      operation,
      results,
      errors,
      summary: {
        total: payment_ids.length,
        successful: results.length,
        failed: errors.length
      }
    })

  } catch (error: any) {
    console.error('Error in batch payment operation:', error)
    return errorResponse('Batch operation failed', 500, 'BATCH_ERROR')
  }
}

// DELETE - No soportado
export async function DELETE() {
  return errorResponse('Payments cannot be deleted. Use cancellation instead.', 405, 'METHOD_NOT_ALLOWED')
}