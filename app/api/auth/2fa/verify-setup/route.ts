import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { generateCorrelationId } from '@/lib/auth';

// Validation schema
const verify2FASetupSchema = z.object({
  otp: z.string().length(6, 'OTP debe tener 6 dígitos'),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const validatedData = verify2FASetupSchema.parse(body);

    // Get session from cookie
    const sessionCookie = cookies().get('hyperswitch_session');
    const tempSessionCookie = cookies().get('hyperswitch_temp_session');
    
    let sessionData;
    let authToken;

    if (sessionCookie) {
      sessionData = JSON.parse(sessionCookie.value);
      authToken = sessionData.token;
    } else if (tempSessionCookie) {
      sessionData = JSON.parse(tempSessionCookie.value);
      authToken = sessionData.tempToken;
    } else {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa',
        code: 'NO_SESSION',
      }, { status: 401 });
    }

    // Call Hyperswitch 2FA verification API
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/2fa/verify_setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        otp: validatedData.otp,
      }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Código OTP inválido',
        code: hyperswitchData.code || 'INVALID_OTP',
      }, { status: hyperswitchResponse.status });
    }

    // Update session data to reflect 2FA is now enabled
    if (sessionCookie) {
      const updatedSessionData = {
        ...sessionData,
        has2FA: true,
      };

      cookies().set('hyperswitch_session', JSON.stringify(updatedSessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      recoveryCodes: hyperswitchData.recovery_codes || [],
      message: '2FA configurado exitosamente',
    });

  } catch (error) {
    console.error('2FA setup verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'OTP inválido',
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

