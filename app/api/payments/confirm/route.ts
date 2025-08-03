import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getApiUrl } from '@/lib/environment';

// Validation schema
const confirmPaymentSchema = z.object({
  client_secret: z.string().min(1, 'Client secret requerido'),
  payment_method: z.string().min(1, 'Método de pago requerido'),
  payment_method_data: z.object({
    card: z.object({
      card_number: z.string().min(1, 'Número de tarjeta requerido'),
      card_exp_month: z.string().min(1, 'Mes de vencimiento requerido'),
      card_exp_year: z.string().min(1, 'Año de vencimiento requerido'),
      card_cvc: z.string().min(1, 'CVC requerido'),
      card_holder_name: z.string().min(1, 'Nombre del titular requerido'),
    }).optional(),
  }).optional(),
  customer_id: z.string().optional(),
  merchant_id: z.string().optional(),
  profile_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = confirmPaymentSchema.parse(body);

    // Get session from cookie
    const sessionCookie = cookies().get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa',
        code: 'NO_SESSION',
      }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if user has permission to process payments
    const userPermissions = sessionData.permissions || [];
    const canProcessPayments = userPermissions.includes('payments.process') || 
                              userPermissions.includes('payments.all') ||
                              userPermissions.length === 0; // If no specific permissions, allow

    if (!canProcessPayments) {
      return NextResponse.json({
        success: false,
        error: 'No tienes permisos para procesar pagos',
        code: 'INSUFFICIENT_PERMISSIONS',
      }, { status: 403 });
    }

    // Prepare payment confirmation data
    const paymentData: any = {
      payment_method: {
        type: validatedData.payment_method,
        ...validatedData.payment_method_data,
      },
      client_secret: validatedData.client_secret,
    };

    // Add customer information if available
    if (validatedData.customer_id) {
      paymentData.customer_id = validatedData.customer_id;
    }

    // Call Hyperswitch payment confirmation API
    const HYPERSWITCH_API_URL = getApiUrl();
    const HYPERSWITCH_SECRET_KEY = process.env.HYPERSWITCH_SECRET_KEY;

    if (!HYPERSWITCH_API_URL || !HYPERSWITCH_SECRET_KEY) {
      console.error('HYPERSWITCH_API_URL o HYPERSWITCH_SECRET_KEY no están configuradas en las variables de entorno.');
      return NextResponse.json({
        success: false,
        error: 'Error de configuración del servidor',
        code: 'SERVER_CONFIG_ERROR',
      }, { status: 500 });
    }

    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HYPERSWITCH_SECRET_KEY}`, // Using secret key for server-side API calls
        'X-Correlation-ID': `multipaga-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Error al procesar el pago',
        code: hyperswitchData.code || 'PAYMENT_PROCESSING_ERROR',
        details: hyperswitchData.details,
      }, { status: hyperswitchResponse.status });
    }

    // Log payment activity (for audit purposes)
    console.log(`Payment processed by user ${sessionData.userId}:`, {
      payment_id: hyperswitchData.payment_id,
      amount: hyperswitchData.amount,
      currency: hyperswitchData.currency,
      status: hyperswitchData.status,
      customer_id: validatedData.customer_id,
      correlation_id: `multipaga-${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      payment_intent: {
        id: hyperswitchData.payment_id,
        status: hyperswitchData.status,
        amount: hyperswitchData.amount,
        currency: hyperswitchData.currency,
        client_secret: hyperswitchData.client_secret,
        next_action: hyperswitchData.next_action,
        payment_method: hyperswitchData.payment_method,
        created: hyperswitchData.created,
        metadata: hyperswitchData.metadata,
      },
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}


