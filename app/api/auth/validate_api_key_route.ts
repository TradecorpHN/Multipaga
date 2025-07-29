import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Constants
const API_TIMEOUT = 10000; // 10 seconds timeout for validation
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};

// Schema for request body
const requestSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key es requerida')
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]+)/, 'API Key debe comenzar con "snd_"'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

// Interface for response
interface ValidationResponse {
  valid: boolean;
  error?: string;
  code?: string;
  details?: {
    customers_count?: number;
    first_customer?: {
      customer_id: string;
      name: string | null;
    };
  };
}

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';

  try {
    // Parse request body
    let requestData: unknown;
    try {
      requestData = await request.json();
      logger.debug({ ip, apiKey: '[REDACTED]' }, 'API Key validation request');
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse request body');
      return NextResponse.json(
        {
          valid: false,
          error: 'Cuerpo de solicitud inválido',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const parsedData = requestSchema.safeParse(requestData);
    if (!parsedData.success) {
      const errorMessage = parsedData.error.errors[0]?.message || 'Datos inválidos';
      logger.warn({ ip, error: parsedData.error }, 'Invalid request data');
      return NextResponse.json(
        { valid: false, error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { apiKey, environment } = parsedData.data;
    const apiUrl = API_URLS[environment];

    // Call Hyperswitch /customers/list to validate API Key
    const hyperswitchApiResponse = await fetch(`${apiUrl}/customers/list`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'NextjsApp/1.0',
      },
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    // Check if response is JSON
    const contentType = hyperswitchApiResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const rawText = await hyperswitchApiResponse.text();
      logger.error({ ip, contentType, rawText }, 'Non-JSON response from Hyperswitch');
      return NextResponse.json(
        {
          valid: false,
          error: 'Respuesta inválida de la API de Hyperswitch',
          code: 'INVALID_RESPONSE',
        },
        { status: 502 }
      );
    }

    if (!hyperswitchApiResponse.ok) {
      let errorMessage = 'API Key inválida';
      let errorCode = `HS_${hyperswitchApiResponse.status}`;
      
      try {
        const errorData = await hyperswitchApiResponse.json();
        errorMessage = errorData.error?.message || errorMessage;
        errorCode = errorData.error?.code ? `HS_${errorData.error.code}` : errorCode;
      } catch {
        // Ignore JSON parse errors for error response
      }
      
      logger.warn({ ip, status: hyperswitchApiResponse.status, errorCode }, 'API Key validation failed');
      return NextResponse.json(
        { valid: false, error: errorMessage, code: errorCode },
        { status: 200 } // Return 200 for validation response, even if API Key is invalid
      );
    }

    // Parse successful response
    let responseData: unknown;
    try {
      responseData = await hyperswitchApiResponse.json();
    } catch (error) {
      logger.error({ ip, error }, 'Failed to parse Hyperswitch API response');
      return NextResponse.json(
        {
          valid: false,
          error: 'Respuesta inválida de la API de Hyperswitch',
          code: 'INVALID_RESPONSE',
        },
        { status: 502 }
      );
    }

    // Validate response structure
    if (!Array.isArray(responseData)) {
      logger.warn({ ip, responseData }, 'Invalid response format from Hyperswitch');
      return NextResponse.json(
        {
          valid: false,
          error: 'Formato de respuesta inválido',
          code: 'INVALID_RESPONSE_FORMAT',
        },
        { status: 502 }
      );
    }

    // Check if we have customers
    if (responseData.length === 0) {
      logger.info({ ip }, 'API Key valid but no customers found');
      return NextResponse.json(
        {
          valid: false,
          error: 'API Key válida pero no se encontraron clientes',
          code: 'NO_CUSTOMERS_FOUND',
        },
        { status: 200 }
      );
    }

    // API Key is valid and we have customers
    const firstCustomer = responseData[0] as any;
    logger.info({ ip, customersCount: responseData.length }, 'API Key validation successful');
    
    const validationResponse: ValidationResponse = {
      valid: true,
      details: {
        customers_count: responseData.length,
        first_customer: {
          customer_id: firstCustomer.customer_id || 'unknown',
          name: firstCustomer.name || null,
        },
      },
    };

    return NextResponse.json(validationResponse, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn({ ip }, 'API Key validation timeout');
      return NextResponse.json(
        {
          valid: false,
          error: 'Tiempo de espera agotado al validar la API Key',
          code: 'VALIDATION_TIMEOUT',
        },
        { status: 408 }
      );
    }

    logger.error({ error, ip }, 'Unexpected error during API Key validation');
    return NextResponse.json(
      {
        valid: false,
        error: 'Error inesperado al validar la API Key',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

