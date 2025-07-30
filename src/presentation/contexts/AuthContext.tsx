'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { z } from 'zod';
import toast from 'react-hot-toast';

// =============== SCHEMAS ===============

const AuthStateSchema = z.object({
  customerId: z.string(),
  customerName: z.string().nullable(),
  environment: z.enum(['sandbox', 'production']),
  isAuthenticated: z.boolean(),
  expiresAt: z.string().datetime(),
  apiKey: z.string(),
});

const LoginCredentialsSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key es requerida')
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]+)/, 'API Key debe comenzar con "snd_"'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

const SessionResponseSchema = z.object({
  success: z.boolean(),
  isAuthenticated: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  customer: z
    .object({
      customer_id: z.string(),
      customer_name: z.string().nullable(),
      environment: z.enum(['sandbox', 'production']),
    })
    .optional(),
  session: z
    .object({
      expires_at: z.string().datetime(),
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
      customer_id: z.string(),
      customer_name: z.string().nullable(),
      environment: z.enum(['sandbox', 'production']),
    })
    .optional(),
  session: z
    .object({
      expires_at: z.string().datetime(),
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
}

// =============== CONSTANTS ===============

const API_URLS = {
  sandbox: 'https://sandbox.hyperswitch.io',
  production: 'https://api.hyperswitch.io',
};

// =============== CONTEXT ===============

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =============== PROVIDER ===============

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

  // =============== FUNCIONES AUXILIARES ===============

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =============== VERIFICAR SESIÓN ===============

  const checkSession = useCallback(async (silent = true): Promise<boolean> => {
    try {
      setIsCheckingSession(true);
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const rawResponse = await response.text();
      console.log('Raw session response:', rawResponse); // Debug
      let data;
      try {
        data = SessionResponseSchema.parse(JSON.parse(rawResponse));
      } catch (parseError) {
        console.error('Error parsing session response:', parseError, { rawResponse });
        throw new Error('Respuesta inválida del servidor');
      }

      if (response.ok && data.success && data.isAuthenticated && data.customer && data.session) {
        setAuthState({
          customerId: data.customer.customer_id,
          customerName: data.customer.customer_name,
          environment: data.customer.environment,
          isAuthenticated: true,
          expiresAt: data.session.expires_at,
          apiKey: '',
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
      console.error('Error checking session:', error);
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

  // =============== LOGIN ===============

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const validatedCredentials = LoginCredentialsSchema.parse(credentials);

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            apiKey: validatedCredentials.apiKey,
            environment: validatedCredentials.environment,
          }),
        });

        const rawResponse = await response.text();
        console.log("Raw login response:", rawResponse); // Debug
        let data;
        try {
          data = LoginResponseSchema.parse(JSON.parse(rawResponse));
          console.log("Parsed login response data:", data); // Debug
        } catch (parseError) {
          console.error("Error parsing login response:", parseError, { rawResponse });
          throw new Error("Respuesta inválida del servidor");
        }

        if (!response.ok || !data.success) {
          const errorMessage = data.error || "Error al iniciar sesión";
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
          customerId: data.customer.customer_id,
          customerName: data.customer.customer_name,
          environment: data.customer.environment,
          isAuthenticated: true,
          expiresAt: data.session.expires_at,
          apiKey: validatedCredentials.apiKey,
        };

        setAuthState(newAuthState);
        toast.success('¡Login exitoso!');
        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
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
    []
  );

  // =============== LOGOUT ===============

  const logout = useCallback(
    async (reason?: string) => {
      setIsLoading(true);
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (error) {
        console.error('Error during logout:', error);
      }
      setAuthState(null);
      setError(null);
      toast.success('Sesión cerrada exitosamente');
      const loginUrl = reason ? `/login?reason=${reason}` : '/login';
      router.push(loginUrl);
      setIsLoading(false);
    },
    [router]
  );

  // =============== REFRESH ===============

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      const rawResponse = await response.text();
      console.log('Raw refresh response:', rawResponse); // Debug
      const data = RefreshResponseSchema.parse(JSON.parse(rawResponse));

      if (response.ok && data.success && data.session) {
        setAuthState((prev) =>
          prev && data.session ? { ...prev, expiresAt: data.session.expires_at } : null
        );
      } else {
        if (data.code === 'REFRESH_TOKEN_EXPIRED' || data.code === 'INCOMPLETE_SESSION') {
          await logout('session_expired');
        } else {
          await logout('session_expired');
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      await logout('session_expired');
    }
  }, [logout]);

  // =============== HEADERS ===============

  const getApiHeaders = useCallback((): Record<string, string> => {
    if (!authState?.isAuthenticated || !authState.apiKey) {
      throw new Error('No authenticated session or API key available');
    }
    return {
      'Content-Type': 'application/json',
      'api-key': authState.apiKey,
      'X-Environment': authState.environment,
    };
  }, [authState]);

  // =============== EFFECTS ===============

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
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => refreshAuth(), refreshTime);
      return () => clearTimeout(timeoutId);
    } else if (timeUntilExpiry <= 0) {
      logout('session_expired');
    }
  }, [authState, logout, refreshAuth]);

  // =============== CONTEXT VALUE ===============

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
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// =============== HOOKS ===============

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
    isAuthenticated: authState?.isAuthenticated ?? false,
  };
}