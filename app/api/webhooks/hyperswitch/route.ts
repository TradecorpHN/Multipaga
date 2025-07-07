// app/api/webhooks/hyperswitch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { env } from '@/presentation/lib/env-config'

// Webhook event schema
const WebhookEventSchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  created_at: z.string(),
  object_type: z.string(),
  object_id: z.string(),
  data: z.record(z.any()),
  livemode: z.boolean().optional(),
})

// Supported event types
const SUPPORTED_EVENTS = [
  'payment.succeeded',
  'payment.failed',
  'payment.processing',
  'payment.cancelled',
  'payment.captured',
  'payment.authorized',
  'refund.succeeded',
  'refund.failed',
  'refund.pending',
  'dispute.created',
  'dispute.challenged',
  'dispute.won',
  'dispute.lost',
  'mandate.active',
  'mandate.revoked',
  'payout.success',
  'payout.failed',
  'payout.initiated',
]

// Verify webhook signature
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
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.HYPERSWITCH_WEBHOOK_SECRET
    
    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing webhook signature or secret' },
        { status: 401 }
      )
    }

    // Get raw body
    const rawBody = await request.text()
    
    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse and validate event
    const event = WebhookEventSchema.parse(JSON.parse(rawBody))
    
    // Check if we support this event type
    if (!SUPPORTED_EVENTS.includes(event.event_type)) {
      console.log(`Unsupported webhook event type: ${event.event_type}`)
      return NextResponse.json({ received: true })
    }

    // Log the event
    console.log(`Processing webhook event: ${event.event_type} for ${event.object_type} ${event.object_id}`)

    // Process the event based on type
    switch (event.event_type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event)
        break
        
      case 'payment.failed':
        await handlePaymentFailed(event)
        break
        
      case 'payment.captured':
        await handlePaymentCaptured(event)
        break
        
      case 'refund.succeeded':
        await handleRefundSucceeded(event)
        break
        
      case 'refund.failed':
        await handleRefundFailed(event)
        break
        
      case 'dispute.created':
        await handleDisputeCreated(event)
        break
        
      case 'dispute.won':
      case 'dispute.lost':
        await handleDisputeResolved(event)
        break
        
      case 'payout.success':
        await handlePayoutSuccess(event)
        break
        
      case 'payout.failed':
        await handlePayoutFailed(event)
        break
        
      default:
        console.log(`Unhandled event type: ${event.event_type}`)
    }

    // Return success response
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Event handlers
async function handlePaymentSucceeded(event: z.infer<typeof WebhookEventSchema>) {
  const { payment_id, amount, currency, customer_id } = event.data
  
  // TODO: Implement your business logic here
  // - Update order status
  // - Send confirmation email
  // - Update inventory
  // - Trigger fulfillment
  
  console.log(`Payment ${payment_id} succeeded for ${amount} ${currency}`)
}

async function handlePaymentFailed(event: z.infer<typeof WebhookEventSchema>) {
  const { payment_id, error_code, error_message } = event.data
  
  // TODO: Implement your business logic here
  // - Notify customer
  // - Update order status
  // - Log failure reason
  
  console.log(`Payment ${payment_id} failed: ${error_code} - ${error_message}`)
}

async function handlePaymentCaptured(event: z.infer<typeof WebhookEventSchema>) {
  const { payment_id, amount_captured } = event.data
  
  // TODO: Implement your business logic here
  // - Update payment status
  // - Trigger fulfillment if not already done
  
  console.log(`Payment ${payment_id} captured: ${amount_captured}`)
}

async function handleRefundSucceeded(event: z.infer<typeof WebhookEventSchema>) {
  const { refund_id, payment_id, amount } = event.data
  
  // TODO: Implement your business logic here
  // - Update refund status
  // - Send confirmation email
  // - Update accounting records
  
  console.log(`Refund ${refund_id} succeeded for payment ${payment_id}`)
}

async function handleRefundFailed(event: z.infer<typeof WebhookEventSchema>) {
  const { refund_id, payment_id, error_message } = event.data
  
  // TODO: Implement your business logic here
  // - Notify operations team
  // - Update refund status
  // - Log failure reason
  
  console.log(`Refund ${refund_id} failed: ${error_message}`)
}

async function handleDisputeCreated(event: z.infer<typeof WebhookEventSchema>) {
  const { dispute_id, payment_id, amount, reason } = event.data
  
  // TODO: Implement your business logic here
  // - Notify operations team
  // - Gather evidence
  // - Update payment status
  
  console.log(`Dispute ${dispute_id} created for payment ${payment_id}: ${reason}`)
}

async function handleDisputeResolved(event: z.infer<typeof WebhookEventSchema>) {
  const { dispute_id, status, payment_id } = event.data
  
  // TODO: Implement your business logic here
  // - Update dispute status
  // - Process outcome (won/lost)
  // - Update accounting
  
  console.log(`Dispute ${dispute_id} resolved: ${status}`)
}

async function handlePayoutSuccess(event: z.infer<typeof WebhookEventSchema>) {
  const { payout_id, amount, currency } = event.data
  
  // TODO: Implement your business logic here
  // - Update payout status
  // - Send confirmation
  // - Update accounting
  
  console.log(`Payout ${payout_id} succeeded: ${amount} ${currency}`)
}

async function handlePayoutFailed(event: z.infer<typeof WebhookEventSchema>) {
  const { payout_id, error_code, error_message } = event.data
  
  // TODO: Implement your business logic here
  // - Notify recipient
  // - Update payout status
  // - Retry logic
  
  console.log(`Payout ${payout_id} failed: ${error_code} - ${error_message}`)
}

// Webhook configuration endpoint (optional)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/hyperswitch`,
    events: SUPPORTED_EVENTS,
    instructions: 'Configure this endpoint in your Hyperswitch dashboard with the provided webhook secret',
  })
}