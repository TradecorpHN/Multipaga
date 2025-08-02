'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCustomer } from '@/presentation/contexts/AuthContext'; // Changed from useMerchant to useCustomer
import { useHyperswitch } from '@/presentation/contexts/HyperswitchContext';
import { useApiClient } from '@/presentation/hooks/useApiClient';
import toast from 'react-hot-toast';
import { z } from 'zod';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
  redact: ['apiKey', 'merchantId', 'profileId', 'customerId', 'api_secret', 'key1', 'key2', 'merchant_secret'],
});

// Configuration
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;
const API_TIMEOUT = 15000;

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
}).strict();

const PaymentMethodEnabledSchema = z.object({
  payment_method: z.string().min(1),
  payment_method_types: z.array(z.string().min(1)).optional(),
  payment_method_issuers: z.array(z.string()).optional(),
  payment_schemes: z.array(z.string()).optional(),
  accepted_currencies: z
    .object({
      type: z.enum(['enable_only', 'disable_only']),
      list: z.array(z.string().min(1)),
    })
    .optional(),
  accepted_countries: z
    .object({
      type: z.enum(['enable_only', 'disable_only']),
      list: z.array(z.string().min(1)),
    })
    .optional(),
  minimum_amount: z.number().positive().optional(),
  maximum_amount: z.number().positive().optional(),
  recurring_enabled: z.boolean().optional(),
  installment_payment_enabled: z.boolean().optional(),
}).strict();

