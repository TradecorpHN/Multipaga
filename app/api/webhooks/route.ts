import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import crypto from 'crypto'
import type { WebhookPayload, WebhookEventData } from '@/types/hyperswitch'

// Schema de validación para webhook payload
const webhookPayloadSchema = z.object({
  event_type: z.enum([
    'payment_succeeded',
    'payment_failed',
    'payment_cancelled',
    'payment_processing',
    'action_required',
    'refund_succeeded',
    'refund_failed',
    'dispute_opened',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ]),
  event_id: z.string(),
  created: z.string(),
  resource_id: z.string(),
  resource: z.object({}).passthrough(), // Permitir cualquier estructura
  api_version: z.string(),
})

// Verificar firma del webhook
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    // Comparar usando comparación de tiempo constante
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// Procesar evento de pago
async function handlePaymentEvent(eventType: string, data: WebhookEventData) {
  const payment = data.payment
  if (!payment) return

  console.info(`Processing ${eventType}:`, {
    payment_id: payment.payment_id,
    merchant_id: payment.merchant_id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
  })

  switch (eventType) {
    case 'payment_succeeded':
      // Lógica para pago exitoso
      // Aquí podrías:
      // - Actualizar inventario
      // - Enviar email de confirmación
      // - Activar servicios
      await handlePaymentSucceeded(payment)
      break

    case 'payment_failed':
      // Lógica para pago fallido
      await handlePaymentFailed(payment)
      break

    case 'payment_cancelled':
      // Lógica para pago cancelado
      await handlePaymentCancelled(payment)
      break

    case 'action_required':
      // Lógica para acción requerida (3DS, etc.)
      await handleActionRequired(payment)
      break

    default:
      console.warn(`Unhandled payment event: ${eventType}`)
  }
}

// Procesar evento de reembolso
async function handleRefundEvent(eventType: string, data: WebhookEventData) {
  const refund = data.refund
  if (!refund) return

  console.info(`Processing ${eventType}:`, {
    refund_id: refund.refund_id,
    payment_id: refund.payment_id,
    merchant_id: refund.merchant_id,
    status: refund.refund_status,
    amount: refund.refund_amount,
    currency: refund.currency,
  })

  switch (eventType) {
    case 'refund_succeeded':
      // Lógica para reembolso exitoso
      await handleRefundSucceeded(refund)
      break

    case 'refund_failed':
      // Lógica para reembolso fallido
      await handleRefundFailed(refund)
      break

    default:
      console.warn(`Unhandled refund event: ${eventType}`)
  }
}

// Procesar evento de disputa
async function handleDisputeEvent(eventType: string, data: WebhookEventData) {
  const dispute = data.dispute
  if (!dispute) return

  console.info(`Processing ${eventType}:`, {
    dispute_id: dispute.dispute_id,
    payment_id: dispute.payment_id,
    status: dispute.dispute_status,
    stage: dispute.dispute_stage,
    amount: dispute.amount,
    currency: dispute.currency,
  })

  switch (eventType) {
    case 'dispute_opened':
      // Nueva disputa abierta - notificar al merchant
      await handleDisputeOpened(dispute)
      break

    case 'dispute_challenged':
      // Disputa ha sido disputada
      await handleDisputed(dispute)
      break

    case 'dispute_won':
      // Disputa ganada
      await handleDisputeWon(dispute)
      break

    case 'dispute_lost':
      // Disputa perdida
      await handleDisputeLost(dispute)
      break

    default:
      console.warn(`Unhandled dispute event: ${eventType}`)
  }
}

// Implementaciones específicas de handlers
async function handlePaymentSucceeded(payment: any) {
  // Implementar lógica específica de tu negocio
  console.info('Payment succeeded - implementing business logic')
  
  // Ejemplo: Enviar notificación, actualizar base de datos, etc.
  // await notificationService.sendPaymentConfirmation(payment)
  // await inventoryService.updateStock(payment.metadata?.product_id)
}

async function handlePaymentFailed(payment: any) {
  console.info('Payment failed - implementing retry or notification logic')
  
  // Ejemplo: Notificar fallo, programar retry, etc.
  // await notificationService.sendPaymentFailure(payment)
}

async function handlePaymentCancelled(payment: any) {
  console.info('Payment cancelled - releasing reserved resources')
  
  // Ejemplo: Liberar inventario reservado
  // await inventoryService.releaseReservation(payment.metadata?.reservation_id)
}

async function handleActionRequired(payment: any) {
  console.info('Action required - sending 3DS or redirect info')
  
  // Ejemplo: Enviar instrucciones de 3DS al cliente
  // await notificationService.sendActionRequired(payment)
}

async function handleRefundSucceeded(refund: any) {
  console.info('Refund succeeded - updating order status')
  
  // Ejemplo: Actualizar estado del pedido
  // await orderService.markAsRefunded(refund.payment_id)
}

