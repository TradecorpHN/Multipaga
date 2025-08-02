
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

// Constants
const API_TIMEOUT = 15000;
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};
const MAX_RETRIES = 2;

// Validation schema
const loginSchema = z.object({
  apiKey: z.string().regex(/^(snd_[a-zA-Z0-9]{10,})$/, 'API Key debe comenzar con "snd_"'),
  merchantId: z.string().regex(/^(merchant_[a-zA-Z0-9]{10,})$/, 'Merchant ID debe comenzar con "merchant_"'),
  profileId: z.string().regex(/^(pro_[a-zA-Z0-9]{10,})$/, 'Profile ID debe comenzar con "pro_"'),
  customerId: z.string().min(1, 'Customer ID es requerido'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

const customersListSchema = z.array(z.object({ customer_id: z.string().min(1) })).catch((ctx) => {
  logger.warn({ error: ctx.error, input: ctx.input }, 'Flexible parsing for customersListSchema');
  return ctx.input;
});

const businessProfileSchema = z.array(z.object({ profile_id: z.string().min(1) })).catch((ctx) => {
  logger.warn({ error: ctx.error, input: ctx.input }, 'Flexible parsing for businessProfileSchema');
  return ctx.input;
});

const customerSchema = z.object({ customer_id: z.string().min(1) }).catch((ctx) => {
  logger.warn({ error: ctx.error, input: ctx.input }, 'Flexible parsing for customerSchema');
  return ctx.input;
});

// Fetch with retry
async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(API_TIMEOUT) });
    } catch (error) {
      if (attempt === retries || (error instanceof Error && error.name !== 'AbortError')) {
        throw error;
      }
      logger.warn({ url, attempt }, 'Retrying API request');
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Max retries reached');
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
        },
        { status: 429 }
      );
    }

    // Parse request body
    let requestData: unknown;
    try {
      requestData = await request.json();
      const loggableData = typeof requestData === 'object' && requestData !== null
        ? { ...requestData, apiKey: '[REDACTED]' }
        : { data: '[INVALID_REQUEST_DATA]' };
      logger.debug({ ip, requestData: loggableData }, 'Raw request body');
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse request body');
      return NextResponse.json(
        {
          success: false,
          error: 'Cuerpo de solicitud inválido',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    // Validate request data
    const parsedData = loginSchema.safeParse(requestData);
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

    const { apiKey, merchantId, profileId, customerId, environment } = parsedData.data;
    const apiUrl = API_URLS[environment];
    logger.debug({ ip, environment }, 'Initiating Hyperswitch API authentication');

    // Validate credentials with minimal requests
    const errors: { field: string; message: string }[] = [];

    // 1. Validate apiKey and merchantId with /account/{merchantId}/business_profile
    let response = await fetchWithRetry(
      `${apiUrl}/account/${merchantId}/business_profile`,
      {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'NextjsApp/1.0',
        },
      },
      MAX_RETRIES
    );
    if (!response.ok) {
      const rawErrorText = await response.text();
      let errorMessage = 'No se pudo validar la API Key o Merchant ID';
      let errorCode = `HS_${response.status}`;
      try {
        const errorData = JSON.parse(rawErrorText);
        errorMessage = errorData.error?.message || 'API key o Merchant ID inválidos';
        errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
      } catch (error) {
        logger.error({ ip, status: response.status, rawErrorText }, 'Failed to parse business profile error');
      }
      errors.push(
        { field: 'apiKey', message: errorMessage },
        { field: 'merchantId', message: errorMessage }
      );
      logger.error({ ip, status: response.status, rawErrorText }, 'apiKey and merchantId validation failed');
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas', code: errorCode, details: errors },
        { status: response.status === 401 ? 401 : 400 }
      );
    }
    const businessProfileData = await response.json();
    if (!businessProfileSchema.safeParse(businessProfileData).success || 
        !businessProfileData.some((p: { profile_id: string }) => p.profile_id === profileId)) {
      errors.push(
        { field: 'merchantId', message: 'Formato de respuesta inválido para Merchant ID o Profile ID no encontrado' },
        { field: 'profileId', message: 'Profile ID no encontrado o no asociado al Merchant ID' }
      );
      logger.warn({ ip, profileId, responseData: businessProfileData }, 'Invalid business profile response or Profile ID not found');
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas', code: 'INVALID_RESPONSE_FORMAT', details: errors },
        { status: 400 }
      );
    }

    // 2. Validate customerId
    response = await fetchWithRetry(
      `${apiUrl}/customers/${customerId}`,
      {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'merchant-id': merchantId,
          'Accept': 'application/json',
          'User-Agent': 'NextjsApp/1.0',
        },
      },
      MAX_RETRIES
    );
    if (!response.ok) {
      const rawErrorText = await response.text();
      let errorMessage = 'No se pudo validar el Customer ID';
      let errorCode = `HS_${response.status}`;
      try {
        const errorData = JSON.parse(rawErrorText);
        errorMessage = errorData.error?.message || 'Customer ID no encontrado';
        errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
      } catch (error) {
        logger.error({ ip, status: response.status, rawErrorText }, 'Failed to parse customer error');
      }
      errors.push({ field: 'customerId', message: errorMessage });
      logger.error({ ip, status: response.status, rawErrorText }, 'Customer ID validation failed');
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas', code: errorCode, details: errors },
        { status: response.status === 404 ? 400 : response.status }
      );
    }
    const customerData = await response.json();
    if (!customerSchema.safeParse(customerData).success || customerData.customer_id !== customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID no encontrado o no coincide' });
      logger.warn({ ip, customerId, responseData: customerData }, 'Invalid or mismatched Customer ID');
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas', code: 'INVALID_CUSTOMER_ID', details: errors },
        { status: 400 }
      );
    }

    // Create session
    const sessionData = {
      customerId,
      customerName: null,
      environment,
      merchantId,
      profileId,
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      apiKey,
    };

    cookies().set({
      name: 'hyperswitch_session',
      value: JSON.stringify(sessionData),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    logger.info({ ip, customerId, responseTime: Date.now() - startTime }, 'Login successful');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ ip, error }, 'Unexpected error during login');
    return NextResponse.json(
      {
        success: false,
        error: 'Error inesperado al iniciar sesión',
        code: 'UNEXPECTED_ERROR',
      },
      { status: 500 }
    );
  }
}
