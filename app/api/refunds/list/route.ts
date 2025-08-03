import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
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

    const HYPERSWITCH_API_URL = process.env.HYPERSWITCH_API_URL;
    if (!HYPERSWITCH_API_URL) {
      console.error('HYPERSWITCH_API_URL no está configurada en las variables de entorno.');
      return NextResponse.json({
        success: false,
        error: 'Error de configuración del servidor',
        code: 'SERVER_CONFIG_ERROR',
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const dateRange = searchParams.get('date_range');

    // Construct query parameters for Hyperswitch API
    const query = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') query.append('status', statusFilter);
    // Add date range logic if Hyperswitch API supports it

    const hyperswitchResponse = await fetch(`${HYPERSWITCH_API_URL}/refunds/list?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.token}`,
      },
    });

    const hyperswitchData = await hyperswitchResponse.json();

    if (!hyperswitchResponse.ok) {
      console.error('Error al obtener reembolsos de Hyperswitch:', hyperswitchData);
      return NextResponse.json({
        success: false,
        error: hyperswitchData.message || 'Error al obtener reembolsos',
        code: hyperswitchData.code || 'HYPERSWITCH_ERROR',
      }, { status: hyperswitchResponse.status });
    }

    return NextResponse.json({
      success: true,
      refunds: hyperswitchData.data || [],
    });

  } catch (error) {
    console.error('Error al listar reembolsos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

