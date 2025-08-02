'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useHyperswitch } from '@/presentation/contexts/HyperswitchContext';
import toast from 'react-hot-toast';
import { z } from 'zod';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
});

// Configuración
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
const ConnectorAccountDetailsSchema = z.object({
  auth_type: z.enum(['HeaderKey', 'BodyKey', 'SignatureKey', 'MultiAuthKey']),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  key1: z.string().optional(),
  key2: z.string().optional(),
  merchant_id: z.string().optional(),
  merchant_account_id: z.string().optional(),
  test_mode: z.boolean().optional(),
  additional_config: z.record(z.any()).optional(),
});

const PaymentMethodEnabledSchema = z.object({
  payment_method: z.string().min(1),
  payment_method_types: z.array(z.string().min(1)).optional(),
  payment_method_issuers: z.array(z.string()).optional(),
  payment_schemes: z.array(z.string()).optional(),
  accepted_currencies: z.object({
    type: z.enum(['enable_only', 'disable_only']),
    list: z.array(z.string().min(1)),
  }).optional(),
  accepted_countries: z.object({
    type: z.enum(['enable_only', 'disable_only']),
    list: z.array(z.string().min(1)),
  }).optional(),
  minimum_amount: z.number().positive().optional(),
  maximum_amount: z.number().positive().optional(),
  recurring_enabled: z.boolean().optional(),
  installment_payment_enabled: z.boolean().optional(),
});

const ConnectorWebhookDetailsSchema = z.object({
  merchant_secret: z.string().optional(),
  additional_webhook_details: z.record(z.any()).optional(),
});

const ConnectorSchema = z.object({
  merchant_connector_id: z.string().min(1),
  connector_type: z.enum(['payment_processor', 'authentication_processor', 'fraud_check', 'acquirer', 'accounting']),
  connector_name: z.string().min(1),
  connector_label: z.string().optional(),
  merchant_id: z.string().optional(),
  connector_account_details: ConnectorAccountDetailsSchema.optional(),
  test_mode: z.boolean().optional().default(false),
  disabled: z.boolean().optional().default(false),
  payment_methods_enabled: z.array(PaymentMethodEnabledSchema).optional(),
  metadata: z.record(z.any()).optional(),
  connector_webhook_details: ConnectorWebhookDetailsSchema.optional(),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
  frm_configs: z.array(z.any()).optional(),
  profile_id: z.string().optional(),
  applepay_verified_domains: z.array(z.string()).optional(),
  pm_auth_config: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional().default('active'),
}).strict();

const ConnectorListResponseSchema = z.object({
  connectors: z.array(ConnectorSchema).optional(),
  data: z.array(ConnectorSchema).optional(),
  size: z.number().optional(),
  count: z.number().optional(),
  has_more: z.boolean().optional(),
  total_count: z.number().optional(),
});

const CreateConnectorRequestSchema = z.object({
  connector_type: z.enum(['payment_processor', 'authentication_processor', 'fraud_check', 'acquirer', 'accounting']),
  connector_name: z.string().min(1),
  connector_label: z.string().optional(),
  connector_account_details: ConnectorAccountDetailsSchema,
  test_mode: z.boolean().default(true),
  disabled: z.boolean().default(false),
  payment_methods_enabled: z.array(PaymentMethodEnabledSchema).optional(),
  metadata: z.record(z.any()).optional(),
  connector_webhook_details: ConnectorWebhookDetailsSchema.optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
}).strict();

// Types
export type Connector = z.infer<typeof ConnectorSchema>;
export type ConnectorListResponse = z.infer<typeof ConnectorListResponseSchema>;
export type CreateConnectorRequest = z.infer<typeof CreateConnectorRequestSchema>;
export type UpdateConnectorRequest = Partial<CreateConnectorRequest> & { merchant_connector_id: string };
export type ConnectorAccountDetails = z.infer<typeof ConnectorAccountDetailsSchema>;
export type PaymentMethodEnabled = z.infer<typeof PaymentMethodEnabledSchema>;

export type ConnectorTier = 1 | 2 | 3;

export interface SupportedConnectorInfo {
  name: string;
  tier: ConnectorTier;
  regions: string[];
  methods: string[];
  logo: string;
}

