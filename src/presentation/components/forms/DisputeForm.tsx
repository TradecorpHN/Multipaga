// ==============================================================================
// refund.schema.ts - Esquemas de validación para reembolsos
// ==============================================================================

// /home/kali/multipaga/src/presentation/components/forms/validation/refund.schema.ts
import { z } from 'zod'
import { REGEX_PATTERNS } from '@/presentation/lib/constants'

/**
 * Esquema de validación para crear un reembolso
 */
export const createRefundSchema = z.object({
  payment_id: z
    .string()
    .min(1, 'Payment ID is required')
    .regex(REGEX_PATTERNS.PAYMENT_ID, 'Invalid payment ID format')
    .trim(),
  
  amount: z
    .number()
    .min(1, 'Amount must be at least 1 cent')
    .max(999999999, 'Amount cannot exceed $9,999,999.99')
    .or(z.string().regex(/^\d+$/, 'Amount must be a valid number').transform(Number))
    .refine(val => val > 0, 'Amount must be greater than 0'),
  
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .toUpperCase()
    .refine(currency => 
      ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RSD', 'MKD', 'BAM', 'ALL', 'TRY', 'UAH', 'BYN', 'RUB', 'KZT', 'UZS', 'KGS', 'TJS', 'AZN', 'GEL', 'AMD', 'TMT', 'AFN', 'PKR', 'INR', 'NPR', 'LKR', 'BDT', 'BTN', 'MVR', 'MMK', 'LAK', 'KHR', 'VND', 'THB', 'IDR', 'PHP', 'MYR', 'SGD', 'BND', 'CNY', 'HKD', 'MOP', 'TWD', 'KRW', 'MNT', 'KPW'].includes(currency),
      'Unsupported currency'
    ),
  
  reason: z
    .enum([
      'duplicate',
      'fraudulent', 
      'requested_by_customer',
      'seller_error',
      'product_not_received',
      'product_unacceptable',
      'processing_error',
      'credit_not_processed',
      'general',
      'merchant_decision'
    ])
    .default('requested_by_customer'),
  
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .refine(metadata => {
      if (!metadata) return true
      const keys = Object.keys(metadata)
      return keys.length <= 50 && keys.every(key => key.length <= 40)
    }, 'Metadata can have max 50 keys, each key max 40 characters'),
  
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  merchant_refund_id: z
    .string()
    .max(128, 'Merchant refund ID cannot exceed 128 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
})

/**
 * Esquema de validación para búsqueda/filtrado de reembolsos
 */
export const refundFiltersSchema = z.object({
  payment_id: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  refund_id: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  status: z
    .array(z.enum([
      'succeeded',
      'failed', 
      'pending',
      'cancelled',
      'requires_merchant_action',
      'manual_review'
    ]))
    .optional()
    .nullable(),
  
  currency: z
    .array(z.string().length(3))
    .optional()
    .nullable(),
  
  amount_gte: z
    .number()
    .min(0, 'Minimum amount must be 0 or greater')
    .optional()
    .nullable(),
  
  amount_lte: z
    .number()
    .min(0, 'Maximum amount must be 0 or greater')
    .optional()
    .nullable(),
  
  reason: z
    .array(z.enum([
      'duplicate',
      'fraudulent',
      'requested_by_customer',
      'seller_error',
      'product_not_received',
      'product_unacceptable',
      'processing_error',
      'credit_not_processed',
      'general',
      'merchant_decision'
    ]))
    .optional()
    .nullable(),
  
  created_gte: z
    .date()
    .optional()
    .nullable(),
  
  created_lte: z
    .date()
    .optional()
    .nullable(),
  
  search: z
    .string()
    .max(200, 'Search term cannot exceed 200 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  
  offset: z
    .number()
    .min(0, 'Offset must be 0 or greater')
    .default(0),
}).refine(data => {
  if (data.amount_gte !== null && data.amount_lte !== null) {
    return data.amount_gte <= data.amount_lte
  }
  return true
}, {
  message: 'Minimum amount must be less than or equal to maximum amount',
  path: ['amount_gte']
}).refine(data => {
  if (data.created_gte && data.created_lte) {
    return data.created_gte <= data.created_lte
  }
  return true
}, {
  message: 'Start date must be before or equal to end date',
  path: ['created_gte']
})

/**
 * Esquema de validación para actualizar un reembolso
 */
export const updateRefundSchema = z.object({
  refund_id: z
    .string()
    .min(1, 'Refund ID is required')
    .regex(REGEX_PATTERNS.REFUND_ID, 'Invalid refund ID format'),
  
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .refine(metadata => {
      if (!metadata) return true
      const keys = Object.keys(metadata)
      return keys.length <= 50 && keys.every(key => key.length <= 40)
    }, 'Metadata can have max 50 keys, each key max 40 characters'),
  
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
})

/**
 * Esquema de validación para reembolso masivo
 */
export const bulkRefundSchema = z.object({
  payment_ids: z
    .array(z.string().regex(REGEX_PATTERNS.PAYMENT_ID, 'Invalid payment ID format'))
    .min(1, 'At least one payment ID is required')
    .max(100, 'Cannot process more than 100 refunds at once'),
  
  reason: z
    .enum([
      'duplicate',
      'fraudulent',
      'requested_by_customer', 
      'seller_error',
      'product_not_received',
      'product_unacceptable',
      'processing_error',
      'credit_not_processed',
      'general',
      'merchant_decision'
    ])
    .default('merchant_decision'),
  
  refund_type: z
    .enum(['full', 'partial'])
    .default('full'),
  
  partial_amount: z
    .number()
    .min(1, 'Partial amount must be at least 1 cent')
    .optional()
    .nullable(),
  
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .nullable(),
  
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
}).refine(data => {
  if (data.refund_type === 'partial') {
    return data.partial_amount !== null && data.partial_amount !== undefined
  }
  return true
}, {
  message: 'Partial amount is required for partial refunds',
  path: ['partial_amount']
})

/**
 * Esquema de validación para configuración de reembolsos automáticos
 */
export const autoRefundConfigSchema = z.object({
  enabled: z.boolean().default(false),
  
  triggers: z.object({
    failed_payments: z.boolean().default(false),
    duplicate_payments: z.boolean().default(false),
    disputed_payments: z.boolean().default(false),
    cancelled_orders: z.boolean().default(false),
  }).default({}),
  
  conditions: z.object({
    max_amount: z
      .number()
      .min(0, 'Maximum amount must be 0 or greater')
      .max(999999999, 'Maximum amount cannot exceed $9,999,999.99')
      .optional()
      .nullable(),
    
    min_amount: z
      .number()
      .min(0, 'Minimum amount must be 0 or greater')
      .optional()
      .nullable(),
    
    age_limit_hours: z
      .number()
      .min(1, 'Age limit must be at least 1 hour')
      .max(8760, 'Age limit cannot exceed 1 year')
      .default(24),
    
    allowed_currencies: z
      .array(z.string().length(3))
      .min(1, 'At least one currency must be allowed')
      .default(['USD']),
  }).default({}),
  
  notifications: z.object({
    email_alerts: z.boolean().default(true),
    webhook_notifications: z.boolean().default(true),
    slack_notifications: z.boolean().default(false),
  }).default({}),
  
  approval: z.object({
    require_manual_approval: z.boolean().default(true),
    auto_approve_under_amount: z
      .number()
      .min(0, 'Auto-approve amount must be 0 or greater')
      .max(10000, 'Auto-approve amount cannot exceed $100.00')
      .default(1000), // $10.00 in cents
    
    approval_timeout_hours: z
      .number()
      .min(1, 'Approval timeout must be at least 1 hour')
      .max(168, 'Approval timeout cannot exceed 1 week')
      .default(24),
  }).default({}),
}).refine(data => {
  if (data.conditions.min_amount !== null && data.conditions.max_amount !== null) {
    return data.conditions.min_amount <= data.conditions.max_amount
  }
  return true
}, {
  message: 'Minimum amount must be less than or equal to maximum amount',
  path: ['conditions', 'min_amount']
})

// Tipos TypeScript inferidos de los esquemas
export type CreateRefundFormData = z.infer<typeof createRefundSchema>
export type RefundFiltersFormData = z.infer<typeof refundFiltersSchema>
export type UpdateRefundFormData = z.infer<typeof updateRefundSchema>
export type BulkRefundFormData = z.infer<typeof bulkRefundSchema>
export type AutoRefundConfigFormData = z.infer<typeof autoRefundConfigSchema>

// Valores por defecto para formularios
export const DEFAULT_CREATE_REFUND_VALUES: CreateRefundFormData = {
  payment_id: '',
  amount: 0,
  currency: 'USD',
  reason: 'requested_by_customer',
  metadata: null,
  notes: null,
  merchant_refund_id: null,
}

export const DEFAULT_REFUND_FILTERS_VALUES: RefundFiltersFormData = {
  payment_id: null,
  refund_id: null,
  status: null,
  currency: null,
  amount_gte: null,
  amount_lte: null,
  reason: null,
  created_gte: null,
  created_lte: null,
  search: null,
  limit: 20,
  offset: 0,
}

export const DEFAULT_BULK_REFUND_VALUES: BulkRefundFormData = {
  payment_ids: [],
  reason: 'merchant_decision',
  refund_type: 'full',
  partial_amount: null,
  metadata: null,
  notes: null,
}

export const DEFAULT_AUTO_REFUND_CONFIG_VALUES: AutoRefundConfigFormData = {
  enabled: false,
  triggers: {
    failed_payments: false,
    duplicate_payments: false,
    disputed_payments: false,
    cancelled_orders: false,
  },
  conditions: {
    max_amount: null,
    min_amount: null,
    age_limit_hours: 24,
    allowed_currencies: ['USD'],
  },
  notifications: {
    email_alerts: true,
    webhook_notifications: true,
    slack_notifications: false,
  },
  approval: {
    require_manual_approval: true,
    auto_approve_under_amount: 1000,
    approval_timeout_hours: 24,
  },
}

// Funciones de validación adicionales
export const validateRefundAmount = (amount: number, maxAmount: number): boolean => {
  return amount > 0 && amount <= maxAmount
}

export const validateCurrency = (currency: string): boolean => {
  const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']
  return supportedCurrencies.includes(currency.toUpperCase())
}

export const validatePaymentIdFormat = (paymentId: string): boolean => {
  return REGEX_PATTERNS.PAYMENT_ID.test(paymentId)
}

export const formatRefundReason = (reason: string): string => {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Mapeo de razones de reembolso a descripciones
export const REFUND_REASON_DESCRIPTIONS = {
  duplicate: 'Payment was processed more than once',
  fraudulent: 'Payment was fraudulent',
  requested_by_customer: 'Customer requested a refund',
  seller_error: 'Merchant made an error',
  product_not_received: 'Customer did not receive the product',
  product_unacceptable: 'Product was not as described',
  processing_error: 'Error during payment processing',
  credit_not_processed: 'Credit was not processed correctly',
  general: 'General refund reason',
  merchant_decision: 'Merchant decided to issue refund',
} as const

// Configuración de estados de reembolso
export const REFUND_STATUS_CONFIG = {
  succeeded: {
    label: 'Succeeded',
    variant: 'success' as const,
    description: 'Refund was successfully processed'
  },
  failed: {
    label: 'Failed', 
    variant: 'destructive' as const,
    description: 'Refund processing failed'
  },
  pending: {
    label: 'Pending',
    variant: 'warning' as const,
    description: 'Refund is being processed'
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary' as const,
    description: 'Refund was cancelled'
  },
  requires_merchant_action: {
    label: 'Requires Action',
    variant: 'warning' as const,
    description: 'Merchant action required'
  },
  manual_review: {
    label: 'Manual Review',
    variant: 'warning' as const,
    description: 'Refund requires manual review'
  },
} 