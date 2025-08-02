'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import pino from 'pino';

// Logger with redaction for sensitive data
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
  redact: ['apiKey', 'customerId', 'merchantId', 'profileId'],
});

// Configuration
const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};

const ENDPOINTS = {
  login: '/api/auth/login',
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
const BASE_RETRY_DELAY = 1000;
const API_TIMEOUT = 15000;

// Localization
const messages = {
  es: {
    invalidSession: 'Sesión inválida o expirada',
    loginError: 'Error al iniciar sesión',
    invalidResponse: 'Respuesta inválida del servidor',
    loginSuccess: '¡Login exitoso!',
    logoutSuccess: 'Sesión cerrada exitosamente',
    sessionCheckError: 'Error verificando sesión',
    noSession: 'No hay sesión activa',
    invalidCredentials: 'Credenciales inválidas',
    fetchError: 'Error al cargar datos',
  },
  en: {
    invalidSession: 'Invalid or expired session',
    loginError: 'Login failed',
    invalidResponse: 'Invalid server response',
    loginSuccess: 'Login successful!',
    logoutSuccess: 'Logged out successfully',
    sessionCheckError: 'Error checking session',
    noSession: 'No active session',
    invalidCredentials: 'Invalid credentials',
    fetchError: 'Failed to load data',
  },
};

// Fetch with retry (exponential backoff)
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

// Schemas
const AuthStateSchema = z.object({
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
  const language = 'es'; // TODO: Implement dynamic language detection

  // Local state
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Track login attempts

  // Derived state
  const isAuthenticated = authState?.isAuthenticated ?? false;

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get API headers
  const getApiHeaders = useCallback((): Record<string, string> => {
    if (!authState?.isAuthenticated) {
      logger.error('No authenticated session');
      throw new Error(messages[language].noSession);
    }
    const sessionCookie = Cookies.get(SESSION_COOKIE);
    if (!sessionCookie) {
      logger.error('Session cookie not found');
      throw new Error(messages[language].noSession);
    }
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
      logger.debug({ sessionData: { ...sessionData, apiKey: '[REDACTED]' } }, 'Parsed session cookie');
    } catch (e) {
      logger.error({ error: e }, 'Invalid session cookie');
      throw new Error(messages[language].invalidSession);
    }
    const apiKey = sessionData.apiKey;
    if (!apiKey) {
      logger.error('Invalid API key in session cookie');
      throw new Error(messages[language].invalidCredentials);
    }
    return {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'User-Agent': `NextjsApp/1.0 (${authState.environment})`,
    };
  }, [authState, language]);

  // Logout
  const logout = useCallback(
    async (reason?: string) => {
      setIsLoading(true);
      logger.info({ reason }, 'Initiating logout');
      try {
        await fetch(ENDPOINTS.logout, { method: 'POST', credentials: 'include' });
      } catch (error) {
        logger.error({ error, reason }, 'Error during logout, continuing with client-side cleanup');
      }
      setAuthState(null);
      setError(null);
      Cookies.remove(SESSION_COOKIE, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      toast.success(messages[language].logoutSuccess);
      const loginUrl = reason ? `/login?reason=${reason}` : '/login';
      router.push(loginUrl);
      setIsLoading(false);
    },
    [router, language]
  );

  // Check session
  const checkSession = useCallback(
    async (silent = true): Promise<boolean> => {
      logger.debug({ pathname, silent }, 'Checking session');
      try {
        setIsCheckingSession(true);
        const sessionCookie = Cookies.get(SESSION_COOKIE);
        if (!sessionCookie) {
          logger.info('No session cookie found');
          return false;
        }

        let sessionData;
        try {
          sessionData = JSON.parse(sessionCookie);
          logger.debug({ sessionData: { ...sessionData, apiKey: '[REDACTED]' } }, 'Parsed session cookie');
        } catch (error) {
          logger.error({ error }, 'Invalid session cookie');
          Cookies.remove(SESSION_COOKIE, { path: '/' });
          return false;
        }

        const validatedSession = AuthStateSchema.safeParse(sessionData);
        if (!validatedSession.success) {
          logger.warn({ errors: validatedSession.error.errors }, 'Invalid session data');
          Cookies.remove(SESSION_COOKIE, { path: '/' });
          return false;
        }

        const { expiresAt } = validatedSession.data;
        if (new Date(expiresAt) <= new Date()) {
          logger.info('Session expired');
          Cookies.remove(SESSION_COOKIE, { path: '/' });
          return false;
        }

        // Use /api/auth/refresh to validate session
        const response = await fetchWithRetry(
          ENDPOINTS.refresh,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
          MAX_RETRIES
        );

        let data;
        try {
          data = RefreshResponseSchema.parse(await response.json());
          logger.debug({ response: data }, 'Refresh response received');
        } catch (error) {
          logger.error({ error, status: response.status }, 'Error parsing refresh response');
          throw new Error(messages[language].invalidResponse);
        }

        if (response.ok && data.success && data.session) {
          const newAuthState: AuthState = {
            ...validatedSession.data,
            expiresAt: data.session.expires_at,
          };
          setAuthState(newAuthState);
          setError(null);
          logger.info({ newAuthState }, 'Session validated successfully');
          return true;
        } else {
          logger.warn({ response: data }, 'Session validation failed');
          setAuthState(null);
          Cookies.remove(SESSION_COOKIE, { path: '/' });
          if (!silent && data.error) {
            setError(data.error);
            toast.error(data.error);
          }
          return false;
        }
      } catch (error) {
        logger.error({ error }, 'Error checking session');
        setAuthState(null);
        Cookies.remove(SESSION_COOKIE, { path: '/' });
        if (!silent) {
          const errorMessage = messages[language].sessionCheckError;
          setError(errorMessage);
          toast.error(errorMessage);
        }
        return false;
      } finally {
        setIsCheckingSession(false);
      }
    },
    [language, pathname]
  );

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      setIsLoading(true);
      setIsLoggingIn(true); // Prevent redirects during login
      setError(null);
      logger.debug({ credentials: { ...credentials, apiKey: '[REDACTED]' } }, 'Attempting login');

      try {
        const validatedCredentials = LoginCredentialsSchema.parse(credentials);

        const response = await fetch(ENDPOINTS.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(validatedCredentials),
        });

        let data;
        try {
          data = LoginResponseSchema.parse(await response.json());
          logger.debug({ response: data }, 'Login response received');
        } catch (error) {
          logger.error({ error, status: response.status }, 'Error parsing login response');
          throw new Error(messages[language].invalidResponse);
        }

        if (!response.ok || !data.success) {
          const errorMessage = data.error || messages[language].loginError;
          setError(errorMessage);
          toast.error(errorMessage);
          logger.warn({ response: data }, 'Login failed');
          return {
            success: false,
            error: errorMessage,
            code: data.code,
            details: data.details,
          };
        }

        // Since /api/auth/login doesn't return customer or session data, use credentials
        const newAuthState: AuthState = {
          customerId: validatedCredentials.customerId,
          customerName: null,
          environment: validatedCredentials.environment,
          merchantId: validatedCredentials.merchantId,
          profileId: validatedCredentials.profileId,
          isAuthenticated: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Match backend
          apiKey: validatedCredentials.apiKey,
        };

        setAuthState(newAuthState);
        logger.info({ newAuthState }, 'Login successful, setting auth state');
        toast.success(messages[language].loginSuccess);
        router.push('/dashboard');
        return { success: true };
      } catch (error) {
        logger.error({ error }, 'Login error');
        let errorMessage = messages[language].loginError;
        let details: ErrorDetail[] | undefined;
        if (error instanceof z.ZodError) {
          errorMessage = messages[language].invalidCredentials;
          details = error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage, details };
      } finally {
        setIsLoading(false);
        setIsLoggingIn(false);
      }
    },
    [router, language]
  );

  // Fetch with auth
  const fetchWithAuth = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      if (!authState?.isAuthenticated) {
        logger.error('No authenticated session');
        throw new Error(messages[language].noSession);
      }
      const apiUrl = `${API_URLS[authState.environment]}${url.startsWith('/') ? url : `/${url}`}`;
      logger.debug({ apiUrl, options }, 'Initiating fetch with auth');

      let attempt = 0;
      const attemptFetch = async (): Promise<T> => {
        try {
          const response = await fetchWithRetry(
            apiUrl,
            {
              ...options,
              headers: { ...getApiHeaders(), ...options.headers },
              credentials: 'include',
            },
            MAX_RETRIES
          );
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
              await checkSession();
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
            const errorMessage = error instanceof Error ? error.message : messages[language].fetchError;
            if (errorMessage.includes('Session expired')) {
              logout('session_expired');
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
    [authState, getApiHeaders, checkSession, logout, language]
  );

  // Effects
  useEffect(() => {
    const handleAuth = async () => {
      if (!pathname || isLoggingIn) {
        logger.debug({ pathname, isLoggingIn }, 'Skipping auth check during login or missing pathname');
        return;
      }
      logger.debug({ pathname }, 'Handling auth check');
      const isValidSession = await checkSession(true);
      const isAuthRoute = pathname.startsWith('/login');
      const isPublicRoute = ['/login', '/signup', '/forgot-password'].includes(pathname);

      if (!isValidSession && !isPublicRoute && !isAuthRoute) {
        const currentPath = encodeURIComponent(pathname + window.location.search);
        logger.info({ currentPath }, 'Redirecting to login');
        router.push(`/login?redirect=${currentPath}`);
      } else if (isValidSession && isAuthRoute) {
        logger.info('Redirecting to dashboard');
        router.push('/dashboard');
      }
    };

    handleAuth();
  }, [checkSession, pathname, router, isLoggingIn]);

  useEffect(() => {
    if (!authState?.isAuthenticated) return;

    const expiryTime = new Date(authState.expiresAt).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    const refreshTime = timeUntilExpiry - REFRESH_MARGIN;

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => checkSession(), refreshTime);
      return () => clearTimeout(timeoutId);
    } else if (timeUntilExpiry <= 0) {
      logger.info('Session expired, logging out');
      logout('session_expired');
    }
  }, [authState, logout, checkSession]);

  // Context value
  const contextValue: AuthContextValue = {
    authState,
    isLoading,
    isAuthenticated,
    isCheckingSession,
    error,
    login,
    logout,
    clearError,
    getApiHeaders,
    fetchWithAuth,
  };


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