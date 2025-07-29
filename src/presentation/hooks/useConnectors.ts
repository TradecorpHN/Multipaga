// src/presentation/hooks/useConnectors.ts
// Hook completamente corregido para cargar datos reales de conectores de Hyperswitch
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/presentation/contexts/AuthContext'
import toast from 'react-hot-toast'
import { z } from 'zod'

// Schema para detalles de cuenta del conector
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
})

// Schema para métodos de pago habilitados
const PaymentMethodEnabledSchema = z.object({
  payment_method: z.string(),
  payment_method_types: z.array(z.string()).optional(),
  payment_method_issuers: z.array(z.string()).optional(),
  payment_schemes: z.array(z.string()).optional(),
  accepted_currencies: z.object({
    type: z.enum(['enable_only', 'disable_only']),
    list: z.array(z.string()),
  }).optional(),
  accepted_countries: z.object({
    type: z.enum(['enable_only', 'disable_only']),
    list: z.array(z.string()),
  }).optional(),
  minimum_amount: z.number().optional(),
  maximum_amount: z.number().optional(),
  recurring_enabled: z.boolean().optional(),
  installment_payment_enabled: z.boolean().optional(),
})

// Schema para detalles de webhook del conector
const ConnectorWebhookDetailsSchema = z.object({
  merchant_secret: z.string().optional(),
  additional_webhook_details: z.record(z.any()).optional(),
})

// FIX: Schema principal del conector con tipos compatibles y tipado estricto
const ConnectorSchema = z.object({
  merchant_connector_id: z.string(),
  connector_type: z.enum(['payment_processor', 'authentication_processor', 'fraud_check', 'acquirer', 'accounting']),
  connector_name: z.string(),
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
})

const ConnectorListResponseSchema = z.object({
  connectors: z.array(ConnectorSchema).optional(),
  data: z.array(ConnectorSchema).optional(),
  size: z.number().optional(),
  count: z.number().optional(),
  has_more: z.boolean().optional(),
  total_count: z.number().optional(),
})

// Schema para crear conector
const CreateConnectorRequestSchema = z.object({
  connector_type: z.enum(['payment_processor', 'authentication_processor', 'fraud_check', 'acquirer', 'accounting']),
  connector_name: z.string(),
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
})

// Tipos exportados
export type Connector = z.infer<typeof ConnectorSchema>
export type ConnectorListResponse = z.infer<typeof ConnectorListResponseSchema>
export type CreateConnectorRequest = z.infer<typeof CreateConnectorRequestSchema>
export type UpdateConnectorRequest = Partial<CreateConnectorRequest> & { 
  merchant_connector_id: string 
}
export type ConnectorAccountDetails = z.infer<typeof ConnectorAccountDetailsSchema>
export type PaymentMethodEnabled = z.infer<typeof PaymentMethodEnabledSchema>

// FIX: Tipado estricto para los tiers de conectores
export type ConnectorTier = 1 | 2 | 3

// FIX: Interface para información de conector soportado con tipado estricto
export interface SupportedConnectorInfo {
  name: string
  tier: ConnectorTier
  regions: string[]
  methods: string[]
  logo: string
}

