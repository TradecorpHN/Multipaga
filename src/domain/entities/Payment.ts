import { z } from 'zod'
import { AddressSchema } from './Address'
import { CustomerSchema } from './Customer'
import { RefundResponseSchema } from './Refund'
import { DisputeResponseSchema } from './Dispute'

// Payment status enum
export enum PaymentStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PROCESSING = 'processing',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CAPTURE = 'requires_capture',
}

// Capture method enum
export enum CaptureMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  MANUAL_MULTIPLE = 'manual_multiple',
}

// Payment method enum
export enum PaymentMethod {
  CARD = 'card',
  CARD_REDIRECT = 'card_redirect',
  PAY_LATER = 'pay_later',
  WALLET = 'wallet',
  BANK_REDIRECT = 'bank_redirect',
  BANK_TRANSFER = 'bank_transfer',
  CRYPTO = 'crypto',
  BANK_DEBIT = 'bank_debit',
  REWARD = 'reward',
  UPI = 'upi',
  VOUCHER = 'voucher',
  GIFT_CARD = 'gift_card',
  OPEN_BANKING = 'open_banking',
}

// Payment attempt schema
export const PaymentAttemptSchema = z.object({
  attempt_id: z.string(),
  status: z.nativeEnum(PaymentStatus),
  amount: z.number(),
  currency: z.string(),
  connector: z.string().nullable(),
  error_message: z.string().nullable(),
  error_code: z.string().nullable(),
  payment_method: z.nativeEnum(PaymentMethod).nullable(),
  connector_transaction_id: z.string().nullable(),
  authentication_type: z.string().nullable(),
  created_at: z.string(),
  modified_at: z.string(),
})

// Capture response schema
export const CaptureResponseSchema = z.object({
  capture_id: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  connector: z.string(),
  authorized_attempt_id: z.string(),
  connector_capture_id: z.string().nullable(),
  capture_sequence: z.number(),
  error_message: z.string().nullable(),
  error_code: z.string().nullable(),
  error_reason: z.string().nullable(),
  reference_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

// Payment method data schema
export const PaymentMethodDataSchema = z.object({
  card: z.object({
    last4: z.string(),
    card_type: z.string().optional(),
    card_network: z.string().optional(),
    card_issuer: z.string().optional(),
    card_exp_month: z.string().optional(),
    card_exp_year: z.string().optional(),
    card_holder_name: z.string().optional(),
  }).optional(),
  bank_transfer: z.object({
    bank_name: z.string().optional(),
    bank_country_code: z.string().optional(),
    bank_city: z.string().optional(),
  }).optional(),
  wallet: z.object({
    type: z.string(),
    provider: z.string().optional(),
  }).optional(),
})

// Payment schema
export const PaymentSchema = z.object({
  payment_id: z.string(),
  merchant_id: z.string(),
  status: z.nativeEnum(PaymentStatus),
  amount: z.number(),
  net_amount: z.number(),
  amount_capturable: z.number().optional(),
  amount_received: z.number().nullable(),
  currency: z.string(),
  connector: z.string().nullable(),
  client_secret: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  capture_on: z.string().nullable(),
  capture_method: z.nativeEnum(CaptureMethod).nullable(),
  confirm: z.boolean(),
  customer_id: z.string().nullable(),
  customer: CustomerSchema.nullable(),
  description: z.string().nullable(),
  return_url: z.string().nullable(),
  setup_future_usage: z.enum(['on_session', 'off_session']).nullable(),
  off_session: z.boolean().nullable(),
  payment_method: z.nativeEnum(PaymentMethod).nullable(),
  payment_method_data: PaymentMethodDataSchema.nullable(),
  payment_method_type: z.string().nullable(),
  payment_token: z.string().nullable(),
  billing: z.object({
    address: AddressSchema.nullable(),
    phone: z.object({
      number: z.string().nullable(),
      country_code: z.string().nullable(),
    }).nullable(),
    email: z.string().email().nullable(),
  }).nullable(),
  shipping: z.object({
    address: AddressSchema.nullable(),
    phone: z.object({
      number: z.string().nullable(),
      country_code: z.string().nullable(),
    }).nullable(),
    email: z.string().email().nullable(),
  }).nullable(),
  statement_descriptor_name: z.string().nullable(),
  statement_descriptor_suffix: z.string().nullable(),
  mandate_id: z.string().nullable(),
  mandate_data: z.any().nullable(),
  browser_info: z.any().nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  error_reason: z.string().nullable(),
  payment_experience: z.string().nullable(),
  payment_method_status: z.string().nullable(),
  connector_transaction_id: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  refunds: z.array(RefundResponseSchema).nullable(),
  disputes: z.array(DisputeResponseSchema).nullable(),
  attempts: z.array(PaymentAttemptSchema).nullable(),
  captures: z.array(CaptureResponseSchema).nullable(),
  authentication_type: z.string().nullable(),
  merchant_connector_id: z.string().nullable(),
  profile_id: z.string().nullable(),
  attempt_count: z.number(),
  merchant_decision: z.string().nullable(),
  merchant_order_reference_id: z.string().nullable(),
  incremental_authorization_allowed: z.boolean().nullable(),
  authorization_count: z.number().nullable(),
  session_expiry: z.string().nullable(),
  fingerprint: z.string().nullable(),
  payment_link: z.any().nullable(),
  external_authentication_details: z.any().nullable(),
  external_3ds_authentication_attempted: z.boolean().nullable(),
  expires_on: z.string().nullable(),
  frm_metadata: z.any().nullable(),
})

// Type exports
export type Payment = z.infer<typeof PaymentSchema>
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>
export type CaptureResponse = z.infer<typeof CaptureResponseSchema>
export type PaymentMethodData = z.infer<typeof PaymentMethodDataSchema>

// Request types
export interface PaymentCreateRequest {
  amount: number
  currency: string
  capture_method?: CaptureMethod
  capture_on?: string
  confirm?: boolean
  customer?: any
  customer_id?: string
  description?: string
  return_url?: string
  setup_future_usage?: 'on_session' | 'off_session'
  payment_method_data?: any
  payment_method?: PaymentMethod
  payment_token?: string
  billing?: any
  shipping?: any
  statement_descriptor_name?: string
  statement_descriptor_suffix?: string
  metadata?: Record<string, any>
  routing?: any
  authentication_type?: string
  mandate_id?: string
  browser_info?: any
  merchant_order_reference_id?: string
  off_session?: boolean
}

export interface PaymentUpdateRequest {
  amount?: number
  currency?: string
  confirm?: boolean
  capture_method?: CaptureMethod
  description?: string
  return_url?: string
  setup_future_usage?: 'on_session' | 'off_session'
  payment_method_data?: any
  payment_token?: string
  billing?: any
  shipping?: any
  statement_descriptor_name?: string
  statement_descriptor_suffix?: string
  metadata?: Record<string, any>
}

export interface PaymentCaptureRequest {
  amount_to_capture?: number
  statement_descriptor_suffix?: string
}

export interface PaymentCancelRequest {
  cancellation_reason: string
}

export interface PaymentListRequest {
  customer_id?: string
  starting_after?: string
  ending_before?: string
  limit?: number
  offset?: number
  created?: {
    gt?: string
    gte?: string
    lt?: string
    lte?: string
  }
  currency?: string
  status?: string[]
  payment_method?: string[]
  payment_method_type?: string[]
  connector?: string[]
}

// List response schema
export const PaymentListResponseSchema = z.object({
  count: z.number(),
  total_count: z.number(),
  data: z.array(PaymentSchema),
})

export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>