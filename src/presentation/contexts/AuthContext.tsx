'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
});

// Configuración
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};

const ENDPOINTS = {
  login: '/api/auth/login',
  session: '/api/auth/session',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  customersList: '/customers/list',
  paymentsList: '/payments/list',
  createPayment: '/payments',
  retrievePayment: (paymentId: string) => `/payments/${paymentId}`,
};

const SESSION_COOKIE = 'hyperswitch_session';
const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const API_TIMEOUT = 15000;

// Fetch with retry
async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(API_TIMEOUT) });
    } catch (error) {
      if (attempt === retries || (error instanceof Error && error.name !== 'AbortError')) {
        throw error;
      }
      logger.warn({ url, attempt }, 'Retrying API request');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
    }
  }
  throw new Error('Max retries reached');
}

// Schemas
const AuthStateSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  merchantId: z.string().min(1),
  profileId: z.string().min(1),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
}).strict();

const LoginCredentialsSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key es requerida')
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]+)/, 'API Key debe comenzar con "snd_"'),
  merchantId: z
    .string()
    .min(1, 'Merchant ID es requerido')
    .regex(/^(merchant_[a-zA-Z0-9]+)/, 'Merchant ID debe comenzar con "merchant_"'),
  profileId: z
    .string()
    .min(1, 'Profile ID es requerido')
    .regex(/^(pro_[a-zA-Z0-9]+)/, 'Profile ID debe comenzar con "pro_"'),
  customerId: z.string().min(1, 'Customer ID es requerido'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

const SessionResponseSchema = z.object({
  success: z.boolean(),
  isAuthenticated: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  customer: z
    .object({
      customer_id: z.string().min(1).optional(),
      customer_name: z.string().nullable(),
      environment: z.enum(['sandbox', 'production']),
    })
    .optional(),
  session: z
    .object({
      expires_at: z.string().datetime(),
      merchant_id: z.string().min(1),
      profile_id: z.string().min(1),
    })
    .optional(),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string().optional(),
        message: z.string(),
      })
    )
    .optional(),
  customer: z
    .object({
      customer_id: z.string().min(1).optional(),
      customer_name: z.string().nullable(),
      environment: z.enum(['sandbox', 'production']),
    })
    .optional(),
  session: z
    .object({
      expires_at: z.string().datetime(),
      merchant_id: z.string().min(1),
      profile_id: z.string().min(1),
    })
    .optional(),
});

const RefreshResponseSchema = z.object({
  success: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  session: z
    .object({
      expires_at: z.string().datetime(),
    })
    .optional(),
});

type AuthState = z.infer<typeof AuthStateSchema>;
type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
type ErrorDetail = { field?: string; message: string };

export interface LoginResult {
  success: boolean;
  error?: string;
  code?: string;
  details?: ErrorDetail[];
}

interface AuthContextValue {
  authState: AuthState | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: (reason?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  getApiHeaders: () => Record<string, string>;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T>;
}

// Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Estado local
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado derivado
  const isAuthenticated = authState?.isAuthenticated ?? false;

  // Funciones auxiliares
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Headers
  const getApiHeaders = useCallback((): Record<string, string> => {
    if (!authState?.isAuthenticated || !authState.merchantId) {
      throw new Error('No authenticated session or merchant ID available');
    }
    const sessionCookie = Cookies.get(SESSION_COOKIE);
    if (!sessionCookie) {
      throw new Error('Session cookie not found');
    }
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (e) {
      throw new Error('Invalid session cookie');
    }
    const apiKey = sessionData.apiKey;
    if (!apiKey || !apiKey.match(/^(snd_[a-zA-Z0-9]+)/)) {
      throw new Error('Invalid API key format');
    }
    return {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'merchant-id': authState.merchantId,
      'User-Agent': `NextjsApp/1.0 (${authState.environment})`,
    };
  }, [authState]);

  // Logout
  const logout = useCallback(
    async (reason?: string) => {
      setIsLoading(true);
      logger.info({ reason }, 'Initiating logout');
      try {
        await fetch(ENDPOINTS.logout, { method: 'POST', credentials: 'include' });
      } catch (error) {
        logger.error({ error, reason }, 'Error during logout');
      }
      setAuthState(null);
      setError(null);
      Cookies.remove(SESSION_COOKIE);
      toast.success('Sesión cerrada exitosamente');
      const loginUrl = reason ? `/login?reason=${reason}` : '/login';
      router.push(loginUrl);
      setIsLoading(false);
    },
    [router]
  );

