import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getApiUrl } from '@/lib/environment';

// Validation schema
const paymentMethodsSchema = z.object({
  client_secret: z.string().min(1, 'Client secret requerido'),
  amount: z.number().positive('Monto debe ser positivo'),
  currency: z.string().length(3, 'Moneda debe tener 3 caracteres'),
  customer_id: z.string().optional(),
  merchant_id: z.string().optional(),
  profile_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = paymentMethodsSchema.parse(body);

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

    // Prepare payment methods request data
    const paymentMethodsRequestData: any = {
      amount: validatedData.amount,
      currency: validatedData.currency.toLowerCase(),
      customer_id: validatedData.customer_id,
      merchant_id: validatedData.merchant_id || sessionData.merchantId,
      profile_id: validatedData.profile_id || sessionData.profileId,
    };

    // Call Hyperswitch payment methods API
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

    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/payment_methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HYPERSWITCH_SECRET_KEY}`, // Using secret key for server-side API calls
        'X-Correlation-ID': `multipaga-${Date.now()}`,
      },
      body: JSON.stringify(paymentMethodsRequestData),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Error al obtener métodos de pago',
        code: hyperswitchData.code || 'PAYMENT_METHODS_ERROR',
        details: hyperswitchData.details,
      }, { status: hyperswitchResponse.status });
    }

    // Filter payment methods based on user permissions
    const allowedPaymentMethods = hyperswitchData.payment_methods?.filter((method: any) => {
      // Check if user has permission for this payment method
      // This would be based on the permissions configured in the control center
      return method.enabled && (
        userPermissions.includes('payments.all') ||
        userPermissions.includes(`payments.${method.payment_method_type}`) ||
        userPermissions.length === 0 // If no specific permissions, allow all
      );
    }) || [];

    return NextResponse.json({
      success: true,
      payment_methods: allowedPaymentMethods.map((method: any) => ({
        id: method.payment_method,
        type: method.payment_method_type,
        name: method.payment_method_display_name || method.payment_method,
        enabled: method.enabled,
        supported_countries: method.supported_countries,
        supported_currencies: method.supported_currencies,
        icon: method.icon_url,
      })),
    });

  } catch (error) {
    console.error('Payment methods error:', error);
    
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


