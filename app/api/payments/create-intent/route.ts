// =============== ENDPOINT FALTANTE ===============
// app/api/payments/create-intent/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'

const createIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  description: z.string().optional(),
  customer_id: z.string().optional(),
  return_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  confirm: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createIntentSchema.parse(body)

    // Obtener datos de autenticación
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    const environment = request.headers.get('x-environment')

    if (!merchantId || !profileId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Obtener API key desde sesión
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session token' },
        { status: 401 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET!
    const sessionPayload = verify(sessionToken, jwtSecret) as any
    const apiKey = sessionPayload.api_key

    // Determinar URL base
    const baseUrl = environment === 'production' 
      ? process.env.HYPERSWITCH_PROD_URL || 'https://api.hyperswitch.io'
      : process.env.HYPERSWITCH_SANDBOX_URL || 'https://sandbox.hyperswitch.io'

    // Preparar datos del pago para Hyperswitch
    const paymentData = {
      amount: validatedData.amount,
      currency: validatedData.currency,
      description: validatedData.description,
      customer_id: validatedData.customer_id,
      return_url: validatedData.return_url || `${process.env.NEXT_PUBLIC_APP_URL}/payments/complete`,
      metadata: validatedData.metadata,
      confirm: validatedData.confirm,
      profile_id: profileId,
      business_country: 'HN',
      business_label: 'TradecorpHN',
    }

    // Crear payment en Hyperswitch usando API privada
    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey, // Usar API privada
        'Accept': 'application/json',
      },
      body: JSON.stringify(paymentData),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hyperswitch payment creation error:', response.status, errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error?.message || 'Failed to create payment intent',
          code: errorData.error?.code
        },
        { status: response.status }
      )
    }

    const payment = await response.json()
    
    // Log para auditoría
    console.info('Payment intent created:', {
      payment_id: payment.payment_id,
      merchant_id: merchantId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    })

    return NextResponse.json({
      success: true,
      data: {
        client_secret: payment.client_secret,
        payment_id: payment.payment_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      }
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid payment data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}