import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Auth cookie key
const AUTH_COOKIE_KEY = 'hyperswitch_auth'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/health', '/api/auth/login']

// API routes
const API_ROUTES_PREFIX = '/api/'

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 300, // Block for 5 minutes
})

// Helper to get client IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || real || '127.0.0.1'
  return ip.trim()
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // Apply rate limiting for API routes
  if (pathname.startsWith(API_ROUTES_PREFIX)) {
    const clientIp = getClientIp(request)
    
    try {
      await rateLimiter.consume(clientIp)
    } catch (error) {
      // Rate limit exceeded
      return new NextResponse(
        JSON.stringify({
          error: {
            type: 'rate_limit_exceeded',
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '300', // 5 minutes
          },
        }
      )
    }

    // Add security headers for API responses
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // CORS headers for API routes (configure as needed)
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ]

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, PATCH'
      )
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Merchant-Id, X-Profile-Id'
      )
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    return response
  }

  // Check authentication for protected routes
  if (!PUBLIC_ROUTES.includes(pathname)) {
    const authCookie = request.cookies.get(AUTH_COOKIE_KEY)

    if (!authCookie) {
      // No auth cookie, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    try {
      // Parse and validate auth cookie
      const authData = JSON.parse(authCookie.value)
      const expiresAt = new Date(authData.expiresAt)

      if (expiresAt <= new Date()) {
        // Session expired, redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete(AUTH_COOKIE_KEY)
        return response
      }
    } catch (error) {
      // Invalid auth cookie, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(AUTH_COOKIE_KEY)
      return response
    }
  }

  // Add general security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://sandbox.hyperswitch.io https://api.hyperswitch.io; " +
      "frame-ancestors 'none';"
    )
  }

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}