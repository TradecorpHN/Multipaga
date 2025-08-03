import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCorrelationId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
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

    // Call Hyperswitch 2FA generation API
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/user/2fa/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Correlation-ID': correlationId,
      },
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: hyperswitchData.error || 'Error al generar código 2FA',
        code: hyperswitchData.code || '2FA_GENERATION_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    return NextResponse.json({
      success: true,
      qrCodeUrl: hyperswitchData.qr_code_url,
      secretKey: hyperswitchData.secret_key,
    });

  } catch (error) {
    console.error('2FA generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