export const SUPPORTED_CONNECTORS: Record<string, SupportedConnectorInfo> = {
  stripe: { 
    name: 'Stripe', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'bank_redirect', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/STRIPE.svg'
  },
  adyen: { 
    name: 'Adyen', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'bank_redirect', 'wallet', 'bank_transfer', 'crypto'],
    logo: '/resources/connectors/ADYEN.svg'
  },
  paypal: { 
    name: 'PayPal', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['wallet', 'card'],
    logo: '/resources/connectors/PAYPAL.svg'
  },
  checkout: { 
    name: 'Checkout.com', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/CHECKOUT.svg'
  },
  klarna: { 
    name: 'Klarna', 
    tier: 2, 
    regions: ['Europe', 'US'], 
    methods: ['pay_later'],
    logo: '/resources/connectors/KLARNA.svg'
  },
  rapyd: { 
    name: 'Rapyd', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/RAPYD.svg'
  },
  worldpay: { 
    name: 'Worldpay', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/WORLDPAY.svg'
  },
  square: { 
    name: 'Square', 
    tier: 2, 
    regions: ['US', 'Canada', 'Australia'], 
    methods: ['card'],
    logo: '/resources/connectors/SQUARE.svg'
  },
  braintree: { 
    name: 'Braintree', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BRAINTREE.svg'
  },
  multisafepay: { 
    name: 'MultiSafepay', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect', 'wallet'],
    logo: '/resources/connectors/MULTISAFEPAY.svg'
  },
  trustpay: { 
    name: 'TrustPay', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/TRUSTPAY.svg'
  },
  payu: { 
    name: 'PayU', 
    tier: 3, 
    regions: ['Latin America', 'Europe'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/PAYU.svg'
  },
  cybersource: { 
    name: 'Cybersource', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/CYBERSOURCE.svg'
  },
  shift4: { 
    name: 'Shift4', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/SHIFT4.svg'
  },
  worldline: { 
    name: 'Worldline', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/WORLDLINE.svg'
  },
  payone: { 
    name: 'Payone', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/PAYONE.svg'
  },
  fiserv: { 
    name: 'Fiserv', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/FISERV.svg'
  },
  helcim: { 
    name: 'Helcim', 
    tier: 3, 
    regions: ['Canada'], 
    methods: ['card'],
    logo: '/resources/connectors/HELCIM.svg'
  },
  bluesnap: { 
    name: 'BlueSnap', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BLUESNAP.svg'
  },
  nuvei: { 
    name: 'Nuvei', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/NUVEI.svg'
  },
  wise: { 
    name: 'Wise', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/WISE.svg'
  },
  iatapay: { 
    name: 'IATAPay', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/IATAPAY.svg'
  },
  noon: { 
    name: 'Noon', 
    tier: 3, 
    regions: ['Middle East'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/NOON.svg'
  },
  airwallex: { 
    name: 'Airwallex', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/AIRWALLEX.svg'
  },
  globalpay: { 
    name: 'GlobalPay', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAY.svg'
  },
  nexinets: { 
    name: 'Nexinets', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card'],
    logo: '/resources/connectors/NEXINETS.svg'
  },
  stax: { 
    name: 'Stax', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/STAX.svg'
  },
  tsys: { 
    name: 'TSYS', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/TSYS.svg'
  },
  nmi: { 
    name: 'NMI', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/NMI.svg'
  },
  volt: { 
    name: 'Volt', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/VOLT.svg'
  },
  zen: { 
    name: 'Zen', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card'],
    logo: '/resources/connectors/ZEN.svg'
  },
  wellsfargo: { 
    name: 'Wells Fargo', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/WELLSFARGO.svg'
  },
  tokenio: { 
    name: 'Token.io', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/TOKENIO.svg'
  },
  payeezy: { 
    name: 'Payeezy', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/PAYEEZY.svg'
  },
  globalpayments: { 
    name: 'Global Payments', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAYMENTS.svg'
  },
  netnaxept: { 
    name: 'Nets/Netaxept', 
    tier: 3, 
    regions: ['Nordic'], 
    methods: ['card'],
    logo: '/resources/connectors/NETNAXEPT.svg'
  },
} as const;

export type SupportedConnector = keyof typeof SUPPORTED_CONNECTORS;

class ConnectorApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'ConnectorApiError';
  }
}