// Lista completa de conectores soportados por Hyperswitch con información adicional
export const SUPPORTED_CONNECTORS: Record<string, SupportedConnectorInfo> = {
  // Tier 1 - Principales proveedores globales
  'stripe': { 
    name: 'Stripe', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'bank_redirect', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/STRIPE.svg'
  },
  'adyen': { 
    name: 'Adyen', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'bank_redirect', 'wallet', 'bank_transfer', 'crypto'],
    logo: '/resources/connectors/ADYEN.svg'
  },
  'paypal': { 
    name: 'PayPal', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['wallet', 'card'],
    logo: '/resources/connectors/PAYPAL.svg'
  },
  'checkout': { 
    name: 'Checkout.com', 
    tier: 1, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/CHECKOUT.svg'
  },
  
  // Tier 2 - Proveedores regionales importantes
  'klarna': { 
    name: 'Klarna', 
    tier: 2, 
    regions: ['Europe', 'US'], 
    methods: ['pay_later'],
    logo: '/resources/connectors/KLARNA.svg'
  },
  'rapyd': { 
    name: 'Rapyd', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/RAPYD.svg'
  },
  'worldpay': { 
    name: 'Worldpay', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/WORLDPAY.svg'
  },
  'square': { 
    name: 'Square', 
    tier: 2, 
    regions: ['US', 'Canada', 'Australia'], 
    methods: ['card'],
    logo: '/resources/connectors/SQUARE.svg'
  },
  'braintree': { 
    name: 'Braintree', 
    tier: 2, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BRAINTREE.svg'
  },
  
  // Tier 3 - Proveedores especializados
  'multisafepay': { 
    name: 'MultiSafepay', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect', 'wallet'],
    logo: '/resources/connectors/MULTISAFEPAY.svg'
  },
  'trustpay': { 
    name: 'TrustPay', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/TRUSTPAY.svg'
  },
  'payu': { 
    name: 'PayU', 
    tier: 3, 
    regions: ['Latin America', 'Europe'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/PAYU.svg'
  },
  'cybersource': { 
    name: 'Cybersource', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/CYBERSOURCE.svg'
  },
  'shift4': { 
    name: 'Shift4', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/SHIFT4.svg'
  },
  'worldline': { 
    name: 'Worldline', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/WORLDLINE.svg'
  },
  'payone': { 
    name: 'Payone', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card', 'bank_redirect'],
    logo: '/resources/connectors/PAYONE.svg'
  },
  'fiserv': { 
    name: 'Fiserv', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/FISERV.svg'
  },
  'helcim': { 
    name: 'Helcim', 
    tier: 3, 
    regions: ['Canada'], 
    methods: ['card'],
    logo: '/resources/connectors/HELCIM.svg'
  },
  'bluesnap': { 
    name: 'BlueSnap', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/BLUESNAP.svg'
  },
  'nuvei': { 
    name: 'Nuvei', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'wallet', 'bank_transfer'],
    logo: '/resources/connectors/NUVEI.svg'
  },
  'wise': { 
    name: 'Wise', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/WISE.svg'
  },
  'iatapay': { 
    name: 'IATAPay', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/IATAPAY.svg'
  },
  'noon': { 
    name: 'Noon', 
    tier: 3, 
    regions: ['Middle East'], 
    methods: ['card', 'wallet'],
    logo: '/resources/connectors/NOON.svg'
  },
  'airwallex': { 
    name: 'Airwallex', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card', 'bank_transfer'],
    logo: '/resources/connectors/AIRWALLEX.svg'
  },
  'globalpay': { 
    name: 'GlobalPay', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAY.svg'
  },
  'nexinets': { 
    name: 'Nexinets', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card'],
    logo: '/resources/connectors/NEXINETS.svg'
  },
  'stax': { 
    name: 'Stax', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/STAX.svg'
  },
  'tsys': { 
    name: 'TSYS', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/TSYS.svg'
  },
  'nmi': { 
    name: 'NMI', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/NMI.svg'
  },
  'volt': { 
    name: 'Volt', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/VOLT.svg'
  },
  'zen': { 
    name: 'Zen', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['card'],
    logo: '/resources/connectors/ZEN.svg'
  },
  'wellsfargo': { 
    name: 'Wells Fargo', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/WELLSFARGO.svg'
  },
  'tokenio': { 
    name: 'Token.io', 
    tier: 3, 
    regions: ['Europe'], 
    methods: ['bank_transfer'],
    logo: '/resources/connectors/TOKENIO.svg'
  },
  'payeezy': { 
    name: 'Payeezy', 
    tier: 3, 
    regions: ['US'], 
    methods: ['card'],
    logo: '/resources/connectors/PAYEEZY.svg'
  },
  'globalpayments': { 
    name: 'Global Payments', 
    tier: 3, 
    regions: ['Global'], 
    methods: ['card'],
    logo: '/resources/connectors/GLOBALPAYMENTS.svg'
  },
  'netnaxept': { 
    name: 'Nets/Netaxept', 
    tier: 3, 
    regions: ['Nordic'], 
    methods: ['card'],
    logo: '/resources/connectors/NETNAXEPT.svg'
  },
} as const

