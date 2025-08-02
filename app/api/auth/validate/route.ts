
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { pid: process.pid, hostname: process.env.HOSTNAME || 'unknown' },
});

// Constants
const API_TIMEOUT = 15000;
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};
const MAX_RETRIES = 2;

// Validation schema
const validateSchema = z.object({
  field: z.enum(['apiKey', 'merchantId', 'profileId', 'customerId']),
  value: z.string().min(1, 'El valor es requerido'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  apiKey: z.string().optional(),
  merchantId: z.string().optional(),
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
    // Parse request body
    const requestData = await request.json();
    logger.debug({ ip, requestData: { ...requestData, apiKey: '[REDACTED]' } }, 'Raw request body');

    // Validate request data
    const parsedData = validateSchema.safeParse(requestData);
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

    const { field, value, environment, apiKey, merchantId } = parsedData.data;
    const apiUrl = API_URLS[environment];
    logger.debug({ ip, field, environment }, 'Initiating Hyperswitch API validation');

    let response: Response;

    if (field === 'apiKey' || field === 'merchantId' || field === 'profileId') {
      if (!apiKey || (field === 'profileId' && !merchantId)) {
        logger.warn({ ip, field }, 'Missing required credentials for validation');
        return NextResponse.json(
          {
            success: false,
            error: `Se requiere ${field === 'profileId' ? 'API Key y Merchant ID' : 'API Key'} para validar ${field}`,
            code: 'MISSING_CREDENTIALS',
            field,
          },
          { status: 400 }
        );
      }

      const merchantIdToUse = field === 'merchantId' ? value : merchantId!;
      response = await fetchWithRetry(
        `${apiUrl}/account/${merchantIdToUse}/business_profile`,
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
        let errorMessage = `No se pudo validar ${field}`;
        let errorCode = `HS_${response.status}`;
        try {
          const errorData = JSON.parse(rawErrorText);
          errorMessage = errorData.error?.message || `Error al validar ${field}`;
          errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
        } catch (error) {
          logger.error({ ip, status: response.status, rawErrorText }, 'Failed to parse business profile error');
        }
        logger.error({ ip, status: response.status, rawErrorText }, `${field} validation failed`);
        return NextResponse.json(
          { success: false, error: errorMessage, code: errorCode, field },
          { status: response.status === 401 ? 401 : 400 }
        );
      }

      const businessProfileData = await response.json();
      if (field === 'profileId' && 
          (!businessProfileSchema.safeParse(businessProfileData).success || 
           !businessProfileData.some((p: { profile_id: string }) => p.profile_id === value))) {
        logger.warn({ ip, profileId: value, responseData: businessProfileData }, 'Profile ID not found');
        return NextResponse.json(
          {
            success: false,
            error: 'Profile ID no encontrado o no asociado al Merchant ID',
            code: 'PROFILE_ID_NOT_FOUND',
            field,
          },
          { status: 400 }
        );
      }
    } else if (field === 'customerId') {
      if (!apiKey || !merchantId) {
        logger.warn({ ip, field }, 'Missing required credentials for customer validation');
        return NextResponse.json(
          {
            success: false,
            error: 'Se requieren API Key y Merchant ID para validar Customer ID',
            code: 'MISSING_CREDENTIALS',
            field,
          },
          { status: 400 }
        );
      }

      response = await fetchWithRetry(
        `${apiUrl}/customers/${value}`,
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
        logger.error({ ip, status: response.status, rawErrorText }, 'Customer ID validation failed');
        return NextResponse.json(
          { success: false, error: errorMessage, code: errorCode, field },
          { status: response.status === 404 ? 400 : response.status }
        );
      }

      const customerData = await response.json();
      if (!customerSchema.safeParse(customerData).success || customerData.customer_id !== value) {
        logger.warn({ ip, customerId: value, responseData: customerData }, 'Invalid or mismatched Customer ID');
        return NextResponse.json(
          {
            success: false,
            error: 'Customer ID no encontrado o no coincide',
            code: 'INVALID_CUSTOMER_ID',
            field,
          },
          { status: 400 }
        );
      }
    }

    logger.info({ ip, field, responseTime: Date.now() - startTime }, 'Field validated successfully');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ ip, error }, 'Unexpected error during validation');
    return NextResponse.json(
      {
        success: false,
        error: 'Error inesperado al validar',
        code: 'UNEXPECTED_ERROR',
        field: undefined,
      },
      { status: 500 }
    );
  }
}
