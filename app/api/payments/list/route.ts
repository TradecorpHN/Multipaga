import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pino from 'pino';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { cookies } from 'next/headers';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { pid: process.pid, hostname: process.env.HOSTNAME || 'unknown' },
});

// Rate Limiter
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Session schema
const sessionSchema = z.object({
  customerId: z.string().min(1),
  environment: z.enum(['sandbox', 'production']),
  merchantId: z.string().min(1),
  profileId: z.string().min(1),
  apiKey: z.string().min(1),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
});

// Payment list schema
const paymentListSchema = z.array(
  z.object({
    payment_id: z.string().min(1),
    merchant_id: z.string().min(1),
    status: z.string(),
    amount: z.number(),
    currency: z.string(),
    created: z.string().datetime().optional(),
  })
).catch((ctx) => {
  logger.warn({ error: ctx.error, input: ctx.input }, 'Flexible parsing for paymentListSchema');
  return ctx.input;
});

export async function GET(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const startTime = Date.now();

  try {
    // Rate limiting
    await rateLimiter.consume(ip).catch(() => {
      logger.warn({ ip }, 'Rate limit exceeded');
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    });

    // Check session
    const sessionCookie = cookies().get('hyperswitch_session')?.value;
    if (!sessionCookie) {
      logger.info({ ip }, 'No session cookie found');
      return NextResponse.json(
        { success: false, error: 'No hay sesión activa', code: 'NO_SESSION' },
        { status: 401 }
      );
    }

    // Parse and validate session
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse session cookie');
      return NextResponse.json(
        { success: false, error: 'Sesión inválida', code: 'INVALID_SESSION' },
        { status: 401 }
      );
    }

    const parsedSession = sessionSchema.safeParse(sessionData);
    if (!parsedSession.success) {
      logger.warn({ ip, errors: parsedSession.error.errors }, 'Invalid session data');
      return NextResponse.json(
        { success: false, error: 'Datos de sesión inválidos', code: 'INVALID_SESSION_DATA' },
        { status: 401 }
      );
    }

    // Check session expiration
    if (new Date(parsedSession.data.expiresAt) < new Date()) {
      logger.info({ ip }, 'Session expired');
      cookies().delete('hyperswitch_session');
      return NextResponse.json(
        { success: false, error: 'La sesión ha expirado', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }

    // Fetch payment history
    const { apiKey, customerId, environment, merchantId } = parsedSession.data;
    const baseUrl = environment === 'sandbox' ? 'https://sandbox.hyperswitch.io' : 'https://api.hyperswitch.io';
    const searchParams = new URLSearchParams({
      customer_id: customerId,
      limit: '10', // Default limit
    });

    const response = await fetch(`${baseUrl}/payments/list?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey,
        'merchant-id': merchantId, // Added for consistency with other endpoints
        'User-Agent': 'NextjsApp/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'No se pudo obtener el historial de pagos';
      let errorCode = `HS_${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
        errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
      } catch (error) {
        logger.error({ ip, status: response.status, errorText }, 'Failed to parse payment list error');
      }
      logger.warn({ ip, status: response.status, errorMessage }, 'Payment list request failed');
      return NextResponse.json(
        { success: false, error: errorMessage, code: errorCode },
        { status: response.status }
      );
    }

    const paymentData = await response.json();
    const parsedPayments = paymentListSchema.safeParse(paymentData);
    if (!parsedPayments.success) {
      logger.warn({ ip, errors: parsedPayments.error.errors }, 'Invalid payment list response');
      return NextResponse.json(
        { success: false, error: 'Formato de respuesta inválido', code: 'INVALID_RESPONSE_FORMAT' },
        { status: 400 }
      );
    }

    logger.info({ ip, customerId, responseTime: Date.now() - startTime }, 'Payment history retrieved successfully');
    return NextResponse.json({
      success: true,
      payments: parsedPayments.data,
    });
  } catch (error) {
    logger.error({ ip, error }, 'Unexpected error retrieving payment history');
    return NextResponse.json(
      { success: false, error: 'Error inesperado al obtener el historial', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    );
  }
}