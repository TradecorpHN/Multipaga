import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface SessionPayload {
  merchant_id: string
  api_key: string
  profile_id?: string
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value

    let merchantId: string | null = null

    // Intentar obtener merchant_id del token si existe (para logging)
    if (sessionToken) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev'
        const decoded = verify(sessionToken, jwtSecret) as SessionPayload
        merchantId = decoded.merchant_id
      } catch (error) {
        // Token inválido, pero continuamos con el logout
        console.warn('Token inválido durante logout:', error)
      }
    }

    // Limpiar todas las cookies de autenticación
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0, // Expire inmediatamente
    }

    // Eliminar session token
    cookieStore.set('session_token', '', cookieOptions)
    
    // Eliminar refresh token
    cookieStore.set('refresh_token', '', cookieOptions)

    // También limpiar cualquier cookie adicional que pueda existir
    cookieStore.set('merchant_id', '', cookieOptions)
    cookieStore.set('profile_id', '', cookieOptions)

    // Log del logout para auditoría
    console.info('Usuario deslogueado:', {
      merchant_id: merchantId,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error durante logout:', error)

    // Incluso si hay error, intentamos limpiar las cookies
    const cookieStore = cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    }

    cookieStore.set('session_token', '', cookieOptions)
    cookieStore.set('refresh_token', '', cookieOptions)
    cookieStore.set('merchant_id', '', cookieOptions)
    cookieStore.set('profile_id', '', cookieOptions)

    return NextResponse.json(
      { 
        success: true, // Consideramos exitoso aunque haya error interno
        message: 'Sesión cerrada (con advertencias)',
        warning: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Error desconocido') : 
          undefined
      },
      { status: 200 }
    )
  }
}

// Manejo de método GET - información de logout
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/auth/logout',
    method: 'POST',
    description: 'Cierra la sesión del usuario y limpia cookies de autenticación',
    required_cookies: ['session_token', 'refresh_token'],
    response: {
      success: 'boolean',
      message: 'string',
      timestamp: 'ISO 8601 string'
    }
  })
}

// Manejo de otros métodos HTTP
export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para logout.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para logout.' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para logout.' },
    { status: 405 }
  )
}