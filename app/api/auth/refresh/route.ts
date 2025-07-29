import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

const sessionSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
  apiKey: z.string(),
});

export async function POST(request: NextRequest) {
  const sessionCookie = cookies().get('hyperswitch_session')?.value;

  if (!sessionCookie) {
    logger.warn('No session cookie found');
    return NextResponse.json(
      { success: false, code: 'NO_SESSION', error: 'No hay sesión activa' },
      { status: 401 }
    );
  }

  try {
    const sessionData = sessionSchema.parse(JSON.parse(sessionCookie));
    if (new Date(sessionData.expiresAt) < new Date()) {
      logger.warn('Session expired');
      return NextResponse.json(
        { success: false, code: 'REFRESH_TOKEN_EXPIRED', error: 'Sesión expirada' },
        { status: 401 }
      );
    }

    // Mock refresh
    const newExpiresAt = new Date(Date.now() + 3600 * 8 * 1000);
    const newSessionData = { ...sessionData, expiresAt: newExpiresAt.toISOString() };

    cookies().set('hyperswitch_session', JSON.stringify(newSessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 8,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      session: { expires_at: newExpiresAt.toISOString() },
    });
  } catch (error) {
    logger.error({ error }, 'Error refreshing session');
    return NextResponse.json(
      { success: false, code: 'SESSION_ERROR', error: 'Error al refrescar la sesión' },
      { status: 500 }
    );
  }
}