import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Schema for session data
const sessionSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
  apiKey: z.string(),
});

export async function GET() {
  const sessionCookie = cookies().get('hyperswitch_session')?.value;

  if (!sessionCookie) {
    logger.warn('No session cookie found');
    return NextResponse.json(
      {
        success: false,
        isAuthenticated: false,
        code: 'NO_SESSION',
        error: 'No hay sesión activa',
      },
      { status: 401 }
    );
  }

  try {
    const sessionData = sessionSchema.parse(JSON.parse(sessionCookie));
    if (new Date(sessionData.expiresAt) < new Date()) {
      logger.warn('Session expired');
      return NextResponse.json(
        {
          success: false,
          isAuthenticated: false,
          code: 'SESSION_EXPIRED',
          error: 'Sesión expirada',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      isAuthenticated: true,
      customer: {
        customer_id: sessionData.customerId,
        customer_name: sessionData.customerName,
        environment: sessionData.environment,
      },
      session: {
        expires_at: sessionData.expiresAt,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error parsing session cookie');
    return NextResponse.json(
      {
        success: false,
        isAuthenticated: false,
        code: 'SESSION_ERROR',
        error: 'Error al procesar la sesión',
      },
      { status: 500 }
    );
  }
}