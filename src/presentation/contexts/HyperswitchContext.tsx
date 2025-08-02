'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useConnectors } from '../hooks/useConnectors'; // Corrección de la importación
import { z } from 'zod';
import toast from 'react-hot-toast';
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
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
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
const HyperswitchConfigSchema = z.object({
  publishableKey: z.string().min(1).regex(/^(snd_[a-zA-Z0-9]+)/, 'Invalid publishable key format'),
  merchantId: z.string().min(1).regex(/^(merchant_[a-zA-Z0-9]+)/, 'Invalid merchant ID format'),
  environment: z.enum(['sandbox', 'production']),
  baseUrl: z.string().url(),
}).strict();

const PaymentMethodsResponseSchema = z.object({
  payment_methods: z.array(
    z.object({
      payment_method: z.string().min(1),
      payment_method_types: z.array(z.string().min(1)),
      supported_currencies: z.array(z.string().min(1)),
      supported_countries: z.array(z.string().min(1)),
    })
  ),
});

const PaymentIntentSchema = z.object({
  payment_id: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  status: z.string().min(1),
  client_secret: z.string().min(1).optional(),
}).strict();

// Types
interface HyperswitchConfig {
  publishableKey: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

interface PaymentIntent {
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

interface PaymentMethodsResponse {
  payment_methods: Array<{
    payment_method: string;
    payment_method_types: string[];
    supported_currencies: string[];
    supported_countries: string[];
  }>;
}

interface HyperswitchContextValue {
  config: HyperswitchConfig | null;
  isLoading: boolean;
  error: string | null;
  initializeClient: () => Promise<void>;
  getPaymentMethods: (params?: {
    currency?: string;
    country?: string;
    amount?: number;
    customer_id?: string;
  }) => Promise<PaymentMethodsResponse>;
  createPaymentIntent: (paymentData: {
    amount: number;
    currency: string;
    description?: string;
    customer_id?: string;
    return_url?: string;
    metadata?: Record<string, any>;
  }) => Promise<PaymentIntent>;
  confirmPayment: (paymentId: string, paymentMethodData?: any) => Promise<any>;
  getPublishableKey: () => string | null;
  isInitialized: () => boolean;
}

// Context
const HyperswitchContext = createContext<HyperswitchContextValue | undefined>(undefined);

// Provider
export function HyperswitchProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, fetchWithAuth, authState } = useAuth();
  const { getAvailablePaymentMethods } = useConnectors();
  const [config, setConfig] = useState<HyperswitchConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  const initializeClient = useCallback(async () => {
    if (!isAuthenticated || !authState?.merchantId) {
      logger.warn('Missing auth state for initializing Hyperswitch client');
      setError('Usuario no autenticado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithRetry(
        '/api/auth/publishable-key',
        {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
        MAX_RETRIES
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to get publishable key';
        logger.error({ status: response.status, error: errorMessage }, 'Publishable key fetch failed');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const validatedConfig = HyperswitchConfigSchema.parse({
        publishableKey: data.publishable_key,
        merchantId: data.merchant_id,
        environment: data.environment,
        baseUrl: data.environment === 'production' ? API_URLS.production : API_URLS.sandbox,
      });

      setConfig(validatedConfig);
      logger.info(
        {
          merchantId: validatedConfig.merchantId,
          environment: validatedConfig.environment,
          hasPublishableKey: !!validatedConfig.publishableKey,
        },
        'Hyperswitch client initialized'
      );
    } catch (error) {
      let errorMessage = 'No se pudo inicializar el cliente Hyperswitch';
      let errorCode = 'UNEXPECTED_ERROR';

      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'Clave pública no encontrada';
          errorCode = 'NOT_FOUND';
        } else if (error.message.includes('401')) {
          errorMessage = 'No autorizado para obtener la clave pública';
          errorCode = 'UNAUTHORIZED';
        } else if (error.message.includes('429')) {
          errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
          errorCode = 'RATE_LIMIT_EXCEEDED';
        }
      } else if (error instanceof z.ZodError) {
        errorMessage = 'Datos de configuración inválidos';
        errorCode = 'INVALID_RESPONSE';
      }

      logger.error({ error, errorCode }, 'Error initializing Hyperswitch client');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authState?.merchantId]);

  // Get payment methods
  const getPaymentMethods = useCallback(
    async (params?: {
      currency?: string;
      country?: string;
      amount?: number;
      customer_id?: string;
    }): Promise<PaymentMethodsResponse> => {
      if (!config) {
        logger.error('Hyperswitch client not initialized');
        throw new Error('Hyperswitch client not initialized');
      }

      const queryParams = new URLSearchParams();
      if (params?.currency) queryParams.append('currency', params.currency);
      if (params?.country) queryParams.append('country', params.country);
      if (params?.amount) queryParams.append('amount', params.amount.toString());
      if (params?.customer_id) queryParams.append('customer_id', params.customer_id);

      try {
        const response = await fetchWithAuth<PaymentMethodsResponse>(
          `/api/payment-methods?${queryParams.toString()}`,
          { method: 'GET' }
        );

        const validatedResponse = PaymentMethodsResponseSchema.parse(response);
        
        // Validate against ConnectorProvider
        const connectorMethods = getAvailablePaymentMethods();
        const apiMethods = validatedResponse.payment_methods.map(pm => pm.payment_method);
        const missingMethods = apiMethods.filter(method => !connectorMethods.includes(method));
        if (missingMethods.length > 0) {
          logger.warn({ missingMethods }, 'Payment methods not supported by active connectors');
        }

        // Cache response
        sessionStorage.setItem(
          `payment_methods_${config.merchantId}_${params?.currency || 'all'}`,
          JSON.stringify({
            data: validatedResponse,
            timestamp: Date.now(),
          })
        );

        return validatedResponse;
      } catch (error) {
        let errorMessage = 'No se pudieron obtener los métodos de pago';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Métodos de pago no encontrados';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para obtener métodos de pago';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de métodos de pago inválidos';
          errorCode = 'INVALID_RESPONSE';
        }

        logger.error({ error, errorCode }, 'Failed to fetch payment methods');

        // Try to load from cache
        const cachedData = sessionStorage.getItem(
          `payment_methods_${config.merchantId}_${params?.currency || 'all'}`
        );
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp > CACHE_EXPIRY) {
              logger.warn('Cached payment methods expired');
              sessionStorage.removeItem(`payment_methods_${config.merchantId}_${params?.currency || 'all'}`);
            } else {
              const validatedCache = PaymentMethodsResponseSchema.parse(data);
              toast.error('Usando datos de métodos de pago en caché debido a un error de red');
              return validatedCache;
            }
          } catch (cacheError) {
            logger.error({ cacheError }, 'Invalid cached payment methods data');
            sessionStorage.removeItem(`payment_methods_${config.merchantId}_${params?.currency || 'all'}`);
          }
        }

