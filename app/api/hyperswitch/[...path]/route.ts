import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/presentation/lib/env-config'
import { z } from 'zod'

// Request headers schema
const HeadersSchema = z.object({
  'x-merchant-id': z.string().optional(),
  'x-profile-id': z.string().optional(),
})

// Error response helper
function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      error: {
        type: 'invalid_request',
        message,
        code: 'API_PROXY_ERROR',
      },
    },
    { status }
  )
}

// Proxy handler for all HTTP methods
async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruct the path
    const path = params.path.join('/')
    
    // Validate required headers
    const merchantId = request.headers.get('x-merchant-id')
    const profileId = request.headers.get('x-profile-id')

    // Some endpoints don't require merchant/profile context
    const publicEndpoints = ['health', 'connector/list']
    const isPublicEndpoint = publicEndpoints.some(endpoint => path.includes(endpoint))

    if (!isPublicEndpoint && (!merchantId || !profileId)) {
      return errorResponse('Missing required headers: x-merchant-id, x-profile-id', 401)
    }

    // Build target URL
    const targetUrl = new URL(path, env.HYPERSWITCH_BASE_URL)
    
    // Copy query parameters
    const searchParams = request.nextUrl.searchParams
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value)
    })

    // Prepare headers for upstream request
    const headers = new Headers({
      'Authorization': `Bearer ${env.HYPERSWITCH_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    })

    // Add merchant context headers if available
    if (merchantId) headers.set('X-Merchant-Id', merchantId)
    if (profileId) headers.set('X-Profile-Id', profileId)

    // Get request body if present
    let body = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const contentType = request.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          body = await request.json()
        } else {
          body = await request.text()
        }
      } catch (error) {
        // No body or invalid body
        body = null
      }
    }

    // Make the upstream request
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      // Important: Don't follow redirects automatically
      redirect: 'manual',
    })

    // Handle redirects
    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      const location = upstreamResponse.headers.get('location')
      if (location) {
        return NextResponse.redirect(new URL(location))
      }
    }

    // Get response body
    const responseText = await upstreamResponse.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // If not JSON, return as text
      responseData = responseText
    }

    // Create response with same status as upstream
    const response = NextResponse.json(responseData, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    })

    // Copy relevant headers from upstream response
    const headersToForward = [
      'x-request-id',
      'x-correlation-id',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ]

    headersToForward.forEach(header => {
      const value = upstreamResponse.headers.get(header)
      if (value) {
        response.headers.set(header, value)
      }
    })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id')

    return response

  } catch (error) {
    console.error('Proxy error:', error)
    
    // Network or other errors
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        return errorResponse('Failed to connect to Hyperswitch API', 503)
      }
    }

    return errorResponse('Internal server error', 500)
  }
}

// Export handlers for all HTTP methods
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

export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id',
      'Access-Control-Max-Age': '86400',
    },
  })
}