const ConnectorWebhookDetailsSchema = z.object({
  merchant_secret: z.string().optional(),
  additional_webhook_details: z.record(z.any()).optional(),
}).strict();

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
}).strict();

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
    logo: '/resources/connectors/STRIPE.svg',
  },
  adyen: {
    name: 'Adyen',
    tier: 1,
    regions: ['Global'],
    methods: ['card', 'bank_redirect', 'wallet', 'bank_transfer', 'crypto'],
    logo: '/resources/connectors/ADYEN.svg',
  },
  paypal: {
    name: 'PayPal',
    tier: 1,
    regions: ['Global'],
    methods: ['wallet', 'card'],
    logo: '/resources/connectors/PAYPAL.svg',
  },
  checkout: {
    name: 'Checkout.com',
    tier: 1,
    regions: ['Global'],
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/CHECKOUT.svg',
  },
  klarna: {
    name: 'Klarna',
    tier: 2,
    regions: ['Europe', 'US'],
    methods: ['pay_later'],
    logo: '/resources/connectors/KLARNA.svg',
  },
  rapyd: {
    name: 'Rapyd',
    tier: 2,
    regions: ['Global'],
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/RAPYD.svg',
  },
  worldpay: {
    name: 'Worldpay',
    tier: 2,
    regions: ['Global'],
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/WORLDPAY.svg',
  },
  square: {
    name: 'Square',
    tier: 2,
    regions: ['US', 'Canada', 'Australia'],
    methods: ['card'],
    logo: '/resources/connectors/SQUARE.svg',
  },
  braintree: {
    name: 'Braintree',
    tier: 2,
    regions: ['Global'],
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BRAINTREE.svg',
  },
  multisafepay: {
    name: 'MultiSafepay',
    tier: 3,
    regions: ['Europe'],
    methods: ['card', 'bank_redirect', 'wallet'],
    logo: '/resources/connectors/MULTISAFEPAY.svg',
  },
  trustpay: {
    name: 'TrustPay',
    tier: 3,
    regions: ['Europe'],
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/TRUSTPAY.svg',
  },
  payu: {
    name: 'PayU',
    tier: 3,
    regions: ['Latin America', 'Europe'],
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/PAYU.svg',
  },
  cybersource: {
    name: 'Cybersource',
    tier: 3,
    regions: ['Global'],
    methods: ['card'],
    logo: '/resources/connectors/CYBERSOURCE.svg',
  },
  shift4: {
    name: 'Shift4',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/SHIFT4.svg',
  },
  worldline: {
    name: 'Worldline',
    tier: 3,
    regions: ['Europe'],
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/WORLDLINE.svg',
  },
  payone: {
    name: 'Payone',
    tier: 3,
    regions: ['Europe'],
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/PAYONE.svg',
  },
  fiserv: {
    name: 'Fiserv',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/FISERV.svg',
  },
  helcim: {
    name: 'Helcim',
    tier: 3,
    regions: ['Canada'],
    methods: ['card'],
    logo: '/resources/connectors/HELCIM.svg',
  },
  bluesnap: {
    name: 'BlueSnap',
    tier: 3,
    regions: ['Global'],
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BLUESNAP.svg',
  },
  nuvei: {
    name: 'Nuvei',
    tier: 3,
    regions: ['Global'],
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/NUVEI.svg',
  },
  wise: {
    name: 'Wise',
    tier: 3,
    regions: ['Global'],
    methods: ['bank_transfer'],
    logo: '/resources/connectors/WISE.svg',
  },
  iatapay: {
    name: 'IATAPay',
    tier: 3,
    regions: ['Global'],
    methods: ['card'],
    logo: '/resources/connectors/IATAPAY.svg',
  },
  noon: {
    name: 'Noon',
    tier: 3,
    regions: ['Middle East'],
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/NOON.svg',
  },
  airwallex: {
    name: 'Airwallex',
    tier: 3,
    regions: ['Global'],
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/AIRWALLEX.svg',
  },
  globalpay: {
    name: 'GlobalPay',
    tier: 3,
    regions: ['Global'],
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAY.svg',
  },
  nexinets: {
    name: 'Nexinets',
    tier: 3,
    regions: ['Europe'],
    methods: ['card'],
    logo: '/resources/connectors/NEXINETS.svg',
  },
  stax: {
    name: 'Stax',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/STAX.svg',
  },
  tsys: {
    name: 'TSYS',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/TSYS.svg',
  },
  nmi: {
    name: 'NMI',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/NMI.svg',
  },
  volt: {
    name: 'Volt',
    tier: 3,
    regions: ['Europe'],
    methods: ['bank_transfer'],
    logo: '/resources/connectors/VOLT.svg',
  },
  zen: {
    name: 'Zen',
    tier: 3,
    regions: ['Europe'],
    methods: ['card'],
    logo: '/resources/connectors/ZEN.svg',
  },
  wellsfargo: {
    name: 'Wells Fargo',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/WELLSFARGO.svg',
  },
  tokenio: {
    name: 'Token.io',
    tier: 3,
    regions: ['Europe'],
    methods: ['bank_transfer'],
    logo: '/resources/connectors/TOKENIO.svg',
  },
  payeezy: {
    name: 'Payeezy',
    tier: 3,
    regions: ['US'],
    methods: ['card'],
    logo: '/resources/connectors/PAYEEZY.svg',
  },
  globalpayments: {
    name: 'Global Payments',
    tier: 3,
    regions: ['Global'],
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAYMENTS.svg',
  },
  netnaxept: {
    name: 'Nets/Netaxept',
    tier: 3,
    regions: ['Nordic'],
    methods: ['card'],
    logo: '/resources/connectors/NETNAXEPT.svg',
  },
} as const;

export type SupportedConnector = keyof typeof SUPPORTED_CONNECTORS;

// Error personalizado para la API
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

// Interfaz para el hook
interface UseConnectorsReturn {
  connectors: Connector[];
  isLoading: boolean;
  isInitialLoading: boolean;
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
  getAvailablePaymentMethods: () => Promise<string[]>;
}

/**
 * Hook para gestionar conectores de pago
 * @remarks Must be used in a client component with "use client" directive
 * @returns Funciones y estado para interactuar con conectores
 */