  // Refresh
  const refreshAuth = useCallback(async () => {
    try {
      const sessionCookie = Cookies.get(SESSION_COOKIE);
      if (!sessionCookie) {
        logger.warn('No session cookie found for refresh');
        await logout('session_expired');
        return;
      }
      let sessionData;
      try {
        sessionData = JSON.parse(sessionCookie);
      } catch (error) {
        logger.error({ error }, 'Invalid session cookie');
        await logout('session_expired');
        return;
      }
      const validatedSession = AuthStateSchema.safeParse(sessionData);
      if (!validatedSession.success) {
        logger.warn({ errors: validatedSession.error.errors }, 'Invalid session data');
        await logout('session_expired');
        return;
      }

      // Validate with Hyperswitch
      const { customerId, environment } = validatedSession.data;
      const apiKey = sessionData.apiKey; // Obtener apiKey directamente de la cookie
      if (!apiKey || !apiKey.match(/^(snd_[a-zA-Z0-9]+)/)) {
        logger.warn('Invalid API key format');
        await logout('session_expired');
        return;
      }
      const response = await fetchWithRetry(
        `${API_URLS[environment]}/customers/${customerId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        },
        MAX_RETRIES
      );
      if (!response.ok) {
        logger.warn({ customerId, status: response.status }, 'Hyperswitch API validation failed');
        await logout('session_expired');
        return;
      }

      const refreshResponse = await fetch(ENDPOINTS.refresh, {
        method: 'POST',
        credentials: 'include',
      });
      const rawResponse = await refreshResponse.text();
      let data;
      try {
        data = RefreshResponseSchema.parse(JSON.parse(rawResponse));
      } catch (error) {
        logger.error({ error, rawResponse }, 'Error parsing refresh response');
        throw new Error('Invalid refresh response');
      }

      if (refreshResponse.ok && data.success && data.session) {
        setAuthState((prev) =>
          prev
            ? {
                ...prev,
                expiresAt: data.session?.expires_at ?? prev.expiresAt,
              }
            : null
        );
      } else {
        logger.warn({ code: data.code, error: data.error }, 'Refresh failed');
        await logout('session_expired');
      }
    } catch (error) {
      logger.error({ error }, 'Error refreshing session');
      await logout('session_expired');
    }
  }, [logout]);

  // Verificar sesión
  const checkSession = useCallback(async (silent = true): Promise<boolean> => {
    try {
      setIsCheckingSession(true);
      const response = await fetchWithRetry(
        ENDPOINTS.session,
        {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
        MAX_RETRIES
      );

      const rawResponse = await response.text();
      let data;
      try {
        data = SessionResponseSchema.parse(JSON.parse(rawResponse));
      } catch (error) {
        logger.error({ error, rawResponse }, 'Error parsing session response');
        throw new Error('Respuesta inválida del servidor');
      }

      if (response.ok && data.success && data.isAuthenticated && data.customer && data.session) {
        setAuthState({
          customerId: data.customer.customer_id || '',
          customerName: data.customer.customer_name,
          environment: data.customer.environment,
          merchantId: data.session.merchant_id,
          profileId: data.session.profile_id,
          isAuthenticated: true,
          expiresAt: data.session.expires_at,
        });
        setError(null);
        return true;
      } else {
        setAuthState(null);
        if (!silent && data.error) {
          setError(data.error);
          toast.error(data.error);
        }
        return false;
      }
    } catch (error) {
      logger.error({ error }, 'Error checking session');
      setAuthState(null);
      if (!silent) {
        const errorMessage = 'Error verificando sesión';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      return false;
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const validatedCredentials = LoginCredentialsSchema.parse(credentials);

        const response = await fetch(ENDPOINTS.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(validatedCredentials),
        });

        const rawResponse = await response.text();
        let data;
        try {
          data = LoginResponseSchema.parse(JSON.parse(rawResponse));
        } catch (error) {
          logger.error({ error, rawResponse }, 'Error parsing login response');
          throw new Error('Respuesta inválida del servidor');
        }

        if (!response.ok || !data.success) {
          const errorMessage = data.error || 'Error al iniciar sesión';
          setError(errorMessage);
          toast.error(errorMessage);
          return {
            success: false,
            error: errorMessage,
            code: data.code,
            details: data.details,
          };
        }

        if (!data.customer || !data.session) {
          const errorMessage = 'Respuesta incompleta del servidor';
          setError(errorMessage);
          toast.error(errorMessage);
          return { success: false, error: errorMessage, code: 'INVALID_RESPONSE' };
        }

        const newAuthState: AuthState = {
          customerId: data.customer.customer_id || '',
          customerName: data.customer.customer_name,
          environment: data.customer.environment,
          merchantId: data.session.merchant_id,
          profileId: data.session.profile_id,
          isAuthenticated: true,
          expiresAt: data.session.expires_at,
        };

        setAuthState(newAuthState);
        toast.success('¡Login exitoso!');
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        logger.error({ error }, 'Login error');
        let errorMessage = 'Error inesperado al iniciar sesión';
        let details: ErrorDetail[] | undefined;
        if (error instanceof z.ZodError) {
          errorMessage = 'Datos de entrada inválidos';
          details = error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage, details };
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Fetch with auth
  const fetchWithAuth = useCallback(
    <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      if (!authState?.isAuthenticated) {
        return Promise.reject(new Error('No authenticated session'));
      }
      const apiUrl = `${API_URLS[authState.environment]}${url.startsWith('/') ? url : `/${url}`}`;
      let attempt = 0;

      const attemptFetch = async (): Promise<T> => {
        try {
          const response = await fetchWithRetry(
            apiUrl,
            {
              ...options,
              headers: { ...getApiHeaders(), ...options.headers },
            },
            MAX_RETRIES
          );
          if (!response.ok) {
            if (response.status === 401 && attempt < MAX_RETRIES) {
              await refreshAuth();
              attempt++;
              return attemptFetch();
            }
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          return await response.json();
        } catch (error) {
          if (attempt >= MAX_RETRIES) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('Session expired')) {
              logout('session_expired');
            }
            throw error;
          }
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
          return attemptFetch();
        }
      };

      return attemptFetch();
    },
    [authState, getApiHeaders, refreshAuth, logout]
  );

  // Effects
  useEffect(() => {
    const handleAuth = async () => {
      const isValidSession = await checkSession(true);
      const isAuthRoute = pathname?.startsWith('/login');
      const isPublicRoute = ['/login', '/signup', '/forgot-password'].includes(pathname || '');

      if (!isValidSession && !isPublicRoute && !isAuthRoute) {
        const currentPath = encodeURIComponent((pathname || '') + window.location.search);
        router.push(`/login?redirect=${currentPath}`);
      } else if (isValidSession && isAuthRoute) {
        router.push('/dashboard');
      }
    };

    handleAuth();
  }, [checkSession, pathname, router]);

  useEffect(() => {
    if (!authState?.isAuthenticated) return;

    const expiryTime = new Date(authState.expiresAt).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    const refreshTime = timeUntilExpiry - REFRESH_MARGIN;

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => refreshAuth(), refreshTime);
      return () => clearTimeout(timeoutId);
    } else if (timeUntilExpiry <= 0) {
      logout('session_expired');
    }
  }, [authState, logout, refreshAuth]);

  // Context value
  const contextValue: AuthContextValue = {
    authState,
    isLoading,
    isAuthenticated,
    isCheckingSession,
    error,
    login,
    logout,
    refreshAuth,
    clearError,
    getApiHeaders,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hooks
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading, isCheckingSession } = useAuth();
  return { isAuthenticated, isLoading, isCheckingSession };
}

export function useCustomer() {
  const { authState } = useAuth();
  return {
    customerId: authState?.customerId,
    customerName: authState?.customerName,
    environment: authState?.environment,
    merchantId: authState?.merchantId,
    profileId: authState?.profileId,
    isAuthenticated: authState?.isAuthenticated ?? false,
  };
}