interface UseConnectorsReturn {
  connectors: Connector[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  createConnector: (data: CreateConnectorRequest) => Promise<Connector>;
  getConnector: (connectorId: string) => Promise<Connector>;
  updateConnector: (connectorId: string, data: UpdateConnectorRequest) => Promise<Connector>;
  deleteConnector: (connectorId: string) => Promise<void>;
  testConnector: (connectorId: string) => Promise<boolean>;
  listConnectors: () => Promise<void>;
  refreshConnectors: () => Promise<void>;
  getActiveConnectors: () => Connector[];
  getConnectorsByType: (type: string) => Connector[];
  clearError: () => void;
  getAvailablePaymentMethods: () => string[]; // Añadido
}

export function useConnectors(): UseConnectorsReturn {
  const { authState, fetchWithAuth } = useAuth();
  const { getPaymentMethods } = useHyperswitch();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const getAvailablePaymentMethods = useCallback(() => {
    const methodsSet = new Set<string>();
    getActiveConnectors().forEach(connector => {
      if (Array.isArray(connector.payment_methods_enabled)) {
        connector.payment_methods_enabled.forEach(pm => {
          if (pm.payment_method) {
            methodsSet.add(pm.payment_method);
          }
        });
      }
    });
    return Array.from(methodsSet).sort();
  }, [connectors]);

  const listConnectors = useCallback(async (): Promise<void> => {
    if (!authState?.isAuthenticated || !authState?.merchantId) {
      logger.warn('Missing auth state for listing connectors');
      setError('Autenticación requerida');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth<unknown>(
        `/account/${authState.merchantId}/connectors`,
        { method: 'GET' }
      );

      const connectorList = ConnectorListResponseSchema.parse(response);
      const connectorsData = connectorList.connectors || connectorList.data || [];

      // Validate payment methods against HyperswitchProvider
      const paymentMethods = await getPaymentMethods();
      const apiMethods = paymentMethods.payment_methods.map(pm => pm.payment_method);
      const invalidConnectors = connectorsData.filter(
        c => c.payment_methods_enabled?.some(pm => !apiMethods.includes(pm.payment_method))
      );
      if (invalidConnectors.length > 0) {
        logger.warn(
          { invalidConnectors: invalidConnectors.map(c => c.connector_name) },
          'Some connectors have unsupported payment methods'
        );
      }

      setConnectors(connectorsData);
      setTotalCount(
        connectorList.total_count || connectorList.count || connectorList.size || connectorsData.length
      );

      // Cache response
      sessionStorage.setItem(
        `connectors_${authState.merchantId}`,
        JSON.stringify({
          data: connectorsData,
          timestamp: Date.now(),
        })
      );

      logger.info({ count: connectorsData.length }, 'Connectors listed successfully');
    } catch (error) {
      let errorMessage = 'No se pudieron cargar los conectores';
      let errorCode = 'UNEXPECTED_ERROR';

      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'No se encontraron conectores';
          errorCode = 'NOT_FOUND';
        } else if (error.message.includes('401')) {
          errorMessage = 'No autorizado para listar conectores';
          errorCode = 'UNAUTHORIZED';
        } else if (error.message.includes('429')) {
          errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
          errorCode = 'RATE_LIMIT_EXCEEDED';
        }
      } else if (error instanceof z.ZodError) {
        errorMessage = 'Datos de conectores inválidos';
        errorCode = 'INVALID_RESPONSE';
      }

      logger.error({ error, errorCode }, 'Failed to list connectors');
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
            const validatedConnectors = z.array(ConnectorSchema).parse(data);
            setConnectors(validatedConnectors);
            setTotalCount(validatedConnectors.length);
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
  }, [authState?.isAuthenticated, authState?.merchantId, fetchWithAuth, getPaymentMethods]);

