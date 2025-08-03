import { NextRequest, NextResponse } from 'next/server';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Configuración de rutas públicas que NO requieren autenticación
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

// Función para verificar si una ruta es pública (solo para rutas que no son manejadas por el matcher)
function isPublicRoute(pathname: string, method: string): boolean {
  // Permitir POST a /api/auth explícitamente
  if (method === 'POST' && pathname === '/api/auth') {
    return true;
  }
  return (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    API_AUTH_ROUTES.some((route) => pathname.startsWith(route))
  );
}

// Función para verificar la sesión
async function verifySessionCookie(sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie) {
    return false;
  }

  try {
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData.userId || !sessionData.email || !sessionData.isAuthenticated) {
      logger.warn('Invalid session data structure');
      return false;
    }
    
    // Verificar si la sesión no ha expirado (opcional, basado en loginTime)
    if (sessionData.loginTime) {
      const sessionAge = Date.now() - sessionData.loginTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      if (sessionAge > maxAge) {
        logger.warn('Session expired based on login time');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error parsing session cookie');
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Log para debugging
  logger.info({ method, pathname }, 'Middleware processing request');

  // Permitir rutas públicas definidas en isPublicRoute sin verificación
  if (isPublicRoute(pathname, method)) {
    logger.debug({ pathname, method }, 'Public route, bypassing session check');
    return NextResponse.next();
  }

  // Verificar sesión para rutas protegidas
  const sessionCookie = request.cookies.get('session')?.value;

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
    response.cookies.delete('session');
    response.cookies.delete('temp_session');
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
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image (optimización de imágenes de Next.js)
     * - favicon.ico, robots.txt, manifest.json, sw.js, workbox- (archivos estáticos comunes)
     * - Cualquier archivo con extensiones de imagen o de recursos estáticos
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|manifest.json|sw.js|workbox-|.+\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)',
  ],
};

