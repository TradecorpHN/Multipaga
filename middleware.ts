// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ✅ Forzar Node.js runtime para compatibilidad
export const runtime = 'nodejs'

// Auth cookie key
const AUTH_COOKIE_KEY = 'hyperswitch_auth'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/health', '/api/auth/login']

// API routes
const API_ROUTES_PREFIX = '/api/'

// Simple in-memory rate limiter compatible con TypeScript
class SimpleRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()
  
  constructor(
    private maxRequests = 100,
    private windowMs = 15 * 60 * 1000 // 15 minutes
  ) {}

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const record = this.requests.get(key)

    if (!record || now > record.resetTime) {
      // New window or first request
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return true
    }

    if (record.count >= this.maxRequests) {
      return false // Rate limit exceeded
    }

    record.count++
    return true
  }

  cleanup() {
    const now = Date.now()
    // ✅ Usar forEach en lugar de for...of para evitar el error de iteración
    this.requests.forEach((record, key) => {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    })
  }
}

const rateLimiter = new SimpleRateLimiter()

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
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      rateLimiter.cleanup()
    }
    
    const isAllowed = await rateLimiter.checkLimit(clientIp)
    
    if (!isAllowed) {
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

    // CORS headers for API routes
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

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    return response
  }

  // Authentication check for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get(AUTH_COOKIE_KEY)
    
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Add cache headers for authenticated routes
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  }

  // Redirect authenticated users away from login
  if (pathname === '/login') {
    const authCookie = request.cookies.get(AUTH_COOKIE_KEY)
    
    if (authCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
    '/dashboard/:path*'
  ]
}