export function useConnectors(): UseConnectorsReturn {
  const { isAuthenticated, merchantId, environment } = useCustomer(); // Changed from useMerchant, removed apiKey
  const { get, post, makeRequest } = useApiClient();
  const { getPaymentMethods } = useHyperswitch();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Centraliza la actualización del caché
  const updateCache = useCallback((newConnectors: Connector[]) => {
    if (merchantId) {
      const cacheData = {
        data: newConnectors,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(`connectors_${merchantId}`, JSON.stringify(cacheData));
      logger.debug({ count: newConnectors.length }, 'Updated connectors cache');
    }
  }, [merchantId]);

  /**
   * Obtiene conectores activos
   */
  const getActiveConnectors = useCallback(() => {
    return connectors.filter((c) => c.status === 'active' && !(c.disabled ?? false));
  }, [connectors]);

  /**
   * Obtiene los métodos de pago disponibles de los conectores activos
   */
  const getAvailablePaymentMethods = useCallback(async () => {
    const methodsSet = new Set<string>();
    const activeConnectors = getActiveConnectors();
    
    try {
      const paymentMethods = await getPaymentMethods();
      const apiMethods = paymentMethods?.payment_methods?.map((pm: any) => pm.payment_method) || [];
      
      activeConnectors.forEach((connector) => {
        connector.payment_methods_enabled?.forEach((pm) => {
          if (pm.payment_method && apiMethods.includes(pm.payment_method)) {
            methodsSet.add(pm.payment_method);
          }
        });
      });
      
      const methods = Array.from(methodsSet).sort();
      logger.debug({ methods }, 'Available payment methods retrieved');
      return methods;
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch payment methods, using connector data');
      activeConnectors.forEach((connector) => {
        connector.payment_methods_enabled?.forEach((pm) => {
          if (pm.payment_method) {
            methodsSet.add(pm.payment_method);
          }
        });
      });
      const methods = Array.from(methodsSet).sort();
      logger.debug({ methods }, 'Fallback to connector payment methods');
      return methods;
    }
  }, [getPaymentMethods, getActiveConnectors]);

  /**
   * Lista todos los conectores
   */
  const listConnectors = useCallback(async () => {
    if (!isAuthenticated || !merchantId) {
      logger.warn({ isAuthenticated, merchantId }, 'Missing auth state for listing connectors');
      setError('Autenticación requerida');
      setConnectors([]);
      setTotalCount(0);
      setIsInitialLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await get<ConnectorListResponse>(
        `/account/${merchantId}/connectors`,
        { timeout: API_TIMEOUT, retries: MAX_RETRIES }
      );

      const connectorList = ConnectorListResponseSchema.safeParse(response);
      if (!connectorList.success) {
        logger.error({ errors: connectorList.error.errors }, 'Invalid connector list response');
        throw new ConnectorApiError('INVALID_RESPONSE', 'Datos de conectores inválidos', 400, connectorList.error.errors);
      }

      const connectorsData = connectorList.data.connectors || connectorList.data.data || [];

      // Validate payment methods
      let apiMethods: string[] = [];
      try {
        const paymentMethods = await getPaymentMethods();
        apiMethods = paymentMethods?.payment_methods?.map((pm: any) => pm.payment_method) || [];
      } catch (error) {
        logger.warn({ error }, 'Failed to fetch payment methods for validation');
      }

      const invalidConnectors = connectorsData.filter((c) =>
        c.payment_methods_enabled?.some((pm) => !apiMethods.includes(pm.payment_method))
      );
      if (invalidConnectors.length > 0) {
        logger.info(
          { invalidConnectors: invalidConnectors.map((c) => c.connector_name) },
          'Some connectors have unsupported payment methods'
        );
        toast.custom(`Advertencia: ${invalidConnectors.length} conectores tienen métodos de pago no soportados`, {
          icon: '⚠️',
          duration: 4000,
          style: {
            background: '#FFF3CD',
            color: '#856404',
            border: '1px solid #FFEEBA',
          },
        });
      }

      setConnectors(connectorsData);
      setTotalCount(
        connectorList.data.total_count ||
        connectorList.data.count ||
        connectorList.data.size ||
        connectorsData.length
      );
      updateCache(connectorsData);

      logger.info({ count: connectorsData.length, merchantId }, 'Connectors listed successfully');
    } catch (error) {
      let errorMessage = 'No se pudieron cargar los conectores';
      let errorCode = 'UNEXPECTED_ERROR';
      let statusCode = 400;
      let details: any;

      if (error instanceof ConnectorApiError) {
        errorMessage = error.message;
        errorCode = error.code;
        statusCode = error.statusCode;
        details = error.details;
      } else if (error instanceof Error) {
        errorMessage = error.message.includes('HS_')
          ? `Error de Hyperswitch: ${error.message}`
          : error.message.includes('401')
          ? 'No autorizado para listar conectores'
          : error.message.includes('429')
          ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
          : error.message.includes('404')
          ? 'No se encontraron conectores'
          : error.message.includes('TIMEOUT')
          ? 'Tiempo de espera agotado'
          : error.message.includes('NETWORK_ERROR')
          ? 'Error de red'
          : error.message;
        errorCode = error.message.includes('HS_')
          ? error.message
          : error.message.includes('401')
          ? 'UNAUTHORIZED'
          : error.message.includes('429')
          ? 'RATE_LIMIT_EXCEEDED'
          : error.message.includes('404')
          ? 'NOT_FOUND'
          : error.message.includes('TIMEOUT')
          ? 'TIMEOUT'
          : error.message.includes('NETWORK_ERROR')
          ? 'NETWORK_ERROR'
          : 'UNEXPECTED_ERROR';
        statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
      }

      logger.error({ error, errorCode, details }, 'Failed to list connectors');
      setError(errorMessage);
      toast.error(errorMessage);

      // Try loading from cache
      if (merchantId) {
        const cachedData = sessionStorage.getItem(`connectors_${merchantId}`);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp > CACHE_EXPIRY) {
              logger.warn('Cached connectors expired');
              sessionStorage.removeItem(`connectors_${merchantId}`);
            } else {
              const validatedConnectors = z.array(ConnectorSchema).parse(data);
              setConnectors(validatedConnectors);
              setTotalCount(validatedConnectors.length);
              toast.custom('Usando datos de conectores en caché debido a un error', {
                icon: '⚠️',
                duration: 4000,
                style: {
                  background: '#FFF3CD',
                  color: '#856404',
                  border: '1px solid #FFEEBA',
                },
              });
              logger.info({ count: validatedConnectors.length }, 'Loaded connectors from cache');
            }
          } catch (cacheError) {
            logger.error({ cacheError }, 'Invalid cached connector data');
            sessionStorage.removeItem(`connectors_${merchantId}`);
            setConnectors([]);
            setTotalCount(0);
          }
        }
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [isAuthenticated, merchantId, get, getPaymentMethods, updateCache]);

  /**
   * Crea un nuevo conector
   */
  const createConnector = useCallback(
    async (data: CreateConnectorRequest): Promise<Connector> => {
      if (!isAuthenticated || !merchantId) {
        logger.error({ isAuthenticated, merchantId }, 'Missing auth state for creating connector');
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

        const connector = await post<Connector>(
          `/account/${merchantId}/connectors`,
          validatedData,
          { timeout: API_TIMEOUT, retries: MAX_RETRIES }
        );

        const validatedConnector = ConnectorSchema.parse(connector);
        setConnectors((prev) => [validatedConnector, ...prev]);
        setTotalCount((prev) => prev + 1);
        updateCache([validatedConnector, ...connectors]);

        logger.info({ connectorId: validatedConnector.merchant_connector_id }, 'Connector created');
        toast.success(`Conector ${validatedConnector.connector_name} creado exitosamente`);
        return validatedConnector;
      } catch (error) {
        let errorMessage = 'Error al crear el conector';
        let errorCode = 'UNEXPECTED_ERROR';
        let statusCode = 400;
        let details: any;

        if (error instanceof ConnectorApiError) {
          errorMessage = error.message;
          errorCode = error.code;
          statusCode = error.statusCode;
          details = error.details;
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
          details = error.errors;
        } else if (error instanceof Error) {
          errorMessage = error.message.includes('HS_')
            ? `Error de Hyperswitch: ${error.message}`
            : error.message.includes('401')
            ? 'No autorizado para crear conector'
            : error.message.includes('429')
            ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
            : error.message.includes('404')
            ? 'Recurso no encontrado'
            : error.message.includes('TIMEOUT')
            ? 'Tiempo de espera agotado'
            : error.message.includes('NETWORK_ERROR')
            ? 'Error de red'
            : error.message;
          errorCode = error.message.includes('HS_')
            ? error.message
            : error.message.includes('401')
            ? 'UNAUTHORIZED'
            : error.message.includes('429')
            ? 'RATE_LIMIT_EXCEEDED'
            : error.message.includes('404')
            ? 'NOT_FOUND'
            : error.message.includes('TIMEOUT')
            ? 'TIMEOUT'
            : error.message.includes('NETWORK_ERROR')
            ? 'NETWORK_ERROR'
            : 'UNEXPECTED_ERROR';
          statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
        }

        logger.error({ error, errorCode, details }, 'Failed to create connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage, statusCode, details);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, merchantId, post, connectors, updateCache]
  );

  /**
   * Obtiene un conector por ID
   */
  const getConnector = useCallback(
    async (connectorId: string): Promise<Connector> => {
      if (!isAuthenticated || !merchantId) {
        logger.error({ isAuthenticated, merchantId }, 'Missing auth state for getting connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        const connector = await get<Connector>(
          `/account/${merchantId}/connectors/${connectorId}`,
          { timeout: API_TIMEOUT, retries: MAX_RETRIES }
        );

        const validatedConnector = ConnectorSchema.parse(connector);
        setConnectors((prev) =>
          prev.some((c) => c.merchant_connector_id === connectorId)
            ? prev.map((c) => (c.merchant_connector_id === connectorId ? validatedConnector : c))
            : [validatedConnector, ...prev]
        );
        updateCache(
          connectors.some((c) => c.merchant_connector_id === connectorId)
            ? connectors.map((c) => (c.merchant_connector_id === connectorId ? validatedConnector : c))
            : [validatedConnector, ...connectors]
        );

        logger.info({ connectorId }, 'Connector retrieved');
        return validatedConnector;
      } catch (error) {
        let errorMessage = 'Error al obtener el conector';
        let errorCode = 'UNEXPECTED_ERROR';
        let statusCode = 400;
        let details: any;

        if (error instanceof ConnectorApiError) {
          errorMessage = error.message;
          errorCode = error.code;
          statusCode = error.statusCode;
          details = error.details;
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
          details = error.errors;
        } else if (error instanceof Error) {
          errorMessage = error.message.includes('HS_')
            ? `Error de Hyperswitch: ${error.message}`
            : error.message.includes('404')
            ? 'Conector no encontrado'
            : error.message.includes('401')
            ? 'No autorizado para obtener conector'
            : error.message.includes('429')
            ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
            : error.message.includes('TIMEOUT')
            ? 'Tiempo de espera agotado'
            : error.message.includes('NETWORK_ERROR')
            ? 'Error de red'
            : error.message;
          errorCode = error.message.includes('HS_')
            ? error.message
            : error.message.includes('404')
            ? 'NOT_FOUND'
            : error.message.includes('401')
            ? 'UNAUTHORIZED'
            : error.message.includes('429')
            ? 'RATE_LIMIT_EXCEEDED'
            : error.message.includes('TIMEOUT')
            ? 'TIMEOUT'
            : error.message.includes('NETWORK_ERROR')
            ? 'NETWORK_ERROR'
            : 'UNEXPECTED_ERROR';
          statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
        }

        logger.error({ error, errorCode, details }, 'Failed to get connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage, statusCode, details);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, merchantId, get, connectors, updateCache]
  );

  /**
   * Actualiza un conector existente
   */
  const updateConnector = useCallback(
    async (connectorId: string, data: UpdateConnectorRequest): Promise<Connector> => {
      if (!isAuthenticated || !merchantId) {
        logger.error({ isAuthenticated, merchantId }, 'Missing auth state for updating connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        const connector = await post<Connector>(
          `/account/${merchantId}/connectors/${connectorId}`,
          data,
          { timeout: API_TIMEOUT, retries: MAX_RETRIES }
        );

        const validatedConnector = ConnectorSchema.parse(connector);
        setConnectors((prev) => prev.map((c) => (c.merchant_connector_id === connectorId ? validatedConnector : c)));
        updateCache(connectors.map((c) => (c.merchant_connector_id === connectorId ? validatedConnector : c)));

        logger.info({ connectorId }, 'Connector updated');
        toast.success('Conector actualizado exitosamente');
        return validatedConnector;
      } catch (error) {
        let errorMessage = 'Error al actualizar el conector';
        let errorCode = 'UNEXPECTED_ERROR';
        let statusCode = 400;
        let details: any;

        if (error instanceof ConnectorApiError) {
          errorMessage = error.message;
          errorCode = error.code;
          statusCode = error.statusCode;
          details = error.details;
        } else if (error instanceof z.ZodError) {
          errorMessage = 'Datos de conector inválidos';
          errorCode = 'INVALID_RESPONSE';
          details = error.errors;
        } else if (error instanceof Error) {
          errorMessage = error.message.includes('HS_')
            ? `Error de Hyperswitch: ${error.message}`
            : error.message.includes('404')
            ? 'Conector no encontrado'
            : error.message.includes('401')
            ? 'No autorizado para actualizar conector'
            : error.message.includes('429')
            ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
            : error.message.includes('TIMEOUT')
            ? 'Tiempo de espera agotado'
            : error.message.includes('NETWORK_ERROR')
            ? 'Error de red'
            : error.message;
          errorCode = error.message.includes('HS_')
            ? error.message
            : error.message.includes('404')
            ? 'NOT_FOUND'
            : error.message.includes('401')
            ? 'UNAUTHORIZED'
            : error.message.includes('429')
            ? 'RATE_LIMIT_EXCEEDED'
            : error.message.includes('TIMEOUT')
            ? 'TIMEOUT'
            : error.message.includes('NETWORK_ERROR')
            ? 'NETWORK_ERROR'
            : 'UNEXPECTED_ERROR';
          statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
        }

        logger.error({ error, errorCode, details }, 'Failed to update connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage, statusCode, details);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, merchantId, post, connectors, updateCache]
  );

  /**
   * Elimina un conector
   */
  const deleteConnector = useCallback(
    async (connectorId: string): Promise<void> => {
      if (!isAuthenticated || !merchantId) {
        logger.error({ isAuthenticated, merchantId }, 'Missing auth state for deleting connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        await makeRequest<void>(`/account/${merchantId}/connectors/${connectorId}`, {
          method: 'DELETE',
          timeout: API_TIMEOUT,
          retries: MAX_RETRIES,
        });

        setConnectors((prev) => prev.filter((c) => c.merchant_connector_id !== connectorId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        updateCache(connectors.filter((c) => c.merchant_connector_id !== connectorId));

        logger.info({ connectorId }, 'Connector deleted');
        toast.success('Conector eliminado exitosamente');
      } catch (error) {
        let errorMessage = 'Error al eliminar el conector';
        let errorCode = 'UNEXPECTED_ERROR';
        let statusCode = 400;
        let details: any;

        if (error instanceof ConnectorApiError) {
          errorMessage = error.message;
          errorCode = error.code;
          statusCode = error.statusCode;
          details = error.details;
        } else if (error instanceof Error) {
          errorMessage = error.message.includes('HS_')
            ? `Error de Hyperswitch: ${error.message}`
            : error.message.includes('404')
            ? 'Conector no encontrado'
            : error.message.includes('401')
            ? 'No autorizado para eliminar conector'
            : error.message.includes('429')
            ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
            : error.message.includes('TIMEOUT')
            ? 'Tiempo de espera agotado'
            : error.message.includes('NETWORK_ERROR')
            ? 'Error de red'
            : error.message;
          errorCode = error.message.includes('HS_')
            ? error.message
            : error.message.includes('404')
            ? 'NOT_FOUND'
            : error.message.includes('401')
            ? 'UNAUTHORIZED'
            : error.message.includes('429')
            ? 'RATE_LIMIT_EXCEEDED'
            : error.message.includes('TIMEOUT')
            ? 'TIMEOUT'
            : error.message.includes('NETWORK_ERROR')
            ? 'NETWORK_ERROR'
            : 'UNEXPECTED_ERROR';
          statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
        }

        logger.error({ error, errorCode, details }, 'Failed to delete connector');
        setError(errorMessage);
        toast.error(errorMessage);
        throw new ConnectorApiError(errorCode, errorMessage, statusCode, details);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, merchantId, makeRequest, connectors, updateCache]
  );

  /**
   * Prueba la conexión de un conector
   */
  const testConnector = useCallback(
    async (connectorId: string): Promise<boolean> => {
      if (!isAuthenticated || !merchantId) {
        logger.error({ isAuthenticated, merchantId }, 'Missing auth state for testing connector');
        throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401);
      }

      setIsLoading(true);
      setError(null);

      try {
        await get(`/account/${merchantId}/connectors/${connectorId}/verify`, { timeout: API_TIMEOUT, retries: MAX_RETRIES });
        logger.info({ connectorId }, 'Connector connection verified');
        toast.success('Conexión del conector verificada exitosamente');
        return true;
      } catch (error) {
        let errorMessage = 'Error al probar la conexión del conector';
        let errorCode = 'UNEXPECTED_ERROR';
        let statusCode = 400;
        let details: any;

        if (error instanceof ConnectorApiError) {
          errorMessage = error.message;
          errorCode = error.code;
          statusCode = error.statusCode;
          details = error.details;
        } else if (error instanceof Error) {
          errorMessage = error.message.includes('HS_')
            ? `Error de Hyperswitch: ${error.message}`
            : error.message.includes('404')
            ? 'Conector no encontrado'
            : error.message.includes('401')
            ? 'No autorizado para probar conector'
            : error.message.includes('429')
            ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
            : error.message.includes('TIMEOUT')
            ? 'Tiempo de espera agotado'
            : error.message.includes('NETWORK_ERROR')
            ? 'Error de red'
            : error.message;
          errorCode = error.message.includes('HS_')
            ? error.message
            : error.message.includes('404')
            ? 'NOT_FOUND'
            : error.message.includes('401')
            ? 'UNAUTHORIZED'
            : error.message.includes('429')
            ? 'RATE_LIMIT_EXCEEDED'
            : error.message.includes('TIMEOUT')
            ? 'TIMEOUT'
            : error.message.includes('NETWORK_ERROR')
            ? 'NETWORK_ERROR'
            : 'UNEXPECTED_ERROR';
          statusCode = error.message.includes('401') ? 401 : error.message.includes('429') ? 429 : error.message.includes('404') ? 404 : 400;
        }

        logger.error({ error, errorCode, details }, 'Failed to test connector');
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, merchantId, get]
  );

  /**
   * Refresca la lista de conectores
   */
  const refreshConnectors = useCallback(async () => {
    if (merchantId) {
      sessionStorage.removeItem(`connectors_${merchantId}`);
      logger.debug({ merchantId }, 'Cleared connectors cache');
    }
    await listConnectors();
  }, [merchantId, listConnectors]);

  /**
   * Obtiene conectores por tipo
   */
  const getConnectorsByType = useCallback((type: string) => {
    return connectors.filter((c) => c.connector_type === type);
  }, [connectors]);

  /**
   * Limpia el mensaje de error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carga inicial de conectores
  useEffect(() => {
    if (!isAuthenticated || !merchantId) {
      logger.warn({ isAuthenticated, merchantId }, 'Skipping connector load due to missing auth');
      setConnectors([]);
      setTotalCount(0);
      setIsInitialLoading(false);
      setError('Autenticación requerida');
      return;
    }

    const cachedData = sessionStorage.getItem(`connectors_${merchantId}`);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
          logger.warn({ merchantId }, 'Cached connectors expired');
          sessionStorage.removeItem(`connectors_${merchantId}`);
          listConnectors();
        } else {
          const validatedConnectors = z.array(ConnectorSchema).safeParse(data);
          if (validatedConnectors.success) {
            setConnectors(validatedConnectors.data);
            setTotalCount(validatedConnectors.data.length);
            logger.info({ count: validatedConnectors.data.length, merchantId }, 'Loaded connectors from cache');
            listConnectors(); // Refresh in background
          } else {
            logger.error({ errors: validatedConnectors.error.errors }, 'Invalid cached connector data');
            sessionStorage.removeItem(`connectors_${merchantId}`);
            listConnectors();
          }
        }
      } catch (error) {
        logger.error({ error, merchantId }, 'Failed to parse cached connector data');
        sessionStorage.removeItem(`connectors_${merchantId}`);
        listConnectors();
      }
    } else {
      listConnectors();
    }
  }, [isAuthenticated, merchantId, listConnectors]);

  return {
    connectors,
    isLoading,
    isInitialLoading,
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

/**
 * Hook para gestionar conectores soportados
 */
export function useSupportedConnectors() {
  const { connectors } = useConnectors();

  return {
    supportedConnectors: SUPPORTED_CONNECTORS,
    isConnectorSupported: (connectorName: string): boolean => {
      const isSupported = connectorName in SUPPORTED_CONNECTORS;
      const isActive = connectors.some((c) => c.connector_name === connectorName && c.status === 'active' && !c.disabled);
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
        .filter(({ key }) => connectors.some((c) => c.connector_name === key && c.status === 'active' && !c.disabled));
    },
    getConnectorsByRegion: (region: string) => {
      return Object.entries(SUPPORTED_CONNECTORS)
        .filter(([_, info]) => info.regions.includes(region))
        .map(([key, info]) => ({ key, ...info }))
        .filter(({ key }) => connectors.some((c) => c.connector_name === key && c.status === 'active' && !c.disabled));
    },
  };
}