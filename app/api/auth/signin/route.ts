import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getApiUrl } from '@/lib/environment';

// Validation schema
const signinSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = signinSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const { email, password } = validationResult.data;

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

    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/user/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      // Handle errors from Hyperswitch API
      console.error('Error de autenticación con Hyperswitch:', hyperswitchData);
      return NextResponse.json({
        success: false,
        error: hyperswitchData.message || 'Error al iniciar sesión con Hyperswitch',
        code: hyperswitchData.code || 'HYPERSWITCH_AUTH_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    // Check if the response indicates 2FA is required
    if (hyperswitchData.token_type === 'totp') {
      // Create temporary session for 2FA
      const tempSessionData = {
        email: email,
        token: hyperswitchData.token,
        requiresVerification: true,
        timestamp: Date.now(),
      };

      const cookieStore = cookies();
      cookieStore.set('temp_session', JSON.stringify(tempSessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60, // 10 minutes
        path: '/',
      });

      return NextResponse.json({
        success: true,
        requires2FA: true,
        user: {
          email: email,
          has2FA: true,
        },
      });
    }

    // If we have a regular token, extract user information
    // For now, we'll create a session with the available information
    const sessionData = {
      userId: hyperswitchData.user_id || `user_${Date.now()}`,
      email: email,
      name: hyperswitchData.name || email, // Use email as name if not provided
      merchantId: hyperswitchData.merchant_id || 'default_merchant_id',
      profileId: hyperswitchData.profile_id || 'default_profile_id',
      orgId: hyperswitchData.org_id || 'default_org_id',
      roleId: hyperswitchData.role_id || 'user',
      permissions: hyperswitchData.permissions || [],
      isAuthenticated: true,
      loginTime: Date.now(),
      token: hyperswitchData.token, // Store the token for API calls
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

    // Log successful login
    console.log(`User ${email} logged in successfully`);

    return NextResponse.json({
      success: true,
      requires2FA: false,
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        name: sessionData.name,
        merchantId: sessionData.merchantId,
        profileId: sessionData.profileId,
        orgId: sessionData.orgId,
        roleId: sessionData.roleId,
        permissions: sessionData.permissions,
        has2FA: false,
      },
    });

  } catch (error) {
    console.error('Sign in error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}