async function handleRefundFailed(refund: any) {
  console.info('Refund failed - manual intervention required')
  
  // Ejemplo: Notificar fallo para intervención manual
  // await notificationService.alertRefundFailure(refund)
}

async function handleDisputeOpened(dispute: any) {
  console.warn('Dispute opened - immediate attention required')
  
  // Ejemplo: Notificar urgentemente al equipo de soporte
  // await notificationService.alertDisputeOpened(dispute)
}

async function handleDisputed(dispute: any) {
  console.info('Dispute challenged - awaiting resolution')
  
  // Ejemplo: Actualizar estado interno
  // await disputeService.markAsDisputed(dispute.dispute_id)
}

async function handleDisputeWon(dispute: any) {
  console.info('Dispute won - funds restored')
  
  // Ejemplo: Actualizar contabilidad
  // await accountingService.restoreFunds(dispute)
}

async function handleDisputeLost(dispute: any) {
  console.warn('Dispute lost - funds deducted')
  
  // Ejemplo: Actualizar contabilidad y notificar
  // await accountingService.deductFunds(dispute)
  // await notificationService.notifyDisputeLoss(dispute)
}

// POST /api/webhooks - Recibir webhooks de Hyperswitch
export async function POST(request: NextRequest) {
  try {
    // Obtener el payload crudo para verificación de firma
    const rawPayload = await request.text()
    
    if (!rawPayload) {
      return NextResponse.json(
        { error: 'Payload vacío' },
        { status: 400 }
      )
    }

    // Obtener headers
    const headersList = headers()
    const signature = headersList.get('x-webhook-signature') || 
                     headersList.get('hyperswitch-signature')
    const webhookId = headersList.get('x-webhook-id')
    
    // Verificar firma si está configurada
    const webhookSecret = process.env.HYPERSWITCH_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const isValidSignature = verifyWebhookSignature(rawPayload, signature, webhookSecret)
      
      if (!isValidSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Firma de webhook inválida' },
          { status: 401 }
        )
      }
    } else if (webhookSecret) {
      console.warn('Webhook signature expected but not provided')
      return NextResponse.json(
        { error: 'Firma de webhook requerida' },
        { status: 401 }
      )
    }

    // Parsear payload
    let webhookData: WebhookPayload
    try {
      webhookData = JSON.parse(rawPayload)
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      return NextResponse.json(
        { error: 'Payload JSON inválido' },
        { status: 400 }
      )
    }

    // Validar estructura del webhook
    const validatedData = webhookPayloadSchema.parse(webhookData)

    // Log del webhook recibido
    console.info('Webhook received:', {
      event_type: validatedData.event_type,
      event_id: validatedData.event_id,
      resource_id: validatedData.resource_id,
      webhook_id: webhookId,
      api_version: validatedData.api_version,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })

    // Verificar duplicados (idempotencia)
    // En un entorno de producción, deberías verificar event_id contra una base de datos
    // para evitar procesar el mismo evento múltiples veces

    // Procesar evento según tipo
    try {
      if (validatedData.event_type.startsWith('payment_') || 
          validatedData.event_type === 'action_required') {
        await handlePaymentEvent(validatedData.event_type, validatedData.resource)
      } else if (validatedData.event_type.startsWith('refund_')) {
        await handleRefundEvent(validatedData.event_type, validatedData.resource)
      } else if (validatedData.event_type.startsWith('dispute_')) {
        await handleDisputeEvent(validatedData.event_type, validatedData.resource)
      } else {
        console.warn('Unknown event type:', validatedData.event_type)
      }

      // Respuesta exitosa
      return NextResponse.json({
        success: true,
        event_id: validatedData.event_id,
        processed_at: new Date().toISOString()
      })

    } catch (processingError) {
      console.error('Error processing webhook event:', processingError)
      
      // Aunque el procesamiento falle, devolvemos 200 para evitar que 
      // Hyperswitch reintente indefinidamente
      return NextResponse.json({
        success: false,
        event_id: validatedData.event_id,
        error: 'Error procesando evento',
        processed_at: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Webhook processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Estructura de webhook inválida',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// GET /api/webhooks - Información sobre webhooks
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks',
    method: 'POST',
    description: 'Endpoint para recibir webhooks de Hyperswitch',
    supported_events: [
      'payment_succeeded',
      'payment_failed', 
      'payment_cancelled',
      'payment_processing',
      'action_required',
      'refund_succeeded',
      'refund_failed',
      'dispute_opened',
      'dispute_challenged',
      'dispute_won',
      'dispute_lost'
    ],
    security: {
      signature_header: 'x-webhook-signature or hyperswitch-signature',
      verification: 'HMAC SHA256',
      secret_env: 'HYPERSWITCH_WEBHOOK_SECRET'
    },
    response_format: {
      success: 'boolean',
      event_id: 'string',
      processed_at: 'ISO 8601 timestamp'
    }
  })
}

// Otros métodos no soportados
export async function PUT() {
  return NextResponse.json(
    { error: 'Método no soportado' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no soportado' },
    { status: 405 }
  )
}