  const createConnector = useCallback(
    async (data: CreateConnectorRequest): Promise<Connector> => {
      if (!authState?.merchantId) {
        logger.error('Missing merchantId for creating connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        const validatedData = CreateConnectorRequestSchema.parse({
          ...data,
          business_country: data.business_country || 'HN',
          business_label: data.business_label || 'TradecorpHN',
        });

        const response = await fetchWithAuth<Connector>(
          `/account/${authState.merchantId}/connectors`,
          {
            method: 'POST',
            body: JSON.stringify(validatedData),
          }
        );

        const connector = ConnectorSchema.parse(response);
        setConnectors(prev => [connector, ...prev]);
        setTotalCount(prev => prev + 1);

        // Update cache
        sessionStorage.setItem(
          `connectors_${authState.merchantId}`,
          JSON.stringify({
            data: [connector, ...connectors],
            timestamp: Date.now(),
          })
        );

        logger.info({ connectorId: connector.merchant_connector_id }, 'Connector created');
        toast.success(`Conector ${connector.connector_name} creado exitosamente`);
        return connector;
      } catch (error) {
        let errorMessage = 'Error al crear el conector';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Recurso no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para crear conector';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
        }

        logger.error({ error, errorCode }, 'Failed to create connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.merchantId, fetchWithAuth, connectors]
  );

  const getConnector = useCallback(
    async (connectorId: string): Promise<Connector> => {
      if (!authState?.merchantId) {
        logger.error('Missing merchantId for getting connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth<Connector>(
          `/account/${authState.merchantId}/connectors/${connectorId}`,
          { method: 'GET' }
        );

        const connector = ConnectorSchema.parse(response);
        setConnectors(prev =>
          prev.some(c => c.merchant_connector_id === connectorId)
            ? prev.map(c => (c.merchant_connector_id === connectorId ? connector : c))
            : [connector, ...prev]
        );

        logger.info({ connectorId }, 'Connector retrieved');
        return connector;
      } catch (error) {
        let errorMessage = 'Error al obtener el conector';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Conector no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para obtener conector';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
        }

        logger.error({ error, errorCode }, 'Failed to get connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.merchantId, fetchWithAuth]
  );

  const updateConnector = useCallback(
    async (connectorId: string, data: UpdateConnectorRequest): Promise<Connector> => {
      if (!authState?.merchantId) {
        logger.error('Missing merchantId for updating connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth<Connector>(
          `/account/${authState.merchantId}/connectors/${connectorId}`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );

        const connector = ConnectorSchema.parse(response);
        setConnectors(prev =>
          prev.map(c => (c.merchant_connector_id === connectorId ? connector : c))
        );

        // Update cache
        sessionStorage.setItem(
          `connectors_${authState.merchantId}`,
          JSON.stringify({
            data: connectors.map(c => (c.merchant_connector_id === connectorId ? connector : c)),
            timestamp: Date.now(),
          })
        );

        logger.info({ connectorId }, 'Connector updated');
        toast.success('Conector actualizado exitosamente');
        return connector;
      } catch (error) {
        let errorMessage = 'Error al actualizar el conector';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Conector no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para actualizar conector';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
        }

        logger.error({ error, errorCode }, 'Failed to update connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.merchantId, fetchWithAuth, connectors]
  );

  const deleteConnector = useCallback(
    async (connectorId: string): Promise<void> => {
      if (!authState?.merchantId) {
        logger.error('Missing merchantId for deleting connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        await fetchWithAuth(`/account/${authState.merchantId}/connectors/${connectorId}`, {
          method: 'DELETE',
        });

        setConnectors(prev => prev.filter(c => c.merchant_connector_id !== connectorId));
        setTotalCount(prev => Math.max(0, prev - 1));

        // Update cache
        sessionStorage.setItem(
          `connectors_${authState.merchantId}`,
          JSON.stringify({
            data: connectors.filter(c => c.merchant_connector_id !== connectorId),
            timestamp: Date.now(),
          })
        );

        logger.info({ connectorId }, 'Connector deleted');
        toast.success('Conector eliminado exitosamente');
      } catch (error) {
        let errorMessage = 'Error al eliminar el conector';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Conector no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para eliminar conector';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        }

        logger.error({ error, errorCode }, 'Failed to delete connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.merchantId, fetchWithAuth, connectors]
  );

  const testConnector = useCallback(
    async (connectorId: string): Promise<boolean> => {
      if (!authState?.merchantId) {
        logger.error('Missing merchantId for testing connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        // Hyperswitch no tiene endpoint específico, usar GET como verificación
        await getConnector(connectorId);
        logger.info({ connectorId }, 'Connector connection verified');
        toast.success('Conexión del conector verificada exitosamente');
        return true;
      } catch (error) {
        let errorMessage = 'Error al probar la conexión del conector';
        let errorCode = 'UNEXPECTED_ERROR';

        if (error instanceof Error) {
          if (error.message.includes('404')) {
            errorMessage = 'Conector no encontrado';
            errorCode = 'NOT_FOUND';
          } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado para probar conector';
            errorCode = 'UNAUTHORIZED';
          } else if (error.message.includes('429')) {
            errorMessage = 'Demasiadas solicitudes, intenta de nuevo más tarde';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
        }

        logger.error({ error, errorCode }, 'Failed to test connector');
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.merchantId, getConnector]
  );

  const refreshConnectors = useCallback(async (): Promise<void> => {
    if (authState?.merchantId) {
      sessionStorage.removeItem(`connectors_${authState.merchantId}`);
    }
    await listConnectors();
  }, [authState?.merchantId, listConnectors]);

  const getActiveConnectors = useCallback((): Connector[] => {
    return connectors.filter(c => c.status === 'active' && !(c.disabled ?? false));
  }, [connectors]);

  const getConnectorsByType = useCallback((type: string): Connector[] => {
    return connectors.filter(c => c.connector_type === type);
  }, [connectors]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (authState?.isAuthenticated && authState?.merchantId) {
      const cachedData = sessionStorage.getItem(`connectors_${authState.merchantId}`);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp > CACHE_EXPIRY) {
            logger.warn('Cached connectors expired');
            sessionStorage.removeItem(`connectors_${authState.merchantId}`);
            listConnectors();
          } else {
            const validatedConnectors = z.array(ConnectorSchema).parse(data);
            setConnectors(validatedConnectors);
            setTotalCount(validatedConnectors.length);
            listConnectors(); // Fetch fresh data in background
          }
        } catch (error) {
          logger.error({ error }, 'Invalid cached connector data');
          sessionStorage.removeItem(`connectors_${authState.merchantId}`);
          listConnectors();
        }
      } else {
        listConnectors();
      }
    } else {
      setConnectors([]);
      setTotalCount(0);
      setError(null);
    }
  }, [authState?.isAuthenticated, authState?.merchantId, listConnectors]);

  return {
    connectors,
    isLoading,
    error,
    totalCount,
    createConnector,
    getConnector,
    updateConnector,
    deleteConnector,
    testConnector,
    listConnectors,
    refreshConnectors,
    getActiveConnectors,
    getConnectorsByType,
    clearError,
    getAvailablePaymentMethods,
  };
}

export function useSupportedConnectors() {
  const { connectors } = useConnectors();
  return {
    supportedConnectors: SUPPORTED_CONNECTORS,
    isConnectorSupported: (connectorName: string): boolean => {
      const isSupported = connectorName in SUPPORTED_CONNECTORS;
      const isActive = connectors.some(c => c.connector_name === connectorName && c.status === 'active' && !c.disabled);
      return isSupported && isActive;
    },
    getConnectorInfo: (connectorName: string): SupportedConnectorInfo | undefined => {
      return SUPPORTED_CONNECTORS[connectorName];
    },
    getConnectorDisplayName: (connectorName: string): string => {
      const info = SUPPORTED_CONNECTORS[connectorName];
      return info?.name || connectorName.charAt(0).toUpperCase() + connectorName.slice(1);
    },
    getConnectorsByTier: (tier: ConnectorTier) => {
      return Object.entries(SUPPORTED_CONNECTORS)
        .filter(([_, info]) => info.tier === tier)
        .map(([key, info]) => ({ key, ...info }))
        .filter(({ key }) => connectors.some(c => c.connector_name === key && c.status === 'active' && !c.disabled));
    },
    getConnectorsByRegion: (region: string) => {
      return Object.entries(SUPPORTED_CONNECTORS)
        .filter(([_, info]) => info.regions.includes(region))
        .map(([key, info]) => ({ key, ...info }))
        .filter(({ key }) => connectors.some(c => c.connector_name === key && c.status === 'active' && !c.disabled));
    },
  };
}