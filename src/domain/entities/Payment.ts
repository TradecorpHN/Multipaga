import { z } from 'zod'

// Payment Status Enum
export enum PaymentStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  CANCELLED = 'cancelled',
  PROCESSING_PAYMENT = 'processing_payment',
  REQUIRES_CAPTURE = 'requires_capture',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  VOIDED = 'voided',
  CAPTURE_INITIATED = 'capture_initiated',
  CAPTURE_FAILED = 'capture_failed',
  PARTIALLY_CAPTURED = 'partially_captured',
}

// Payment Method Type Enum
export enum PaymentMethodType {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  PAY_LATER = 'pay_later',
  BANK_REDIRECT = 'bank_redirect',
  CRYPTO = 'crypto',
  BANK_DEBIT = 'bank_debit',
  REWARD = 'reward',
  REAL_TIME_PAYMENT = 'real_time_payment',
  UPI = 'upi',
  VOUCHER = 'voucher',
  GIFT_CARD = 'gift_card',
  CARD_REDIRECT = 'card_redirect',
}

// Capture Method Enum
export enum CaptureMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  MANUAL_MULTIPLE = 'manual_multiple',
  SCHEDULED = 'scheduled',
}

// Payment Schema
export const PaymentSchema = z.object({
  payment_id: z.string(),
  merchant_id: z.string(),
  status: z.nativeEnum(PaymentStatus),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  amount_captured: z.number().int().optional(),
  customer_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  return_url: z.string().url().optional().nullable(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional().nullable(),
  payment_method: z.nativeEnum(PaymentMethodType).optional().nullable(),
  payment_method_data: z.any().optional().nullable(),
  capture_method: z.nativeEnum(CaptureMethod).optional(),
  authentication_type: z.enum(['no_three_ds', 'three_ds']).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  last_synced_at: z.string().datetime().optional(),
  reference_id: z.string().optional().nullable(),
  business_label: z.string().optional().nullable(),
  business_sub_label: z.string().optional().nullable(),
  allowed_payment_method_types: z.array(z.nativeEnum(PaymentMethodType)).optional(),
  connector: z.string().optional().nullable(),
  statement_descriptor_name: z.string().optional().nullable(),
  statement_descriptor_suffix: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  profile_id: z.string().optional().nullable(),
  attempt_count: z.number().int().optional(),
  merchant_decision: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
  payment_token: z.string().optional().nullable(),
  connector_transaction_id: z.string().optional().nullable(),
  capture_on: z.string().datetime().optional().nullable(),
  confirm: z.boolean().optional(),
  client_secret: z.string().optional().nullable(),
  mandate_id: z.string().optional().nullable(),
  browser_info: z.any().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  shipping: z.any().optional().nullable(),
  billing: z.any().optional().nullable(),
})

export type Payment = z.infer<typeof PaymentSchema>

// Payment Create Request Schema
export const PaymentCreateRequestSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  capture_method: z.nativeEnum(CaptureMethod).optional(),
  amount_to_capture: z.number().int().positive().optional(),
  confirm: z.boolean().optional(),
  customer_id: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  return_url: z.string().url().optional(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  payment_method: z.nativeEnum(PaymentMethodType).optional(),
  payment_method_data: z.any().optional(),
  billing: z.any().optional(),
  shipping: z.any().optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  routing: z.any().optional(),
  authentication_type: z.enum(['no_three_ds', 'three_ds']).optional(),
  mandate_id: z.string().optional(),
  browser_info: z.any().optional(),
  payment_id: z.string().length(30).optional(),
  merchant_id: z.string().optional(),
  profile_id: z.string().optional(),
})

export type PaymentCreateRequest = z.infer<typeof PaymentCreateRequestSchema>

// Payment Update Request Schema
export const PaymentUpdateRequestSchema = PaymentCreateRequestSchema.partial()

export type PaymentUpdateRequest = z.infer<typeof PaymentUpdateRequestSchema>

// Payment Capture Request Schema
export const PaymentCaptureRequestSchema = z.object({
  amount_to_capture: z.number().int().positive().optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type PaymentCaptureRequest = z.infer<typeof PaymentCaptureRequestSchema>

// Payment List Request Schema
export const PaymentListRequestSchema = z.object({
  customer_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  status: z.array(z.nativeEnum(PaymentStatus)).optional(),
  payment_method: z.array(z.nativeEnum(PaymentMethodType)).optional(),
  time_range: z.object({
    start_time: z.string().datetime(),
    end_time: z.string().datetime().optional(),
  }).optional(),
})

export type PaymentListRequest = z.infer<typeof PaymentListRequestSchema>

// Payment List Response Schema
export const PaymentListResponseSchema = z.object({
  count: z.number().int(),
  total_count: z.number().int(),
  data: z.array(PaymentSchema),
})

export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>

// Helper functions
export class PaymentEntity {
  static isSuccessful(payment: Payment): boolean {
    return payment.status === PaymentStatus.SUCCEEDED
  }

  static isPending(payment: Payment): boolean {
    return [
      PaymentStatus.PROCESSING,
      PaymentStatus.REQUIRES_PAYMENT_METHOD,
      PaymentStatus.REQUIRES_CONFIRMATION,
      PaymentStatus.REQUIRES_ACTION,
      PaymentStatus.PROCESSING_PAYMENT,
      PaymentStatus.REQUIRES_CAPTURE,
    ].includes(payment.status)
  }

  static isFailed(payment: Payment): boolean {
    return [
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.VOIDED,
      PaymentStatus.CAPTURE_FAILED,
    ].includes(payment.status)
  }

  static canBeCaptured(payment: Payment): boolean {
    return payment.status === PaymentStatus.REQUIRES_CAPTURE
  }

  static canBeCancelled(payment: Payment): boolean {
    return this.isPending(payment) || payment.status === PaymentStatus.REQUIRES_CAPTURE
  }

  static canBeRefunded(payment: Payment): boolean {
    return payment.status === PaymentStatus.SUCCEEDED || 
           payment.status === PaymentStatus.PARTIALLY_CAPTURED
  }

  static getStatusColor(status: PaymentStatus): 'green' | 'yellow' | 'red' | 'gray' {
    if (status === PaymentStatus.SUCCEEDED) return 'green'
    if (this.isPending({ status } as Payment)) return 'yellow'
    if (this.isFailed({ status } as Payment)) return 'red'
    return 'gray'
  }

  static formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100)
  }
}