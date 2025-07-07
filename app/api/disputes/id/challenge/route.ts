import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getHyperswitchClient } from '@/lib/hyperswitch'
import type { DisputeEvidenceRequest } from '@/types/hyperswitch'

interface RouteContext {
  params: {
    id: string
  }
}

// Schema de validación para envío de evidencia de disputa
const challengeDisputeSchema = z.object({
  dispute_id: z.string(),
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication',
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other'
  ]),
  evidence_description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  shipping_tracking_number: z.string().max(100, 'Número de tracking muy largo').optional(),
  refund_amount: z.number().min(0, 'Monto de reembolso debe ser positivo').optional(),
  additional_notes: z.string().max(2000, 'Notas adicionales muy largas').optional(),
  evidence_files: z.array(z.string()).min(1, 'Debe incluir al menos un archivo de evidencia'),
  submitted_at: z.string().datetime('Fecha de envío inválida'),
})

// POST /api/disputes/[id]/challenge - Enviar evidencia para disputar un cargo
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const disputeId = context.params.id
    const body = await request.json()
    
    // Validar que el ID coincida
    if (disputeId !== body.dispute_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID de disputa no coincide' 
        },
        { status: 400 }
      )
    }
    
    // Validar datos de entrada
    const validatedData = challengeDisputeSchema.parse(body)
    
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
    
    // Primero verificar que la disputa existe y puede ser disputada
    let dispute
    try {
      dispute = await hyperswitchClient.getDispute(disputeId)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status_code' in error) {
        const hyperswitchError = error as any
        
        if (hyperswitchError.status_code === 404) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Disputa no encontrada',
              code: 'DISPUTE_NOT_FOUND' 
            },
            { status: 404 }
          )
        }
      }
      throw error
    }
    
    // Verificar que la disputa puede ser disputada
    if (dispute.dispute_status !== 'dispute_opened') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Esta disputa no puede ser disputada',
          code: 'DISPUTE_NOT_CHALLENGEABLE',
          current_status: dispute.dispute_status 
        },
        { status: 400 }
      )
    }
    
    // Verificar que no ha expirado el tiempo límite
    if (dispute.challenge_required_by) {
      const deadline = new Date(dispute.challenge_required_by)
      const now = new Date()
      
      if (now > deadline) {
        return NextResponse.json(
          { 
            success: false,
            error: 'El tiempo límite para disputar ha expirado',
            code: 'CHALLENGE_DEADLINE_EXPIRED',
            deadline: dispute.challenge_required_by 
          },
          { status: 400 }
        )
      }
    }
    
    // Preparar datos de evidencia para Hyperswitch
    const evidenceData: DisputeEvidenceRequest = {
      dispute_id: validatedData.dispute_id,
      evidence_type: validatedData.evidence_type,
      evidence_description: validatedData.evidence_description,
      customer_email: validatedData.customer_email || undefined,
      shipping_tracking_number: validatedData.shipping_tracking_number || undefined,
      refund_amount: validatedData.refund_amount || undefined,
      additional_notes: validatedData.additional_notes || undefined,
      evidence_files: validatedData.evidence_files,
      submitted_at: validatedData.submitted_at,
    }
    
    // Enviar evidencia a Hyperswitch
    let challengeResult
    try {
      challengeResult = await hyperswitchClient.submitDisputeEvidence(disputeId, evidenceData)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status_code' in error) {
        const hyperswitchError = error as any
        
        return NextResponse.json(
          { 
            success: false,
            error: hyperswitchError.error_message || 'Error enviando evidencia de disputa',
            code: hyperswitchError.error_code,
            type: hyperswitchError.type 
          },
          { status: hyperswitchError.status_code }
        )
      }
      throw error
    }
    
    // Log de la disputa enviada para auditoría
    console.info('Dispute evidence submitted:', {
      dispute_id: disputeId,
      merchant_id: merchantId,
      evidence_type: validatedData.evidence_type,
      evidence_files_count: validatedData.evidence_files.length,
      submitted_at: validatedData.submitted_at,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })
    
    return NextResponse.json({
      success: true,
      message: 'Evidencia de disputa enviada exitosamente',
      data: {
        dispute_id: disputeId,
        challenge_status: 'submitted',
        submitted_at: validatedData.submitted_at,
        evidence_type: validatedData.evidence_type,
        evidence_files_count: validatedData.evidence_files.length,
        hyperswitch_response: challengeResult
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting dispute evidence:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos de evidencia inválidos',
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

// GET /api/disputes/[id]/challenge - Obtener información sobre el estado del challenge
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const disputeId = context.params.id
    
    // Validar ID
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
    
    const hyperswitchClient = getHyperswitchClient()
    
    // Obtener información de la disputa
    try {
      const dispute = await hyperswitchClient.getDispute(disputeId)
      
      // Calcular información sobre el challenge
      const now = new Date()
      const deadline = dispute.challenge_required_by ? new Date(dispute.challenge_required_by) : null
      
      const challengeInfo = {
        dispute_id: disputeId,
        can_challenge: dispute.dispute_status === 'dispute_opened' && deadline && now < deadline,
        challenge_deadline: dispute.challenge_required_by,
        time_remaining: deadline ? Math.max(0, deadline.getTime() - now.getTime()) : null,
        days_remaining: deadline ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
        current_status: dispute.dispute_status,
        current_stage: dispute.dispute_stage,
        challenge_status: dispute.dispute_status === 'dispute_challenged' ? 'submitted' : 
                         dispute.dispute_status === 'dispute_won' ? 'won' :
                         dispute.dispute_status === 'dispute_lost' ? 'lost' : 'pending',
        evidence_requirements: {
          min_files: 1,
          max_files: 10,
          max_file_size: 10 * 1024 * 1024, // 10MB
          accepted_formats: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
          required_description_length: { min: 10, max: 1000 }
        }
      }
      
      return NextResponse.json({
        success: true,
        data: challengeInfo
      })
      
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status_code' in error) {
        const hyperswitchError = error as any
        
        if (hyperswitchError.status_code === 404) {
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
            error: hyperswitchError.error_message || 'Error obteniendo información de disputa',
            code: hyperswitchError.error_code 
          },
          { status: hyperswitchError.status_code }
        )
      }
      throw error
    }

  } catch (error) {
    console.error('Error getting dispute challenge info:', error)
    
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

// PUT /api/disputes/[id]/challenge - No soportado
export async function PUT() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Método no soportado. Use POST para enviar evidencia.' 
    },
    { status: 405 }
  )
}

// DELETE /api/disputes/[id]/challenge - No soportado
export async function DELETE() {
  return NextResponse.json(
    { 
      success: false,
      error: 'La evidencia de disputa no puede ser eliminada una vez enviada.' 
    },
    { status: 405 }
  )
}