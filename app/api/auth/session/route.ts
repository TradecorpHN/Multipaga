import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import pino from 'pino';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { pid: process.pid, hostname: process.env.HOSTNAME || 'unknown' },
});

// Rate Limiter (10 requests per minute per IP)
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Session schema (removed publishableKey)
const sessionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  merchantId: z.string().min(1, 'Merchant ID is required'),
  profileId: z.string().min(1, 'Profile ID is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime({ message: 'Invalid expiration date' }),
});

export async function GET(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const startTime = Date.now();

  try {
    // Rate limiting
    try {
      await rateLimiter.consume(ip);
    } catch (error) {
      logger.warn({ ip }, 'Rate limit exceeded');
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiadas solicitudes, intenta de nuevo más tarde',
          code: 'RATE_LIMIT_EXCEEDED',
          isAuthenticated: false,
        },
        { status: 429 }
      );
    }

    // Check session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('hyperswitch_session')?.value;

    if (!sessionCookie) {
      logger.info({ ip }, 'No session cookie found');
      return NextResponse.json(
        {
          success: false,
          error: 'No hay sesión activa',
          code: 'NO_SESSION',
          isAuthenticated: false,
        },
        { status: 401 }
      );
    }

    // Parse session data
    let sessionData: unknown;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse session cookie');
      return NextResponse.json(
        {
          success: false,
          error: 'Sesión inválida',
          code: 'INVALID_SESSION',
          isAuthenticated: false,
        },
        { status: 401 }
      );
    }

    // Validate session data
    const parsedSession = sessionSchema.safeParse(sessionData);
    if (!parsedSession.success) {
      logger.warn({ ip, errors: parsedSession.error.errors }, 'Invalid session data');
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de sesión inválidos',
          code: 'INVALID_SESSION_DATA',
          isAuthenticated: false,
        },
        { status: 401 }
      );
    }

    // Check session expiration
    const { expiresAt } = parsedSession.data;
    if (new Date(expiresAt) < new Date()) {
      logger.info({ ip }, 'Session expired');
      cookieStore.delete('hyperswitch_session');
      return NextResponse.json(
        {
          success: false,
          error: 'La sesión ha expirado',
          code: 'SESSION_EXPIRED',
          isAuthenticated: false,
        },
        { status: 401 }
      );
    }

    // Optional: Validate with Hyperswitch API
    const { apiKey, merchantId, profileId, customerId, environment } = parsedSession.data;
    const baseUrl = environment === 'sandbox' ? 'https://sandbox.hyperswitch.io' : 'https://api.hyperswitch.io';
    try {
      const response = await fetch(`${baseUrl}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        logger.warn({ ip, customerId, status: response.status }, 'Hyperswitch API validation failed');
        return NextResponse.json(
          {
            success: false,
            error: 'Validación de sesión fallida',
            code: 'API_VALIDATION_FAILED',
            isAuthenticated: false,
          },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error({ ip, error }, 'Error during Hyperswitch API validation');
      return NextResponse.json(
        {
          success: false,
          error: 'Error al validar la sesión',
          code: 'API_VALIDATION_ERROR',
          isAuthenticated: false,
        },
        { status: 500 }
      );
    }

    logger.info({ ip, customerId: parsedSession.data.customerId, responseTime: Date.now() - startTime }, 'Session validated successfully');
    return NextResponse.json({
      success: true,
      isAuthenticated: true,
      customer: {
        customer_id: parsedSession.data.customerId,
        customer_name: parsedSession.data.customerName,
        environment: parsedSession.data.environment,
      },
      session: {
        expires_at: parsedSession.data.expiresAt,
        merchant_id: parsedSession.data.merchantId,
        profile_id: parsedSession.data.profileId,
      },
    });
  } catch (error) {
    logger.error({ ip, error }, 'Unexpected error during session check');
    return NextResponse.json(
      {
        success: false,
        error: 'Error inesperado al verificar la sesión',
        code: 'UNEXPECTED_ERROR',
        isAuthenticated: false,
      },
      { status: 500 }
    );
  }
}