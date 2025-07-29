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

// Schema para crear reembolsos
const createRefundSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  amount: z.number().int().min(1).optional(), // Si no se especifica, reembolso total
  reason: z.enum([
    'duplicate',
    'fraudulent', 
    'requested_by_customer',
    'subscription_canceled',
    'product_unsatisfactory',
    'product_not_received',
    'unrecognized',
    'credit_not_processed',
    'general',
    'processing_error'
  ]).optional(),
  refund_id: z.string().optional(), // ID personalizado del reembolso
  metadata: z.record(z.any()).optional(),
  merchant_refund_id: z.string().optional(),
})

// Schema para listar reembolsos
const listRefundsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  payment_id: z.string().optional(),
  refund_id: z.string().optional(),
  profile_id: z.string().optional(),
  created: z.string().optional(),
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  status: z.enum([
    'pending',
    'succeeded', 
    'failed',
    'review',
    'manual_review'
  ]).optional(),
  currency: z.string().length(3).optional(),
  amount: z.coerce.number().int().optional(),
  connector: z.string().optional(),
  merchant_refund_id: z.string().optional(),
  // Ordenamiento
  sort_by: z.enum(['created_at', 'amount', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

// ======================================================================
// HANDLERS DE API
// ======================================================================

// GET /api/refunds - Listar reembolsos
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // Validar parámetros
    const validatedParams = listRefundsSchema.parse(searchParams)
    
    // Obtener headers de contexto
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    // Realizar petición a Hyperswitch
    const refunds = await hyperswitchRequest('/refunds/list', {
      method: 'GET',
      queryParams: validatedParams,
      merchantId: merchantId || undefined,
      profileId: profileId || undefined,
    })
    
    return NextResponse.json({
      success: true,
      data: refunds.data || [],
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: refunds.has_more || false,
        total_count: refunds.total_count || 0,
      }
    })

  } catch (error: any) {
    console.error('Error listing refunds:', error)

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

// POST /api/refunds - Crear reembolso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos de entrada
    const validatedData = createRefundSchema.parse(body)
    
    // Obtener headers de contexto
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    // Preparar datos del reembolso
    const refundData = {
      ...validatedData,
      // Si no se especifica reason, usar por defecto
      reason: validatedData.reason || 'requested_by_customer',
    }
    
    // Crear reembolso en Hyperswitch
    const refund = await hyperswitchRequest('/refunds', {
      method: 'POST',
      body: refundData,
      merchantId: merchantId || undefined,
      profileId: profileId || undefined,
    })
    
    // Log del reembolso creado
    console.info('Refund created:', {
      refund_id: refund.refund_id,
      payment_id: refund.payment_id,
      merchant_id: merchantId,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
    })
    
    return NextResponse.json({
      success: true,
      data: refund
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating refund:', error)

    if (error instanceof z.ZodError) {
      return errorResponse('Invalid refund data', 400, 'VALIDATION_ERROR')
    }

    // Error de Hyperswitch
    if (error.status) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            type: 'hyperswitch_error',
            message: error.message || 'Refund creation failed',
            code: error.error?.code || 'REFUND_ERROR'
          }
        },
        { status: error.status }
      )
    }

    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

// PUT /api/refunds - Actualizar reembolso (solo algunos campos)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { refund_id, ...updateData } = body
    
    if (!refund_id) {
      return errorResponse('Refund ID is required')
    }
    
    // Solo permitir actualizar metadata por seguridad
    const allowedUpdates = {
      metadata: updateData.metadata,
    }
    
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    
    // Actualizar reembolso en Hyperswitch
    const refund = await hyperswitchRequest(`/refunds/${refund_id}`, {
      method: 'PUT',
      body: allowedUpdates,
      merchantId: merchantId || undefined,
      profileId: profileId || undefined,
    })
    
    return NextResponse.json({
      success: true,
      data: refund
    })

  } catch (error: any) {
    console.error('Error updating refund:', error)

    // Error de Hyperswitch
    if (error.status) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            type: 'hyperswitch_error',
            message: error.message || 'Refund update failed',
            code: error.error?.code || 'REFUND_ERROR'
          }
        },
        { status: error.status }
      )
    }

    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

// DELETE - No soportado (los reembolsos no se pueden eliminar)
export async function DELETE() {
  return errorResponse('Refunds cannot be deleted once created.', 405, 'METHOD_NOT_ALLOWED')
}