// =============================================================================
// app/api/payment-methods/route.ts - ENDPOINT PARA MÉTODOS DE PAGO
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema para obtener métodos de pago disponibles
const paymentMethodsSchema = z.object({
  currency: z.string().length(3).optional(),
  country: z.string().length(2).optional(),
  amount: z.number().positive().optional(),
  customer_id: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // Validar parámetros
    const validatedParams = paymentMethodsSchema.parse({
      ...searchParams,
      amount: searchParams.amount ? Number(searchParams.amount) : undefined,
    })

    // Obtener datos de autenticación de headers (middleware)
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')
    const environment = request.headers.get('x-environment')

    if (!merchantId || !profileId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'NO_AUTH'
        },
        { status: 401 }
      )
    }

    // Determinar URL base según el environment
    const baseUrl = environment === 'production' 
      ? process.env.HYPERSWITCH_PROD_URL || 'https://api.hyperswitch.io'
      : process.env.HYPERSWITCH_SANDBOX_URL || 'https://sandbox.hyperswitch.io'

    // Obtener API key desde cookies de sesión para hacer la petición
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session token', code: 'NO_SESSION' },
        { status: 401 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET!
    const sessionPayload = verify(sessionToken, jwtSecret) as any
    const apiKey = sessionPayload.api_key

    // Construir query params para Hyperswitch
    const queryParams = new URLSearchParams()
    if (validatedParams.currency) queryParams.append('currency', validatedParams.currency)
    if (validatedParams.country) queryParams.append('country', validatedParams.country)
    if (validatedParams.amount) queryParams.append('amount', validatedParams.amount.toString())
    if (validatedParams.customer_id) queryParams.append('customer_id', validatedParams.customer_id)
    
    queryParams.append('business_country', 'HN')
    queryParams.append('business_label', 'TradecorpHN')

    // Llamar a Hyperswitch para obtener métodos de pago disponibles
    const response = await fetch(
      `${baseUrl}/account/${merchantId}/business_profile/${profileId}/payment_methods?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hyperswitch payment methods error:', response.status, errorText)
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch payment methods',
          code: 'HYPERSWITCH_ERROR'
        },
        { status: response.status }
      )
    }

    const paymentMethods = await response.json()
    
    return NextResponse.json({
      success: true,
      data: paymentMethods,
      merchant_id: merchantId,
      profile_id: profileId,
      environment,
    })

  } catch (error) {
    console.error('Error fetching payment methods:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}