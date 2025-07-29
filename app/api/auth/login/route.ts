import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import pino from 'pino';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { pid: process.pid, hostname: process.env.HOSTNAME || 'unknown' },
});

// Rate Limiter (5 requests per minute per IP)
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Constants
const API_TIMEOUT = 15000; // 15 seconds timeout
const SESSION_DURATION = 3600 * 8; // 8 hours
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};

// Schema for Hyperswitch customers/list response
const customersListSchema = z
  .array(
    z.object({
      customer_id: z.string().min(1, 'Customer ID is required'),
      name: z.string().nullable(),
      email: z.string().email().nullable(),
      phone: z.string().nullable(),
      phone_country_code: z.string().nullable(),
      description: z.string().nullable(),
      address: z.any().nullable(),
      created_at: z.string().datetime(),
      metadata: z.any().nullable(),
      default_payment_method_id: z.string().nullable(),
    })
  )
  .min(1, 'At least one customer is required');

// Schema for request body
const requestSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key es requerida')
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .max(128, 'API Key no debe exceder 128 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]{10,})$/, 'API Key debe comenzar con "snd_" y contener solo caracteres alfanuméricos'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

// Interface for response
interface LoginResponse {
  success: boolean;
  code?: string;
  error?: string;
  details?: Array<{ field?: string; message: string }>;
  customer?: {
    customer_id: string;
    customer_name: string | null;
    environment: 'sandbox' | 'production';
  };
  session?: {
    expires_at: string;
  };
}

export async function POST(request: NextRequest) {
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
          details: [{ message: 'Demasiadas solicitudes' }],
        },
        { status: 429 }
      );
    }

    // Parse request body
    let requestData: unknown;
    try {
      requestData = await request.json();
      const loggableRequestData =
        typeof requestData === 'object' && requestData !== null
          ? { ...(requestData as Record<string, unknown>), apiKey: '[REDACTED]' }
          : '[REDACTED]';
      logger.debug({ ip, requestData: loggableRequestData }, 'Raw request body');
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse request body');
      return NextResponse.json(
        {
          success: false,
          error: 'Cuerpo de solicitud inválido',
          code: 'INVALID_JSON',
          details: [{ message: 'Cuerpo de solicitud inválido' }],
        },
        { status: 400 }
      );
    }

    // Validate request data
    const parsedData = requestSchema.safeParse(requestData);
    if (!parsedData.success) {
      const details = parsedData.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      logger.warn({ ip, details }, 'Invalid request data');
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', code: 'VALIDATION_ERROR', details },
        { status: 400 }
      );
    }

    const { apiKey, environment } = parsedData.data;
    const apiUrl = API_URLS[environment];
    logger.debug({ ip, environment }, 'Initiating Hyperswitch API request');

    // Call Hyperswitch /customers/list
    const hyperswitchApiResponse = await fetch(`${apiUrl}/customers/list`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'NextjsApp/1.0',
      },
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    // Log response time
    const responseTime = Date.now() - startTime;
    logger.debug({ ip, responseTime }, 'Hyperswitch API response time');

    // Check content type
    const contentType = hyperswitchApiResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const rawText = await hyperswitchApiResponse.text();
      logger.error({ ip, contentType, rawText }, 'Non-JSON response from Hyperswitch');
      return NextResponse.json(
        {
          success: false,
          error: 'Respuesta inválida de la API de Hyperswitch',
          code: 'INVALID_RESPONSE',
          details: [{ field: 'apiKey', message: 'Respuesta inválida de la API de Hyperswitch' }],
        },
        { status: 502 }
      );
    }

    // Handle non-OK responses
    if (!hyperswitchApiResponse.ok) {
      let errorMessage = 'No se pudo validar la API Key';
      let errorCode = `HS_${hyperswitchApiResponse.status}`;
      let details: Array<{ field?: string; message: string }> = [
        { field: 'apiKey', message: errorMessage },
      ];
      try {
        const errorData = await hyperswitchApiResponse.json();
        errorMessage = errorData.error?.message || errorMessage;
        errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
        details = [{ field: 'apiKey', message: errorMessage }];
        logger.error({ ip, status: hyperswitchApiResponse.status, errorCode, errorData }, 'Hyperswitch API request failed');
      } catch (error) {
        logger.error({ ip, status: hyperswitchApiResponse.status, error }, 'Failed to parse error response');
      }
      return NextResponse.json(
        { success: false, error: errorMessage, code: errorCode, details },
        { status: hyperswitchApiResponse.status === 401 ? 401 : 400 }
      );
    }

    // Parse and validate response
    let responseData: unknown;
    try {
      responseData = await hyperswitchApiResponse.json();
      logger.debug({ ip, responseData }, 'Hyperswitch API response');
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse Hyperswitch API response');
      return NextResponse.json(
        {
          success: false,
          error: 'Respuesta inválida de la API de Hyperswitch',
          code: 'INVALID_RESPONSE',
          details: [{ field: 'apiKey', message: 'Respuesta inválida de la API de Hyperswitch' }],
        },
        { status: 502 }
      );
    }

    const customers = customersListSchema.safeParse(responseData);
    if (!customers.success) {
      logger.warn({ ip, error: customers.error }, 'Invalid Hyperswitch response format');
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de respuesta inválido de la API de Hyperswitch',
          code: 'INVALID_RESPONSE_FORMAT',
          details: [{ field: 'apiKey', message: 'Formato de respuesta inválido' }],
        },
        { status: 400 }
      );
    }

    // Additional validation: Ensure customer has valid data
    const customer = customers.data[0];
    if (!customer.customer_id || customer.created_at === 'Invalid Date') {
      logger.warn({ ip, customerId: customer.customer_id }, 'Invalid customer data');
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de cliente inválidos',
          code: 'INVALID_CUSTOMER_DATA',
          details: [{ field: 'apiKey', message: 'Datos de cliente inválidos' }],
        },
        { status: 400 }
      );
    }

    logger.info({ ip, customerId: customer.customer_id }, 'Customer validated successfully');

    // Set session cookie
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION * 1000);
    const sessionData = {
      customerId: customer.customer_id,
      customerName: customer.name,
      environment,
      isAuthenticated: true,
      expiresAt: sessionExpiresAt.toISOString(),
      apiKey: apiKey.slice(0, 8) + '...', // Store partial API key for security
    };

    cookies().set('hyperswitch_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION,
      path: '/',
    });

    // Set environment cookie
    cookies().set('hyperswitch_env', environment, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 3600,
      path: '/',
    });

    // Prepare response
    const loginResponse: LoginResponse = {
      success: true,
      customer: {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        environment,
      },
      session: {
        expires_at: sessionExpiresAt.toISOString(),
      },
    };

    const finalNextResponse = NextResponse.json(loginResponse, { status: 200 });

    // Add security headers
    finalNextResponse.headers.set('X-Content-Type-Options', 'nosniff');
    finalNextResponse.headers.set('X-Frame-Options', 'DENY');
    finalNextResponse.headers.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
    if (process.env.NODE_ENV === 'production') {
      finalNextResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    logger.info({ ip, customerId: customer.customer_id, responseTime }, 'Login successful');
    return finalNextResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ ip, error }, 'Hyperswitch API request timed out');
      return NextResponse.json(
        {
          success: false,
          error: 'Tiempo de espera agotado al validar la API Key',
          code: 'API_TIMEOUT',
          details: [{ field: 'apiKey', message: 'Tiempo de espera agotado' }],
        },
        { status: 504 }
      );
    }

    logger.error({ ip, error }, 'Unexpected error during login');
    return NextResponse.json(
      {
        success: false,
        error: 'Error inesperado en el servidor',
        code: 'INTERNAL_ERROR',
        details: [{ message: 'Error inesperado en el servidor' }],
      },
      { status: 500 }
    );
  }
}