        throw new Error(errorMessage);
      }
    },
    [config, fetchWithAuth, getAvailablePaymentMethods]
  );

  // Create payment intent
  const createPaymentIntent = useCallback(
    async (paymentData: {
      amount: number;
      currency: string;
      description?: string;
      customer_id?: string;
      return_url?: string;
      metadata?: Record<string, any>;
    }): Promise<PaymentIntent> => {
      if (!config) {
        logger.error('Hyperswitch client not initialized');
        throw new Error('Hyperswitch client not initialized');
      }

      try {
        const response = await fetchWithAuth<{ data?: PaymentIntent } | PaymentIntent>(
          '/api/payments/create-intent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...paymentData,
              confirm: false,
            }),
          }
        );

        const validatedResponse = PaymentIntentSchema.parse('data' in response ? response.data : response);
        logger.info({ paymentId: validatedResponse.payment_id }, 'Payment intent created');
        return validatedResponse;
      } catch (error) {
        let errorMessage = 'No se pudo crear el intento de pago';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Recurso de pago no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para crear el intento de pago';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de intento de pago inválidos';
          errorCode = 'INVALID_RESPONSE';
        }

        logger.error({ error, errorCode }, 'Failed to create payment intent');
        throw new Error(errorMessage);
      }
    },
    [config, fetchWithAuth]
  );

  // Confirm payment
  const confirmPayment = useCallback(
    async (paymentId: string, paymentMethodData?: any) => {
      if (!config) {
        logger.error('Hyperswitch client not initialized');
        throw new Error('Hyperswitch client not initialized');
      }

      try {
        const response = await fetchWithRetry(
          `${config.baseUrl}/payments/${paymentId}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': config.publishableKey,
            },
            body: JSON.stringify({
              payment_method_data: paymentMethodData,
              client_secret: paymentMethodData?.client_secret,
            }),
          },
          MAX_RETRIES
        );

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error?.message || 'Failed to confirm payment';
          logger.error({ status: response.status, error: errorMessage }, 'Payment confirmation failed');
          throw new Error(errorMessage);
        }

        const result = await response.json();
        logger.info({ paymentId }, 'Payment confirmed');
        return result;
      } catch (error) {
        let errorMessage = 'No se pudo confirmar el pago';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Intento de pago no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para confirmar el pago';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        }

        logger.error({ error, errorCode }, 'Failed to confirm payment');
        throw new Error(errorMessage);
      }
    },
    [config]
  );

  // Helpers
  const getPublishableKey = useCallback(() => {
    return config?.publishableKey || null;
  }, [config]);

  const isInitialized = useCallback(() => {
    return !!config && !!config.publishableKey;
  }, [config]);

  // Effects
  useEffect(() => {
    if (isAuthenticated && !config && authState?.merchantId) {
      initializeClient();
    } else if (!isAuthenticated) {
      setConfig(null);
      setError(null);
    }
  }, [isAuthenticated, config, initializeClient, authState?.merchantId]);

  // Context value
  const contextValue: HyperswitchContextValue = {
    config,
    isLoading,
    error,
    initializeClient,
    getPaymentMethods,
    createPaymentIntent,
    confirmPayment,
    getPublishableKey,
    isInitialized,
  };

  return (
    <HyperswitchContext.Provider value={contextValue}>
      {children}
    </HyperswitchContext.Provider>
  );
}

// Hooks
export function useHyperswitch() {
  const context = useContext(HyperswitchContext);
  if (context === undefined) {
    throw new Error('useHyperswitch debe ser usado dentro de HyperswitchProvider');
  }
  return context;
}

export function usePayments() {
  const { getPaymentMethods, createPaymentIntent, confirmPayment, isInitialized, error } =
    useHyperswitch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const processPayment = useCallback(
    async (paymentData: {
      amount: number;
      currency: string;
      description?: string;
      customer_id?: string;
      payment_method_data?: any;
      return_url?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!isInitialized()) {
        logger.error('Hyperswitch not initialized');
        throw new Error('Hyperswitch not initialized');
      }

      setIsProcessing(true);
      setPaymentError(null);

      try {
        const paymentIntent = await createPaymentIntent({
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description,
          customer_id: paymentData.customer_id,
          return_url: paymentData.return_url,
          metadata: paymentData.metadata,
        });

        if (paymentData.payment_method_data && paymentIntent.client_secret) {
          const confirmedPayment = await confirmPayment(paymentIntent.payment_id, {
            ...paymentData.payment_method_data,
            client_secret: paymentIntent.client_secret,
          });
          return confirmedPayment;
        }

        return paymentIntent;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'No se pudo procesar el pago';
        logger.error({ error }, 'Payment processing failed');
        setPaymentError(errorMessage);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [createPaymentIntent, confirmPayment, isInitialized]
  );

  return {
    getPaymentMethods,
    processPayment,
    isProcessing,
    paymentError,
    isInitialized: isInitialized(),
    hyperswitchError: error,
  };
}