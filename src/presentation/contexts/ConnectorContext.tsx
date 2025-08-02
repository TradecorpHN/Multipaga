'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ConnectorAccount, ConnectorAccountSchema } from '@/domain/entities/Connector';
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

// Connector Context Interface
interface ConnectorContextValue {
  connectors: ConnectorAccount[];
  isLoading: boolean;
  error: string | null;
  fetchConnectors: () => Promise<void>;
  getConnectorById: (id: string) => ConnectorAccount | undefined;
  getActiveConnectors: () => ConnectorAccount[];
  refreshConnectors: () => Promise<void>;
}

// Create Context
const ConnectorContext = createContext<ConnectorContextValue | undefined>(undefined);

// Connector Provider Component
export function ConnectorProvider({ children }: { children: React.ReactNode }) {
  const { authState, fetchWithAuth } = useAuth();
  const [connectors, setConnectors] = useState<ConnectorAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connectors from API
  const fetchConnectors = useCallback(async () => {
    if (!authState?.merchantId || !authState?.isAuthenticated) {
      logger.warn('Missing auth state for fetching connectors');
      setError('No hay sesión autenticada');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth<unknown>(
        `/account/${authState.merchantId}/connectors`,
        { method: 'GET' }
      );

      // Validate response data
      const connectorsArray = z.array(ConnectorAccountSchema).parse(response);
      
      logger.info({ count: connectorsArray.length }, 'Fetched connectors');
      setConnectors(connectorsArray);
      
      // Cache with expiry
      sessionStorage.setItem(
        `connectors_${authState.merchantId}`,
        JSON.stringify({
          data: connectorsArray,
          timestamp: Date.now(),
        })
      );
      
    } catch (error) {
      let errorMessage = 'No se pudieron cargar los conectores';
      let errorCode = 'UNEXPECTED_ERROR';
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'No se encontraron conectores para este merchant';
          errorCode = 'NOT_FOUND';
        } else if (error.message.includes('401')) {
          errorMessage = 'No autorizado para acceder a los conectores';
          errorCode = 'UNAUTHORIZED';
        } else if (error.message.includes('429')) {
          errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
          errorCode = 'RATE_LIMIT_EXCEEDED';
        }
      } else if (error instanceof z.ZodError) {
        errorMessage = 'Datos de conectores inválidos';
        errorCode = 'INVALID_RESPONSE';
      }

      logger.error({ error, errorCode }, 'Failed to fetch connectors');
      setError(errorMessage);
      toast.error(errorMessage);

      // Try to load from cache
      const cachedData = sessionStorage.getItem(`connectors_${authState.merchantId}`);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp > CACHE_EXPIRY) {
            logger.warn('Cached connectors expired');
            sessionStorage.removeItem(`connectors_${authState.merchantId}`);
          } else {
            const validatedConnectors = z.array(ConnectorAccountSchema).parse(data);
            setConnectors(validatedConnectors);
            toast.error('Usando datos de conectores en caché debido a un error de red');
          }
        } catch (cacheError) {
          logger.error({ cacheError }, 'Invalid cached connector data');
          sessionStorage.removeItem(`connectors_${authState.merchantId}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [authState?.merchantId, authState?.isAuthenticated, fetchWithAuth]);

  // Get connector by ID
  const getConnectorById = useCallback(
    (id: string): ConnectorAccount | undefined => {
      return connectors.find(connector => connector.merchant_connector_id === id);
    },
    [connectors]
  );

  // Get only active connectors
  const getActiveConnectors = useCallback((): ConnectorAccount[] => {
    return connectors.filter(connector => connector.status === 'active' && !connector.disabled);
  }, [connectors]);

  // Force refresh connectors
  const refreshConnectors = useCallback(async () => {
    if (authState?.merchantId) {
      sessionStorage.removeItem(`connectors_${authState.merchantId}`);
    }
    await fetchConnectors();
  }, [authState?.merchantId, fetchConnectors]);

  // Auto-fetch connectors when auth state changes
  useEffect(() => {
    if (authState?.isAuthenticated && authState?.merchantId) {
      // Check cache first
      const cachedData = sessionStorage.getItem(`connectors_${authState.merchantId}`);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp > CACHE_EXPIRY) {
            logger.warn('Cached connectors expired');
            sessionStorage.removeItem(`connectors_${authState.merchantId}`);
            fetchConnectors();
          } else {
            const validatedConnectors = z.array(ConnectorAccountSchema).parse(data);
            setConnectors(validatedConnectors);
            // Fetch fresh data in background
            fetchConnectors();
          }
        } catch (error) {
          logger.error({ error }, 'Invalid cached connector data');
          fetchConnectors();
        }
      } else {
        fetchConnectors();
      }
    } else {
      // Clear connectors when logged out
      setConnectors([]);
      setError(null);
    }
  }, [authState?.isAuthenticated, authState?.merchantId, fetchConnectors]);

  const contextValue: ConnectorContextValue = {
    connectors,
    isLoading,
    error,
    fetchConnectors,
    getConnectorById,
    getActiveConnectors,
    refreshConnectors,
  };

  return (
    <ConnectorContext.Provider value={contextValue}>
      {children}
    </ConnectorContext.Provider>
  );
}

// Custom hook to use connector context
export function useConnectors() {
  const context = useContext(ConnectorContext);
  if (context === undefined) {
    throw new Error('useConnectors must be used within a ConnectorProvider');
  }
  return context;
}

// Helper hook for payment method filtering
export function usePaymentMethods() {
  const { connectors } = useConnectors();

  const getAvailablePaymentMethods = useCallback(() => {
    const methodsSet = new Set<string>();
    
    connectors.forEach(connector => {
      if (connector.status === 'active' && !connector.disabled) {
        if (Array.isArray(connector.payment_methods_enabled)) {
          connector.payment_methods_enabled.forEach(pm => {
            if (pm.payment_method) {
              methodsSet.add(pm.payment_method);
            }
          });
        }
      }
    });
    
    return Array.from(methodsSet).sort();
  }, [connectors]);

  const getConnectorsForPaymentMethod = useCallback((paymentMethod: string) => {
    return connectors.filter(connector => {
      if (connector.status !== 'active' || connector.disabled) return false;
      return Array.isArray(connector.payment_methods_enabled) &&
        connector.payment_methods_enabled.some(pm => pm.payment_method === paymentMethod);
    });
  }, [connectors]);

  return {
    availablePaymentMethods: getAvailablePaymentMethods(),
    getConnectorsForPaymentMethod,
  };
}