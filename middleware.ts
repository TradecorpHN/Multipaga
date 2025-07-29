import { NextRequest, NextResponse } from 'next/server';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Configuración de rutas
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/help',
];

const API_AUTH_ROUTES = [
  '/api/auth', // Main auth route for Hyperswitch login
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/refresh',
  '/api/auth/publishable-key',
];

const STATIC_ROUTES = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
  '/sw.js',
  '/workbox-',
];

// Función para verificar si una ruta es pública
function isPublicRoute(pathname: string, method: string): boolean {
  // Allow POST to /api/auth explicitly
  if (method === 'POST' && pathname === '/api/auth') {
    return true;
  }
  return (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    API_AUTH_ROUTES.some((route) => pathname.startsWith(route)) ||
    STATIC_ROUTES.some((route) => pathname.startsWith(route))
  );
}

// Función para verificar la sesión
async function verifySessionCookie(sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie) {
    return false;
  }

  try {
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData.customerId || !sessionData.apiKey || !sessionData.expiresAt) {
      logger.warn('Invalid session data structure');
      return false;
    }
    if (new Date(sessionData.expiresAt) < new Date()) {
      logger.warn('Session expired');
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error parsing session cookie');
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method; // Fix: Get method from request, not request.nextUrl

  // Log para debugging
  logger.info({ method, pathname }, 'Middleware processing request');

  // Permitir rutas públicas sin verificación
  if (isPublicRoute(pathname, method)) {
    logger.debug({ pathname, method }, 'Public route, bypassing session check');
    return NextResponse.next();
  }

  // Verificar sesión para rutas protegidas
  const sessionCookie = request.cookies.get('hyperswitch_session')?.value;

  if (!sessionCookie) {
    logger.warn({ pathname }, 'No session cookie found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Verificar validez de la sesión
  const isValidSession = await verifySessionCookie(sessionCookie);
  if (!isValidSession) {
    logger.warn({ pathname }, 'Invalid or expired session, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'session_expired');
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('hyperswitch_session');
    response.cookies.delete('auth_response');
    return response;
  }

  // Sesión válida - continuar con la petición
  logger.info({ pathname }, 'Valid session, proceeding');
  const response = NextResponse.next();

  // Agregar headers de contexto para APIs si es necesario
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    try {
      const sessionData = JSON.parse(sessionCookie);
      if (sessionData.customerId) {
        response.headers.set('x-customer-id', sessionData.customerId);
      }
    } catch (error) {
      logger.warn({ pathname, error }, 'Failed to set API headers');
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - api/auth/* (manejan su propia autenticación)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, robots.txt, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|sw.js|workbox-).*)',
  ],
};