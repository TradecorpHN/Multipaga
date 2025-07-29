import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { z } from 'zod';

// Esquema para validar el payload del token de sesión
const sessionTokenSchema = z.object({
  merchant_id: z.string().default('unknown'),
  profile_id: z.string().default('unknown'),
  merchant_name: z.string().default('unknown'),
  profile_name: z.string().default('unknown'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  iat: z.number(),
  exp: z.number(),
  is_demo: z.boolean().optional(),
});

// Interfaz para la respuesta exitosa
interface SuccessResponse {
  success: true;
  message: string;
  merchant: {
    merchant_id: string;
    profile_id: string;
    environment: 'sandbox' | 'production';
    publishable_key: string;
  };
  security: {
    ip_address: string;
    user_agent: string;
  };
  timestamp: string;
}

// Interfaz para la respuesta de error
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  merchant?: {
    merchant_id: string;
    profile_id: string;
  };
  security?: {
    ip_address: string;
    user_agent: string;
  };
  timestamp: string;
}

// Función para obtener información del cliente
function getClientInfo(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent')?.substring(0, 100) || 'unknown',
    ipAddress:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown',
  };
}

// Función para validar el token de sesión
function validateSessionToken(token: string, jwtSecret: string) {
  try {
    const payload = verify(token, jwtSecret);
    return sessionTokenSchema.parse(payload);
  } catch (error) {
    console.warn('⚠️ Invalid or expired session token:', error);
    throw new Error('Invalid or expired session token');
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const startTime = Date.now();
  const cookieStore = cookies();
  const { userAgent, ipAddress } = getClientInfo(request);

  try {
    // Validar la existencia de JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ Missing JWT_SECRET environment variable', {
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Error de configuración del servidor: Falta clave secreta',
          code: 'CONFIGURATION_ERROR',
          security: { ip_address: ipAddress, user_agent: userAgent },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Obtener y validar el token de sesión
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) {
      console.warn('⚠️ No session token found', {
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontró una sesión activa',
          code: 'UNAUTHORIZED',
          security: { ip_address: ipAddress, user_agent: userAgent },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Validar el token de sesión
    const sessionPayload = validateSessionToken(sessionToken, jwtSecret);

    // Obtener la clave publicable de una cookie (asumiendo que se almacenó en el login)
    const publishableKey = cookieStore.get('publishable_key')?.value;
    if (!publishableKey) {
      console.error('❌ No publishable key found in cookies', {
        merchant_id: sessionPayload.merchant_id,
        profile_id: sessionPayload.profile_id,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontró la clave publicable',
          code: 'MISSING_PUBLISHABLE_KEY',
          merchant: {
            merchant_id: sessionPayload.merchant_id,
            profile_id: sessionPayload.profile_id,
          },
          security: { ip_address: ipAddress, user_agent: userAgent },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Log de éxito
    console.log('✅ Publishable key retrieved successfully', {
      merchant_id: sessionPayload.merchant_id,
      profile_id: sessionPayload.profile_id,
      environment: sessionPayload.environment,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Clave publicable obtenida exitosamente',
      merchant: {
        merchant_id: sessionPayload.merchant_id,
        profile_id: sessionPayload.profile_id,
        environment: sessionPayload.environment,
        publishable_key: publishableKey,
      },
      security: {
        ip_address: ipAddress,
        user_agent: userAgent,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log del error
    console.error('❌ Error retrieving publishable key', {
      error: error instanceof Error ? error.message : String(error),
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });

    // Respuesta de error
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la clave publicable',
        code: 'INTERNAL_ERROR',
        details: isProduction ? undefined : error instanceof Error ? error.message : String(error),
        security: { ip_address: ipAddress, user_agent: userAgent },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Método GET para documentación del endpoint
export async function GET_DOCUMENTATION() {
  return NextResponse.json({
    endpoint: '/api/auth/publishable-key',
    method: 'GET',
    description: 'Obtiene la clave publicable para uso en el cliente con la API de Hyperswitch.',
    required_cookies: ['session_token', 'publishable_key'],
    response: {
      success: 'boolean',
      message: 'string',
      merchant: {
        merchant_id: 'string',
        profile_id: 'string',
        environment: 'sandbox | production',
        publishable_key: 'string',
      },
      security: {
        ip_address: 'string',
        user_agent: 'string',
      },
      timestamp: 'ISO 8601 string',
    },
    error_codes: {
      UNAUTHORIZED: 'No se encontró una sesión activa o el token es inválido',
      CONFIGURATION_ERROR: 'Error de configuración del servidor',
      MISSING_PUBLISHABLE_KEY: 'No se encontró la clave publicable',
      INTERNAL_ERROR: 'Error interno del servidor',
    },
    security_notes: [
      'Requiere una sesión activa (session_token)',
      'La clave publicable se obtiene de una cookie segura',
      'Registra información de auditoría (IP, user agent, merchant_id, profile_id)',
      'Errores sensibles no se exponen en producción',
    ],
  });
}

// Métodos no permitidos
export async function POST() {
  return NextResponse.json(
    { error: 'Método no permitido. Use GET para obtener la clave publicable.', allowed_methods: ['GET'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use GET para obtener la clave publicable.', allowed_methods: ['GET'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use GET para obtener la clave publicable.', allowed_methods: ['GET'] },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Método no permitido. Use GET para obtener la clave publicable.', allowed_methods: ['GET'] },
    { status: 405 }
  );
}