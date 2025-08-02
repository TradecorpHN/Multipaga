'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { z } from 'zod';

// Logger
import pino from 'pino';
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
  redact: ['apiKey', 'customerId', 'merchantId', 'profileId'],
});

// Constants
const BASE_URL = process.env.NEXT_PUBLIC_HYPERSWITCH_URL || 'https://sandbox.hyperswitch.io';
const SESSION_COOKIE = 'hyperswitch_session';
const API_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY = 1000;

// Schemas
const SessionDataSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  merchantId: z.string().min(1),
  profileId: z.string().min(1),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
  apiKey: z.string().min(1),
}).strict();

const LoginCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API Key es requerida').min(10, 'API Key debe tener al menos 10 caracteres'),
  merchantId: z.string().min(1, 'Merchant ID es requerido'),
  profileId: z.string().min(1, 'Profile ID es requerido'),
  customerId: z.string().min(1, 'Customer ID es requerido'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
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

// Interfaces
interface SessionData extends z.infer<typeof SessionDataSchema> {}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  merchant: SessionData | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: z.infer<typeof LoginCredentialsSchema>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T>;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Fetch with retry
async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(API_TIMEOUT) });
    } catch (error) {
      if (attempt === retries || (error instanceof Error && error.name !== 'AbortError')) {
        throw error;
      }
      const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
      logger.warn({ url, attempt, delay }, 'Retrying API request');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

// Session fetcher
const sessionFetcher = async ([url, apiKey]: [string, string | undefined]) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  // Use /api/auth/refresh instead of /api/auth/session
  const response = await fetchWithRetry(`/api/auth/refresh`, {
    method: 'POST',
    headers,
    credentials: 'include',
  }, MAX_RETRIES);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `Error verificando sesión: ${response.status}`;
    logger.error({ status: response.status, error: errorMessage }, 'Session fetch failed');
    if (response.status === 401) {
      throw new Error('NO_SESSION');
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    data = RefreshResponseSchema.parse(await response.json());
    logger.debug({ response: data }, 'Refresh response received');
  } catch (error) {
    logger.error({ error, status: response.status }, 'Error parsing refresh response');
    throw new Error('Invalid refresh response');
  }

  const sessionCookie = Cookies.get(SESSION_COOKIE);
  let sessionData: Partial<SessionData> = {};
  try {
    if (sessionCookie) {
      sessionData = JSON.parse(sessionCookie);
      logger.debug({ sessionData: { ...sessionData, apiKey: '[REDACTED]' } }, 'Parsed session cookie');
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to parse hyperswitch_session cookie');
    throw new Error('Invalid session cookie');
  }

  const validatedSession = SessionDataSchema.safeParse(sessionData);
  if (!validatedSession.success) {
    logger.warn({ errors: validatedSession.error.errors }, 'Invalid session data');
    throw new Error('Invalid session data');
  }

  return {
    success: true,
    merchant: {
      ...validatedSession.data,
      expiresAt: data.session?.expires_at || validatedSession.data.expiresAt,
    } as SessionData,
  };
};

// Auth provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Track login attempts

  const {
    data: sessionResponse,
    error: sessionError,
    isLoading,
    mutate: mutateSession,
  } = useSWR<
    { success: boolean; merchant: SessionData } | undefined,
    Error
  >(apiKey ? ['/api/auth/refresh', apiKey] : null, sessionFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    dedupingInterval: 30000,
  });

  const isAuthenticated = !!(sessionResponse?.success && sessionResponse?.merchant);
  const merchant = sessionResponse?.merchant || null;

  const login = useCallback(
    async (credentials: z.infer<typeof LoginCredentialsSchema>) => {
      try {
        setError(null);
        setIsLoggingIn(true);
        setApiKey(credentials.apiKey);
        logger.debug({ credentials: { ...credentials, apiKey: '[REDACTED]' } }, 'Attempting login');

        const validatedCredentials = LoginCredentialsSchema.parse(credentials);

        const response = await fetchWithRetry('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(validatedCredentials),
        }, MAX_RETRIES);

        const data = await response.json();
        logger.debug({ response: data }, 'Login response received');

        if (!response.ok) {
          const errorMessage =
            data.error ||
            (response.status === 401
              ? 'Credenciales inválidas'
              : `Error de autenticación: ${response.status}`);
          setError(errorMessage);
          setApiKey(null);
          toast.error(errorMessage);
          logger.warn({ status: response.status, error: errorMessage }, 'Login failed');
          return { success: false, error: errorMessage };
        }

        // Set merchant state directly from credentials since /api/auth/login doesn't return data
        const newMerchant: SessionData = {
          customerId: validatedCredentials.customerId,
          customerName: null,
          environment: validatedCredentials.environment,
          merchantId: validatedCredentials.merchantId,
          profileId: validatedCredentials.profileId,
          isAuthenticated: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Match backend
          apiKey: validatedCredentials.apiKey,
        };

        await mutateSession({ success: true, merchant: newMerchant }, { revalidate: false });
        toast.success('Sesión iniciada exitosamente');
        logger.info({ merchant: { ...newMerchant, apiKey: '[REDACTED]' } }, 'Login successful');
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error inesperado al iniciar sesión';
        setError(errorMessage);
        setApiKey(null);
        toast.error(errorMessage);
        logger.error({ error }, 'Login error');
        return { success: false, error: errorMessage };
      } finally {
        setIsLoggingIn(false);
      }
    },
    [mutateSession, router]
  );

  const logout = useCallback(async () => {
    try {
      setError(null);
      logger.info('Initiating logout');

      const response = await fetchWithRetry('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }, MAX_RETRIES);

      if (!response.ok) {
        throw new Error(`Error al cerrar sesión: ${response.status}`);
      }

      setApiKey(null);
      Cookies.remove(SESSION_COOKIE, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      await mutateSession(undefined, { revalidate: false });
      toast.success('Sesión cerrada exitosamente');
      logger.info('Logout successful');
      router.push('/login');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cerrar sesión';
      setError(errorMessage);
      toast.error(errorMessage);
      logger.error({ error }, 'Logout error');
    }
  }, [mutateSession, router]);

  const refreshSession = useCallback(async () => {
    try {
      setError(null);
      logger.debug('Refreshing session');
      await mutateSession();
      toast.success('Sesión actualizada');
      logger.info('Session refreshed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error refrescando sesión';
      setError(errorMessage);
      toast.error(errorMessage);
      logger.error({ error }, 'Error refreshing session');
    }
  }, [mutateSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchWithAuth = useCallback(
    async <T>(url: string, options: RequestInit = {}): Promise<T> => {
      if (!merchant?.apiKey) {
        logger.error('No API key available');
        throw new Error('No hay clave API disponible');
      }
      const apiUrl = `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
      logger.debug({ apiUrl, options }, 'Initiating fetch with auth');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'api-key': merchant.apiKey,
        'User-Agent': `NextjsApp/1.0 (${merchant.environment})`,
        ...options.headers,
      };

      let attempt = 0;
      const attemptFetch = async (): Promise<T> => {
        try {
          const response = await fetchWithRetry(apiUrl, {
            ...options,
            headers,
            credentials: 'include',
          }, MAX_RETRIES);
          if (!response.ok) {
            let errorText;
            try {
              errorText = await response.json();
              errorText = errorText.error || `HTTP ${response.status}`;
            } catch {
              errorText = `HTTP ${response.status}`;
            }
            logger.warn({ status: response.status, errorText }, 'API request failed');
            if (response.status === 401 && attempt < MAX_RETRIES) {
              attempt++;
              await refreshSession();
              return attemptFetch();
            }
            throw new Error(errorText);
          }
          const data = await response.json();
          logger.debug({ data }, 'API response received');
          return data;
        } catch (error) {
          logger.error({ error, attempt, url: apiUrl }, 'Fetch with auth failed');
          if (attempt >= MAX_RETRIES) {
            const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos';
            if (errorMessage.includes('Session expired')) {
              logout();
            }
            throw new Error(errorMessage);
          }
          attempt++;
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return attemptFetch();
        }
      };

      return attemptFetch();
    },
    [merchant, refreshSession, logout]
  );

  useEffect(() => {
    if (sessionError) {
      if (sessionError.message === 'NO_SESSION') {
        setError(null);
        if (!isLoggingIn && pathname !== '/login' && !['/signup', '/forgot-password'].includes(pathname)) {
          logger.info({ pathname }, 'Redirecting to login due to no session');
          router.push('/login');
        }
      } else {
        setError(sessionError.message);
        toast.error(sessionError.message);
        logger.error({ error: sessionError }, 'Session error');
      }
    }
  }, [sessionError, router, pathname, isLoggingIn]);

  useEffect(() => {
    if (!isAuthenticated || !merchant || !apiKey) return;

    const expiresAt = new Date(merchant.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      logger.warn('Invalid expiresAt date, setting default expiration');
      logout();
      return;
    }

    const now = new Date();
    const refreshTime = expiresAt.getTime() - now.getTime() - 5 * 60 * 1000;

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshSession();
      }, refreshTime);
      return () => clearTimeout(timeoutId);
    } else if (expiresAt.getTime() <= now.getTime()) {
      logger.info('Session expired, logging out');
      logout();
    }
  }, [isAuthenticated, merchant, apiKey, refreshSession, logout]);

  useEffect(() => {
    // Check cookie on mount
    const sessionCookie = Cookies.get(SESSION_COOKIE);
    if (sessionCookie && !apiKey) {
      try {
        const sessionData = JSON.parse(sessionCookie);
        const validatedSession = SessionDataSchema.safeParse(sessionData);
        if (validatedSession.success && validatedSession.data.isAuthenticated) {
          setApiKey(validatedSession.data.apiKey);
          logger.debug({ sessionData: { ...sessionData, apiKey: '[REDACTED]' } }, 'Loaded session from cookie');
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to parse session cookie on mount');
      }
    }
  }, [apiKey]);

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    merchant,
    error,
    login,
    logout,
    refreshSession,
    clearError,
    fetchWithAuth,
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
}

// Hooks
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/signup', '/forgot-password'].includes(usePathname())) {
      logger.info('Redirecting to login from useRequireAuth');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}

export function useMerchant() {
  const { merchant, isAuthenticated } = useAuth();

  return {
    merchant,
    merchantId: merchant?.merchantId,
    profileId: merchant?.profileId,
    customerId: merchant?.customerId,
    customerName: merchant?.customerName,
    environment: merchant?.environment,
    apiKey: merchant?.apiKey,
    isAuthenticated,
  };
}

export function usePermissions() {
  const { merchant, isAuthenticated } = useAuth();

  const hasPermission = useCallback(
    (permission: string) => {
      if (!isAuthenticated || !merchant) return false;

      const profilePermissions: Record<string, string[]> = {
        admin_profile: [
          'disputes:read',
          'disputes:challenge',
          'payments:create',
          'payments:refund',
          'connectors:manage',
          'analytics:read',
          'webhooks:manage',
        ],
        viewer_profile: ['disputes:read', 'analytics:read'],
      };

      const permissions = profilePermissions[merchant.profileId] || [];
      return permissions.includes(permission);
    },
    [isAuthenticated, merchant]
  );

  return {
    hasPermission,
    canAccessDisputes: hasPermission('disputes:read'),
    canChallengeDisputes: hasPermission('disputes:challenge'),
    canCreatePayments: hasPermission('payments:create'),
    canRefundPayments: hasPermission('payments:refund'),
    canManageConnectors: hasPermission('connectors:manage'),
    canViewAnalytics: hasPermission('analytics:read'),
    canManageWebhooks: hasPermission('webhooks:manage'),
  };
}