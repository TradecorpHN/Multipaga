import { z } from 'zod'

// Connector type enum
export enum ConnectorType {
  PAYMENT_PROCESSOR = 'payment_processor',
  PAYMENT_VAS = 'payment_vas',
  PAYMENT_METHOD_AUTH = 'payment_method_auth',
  AUTHENTICATION_PROCESSOR = 'authentication_processor',
  PAYOUT_PROCESSOR = 'payout_processor',
  FRAUD_CHECK = 'fraud_check',
}

// Connector status enum
export enum ConnectorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Payment method type schema
export const PaymentMethodTypeSchema = z.object({
  payment_method_type: z.string(),
  card_networks: z.array(z.string()).nullable(),
  required_fields: z.record(z.any()).nullable(),
  surcharge_details: z.any().nullable(),
  pm_auth_connector: z.string().nullable(),
})

// Payment methods enabled schema
export const PaymentMethodsEnabledSchema = z.object({
  payment_method: z.string(),
  payment_method_types: z.array(PaymentMethodTypeSchema).nullable(),
})

// Connector auth type schema
export const ConnectorAuthTypeSchema = z.discriminatedUnion('auth_type', [
  z.object({
    auth_type: z.literal('HeaderKey'),
    api_key: z.string(),
  }),
  z.object({
    auth_type: z.literal('BodyKey'),
    api_key: z.string(),
    key1: z.string(),
  }),
  z.object({
    auth_type: z.literal('SignatureKey'),
    api_key: z.string(),
    key1: z.string(),
    api_secret: z.string(),
  }),
  z.object({
    auth_type: z.literal('MultiAuthKey'),
    api_key: z.string(),
    key1: z.string(),
    api_secret: z.string(),
    key2: z.string(),
  }),
  z.object({
    auth_type: z.literal('CurrencyAuthKey'),
    auth_key_map: z.record(z.object({
      api_key: z.string(),
      api_secret: z.string(),
    })),
  }),
  z.object({
    auth_type: z.literal('TemporaryAuth'),
  }),
])

// Connector webhook details schema
export const ConnectorWebhookDetailsSchema = z.object({
  merchant_secret: z.string(),
})

// Frm configs schema
export const FrmConfigsSchema = z.object({
  gateway: z.string(),
  payment_methods: z.array(z.object({
    payment_method: z.string(),
    payment_method_types: z.array(z.object({
      payment_method_type: z.string(),
      card_networks: z.array(z.string()).nullable(),
      flow: z.string(),
      action: z.string(),
    })),
  })),
})

// Connector account schema
export const ConnectorAccountSchema = z.object({
  merchant_connector_id: z.string(),
  connector_type: z.nativeEnum(ConnectorType),
  connector_name: z.string(),
  connector_label: z.string().nullable(),
  connector_account_details: ConnectorAuthTypeSchema,
  test_mode: z.boolean().nullable(),
  disabled: z.boolean().nullable(),
  merchant_id: z.string(),
  payment_methods_enabled: z.array(PaymentMethodsEnabledSchema).nullable(),
  connector_webhook_details: ConnectorWebhookDetailsSchema.nullable(),
  metadata: z.record(z.any()).nullable(),
  frm_configs: z.array(FrmConfigsSchema).nullable(),
  status: z.nativeEnum(ConnectorStatus),
  created_at: z.string(),
  modified_at: z.string(),
  profile_id: z.string().nullable(),
  applepay_verified_domains: z.array(z.string()).nullable(),
  pm_auth_config: z.any().nullable(),
  additional_merchant_data: z.any().nullable(),
  connector_wallets_details: z.any().nullable(),
})

// Type exports
export type ConnectorAccount = z.infer<typeof ConnectorAccountSchema>
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>
export type PaymentMethodsEnabled = z.infer<typeof PaymentMethodsEnabledSchema>
export type ConnectorAuthType = z.infer<typeof ConnectorAuthTypeSchema>
export type ConnectorWebhookDetails = z.infer<typeof ConnectorWebhookDetailsSchema>
export type FrmConfigs = z.infer<typeof FrmConfigsSchema>

// Request types
export interface ConnectorCreateRequest {
  connector_type: ConnectorType
  connector_name: string
  connector_label?: string
  connector_account_details: any
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: PaymentMethodsEnabled[]
  connector_webhook_details?: ConnectorWebhookDetails
  metadata?: Record<string, any>
  frm_configs?: FrmConfigs[]
}

export interface ConnectorUpdateRequest {
  connector_type?: ConnectorType
  connector_label?: string
  connector_account_details?: any
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: PaymentMethodsEnabled[]
  connector_webhook_details?: ConnectorWebhookDetails
  metadata?: Record<string, any>
  frm_configs?: FrmConfigs[]
  status?: ConnectorStatus
}

// Utility class for connector operations
export class ConnectorEntity {
  // Check if connector is active and enabled
  static isActive(connector: ConnectorAccount): boolean {
    return connector.status === ConnectorStatus.ACTIVE && !connector.disabled
  }

  // Get supported payment methods
  static getSupportedPaymentMethods(connector: ConnectorAccount): string[] {
    if (!connector.payment_methods_enabled) return []
    
    return connector.payment_methods_enabled
      .map(pm => pm.payment_method)
      .filter((value, index, self) => self.indexOf(value) === index)
  }

  // Get supported payment method types for a payment method
  static getSupportedPaymentMethodTypes(
    connector: ConnectorAccount,
    paymentMethod: string
  ): PaymentMethodType[] {
    if (!connector.payment_methods_enabled) return []
    
    const pm = connector.payment_methods_enabled.find(
      p => p.payment_method === paymentMethod
    )
    
    return pm?.payment_method_types || []
  }

  // Check if connector supports a payment method
  static supportsPaymentMethod(
    connector: ConnectorAccount,
    paymentMethod: string
  ): boolean {
    return this.getSupportedPaymentMethods(connector).includes(paymentMethod)
  }

  // Get connector type label
  static getConnectorTypeLabel(type: ConnectorType): string {
    const labels: Record<ConnectorType, string> = {
      [ConnectorType.PAYMENT_PROCESSOR]: 'Payment Processor',
      [ConnectorType.PAYMENT_VAS]: 'Payment VAS',
      [ConnectorType.PAYMENT_METHOD_AUTH]: 'Payment Method Auth',
      [ConnectorType.AUTHENTICATION_PROCESSOR]: 'Authentication Processor',
      [ConnectorType.PAYOUT_PROCESSOR]: 'Payout Processor',
      [ConnectorType.FRAUD_CHECK]: 'Fraud Check',
    }
    return labels[type] || type
  }

  // Group connectors by type
  static groupConnectorsByType(
    connectors: ConnectorAccount[]
  ): Record<ConnectorType, ConnectorAccount[]> {
    return connectors.reduce((acc, connector) => {
      const type = connector.connector_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(connector)
      return acc
    }, {} as Record<ConnectorType, ConnectorAccount[]>)
  }

  // Filter active connectors
  static filterActive(connectors: ConnectorAccount[]): ConnectorAccount[] {
    return connectors.filter(connector => this.isActive(connector))
  }

  // Get connector display name
  static getDisplayName(connector: ConnectorAccount): string {
    return connector.connector_label || connector.connector_name
  }
}