// app/api/hyperswitch/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validación de headers requeridos
const HeadersSchema = z.object({
  'x-merchant-id': z.string().min(1, 'Merchant ID es requerido'),
  'x-profile-id': z.string().min(1, 'Profile ID es requerido'),
  'authorization': z.string().min(1, 'Authorization header es requerido'),
})

// Helper para crear respuesta de error
function createErrorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: {
        type: 'api_error',
        message,
        code: `HTTP_${status}`,
        details,
      },
    },
    { 
      status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id, api-key',
      }
    }
  )
}

// Mapeo correcto de endpoints según documentación de Hyperswitch
function mapHyperswitchEndpoint(path: string, method: string): { endpoint: string; needsAuth: boolean } {
  const pathSegments = path.split('/').filter(Boolean)
  
  // Endpoints específicos de Hyperswitch según su documentación
  const endpointMapping: Record<string, { endpoint: string; methods: string[]; needsAuth: boolean }> = {
    // Payments - usa POST para list según documentación
    'payments': { 
      endpoint: method === 'GET' ? 'payments/list' : 'payments', 
      methods: ['GET', 'POST'], 
      needsAuth: true 
    },
    'payments/list': { 
      endpoint: 'payments/list', 
      methods: ['POST'], 
      needsAuth: true 
    },
    
    // Connectors
    'account/connectors': { 
      endpoint: 'account/connectors', 
      methods: ['GET', 'POST'], 
      needsAuth: true 
    },
    'connectors': { 
      endpoint: 'account/connectors', 
      methods: ['GET', 'POST'], 
      needsAuth: true 
    },
    
    // Customers
    'customers': { 
      endpoint: 'customers', 
      methods: ['GET', 'POST'], 
      needsAuth: true 
    },
    'customers/list': { 
      endpoint: 'customers/list', 
      methods: ['POST'], 
      needsAuth: true 
    },
    
    // Refunds
    'refunds': { 
      endpoint: 'refunds', 
      methods: ['GET', 'POST'], 
      needsAuth: true 
    },
    'refunds/list': { 
      endpoint: 'refunds/list', 
      methods: ['POST'], 
      needsAuth: true 
    },
    
    // Disputes
    'disputes': { 
      endpoint: 'disputes/list', 
      methods: ['POST'], 
      needsAuth: true 
    },
    'disputes/list': { 
      endpoint: 'disputes/list', 
      methods: ['POST'], 
      needsAuth: true 
    },
    
    // Analytics
    'analytics/payments': { 
      endpoint: 'analytics/v1/metrics/payments', 
      methods: ['POST'], 
      needsAuth: true 
    },
    
    // Health check
    'health': { 
      endpoint: 'health', 
      methods: ['GET'], 
      needsAuth: false 
    },
  }
  
  const fullPath = pathSegments.join('/')
  
  // Buscar mapeo directo
  if (endpointMapping[fullPath]) {
    const mapping = endpointMapping[fullPath]
    if (mapping.methods.includes(method)) {
      return { endpoint: mapping.endpoint, needsAuth: mapping.needsAuth }
    }
  }
  
  // Buscar mapeos con patrones (para endpoints con IDs)
  for (const [pattern, mapping] of Object.entries(endpointMapping)) {
    if (fullPath.startsWith(pattern + '/')) {
      const suffix = fullPath.substring(pattern.length)
      return { 
        endpoint: mapping.endpoint + suffix, 
        needsAuth: mapping.needsAuth 
      }
    }
  }
  
  // Si no hay mapeo específico, usar la ruta tal como está
  return { endpoint: fullPath, needsAuth: true }
}

// Convertir GET con query params a POST con body para endpoints que lo requieren
function convertGetToPostForHyperswitch(path: string, method: string, searchParams: URLSearchParams): { 
  method: string; 
  body?: string; 
  endpoint: string 
} {
  const { endpoint } = mapHyperswitchEndpoint(path, method)
  
  // Endpoints que requieren POST incluso para consultas
  const postOnlyEndpoints = [
    'payments/list',
    'customers/list', 
    'refunds/list',
    'disputes/list',
    'analytics/v1/metrics/payments'
  ]
  
  if (method === 'GET' && postOnlyEndpoints.some(ep => endpoint.includes(ep))) {
    // Convertir query params a body
    const body: Record<string, any> = {}
    
    searchParams.forEach((value, key) => {
      // Manejar arrays (múltiples valores para la misma key)
      if (body[key]) {
        if (Array.isArray(body[key])) {
          body[key].push(value)
        } else {
          body[key] = [body[key], value]
        }
      } else {
        // Convertir tipos apropiados
        if (key === 'limit' || key === 'offset') {
          body[key] = parseInt(value, 10)
        } else if (key === 'status' || key === 'connector' || key === 'payment_method') {
          body[key] = [value] // Hyperswitch espera arrays para estos
        } else {
          body[key] = value
        }
      }
    })
    
    return {
      method: 'POST',
      body: JSON.stringify(body),
      endpoint: endpoint
    }
  }
  
  return {
    method,
    endpoint: endpoint
  }
}

