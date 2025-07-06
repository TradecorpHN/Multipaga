import { z } from 'zod'
import { PaymentMethodType } from './Payment'

// Connector Status Enum
export enum ConnectorStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

// Connector Type Enum
export enum ConnectorType {
  PAYMENT_PROCESSOR = 'payment_processor',
  PAYMENT_VAS = 'payment_vas',
  PAYMENT_METHOD_AUTH = 'payment_method_auth',
  AUTHENTICATION_PROCESSOR = 'authentication_processor',
  PAYOUT_PROCESSOR = 'payout_processor',
  FRAUD_CHECK = 'fraud_check',
}

// Supported Connectors
export enum ConnectorName {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ADYEN = 'adyen',
  CHECKOUT = 'checkout',
  PAYEEZY = 'payeezy',
  BRAINTREE = 'braintree',
  KLARNA = 'klarna',
  WORLDPAY = 'worldpay',
  MULTISAFEPAY = 'multisafepay',
  BLUESNAP = 'bluesnap',
  NUVEI = 'nuvei',
  PAYU = 'payu',
  TRUSTPAY = 'trustpay',
  CYBERSOURCE = 'cybersource',
  SHIFT4 = 'shift4',
  RAPYD = 'rapyd',
  FISERV = 'fiserv',
  HELCIM = 'helcim',
  IATAPAY = 'iatapay',
  GLOBALPAY = 'globalpay',
  WORLDLINE = 'worldline',
  STAX = 'stax',
  NETNAXEPT = 'netnaxept',
  NMI = 'nmi',
  PAYONE = 'payone',
  WISE = 'wise',
  TSYS = 'tsys',
}

// Payment Method Schema
export const PaymentMethodSchema = z.object({
  payment_method: z.nativeEnum(PaymentMethodType),
  payment_method_types: z.array(z.object({
    payment_method_type: z.string(),
    payment_experience: z.array(z.string()).optional(),
    card_networks: z.array(z.string()).optional(),
    banks: z.array(z.string()).optional(),
    currencies: z.array(z.string()).optional(),
  })),
})

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

// Connector Account Schema
export const ConnectorAccountSchema = z.object({
  merchant_connector_id: z.string(),
  connector_type: z.nativeEnum(ConnectorType),
  connector_name: z.string(),
  connector_label: z.string().optional(),
  connector_account_details: z.record(z.string(), z.any()),
  test_mode: z.boolean().optional(),
  disabled: z.boolean().optional(),
  payment_methods_enabled: z.array(PaymentMethodSchema).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
  status: z.nativeEnum(ConnectorStatus),
  created_at: z.string().datetime().optional(),
  modified_at: z.string().datetime().optional(),
  profile_id: z.string().optional(),
})

export type ConnectorAccount = z.infer<typeof ConnectorAccountSchema>

// Connector Response Schema (from list endpoint)
export const ConnectorResponseSchema = z.object({
  connector: z.nativeEnum(ConnectorName),
  connector_label: z.string().optional(),
})

export type ConnectorResponse = z.infer<typeof ConnectorResponseSchema>

// Connector Features Schema
export const ConnectorFeatureSchema = z.object({
  connector_name: z.string(),
  features: z.object({
    payments: z.object({
      supported: z.boolean(),
      payment_methods: z.array(PaymentMethodSchema).optional(),
    }).optional(),
    refunds: z.object({
      supported: z.boolean(),
      instant_refund: z.boolean().optional(),
      refund_reasons: z.array(z.string()).optional(),
    }).optional(),
    disputes: z.object({
      supported: z.boolean(),
      webhook_support: z.boolean().optional(),
    }).optional(),
    mandates: z.object({
      supported: z.boolean(),
      recurring_payments: z.boolean().optional(),
    }).optional(),
  }),
})

export type ConnectorFeature = z.infer<typeof ConnectorFeatureSchema>

// Helper functions
export class ConnectorEntity {
  static getLogoPath(connectorName: string): string {
    return `/resources/connectors/${connectorName.toUpperCase()}.svg`
  }

  static getDisplayName(connectorName: string): string {
    const displayNames: Record<string, string> = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      adyen: 'Adyen',
      checkout: 'Checkout.com',
      payeezy: 'Payeezy',
      braintree: 'Braintree',
      klarna: 'Klarna',
      worldpay: 'Worldpay',
      multisafepay: 'MultiSafepay',
      bluesnap: 'BlueSnap',
      nuvei: 'Nuvei',
      payu: 'PayU',
      trustpay: 'TrustPay',
      cybersource: 'Cybersource',
      shift4: 'Shift4',
      rapyd: 'Rapyd',
      fiserv: 'Fiserv',
      helcim: 'Helcim',
      iatapay: 'IATAPay',
      globalpay: 'GlobalPay',
      worldline: 'Worldline',
      stax: 'Stax',
      netnaxept: 'Nets/Nexept',
      nmi: 'NMI',
      payone: 'Payone',
      wise: 'Wise',
      tsys: 'TSYS',
    }
    
    return displayNames[connectorName.toLowerCase()] || connectorName
  }

  static isActive(connector: ConnectorAccount): boolean {
    return connector.status === ConnectorStatus.ACTIVE && !connector.disabled
  }

  static getSupportedPaymentMethods(connector: ConnectorAccount): string[] {
    if (!connector.payment_methods_enabled) return []
    
    const methods = new Set<string>()
    connector.payment_methods_enabled.forEach(pm => {
      methods.add(pm.payment_method)
      pm.payment_method_types?.forEach(pmt => {
        methods.add(pmt.payment_method_type)
      })
    })
    
    return Array.from(methods)
  }

  static getConnectorTypeLabel(type: ConnectorType): string {
    const labels: Record<ConnectorType, string> = {
      [ConnectorType.PAYMENT_PROCESSOR]: 'Payment Processor',
      [ConnectorType.PAYMENT_VAS]: 'Value Added Service',
      [ConnectorType.PAYMENT_METHOD_AUTH]: 'Payment Method Auth',
      [ConnectorType.AUTHENTICATION_PROCESSOR]: 'Authentication',
      [ConnectorType.PAYOUT_PROCESSOR]: 'Payout Processor',
      [ConnectorType.FRAUD_CHECK]: 'Fraud Check',
    }
    
    return labels[type] || type
  }

  static getConnectorTypeColor(type: ConnectorType): string {
    const colors: Record<ConnectorType, string> = {
      [ConnectorType.PAYMENT_PROCESSOR]: 'purple',
      [ConnectorType.PAYMENT_VAS]: 'blue',
      [ConnectorType.PAYMENT_METHOD_AUTH]: 'green',
      [ConnectorType.AUTHENTICATION_PROCESSOR]: 'yellow',
      [ConnectorType.PAYOUT_PROCESSOR]: 'cyan',
      [ConnectorType.FRAUD_CHECK]: 'red',
    }
    
    return colors[type] || 'gray'
  }

  static groupConnectorsByType(connectors: ConnectorAccount[]): Record<ConnectorType, ConnectorAccount[]> {
    return connectors.reduce((groups, connector) => {
      const type = connector.connector_type
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(connector)
      return groups
    }, {} as Record<ConnectorType, ConnectorAccount[]>)
  }
}