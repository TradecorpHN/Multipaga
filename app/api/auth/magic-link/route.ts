import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCorrelationId } from '@/lib/auth';

// Validation schema
const magicLinkSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    const validatedData = magicLinkSchema.parse(body);

    // Call Hyperswitch magic link API
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/magic_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({
        email: validatedData.email,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link/verify`,
      }),
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Error al enviar enlace mágico',
        code: hyperswitchData.code || 'MAGIC_LINK_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Se ha enviado un enlace mágico a tu email',
    });

  } catch (error) {
    console.error('Magic link error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Email inválido',
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