export type SupportedConnector = keyof typeof SUPPORTED_CONNECTORS

class ConnectorApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ConnectorApiError'
  }
}

interface UseConnectorsReturn {
  // State
  connectors: Connector[]
  isLoading: boolean
  error: string | null
  totalCount: number
  
  // Actions
  createConnector: (data: CreateConnectorRequest) => Promise<Connector>
  getConnector: (connectorId: string) => Promise<Connector>
  updateConnector: (connectorId: string, data: UpdateConnectorRequest) => Promise<Connector>
  deleteConnector: (connectorId: string) => Promise<void>
  testConnector: (connectorId: string) => Promise<boolean>
  listConnectors: () => Promise<void>
  refreshConnectors: () => Promise<void>
  getActiveConnectors: () => Connector[]
  getConnectorsByType: (type: string) => Connector[]
  clearError: () => void
}

export function useConnectors(): UseConnectorsReturn {
  // FIX: Acceso correcto a authState
  const { authState } = useAuth()
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Helper para hacer requests a la API
  const makeApiRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // FIX: Verificación correcta de authState
    if (!authState?.merchantId || !authState?.profileId) {
      throw new ConnectorApiError('AUTH_REQUIRED', 'Autenticación requerida', 401)
    }

    const url = `/api/hyperswitch${endpoint}`
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Merchant-Id': authState.merchantId,
      'X-Profile-Id': authState.profileId,
      ...options.headers,
    })

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // Si no se puede parsear el JSON, usar mensaje por defecto
      }

      const error = new ConnectorApiError(
        errorData.error_code || 'API_ERROR',
        errorData.error_message || `Error ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      )
      throw error
    }

    return response.json()
  }, [authState?.merchantId, authState?.profileId])

  // Create a new connector
  const createConnector = useCallback(async (data: CreateConnectorRequest): Promise<Connector> => {
    setIsLoading(true)
    setError(null)

    try {
      // Validar datos de entrada
      const validatedData = CreateConnectorRequestSchema.parse({
        ...data,
        business_country: data.business_country || 'HN',
        business_label: data.business_label || 'TradecorpHN',
      })

      const response = await makeApiRequest<Connector>('/account/connectors', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      })

      const connector = ConnectorSchema.parse(response)
      
      // Add to local state
      setConnectors(prev => [connector, ...prev])
      setTotalCount(prev => prev + 1)
      
      toast.success(`Conector ${connector.connector_name} creado exitosamente`)
      return connector
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al crear el conector'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // Get connector details
  const getConnector = useCallback(async (connectorId: string): Promise<Connector> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Connector>(`/account/connectors/${connectorId}`)
      const connector = ConnectorSchema.parse(response)
      
      // Update in local state if exists
      setConnectors(prev => prev.map(c => 
        c.merchant_connector_id === connectorId ? connector : c
      ))
      
      return connector
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al obtener el conector'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // Update connector
  const updateConnector = useCallback(async (
    connectorId: string, 
    data: UpdateConnectorRequest
  ): Promise<Connector> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<Connector>(`/account/connectors/${connectorId}`, {
        method: 'POST', // Hyperswitch usa POST para updates
        body: JSON.stringify(data),
      })

      const connector = ConnectorSchema.parse(response)
      
      setConnectors(prev => prev.map(c => 
        c.merchant_connector_id === connectorId ? connector : c
      ))
      
      toast.success('Conector actualizado exitosamente')
      return connector
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al actualizar el conector'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // Delete connector
  const deleteConnector = useCallback(async (connectorId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await makeApiRequest(`/account/connectors/${connectorId}`, {
        method: 'DELETE',
      })

      setConnectors(prev => prev.filter(c => c.merchant_connector_id !== connectorId))
      setTotalCount(prev => Math.max(0, prev - 1))
      
      toast.success('Conector eliminado exitosamente')
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al eliminar el conector'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // Test connector connection
  const testConnector = useCallback(async (connectorId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Hyperswitch no tiene endpoint específico de test, 
      // pero podemos verificar obteniendo el conector
      await getConnector(connectorId)
      
      toast.success('Conexión del conector verificada exitosamente')
      return true
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al probar la conexión del conector'
      
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [getConnector])

  // List all connectors
  const listConnectors = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await makeApiRequest<ConnectorListResponse>('/account/connectors')
      
      const connectorList = ConnectorListResponseSchema.parse(response)
      
      // Hyperswitch puede retornar los conectores en diferentes formatos
      const connectorsData = connectorList.connectors || connectorList.data || []
      
      setConnectors(connectorsData)
      setTotalCount(
        connectorList.total_count || 
        connectorList.count || 
        connectorList.size || 
        connectorsData.length
      )
      
    } catch (error) {
      const errorMessage = error instanceof ConnectorApiError 
        ? error.message 
        : 'Error al cargar los conectores'
      
      setError(errorMessage)
      console.error('Error listing connectors:', error)
    } finally {
      setIsLoading(false)
    }
  }, [makeApiRequest])

  // Refresh connectors
  const refreshConnectors = useCallback(async (): Promise<void> => {
    await listConnectors()
  }, [listConnectors])

  // FIX: Get active connectors con manejo seguro de disabled
  const getActiveConnectors = useCallback((): Connector[] => {
    return connectors.filter(c => {
      // Manejar disabled como opcional con valor por defecto false
      const isDisabled = c.disabled ?? false
      return !isDisabled && c.status !== 'inactive'
    })
  }, [connectors])

  // Get connectors by type
  const getConnectorsByType = useCallback((type: string): Connector[] => {
    return connectors.filter(c => c.connector_type === type)
  }, [connectors])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load connectors on mount if authenticated
  useEffect(() => {
    if (authState?.isAuthenticated && authState?.merchantId && authState?.profileId) {
      listConnectors()
    }
  }, [authState?.isAuthenticated, authState?.merchantId, authState?.profileId, listConnectors])

  return {
    // State
    connectors,
    isLoading,
    error,
    totalCount,
    
    // Actions
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
  }
}

// Hook adicional para obtener información de conectores soportados
export function useSupportedConnectors() {
  return {
    supportedConnectors: SUPPORTED_CONNECTORS,
    isConnectorSupported: (connectorName: string): boolean => {
      return connectorName in SUPPORTED_CONNECTORS
    },
    getConnectorInfo: (connectorName: string): SupportedConnectorInfo | undefined => {
      return SUPPORTED_CONNECTORS[connectorName]
    },
    getConnectorDisplayName: (connectorName: string): string => {
      const info = SUPPORTED_CONNECTORS[connectorName]
      return info?.name || connectorName.charAt(0).toUpperCase() + connectorName.slice(1)
    },
    getConnectorsByTier: (tier: ConnectorTier) => {
      return Object.entries(SUPPORTED_CONNECTORS)
        .filter(([_, info]) => info.tier === tier)
        .map(([key, info]) => ({ key, ...info }))
    },
    getConnectorsByRegion: (region: string) => {
      return Object.entries(SUPPORTED_CONNECTORS)
        .filter(([_, info]) => info.regions.includes(region))
        .map(([key, info]) => ({ key, ...info }))
    },
  }
}