// Handler principal
async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const startTime = Date.now()
  
  try {
    // Obtener headers de autorización del request
    const authHeader = request.headers.get('authorization')
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')

    if (!authHeader || !merchantId || !profileId) {
      return createErrorResponse(
        'Headers requeridos faltantes: authorization, x-merchant-id, x-profile-id', 
        401
      )
    }

    // Extraer API key del header Authorization
    const apiKey = authHeader.replace('Bearer ', '')
    
    if (!apiKey.startsWith('snd_') && !apiKey.startsWith('pk_')) {
      return createErrorResponse('API Key format inválido', 401)
    }

    // Determinar base URL según el tipo de API key
    const isSandbox = apiKey.startsWith('snd_')
    const baseUrl = isSandbox 
      ? 'https://sandbox.hyperswitch.io' 
      : 'https://api.hyperswitch.io'

    // Validar headers
    try {
      HeadersSchema.parse({
        'x-merchant-id': merchantId,
        'x-profile-id': profileId,
        'authorization': authHeader,
      })
    } catch (error) {
      return createErrorResponse(
        'Headers inválidos',
        400,
        error instanceof z.ZodError ? error.errors : error
      )
    }

    // Procesar la ruta y método
    const originalPath = params.path.join('/')
    const searchParams = request.nextUrl.searchParams
    
    const { method: finalMethod, body: requestBody, endpoint } = convertGetToPostForHyperswitch(
      originalPath, 
      request.method, 
      searchParams
    )
    
    // Construir URL final
    const targetUrl = new URL(`/${endpoint}`, baseUrl)
    
    // Si no se convirtió a POST, agregar query params normalmente
    if (finalMethod === request.method && searchParams.toString()) {
      searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value)
      })
    }

    // Preparar headers para Hyperswitch
    const hyperswitchHeaders = new Headers({
      'api-key': apiKey, // Hyperswitch usa api-key, no Authorization
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Multipaga-Dashboard/1.0',
    })

    // Obtener body del request original si no fue convertido
    let finalBody = requestBody
    if (!finalBody && request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const contentType = request.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const jsonBody = await request.json()
          finalBody = JSON.stringify(jsonBody)
        } else {
          finalBody = await request.text()
        }
      } catch (error) {
        console.warn('No se pudo leer el body de la petición:', error)
      }
    }

    // Log de la petición
    console.log(`🚀 Hyperswitch Request: ${finalMethod} ${targetUrl.pathname}${targetUrl.search}`)
    console.log(`📋 Merchant: ${merchantId}, Profile: ${profileId}`)
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`)
    
    if (finalBody && process.env.NODE_ENV === 'development') {
      console.log(`📦 Body: ${finalBody}`)
    }

    // Realizar petición a Hyperswitch
    const hyperswitchResponse = await fetch(targetUrl.toString(), {
      method: finalMethod,
      headers: hyperswitchHeaders,
      body: finalBody,
      redirect: 'manual',
    })

    const duration = Date.now() - startTime

    // Log de la respuesta
    console.log(`✅ Hyperswitch Response: ${hyperswitchResponse.status} ${hyperswitchResponse.statusText} (${duration}ms)`)

    // Obtener respuesta
    const responseText = await hyperswitchResponse.text()
    let responseData: any

    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch {
      responseData = { message: responseText }
    }

    // Log de respuesta en desarrollo
    if (process.env.NODE_ENV === 'development' && responseData) {
      console.log(`📤 Response Data:`, JSON.stringify(responseData, null, 2))
    }

    // Crear respuesta con mismo status que Hyperswitch
    const response = NextResponse.json(responseData, {
      status: hyperswitchResponse.status,
      statusText: hyperswitchResponse.statusText,
    })

    // Copiar headers relevantes
    const headersToForward = [
      'x-request-id',
      'x-correlation-id', 
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ]

    headersToForward.forEach(header => {
      const value = hyperswitchResponse.headers.get(header)
      if (value) {
        response.headers.set(header, value)
      }
    })

    // Agregar headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id, api-key')

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    
    console.error('❌ Proxy Error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createErrorResponse(
        'No se pudo conectar con Hyperswitch API', 
        503,
        { 
          message: 'Servicio no disponible',
          cause: 'network_error'
        }
      )
    }

    if (error instanceof Error) {
      return createErrorResponse(
        'Error interno del proxy',
        500,
        {
          message: error.message,
          cause: 'internal_error',
          duration
        }
      )
    }

    return createErrorResponse('Error desconocido', 500)
  }
}

// Handlers para métodos HTTP
export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context)
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context)
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context)
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context)
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return handler(request, context)
}

// Handler para CORS preflight
export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id, api-key',
      'Access-Control-Max-Age': '86400',
    },
  })
}