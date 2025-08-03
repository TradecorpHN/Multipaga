import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { generateCorrelationId } from '@/lib/auth';

// Validation schema
const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  password: z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const validatedData = signUpSchema.parse(body);

    // Call Hyperswitch user registration API
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        email: validatedData.email,
        name: validatedData.name,
        password: validatedData.password,
      }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Error al registrar usuario',
        code: hyperswitchData.code || 'REGISTRATION_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    // Check if email verification is required
    if (hyperswitchData.requires_verification) {
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'Se ha enviado un email de verificación',
      });
    }

    // If registration is successful and no verification required
    // Create session data
    const sessionData = {
      userId: hyperswitchData.user.id,
      email: hyperswitchData.user.email,
      name: hyperswitchData.user.name,
      merchantId: hyperswitchData.merchant_id,
      profileId: hyperswitchData.profile_id,
      orgId: hyperswitchData.org_id,
      roleId: hyperswitchData.role_id,
      permissions: hyperswitchData.permissions || [],
      token: hyperswitchData.token,
      refreshToken: hyperswitchData.refresh_token,
      expiresAt: hyperswitchData.expires_at,
      isAuthenticated: true,
      has2FA: false, // New users don't have 2FA enabled by default
    };

    // Set session cookie
    cookies().set('hyperswitch_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      requiresVerification: false,
      requires2FA: false,
      user: {
        id: hyperswitchData.user.id,
        email: hyperswitchData.user.email,
        name: hyperswitchData.user.name,
        has2FA: false,
      },
    });

  } catch (error) {
    console.error('Sign up error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Datos de entrada inválidos',
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

