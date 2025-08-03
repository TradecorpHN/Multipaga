import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { generateCorrelationId } from '@/lib/auth';

// Validation schema
const verifyRecoverySchema = z.object({
  recoveryCode: z.string().min(1, 'Código de recuperación requerido'),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const validatedData = verifyRecoverySchema.parse(body);

    // Get temporary session from cookie
    const tempSessionCookie = cookies().get('hyperswitch_temp_session');
    
    if (!tempSessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión temporal activa',
        code: 'NO_TEMP_SESSION',
      }, { status: 401 });
    }

    const tempSessionData = JSON.parse(tempSessionCookie.value);

    // Check if temp session is expired
    if (new Date(tempSessionData.expiresAt) <= new Date()) {
      cookies().delete('hyperswitch_temp_session');
      return NextResponse.json({
        success: false,
        error: 'Sesión temporal expirada',
        code: 'TEMP_SESSION_EXPIRED',
      }, { status: 401 });
    }

    // Call Hyperswitch recovery code verification API
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/2fa/verify_recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempSessionData.tempToken}`,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        recovery_code: validatedData.recoveryCode,
      }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Código de recuperación inválido',
        code: hyperswitchData.code || 'INVALID_RECOVERY_CODE',
      }, { status: hyperswitchResponse.status });
    }

    // Create full session data
    const sessionData = {
      userId: tempSessionData.userId,
      email: tempSessionData.email,
      name: tempSessionData.name,
      merchantId: hyperswitchData.merchant_id,
      profileId: hyperswitchData.profile_id,
      orgId: hyperswitchData.org_id,
      roleId: hyperswitchData.role_id,
      permissions: hyperswitchData.permissions || [],
      token: hyperswitchData.token,
      refreshToken: hyperswitchData.refresh_token,
      expiresAt: hyperswitchData.expires_at,
      isAuthenticated: true,
      has2FA: true,
    };

    // Set session cookie
    cookies().set('hyperswitch_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Clear temporary session
    cookies().delete('hyperswitch_temp_session');

    return NextResponse.json({
      success: true,
      message: 'Verificación con código de recuperación exitosa',
    });

  } catch (error) {
    console.error('Recovery code verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Código de recuperación inválido',
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

