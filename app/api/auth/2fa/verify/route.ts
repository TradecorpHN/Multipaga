import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getApiUrl } from '@/lib/environment';

// Validation schema
const verify2FASchema = z.object({
  totp_code: z.string().length(6, 'El código TOTP debe tener 6 dígitos'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = verify2FASchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Código TOTP inválido',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const { totp_code } = validationResult.data;

    // Get temporary session from cookie
    const tempSessionCookie = cookies().get('temp_session');
    
    if (!tempSessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'Sesión temporal no encontrada. Por favor, inicia sesión nuevamente.',
        code: 'NO_TEMP_SESSION',
      }, { status: 401 });
    }

    const tempSessionData = JSON.parse(tempSessionCookie.value);

    // Check if temporary session is expired (10 minutes)
    if (Date.now() - tempSessionData.timestamp > 10 * 60 * 1000) {
      cookies().delete('temp_session');
      return NextResponse.json({
        success: false,
        error: 'Sesión temporal expirada. Por favor, inicia sesión nuevamente.',
        code: 'TEMP_SESSION_EXPIRED',
      }, { status: 401 });
    }

    // --- INTEGRACIÓN CON LA API REAL DE HYPERSWITCH ---
    const HYPERSWITCH_API_URL = getApiUrl();

    if (!HYPERSWITCH_API_URL) {
      console.error('HYPERSWITCH_API_URL no está configurada en las variables de entorno.');
      return NextResponse.json({
        success: false,
        error: 'Error de configuración del servidor',
        code: 'SERVER_CONFIG_ERROR',
      }, { status: 500 });
    }

    // Verify TOTP with Hyperswitch API
    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/user/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempSessionData.token}`,
      },
      body: JSON.stringify({ 
        totp: totp_code,
        email: tempSessionData.email 
      }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      console.error('Error de verificación 2FA con Hyperswitch:', hyperswitchData);
      return NextResponse.json({
        success: false,
        error: hyperswitchData.message || 'Código de verificación incorrecto',
        code: hyperswitchData.code || 'TOTP_VERIFICATION_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    // Create full session data after successful 2FA verification
    const sessionData = {
      userId: hyperswitchData.user_id || `user_${Date.now()}`,
      email: tempSessionData.email,
      name: hyperswitchData.name || tempSessionData.email,
      merchantId: hyperswitchData.merchant_id || 'default_merchant_id',
      profileId: hyperswitchData.profile_id || 'default_profile_id',
      orgId: hyperswitchData.org_id || 'default_org_id',
      roleId: hyperswitchData.role_id || 'user',
      permissions: hyperswitchData.permissions || [],
      isAuthenticated: true,
      loginTime: Date.now(),
      token: hyperswitchData.token || tempSessionData.token, // Use new token if provided
    };

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Clear temporary session
    cookieStore.delete('temp_session');

    // Log successful 2FA verification
    console.log(`2FA verification successful for user ${tempSessionData.email}`);

    return NextResponse.json({
      success: true,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        merchantId: sessionData.merchantId,
        profileId: sessionData.profileId,
        orgId: sessionData.orgId,
        roleId: sessionData.roleId,
        permissions: sessionData.permissions,
        has2FA: true,
      },
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}


