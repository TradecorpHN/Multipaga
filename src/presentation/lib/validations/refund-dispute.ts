import { z } from 'zod'
import { amountSchema, currencySchema } from './payment'

// Refund schemas
export const refundCreateSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  amount: amountSchema.optional(),
  reason: z.string().max(1000).optional(),
  refund_type: z.enum(['instant', 'regular']).optional(),
  metadata: z.record(z.any()).optional(),
})

export const refundUpdateSchema = z.object({
  reason: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
})

export const refundListSchema = z.object({
  payment_id: z.string().optional(),
  refund_id: z.string().optional(),
  profile_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  currency: currencySchema.optional(),
  refund_status: z.array(z.enum([
    'succeeded',
    'failed',
    'pending',
    'review',
  ])).optional(),
  created: z.object({
    gt: z.string().datetime().optional(),
    gte: z.string().datetime().optional(),
    lt: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
  }).optional(),
})

// Dispute schemas
export const disputeStageSchema = z.enum(['pre_dispute', 'dispute', 'pre_arbitration'])
export const disputeStatusSchema = z.enum([
  'dispute_opened',
  'dispute_expired',
  'dispute_accepted',
  'dispute_cancelled',
  'dispute_challenged',
  'dispute_won',
  'dispute_lost',
])

export const disputeEvidenceSchema = z.object({
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication',
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other',
  ]),
  evidence_description: z.string().min(10).max(1000),
  customer_email: z.string().email().optional(),
  shipping_tracking_number: z.string().max(100).optional(),
  refund_amount: amountSchema.optional(),
  additional_notes: z.string().max(2000).optional(),
  evidence_files: z.array(z.string()).min(1, 'At least one evidence file is required'),
})

export const disputeListSchema = z.object({
  dispute_id: z.string().optional(),
  payment_id: z.string().optional(),
  profile_id: z.string().optional(),
  merchant_connector_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  dispute_status: z.array(disputeStatusSchema).optional(),
  dispute_stage: z.array(disputeStageSchema).optional(),
  reason: z.string().optional(),
  connector: z.string().optional(),
  received_time: z.string().datetime().optional(),
  received_time_lt: z.string().datetime().optional(),
  received_time_gt: z.string().datetime().optional(),
  received_time_lte: z.string().datetime().optional(),
  received_time_gte: z.string().datetime().optional(),
})

// Form schemas with user-friendly error messages
export const refundFormSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  amount: z.string()
    .optional()
    .transform(val => val ? Math.round(parseFloat(val) * 100) : undefined)
    .refine(val => !val || val > 0, 'Amount must be greater than 0'),
  reason: z.enum([
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'product_not_received',
    'product_unacceptable',
    'subscription_cancelled',
    'other',
  ], {
    errorMap: () => ({ message: 'Please select a reason' })
  }),
  reason_description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  notify_customer: z.boolean().default(true),
})

export const disputeChallengeFormSchema = z.object({
  evidence_type: z.enum([
    'transaction_receipt',
    'customer_communication',
    'shipping_documentation',
    'cancellation_policy',
    'refund_policy',
    'other',
  ], {
    errorMap: () => ({ message: 'Please select evidence type' })
  }),
  evidence_description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description too long'),
  customer_email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  shipping_tracking_number: z.string()
    .max(100, 'Tracking number too long')
    .optional(),
  refund_offered: z.boolean().default(false),
  refund_amount: z.string()
    .optional()
    .transform(val => val ? Math.round(parseFloat(val) * 100) : undefined),
  additional_notes: z.string()
    .max(2000, 'Notes too long')
    .optional(),
})