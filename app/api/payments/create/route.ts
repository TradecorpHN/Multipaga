import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getApiUrl } from '@/lib/environment';

// Validation schema
const createPaymentSchema = z.object({
  amount: z.number().positive('Monto debe ser positivo'),
  currency: z.string().length(3, 'Moneda debe tener 3 caracteres'),
  customer_id: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  payment_method_types: z.array(z.string()).optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  return_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

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

    // Check if user has permission to create payments
    const userPermissions = sessionData.permissions || [];
    const canCreatePayments = userPermissions.includes('payments.create') || 
                             userPermissions.includes('payments.all') ||
                             userPermissions.length === 0; // If no specific permissions, allow

    if (!canCreatePayments) {
      return NextResponse.json({
        success: false,
        error: 'No tienes permisos para crear pagos',
        code: 'INSUFFICIENT_PERMISSIONS',
      }, { status: 403 });
    }

    // Prepare payment creation data
    const paymentData: any = {
      amount: validatedData.amount,
      currency: validatedData.currency.toLowerCase(),
      capture_method: validatedData.capture_method,
      confirm: validatedData.confirm,
      merchant_id: sessionData.merchantId,
      profile_id: sessionData.profileId,
    };

    // Add optional fields
    if (validatedData.customer_id) {
      paymentData.customer_id = validatedData.customer_id;
    }

    if (validatedData.description) {
      paymentData.description = validatedData.description;
    }

    if (validatedData.metadata) {
      paymentData.metadata = validatedData.metadata;
    }

    if (validatedData.payment_method_types) {
      paymentData.payment_method_types = validatedData.payment_method_types;
    }

    if (validatedData.return_url) {
      paymentData.return_url = validatedData.return_url;
    }

    // Call Hyperswitch payment creation API
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

    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/payments`, {
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
        error: hyperswitchData.error || 'Error al crear el pago',
        code: hyperswitchData.code || 'PAYMENT_CREATION_ERROR',
        details: hyperswitchData.details,
      }, { status: hyperswitchResponse.status });
    }

    // Log payment creation activity (for audit purposes)
    console.log(`Payment created by user ${sessionData.userId}:`, {
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
        client_secret: hyperswitchData.client_secret,
        status: hyperswitchData.status,
        amount: hyperswitchData.amount,
        currency: hyperswitchData.currency,
        payment_method_types: hyperswitchData.payment_method_types,
        created: hyperswitchData.created,
        description: hyperswitchData.description,
        metadata: hyperswitchData.metadata,
        next_action: hyperswitchData.next_action,
      },
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    
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


