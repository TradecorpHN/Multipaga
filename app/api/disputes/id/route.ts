import { NextRequest, NextResponse } from 'next/server'
import { getHyperswitchClient } from '@/lib/hyperswitch'
import type { DisputeResponse } from '@/types/hyperswitch'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/disputes/[id] - Obtener disputa por ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const disputeId = context.params.id
    
    // Validar que el ID sea válido
    if (!disputeId || typeof disputeId !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID de disputa inválido' 
        },
        { status: 400 }
      )
    }
    
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
      // Obtener disputa de Hyperswitch
      const dispute: DisputeResponse = await hyperswitchClient.getDispute(disputeId)
      
      // Log de acceso para auditoría
      console.info('Dispute accessed:', {
        dispute_id: disputeId,
        merchant_id: merchantId,
        status: dispute.dispute_status,
        stage: dispute.dispute_stage,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      })
      
      return NextResponse.json({
        success: true,
        data: dispute
      })
      
    } catch (hyperswitchError) {
      // Manejar errores específicos de Hyperswitch
      if (typeof hyperswitchError === 'object' && hyperswitchError !== null && 'status_code' in hyperswitchError) {
        const error = hyperswitchError as any
        
        if (error.status_code === 404) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Disputa no encontrada',
              code: 'DISPUTE_NOT_FOUND' 
            },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false,
            error: error.error_message || 'Error obteniendo disputa',
            code: error.error_code 
          },
          { status: error.status_code }
        )
      }
      
      throw hyperswitchError
    }

  } catch (error) {
    console.error('Error getting dispute:', error)
    
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

// PUT /api/disputes/[id] - Actualizar disputa (no soportado directamente)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Las disputas no pueden ser actualizadas directamente. Use endpoints específicos como /challenge.' 
    },
    { status: 405 }
  )
}

// POST /api/disputes/[id] - Realizar acciones en la disputa
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const disputeId = context.params.id
    const body = await request.json()
    
    // Validar entrada
    if (!disputeId || typeof disputeId !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID de disputa inválido' 
        },
        { status: 400 }
      )
    }
    
    if (!body.action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Acción requerida' 
        },
        { status: 400 }
      )
    }
    
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
    
    const hyperswitchClient = getHyperswitchClient()
    
    // Procesar según la acción solicitada
    switch (body.action) {
      case 'accept':
        // Aceptar la disputa (no hacer nada, dejar que expire)
        console.info('Dispute accepted (no action taken):', {
          dispute_id: disputeId,
          merchant_id: merchantId,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json({
          success: true,
          message: 'Disputa marcada como aceptada. No se realizará ninguna acción.',
          action: 'accept'
        })
        
      case 'refresh':
        // Refrescar información de la disputa
        try {
          const dispute = await hyperswitchClient.getDispute(disputeId)
          
          return NextResponse.json({
            success: true,
            data: dispute,
            action: 'refresh'
          })
          
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'status_code' in error) {
            const hyperswitchError = error as any
            return NextResponse.json(
              { 
                success: false,
                error: hyperswitchError.error_message || 'Error refrescando disputa',
                code: hyperswitchError.error_code 
              },
              { status: hyperswitchError.status_code }
            )
          }
          throw error
        }
        
      default:
        return NextResponse.json(
          { 
            success: false,
            error: `Acción '${body.action}' no soportada. Acciones válidas: accept, refresh` 
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error processing dispute action:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error procesando acción de disputa',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/disputes/[id] - No soportado
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Las disputas no pueden ser eliminadas.' 
    },
    { status: 405 }
  )
}