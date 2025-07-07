import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getHyperswitchClient } from '@/lib/hyperswitch'
import type { DisputeListRequest } from '@/types/hyperswitch'

// Schema de validación para listar disputas
const listDisputesSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  dispute_status: z.enum([
    'dispute_opened',
    'dispute_expired',
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ]).optional(),
  dispute_stage: z.enum([
    'pre_dispute',
    'dispute',
    'pre_arbitration'
  ]).optional(),
  reason: z.string().max(100).optional(),
  connector: z.string().max(50).optional(),
  received_time: z.string().datetime().optional(),
  received_time_lt: z.string().datetime().optional(),
  received_time_gt: z.string().datetime().optional(),
  received_time_lte: z.string().datetime().optional(),
  received_time_gte: z.string().datetime().optional(),
})

// GET /api/disputes - Listar disputas
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // Validar parámetros
    const validatedParams = listDisputesSchema.parse(searchParams)
    
    // Verificar autenticación
    const merchantId = request.headers.get('x-merchant-id')
    if (!merchantId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No autorizado' 
        },
        { status: 401 }
      )
    }
    
    // Obtener cliente de Hyperswitch
    const hyperswitchClient = getHyperswitchClient()
    
    try {
      // Realizar petición a Hyperswitch
      const disputesResponse = await hyperswitchClient.listDisputes(validatedParams)
      
      // Transformar respuesta si es necesario
      const disputes = Array.isArray(disputesResponse.data) ? 
        disputesResponse.data : 
        disputesResponse
      
      // Log de acceso para auditoría
      console.info('Disputes listed:', {
        merchant_id: merchantId,
        count: Array.isArray(disputes) ? disputes.length : 0,
        filters: validatedParams,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      })
      
      return NextResponse.json({
        success: true,
        data: disputes || [],
        pagination: {
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          total: disputesResponse.total_count || (Array.isArray(disputes) ? disputes.length : 0),
          has_more: disputesResponse.has_more || false,
        },
        filters: validatedParams
      })
      
    } catch (hyperswitchError) {
      // Manejar errores específicos de Hyperswitch
      if (typeof hyperswitchError === 'object' && hyperswitchError !== null && 'status_code' in hyperswitchError) {
        const error = hyperswitchError as any
        
        return NextResponse.json(
          { 
            success: false,
            error: error.error_message || 'Error obteniendo disputas',
            code: error.error_code 
          },
          { status: error.status_code }
        )
      }
      
      throw hyperswitchError
    }

  } catch (error) {
    console.error('Error listing disputes:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/disputes - Las disputas no se crean directamente, se generan por Hyperswitch
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Las disputas no se pueden crear directamente. Son generadas automáticamente por los procesadores de pago cuando un cliente inicia una disputa.',
      info: 'Para disputar un cargo, use el endpoint /api/disputes/{id}/challenge'
    },
    { status: 405 }
  )
}

// PUT /api/disputes - Operaciones en lote no soportadas
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Operaciones en lote no soportadas para disputas.',
      info: 'Use endpoints específicos como /api/disputes/{id}/challenge para acciones individuales'
    },
    { status: 405 }
  )
}

// DELETE /api/disputes - No soportado
export async function DELETE() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Las disputas no pueden ser eliminadas.' 
    },
    { status: 405 }
  )
}