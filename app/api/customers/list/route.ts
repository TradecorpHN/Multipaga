import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionCookie = cookies().get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED',
      }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    if (!sessionData.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: 'Sesión inválida',
        code: 'INVALID_SESSION',
      }, { status: 401 });
    }

    // --- INTEGRACIÓN CON LA API REAL DE HYPERSWITCH ---
    const HYPERSWITCH_API_URL = process.env.HYPERSWITCH_API_URL;

    if (!HYPERSWITCH_API_URL) {
      console.error('HYPERSWITCH_API_URL no está configurada en las variables de entorno.');
      return NextResponse.json({
        success: false,
        error: 'Error de configuración del servidor',
        code: 'SERVER_CONFIG_ERROR',
      }, { status: 500 });
    }

    // Fetch customers from Hyperswitch API
    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/customers/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.token}`,
      },
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      console.error('Error al obtener clientes de Hyperswitch:', hyperswitchData);
      return NextResponse.json({
        success: false,
        error: hyperswitchData.message || 'Error al obtener clientes',
        code: hyperswitchData.code || 'HYPERSWITCH_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    return NextResponse.json({
      success: true,
      customers: hyperswitchData.data || [],
    });

  } catch (error) {
    console.error('Error al listar clientes:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

