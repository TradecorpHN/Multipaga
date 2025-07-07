import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify, sign } from 'jsonwebtoken'

interface RefreshTokenPayload {
  merchant_id: string
  type: 'refresh'
  iat: number
  exp: number
}

interface SessionTokenPayload {
  merchant_id: string
  api_key: string
  profile_id?: string
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'Token de renovación no encontrado',
          code: 'REFRESH_TOKEN_MISSING' 
        },
        { status: 401 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev'

    // Verificar refresh token
    let refreshPayload: RefreshTokenPayload
    try {
      refreshPayload = verify(refreshToken, jwtSecret) as RefreshTokenPayload
    } catch (error) {
      // Token expirado o inválido
      return NextResponse.json(
        { 
          error: 'Token de renovación inválido o expirado',
          code: 'REFRESH_TOKEN_INVALID' 
        },
        { status: 401 }
      )
    }

    // Verificar que es realmente un refresh token
    if (refreshPayload.type !== 'refresh') {
      return NextResponse.json(
        { 
          error: 'Tipo de token inválido',
          code: 'INVALID_TOKEN_TYPE' 
        },
        { status: 401 }
      )
    }

    // Obtener información actualizada del merchant desde Hyperswitch
    let merchantData
    try {
      // Necesitamos obtener la API key original - en un caso real esto podría estar 
      // almacenado de forma segura o obtenido de otra manera
      const sessionToken = cookieStore.get('session_token')?.value
      let apiKey: string | undefined

      if (sessionToken) {
        try {
          const sessionPayload = verify(sessionToken, jwtSecret) as SessionTokenPayload
          apiKey = sessionPayload.api_key
        } catch {
          // Session token expirado, pero podemos continuar con refresh
        }
      }

      if (!apiKey) {
        // Si no podemos obtener la API key, necesitamos que el usuario haga login nuevamente
        return NextResponse.json(
          { 
            error: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
            code: 'API_KEY_REQUIRED' 
          },
          { status: 401 }
        )
      }

      // Validar que la cuenta sigue activa en Hyperswitch
      const hyperswitchResponse = await fetch(
        `${process.env.HYPERSWITCH_BASE_URL}/account/${refreshPayload.merchant_id}`,
        {
          headers: {
            'api-key': apiKey,
          },
        }
      )

      if (!hyperswitchResponse.ok) {
        return NextResponse.json(
          { 
            error: 'Cuenta no válida o suspendida',
            code: 'ACCOUNT_INVALID' 
          },
          { status: 401 }
        )
      }

      merchantData = await hyperswitchResponse.json()

    } catch (error) {
      console.error('Error validando cuenta con Hyperswitch:', error)
      return NextResponse.json(
        { 
          error: 'Error validando cuenta',
          code: 'VALIDATION_ERROR' 
        },
        { status: 500 }
      )
    }

    // Crear nuevo session token
    const newSessionToken = sign(
      {
        merchant_id: refreshPayload.merchant_id,
        api_key: merchantData.api_key || 'encrypted-key', // En producción esto debería estar encriptado
        profile_id: merchantData.profile_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      },
      jwtSecret
    )

    // Crear nuevo refresh token (rotar para mayor seguridad)
    const newRefreshToken = sign(
      {
        merchant_id: refreshPayload.merchant_id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 días
      },
      jwtSecret
    )

    // Configurar nuevas cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    // Establecer nuevo session token
    cookieStore.set('session_token', newSessionToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60, // 24 horas
    })

    // Establecer nuevo refresh token
    cookieStore.set('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 días
    })

    // Log de renovación exitosa
    console.info('Token renovado exitosamente:', {
      merchant_id: refreshPayload.merchant_id,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Token renovado exitosamente',
      session: {
        expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
      },
      merchant: {
        merchant_id: refreshPayload.merchant_id,
        profile_id: merchantData.profile_id,
      }
    })

  } catch (error) {
    console.error('Error en refresh de token:', error)

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Error desconocido') :
          'Error interno'
      },
      { status: 500 }
    )
  }
}

// Manejo de método GET - información del endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/auth/refresh',
    method: 'POST',
    description: 'Renueva el token de sesión usando el refresh token',
    required_cookies: ['refresh_token'],
    response: {
      success: 'boolean',
      message: 'string',
      session: {
        expires_at: 'ISO 8601 string'
      },
      merchant: {
        merchant_id: 'string',
        profile_id: 'string'
      }
    },
    error_codes: {
      'REFRESH_TOKEN_MISSING': 'No se encontró el token de renovación',
      'REFRESH_TOKEN_INVALID': 'Token de renovación inválido o expirado',
      'INVALID_TOKEN_TYPE': 'Tipo de token incorrecto',
      'API_KEY_REQUIRED': 'Se requiere nuevo login',
      'ACCOUNT_INVALID': 'Cuenta no válida o suspendida',
      'VALIDATION_ERROR': 'Error validando con Hyperswitch',
      'INTERNAL_ERROR': 'Error interno del servidor'
    }
  })
}

// Manejo de otros métodos HTTP
export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para refresh.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para refresh.' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para refresh.' },
    { status: 405 }
  )
}