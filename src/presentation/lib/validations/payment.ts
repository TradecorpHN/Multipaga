import { z } from 'zod'

// Common schemas
export const currencySchema = z.string().length(3).toUpperCase()
export const amountSchema = z.number().int().positive()
export const emailSchema = z.string().email().max(255)
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/)

// Address schema
export const addressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().length(2).optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

// Customer details schema
export const customerDetailsSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().max(255).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  phone_country_code: z.string().max(10).optional(),
})

// Payment method data schemas
export const cardSchema = z.object({
  card_number: z.string().regex(/^\d{13,19}$/),
  card_exp_month: z.string().regex(/^(0[1-9]|1[0-2])$/),
  card_exp_year: z.string().regex(/^\d{2,4}$/),
  card_holder_name: z.string().max(255).optional(),
  card_cvc: z.string().regex(/^\d{3,4}$/),
  card_issuer: z.string().optional(),
  card_network: z.string().optional(),
})

export const bankTransferSchema = z.object({
  bank_name: z.string(),
  bank_country_code: z.string().length(2),
  bank_city: z.string().optional(),
  bank_branch: z.string().optional(),
  ach: z.object({
    account_number: z.string(),
    routing_number: z.string(),
    account_holder_name: z.string(),
    account_type: z.enum(['checking', 'savings']),
  }).optional(),
  sepa: z.object({
    iban: z.string(),
    bic: z.string().optional(),
    account_holder_name: z.string(),
  }).optional(),
})

export const walletSchema = z.object({
  type: z.enum(['apple_pay', 'google_pay', 'paypal', 'venmo', 'cashapp', 'alipay', 'wechat_pay']),
  token: z.string().optional(),
  redirect_data: z.any().optional(),
})

// Payment create request schema
export const paymentCreateSchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
  capture_method: z.enum(['automatic', 'manual', 'manual_multiple']).optional(),
  capture_on: z.string().datetime().optional(),
  confirm: z.boolean().optional(),
  customer: customerDetailsSchema.optional(),
  customer_id: z.string().max(64).optional(),
  description: z.string().max(255).optional(),
  return_url: z.string().url().max(2048).optional(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  payment_method_data: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('card'),
      card: cardSchema,
    }),
    z.object({
      type: z.literal('bank_transfer'),
      bank_transfer: bankTransferSchema,
    }),
    z.object({
      type: z.literal('wallet'),
      wallet: walletSchema,
    }),
  ]).optional(),
  payment_method: z.enum([
    'card',
    'card_redirect',
    'pay_later',
    'wallet',
    'bank_redirect',
    'bank_transfer',
    'crypto',
    'bank_debit',
    'reward',
    'upi',
    'voucher',
    'gift_card',
    'open_banking',
  ]).optional(),
  payment_token: z.string().optional(),
  billing: z.object({
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  }).optional(),
  shipping: z.object({
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  }).optional(),
  statement_descriptor_name: z.string().max(255).optional(),
  statement_descriptor_suffix: z.string().max(255).optional(),
  metadata: z.record(z.any()).optional(),
  routing: z.object({
    type: z.enum(['single', 'split', 'priority']),
    data: z.array(z.string()),
  }).optional(),
  authentication_type: z.enum(['no_three_ds', 'three_ds']).optional(),
  mandate_id: z.string().max(255).optional(),
  browser_info: z.object({
    user_agent: z.string().optional(),
    accept_header: z.string().optional(),
    language: z.string().optional(),
    color_depth: z.number().optional(),
    screen_height: z.number().optional(),
    screen_width: z.number().optional(),
    time_zone: z.number().optional(),
    java_enabled: z.boolean().optional(),
    java_script_enabled: z.boolean().optional(),
    ip_address: z.string().optional(),
  }).optional(),
})

// Payment update request schema
export const paymentUpdateSchema = z.object({
  amount: amountSchema.optional(),
  currency: currencySchema.optional(),
  confirm: z.boolean().optional(),
  capture_method: z.enum(['automatic', 'manual', 'manual_multiple']).optional(),
  description: z.string().max(255).optional(),
  return_url: z.string().url().max(2048).optional(),
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  payment_method_data: z.any().optional(),
  payment_token: z.string().optional(),
  billing: z.object({
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  }).optional(),
  shipping: z.object({
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  }).optional(),
  statement_descriptor_name: z.string().max(255).optional(),
  statement_descriptor_suffix: z.string().max(255).optional(),
  metadata: z.record(z.any()).optional(),
})

// Payment capture request schema
export const paymentCaptureSchema = z.object({
  amount_to_capture: amountSchema.optional(),
  statement_descriptor_suffix: z.string().max(255).optional(),
})

// Payment cancel request schema
export const paymentCancelSchema = z.object({
  cancellation_reason: z.string().max(255),
})

// Payment list request schema
export const paymentListSchema = z.object({
  customer_id: z.string().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  created: z.object({
    gt: z.string().datetime().optional(),
    gte: z.string().datetime().optional(),
    lt: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
  }).optional(),
  created_date: z.string().optional(),
  currency: currencySchema.optional(),
  status: z.array(z.enum([
    'succeeded',
    'failed',
    'cancelled',
    'processing',
    'requires_action',
    'requires_confirmation',
    'requires_payment_method',
    'requires_capture',
  ])).optional(),
  payment_method: z.array(z.string()).optional(),
  payment_method_type: z.array(z.string()).optional(),
  connector: z.array(z.string()).optional(),
})

// Form validation schemas (with user-friendly error messages)
export const paymentFormSchema = z.object({
  amount: z.string()
    .min(1, 'Amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .transform(val => Math.round(parseFloat(val) * 100)),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().max(255, 'Description too long').optional(),
  customer_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  customer_name: z.string().max(255, 'Name too long').optional(),
  capture_method: z.enum(['automatic', 'manual'], {
    errorMap: () => ({ message: 'Invalid capture method' })
  }),
  statement_descriptor: z.string()
    .max(22, 'Statement descriptor must be 22 characters or less')
    .regex(/^[a-zA-Z0-9\s]*$/, 'Only letters, numbers, and spaces allowed')
    .optional(),
  metadata: z.record(z.string()).optional(),
})