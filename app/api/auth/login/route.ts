import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken'

// Esquema de validación para login
const loginSchema = z.object({
  api_key: z.string().min(1, 'API Key es requerida'),
  merchant_id: z.string().optional(),
})

// Interfaces según Hyperswitch API
interface HyperswitchAuthResponse {
  merchant_id: string
  api_key: string
  publishable_key?: string
  profile_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos de entrada
    const validatedData = loginSchema.parse(body)
    
    // Validar API Key con Hyperswitch
    const hyperswitchResponse = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/account`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': validatedData.api_key,
      },
    })

    if (!hyperswitchResponse.ok) {
      const errorData = await hyperswitchResponse.json().catch(() => ({}))
      
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas',
          details: errorData.message || 'API Key inválida o expirada' 
        },
        { status: 401 }
      )
    }

    const merchantData: HyperswitchAuthResponse = await hyperswitchResponse.json()

    // Crear JWT token para sesión local
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev'
    const sessionToken = sign(
      {
        merchant_id: merchantData.merchant_id,
        api_key: validatedData.api_key,
        profile_id: merchantData.profile_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      },
      jwtSecret
    )

    // Obtener información del perfil de business si existe
    let businessProfile = null
    if (merchantData.profile_id) {
      try {
        const profileResponse = await fetch(
          `${process.env.HYPERSWITCH_BASE_URL}/account/${merchantData.merchant_id}/business_profile/${merchantData.profile_id}`,
          {
            headers: {
              'api-key': validatedData.api_key,
            },
          }
        )
        
        if (profileResponse.ok) {
          businessProfile = await profileResponse.json()
        }
      } catch (error) {
        console.warn('No se pudo obtener información del perfil de business:', error)
      }
    }

    // Crear refresh token
    const refreshToken = sign(
      {
        merchant_id: merchantData.merchant_id,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 días
      },
      jwtSecret
    )

    // Configurar cookies seguras
    const cookieStore = cookies()
    
    // Session token (httpOnly para seguridad)
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/',
    })

    // Refresh token (httpOnly para seguridad)
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/',
    })

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      merchant: {
        merchant_id: merchantData.merchant_id,
        profile_id: merchantData.profile_id,
        publishable_key: merchantData.publishable_key,
        business_profile: businessProfile,
      },
      session: {
        expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
      }
    })

  } catch (error) {
    console.error('Error en login:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos de entrada inválidos',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Error interno del servidor',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error desconocido' },
      { status: 500 }
    )
  }
}

// Manejo de otros métodos HTTP
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para login.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para login.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido. Use POST para login.' },
    { status: 405 }
  )
}