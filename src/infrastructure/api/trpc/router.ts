// /home/kali/multipaga/src/infrastructure/api/trpc/router.ts
// ──────────────────────────────────────────────────────────────────────────────
// tRPC Router - Router principal Multipaga avanzado y compatible frontend/backend
// ──────────────────────────────────────────────────────────────────────────────

import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import superjson from 'superjson'
import { HyperswitchClient } from '../clients/HyperswitchClient'
import { env } from '../../../presentation/lib/env-config'
import type { NextRequest } from 'next/server'
import { Parser as Json2csvParser } from 'json2csv'

// =============== CONTEXT ===============
export interface Context {
  req: NextRequest
  hyperswitchClient: HyperswitchClient
  merchantId?: string
  profileId?: string
  apiKey?: string
  userAgent?: string
  ipAddress?: string
}

// ========== tRPC INIT ==========
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
        hyperswitchError: error.message.includes('Hyperswitch') ? error.message : null,
      },
    }
  },
})

// ========== BASE ==========
export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// ========== MIDDLEWARES ==========
const authMiddleware = middleware(async ({ ctx, next }) => {
  const merchantId = ctx.req.headers.get('x-merchant-id')
  const profileId = ctx.req.headers.get('x-profile-id')
  const apiKey = ctx.req.headers.get('authorization')?.replace('Bearer ', '')
  if (!merchantId || !profileId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing merchant ID or profile ID in headers',
    })
  }
  return next({
    ctx: {
      ...ctx,
      merchantId,
      profileId,
      apiKey: apiKey || env.HYPERSWITCH_API_KEY,
    },
  })
})

const protectedProcedure = publicProcedure.use(authMiddleware)

// ========== SCHEMAS ==========
const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
})

const TimeRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
}).optional();

const DateRangeSchema = z.object({
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
})

// ========== ENUMS ESPECÍFICOS DE HYPERSWITCH ==========
const PayoutTypeEnum = z.enum(['card', 'bank', 'wallet'])
const PayoutStatusEnum = z.enum([
  'success',
  'failed', 
  'cancelled',
  'initiated',
  'expired',
  'reversed',
  'pending',
  'ineligible',
  'requires_creation',
  'requires_confirmation',
  'requires_payout_method_data',
  'requires_fulfillment',
  'requires_vendor_account_creation'
])

const PaymentCreateSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor: z.string().max(22).optional(),
  payment_method: z.enum(['card', 'bank_transfer', 'wallet']).optional(),
  payment_method_data: z.record(z.any()).optional(),
  return_url: z.string().url().optional(),
  confirm: z.boolean().default(false),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  setup_future_usage: z.enum(['off_session', 'on_session']).optional(),
  metadata: z.record(z.string()).optional(),
})

const PaymentUpdateSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string()).optional(),
})

const CustomerCreateSchema = z.object({
  customer_id: z.string().min(1).max(64),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
})

const RefundCreateSchema = z.object({
  payment_id: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.enum([
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'expired_uncaptured_charge',
    'other',
  ]).optional(),
  metadata: z.record(z.string()).optional(),
})

// ========== PAYOUT SCHEMAS CORREGIDOS ==========
const PayoutCreateSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().min(1),
  description: z.string().max(1000).optional(),
  statement_descriptor: z.string().max(22).optional(),
  payout_type: PayoutTypeEnum.default('bank'),
  billing: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
  }).optional(),
  auto_fulfill: z.boolean().default(true),
  confirm: z.boolean().default(false),
  priority: z.enum(['instant', 'normal']).default('normal'),
  metadata: z.record(z.string()).optional(),
})

const PayoutUpdateSchema = z.object({
  payoutId: z.string().min(1),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string()).optional(),
})

// ========== ROUTERS ==========
const paymentsRouter = router({
  create: protectedProcedure.input(PaymentCreateSchema).mutation(async ({ input, ctx }) => {
    try {
      const payment = await ctx.hyperswitchClient.post('/payments', {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      })
      return payment
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  
  get: protectedProcedure.input(z.object({ paymentId: z.string().min(1) })).query(async ({ input, ctx }) => {
    try {
      const payment = await ctx.hyperswitchClient.get(`/payments/${input.paymentId}`)
      return payment
    } catch (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Payment not found: ${input.paymentId}`,
      })
    }
  }),
  
  list: protectedProcedure.input(
    PaginationSchema.merge(DateRangeSchema).extend({
      customer_id: z.string().optional(),
      status: z.array(z.string()).optional(),
      currency: z.string().optional(),
      amount_gte: z.number().optional(),
      amount_lte: z.number().optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const payments = await ctx.hyperswitchClient.get('/payments', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return payments
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payments',
      })
    }
  }),
  
  confirm: protectedProcedure.input(z.object({
    paymentId: z.string().min(1),
    payment_method: z.string().optional(),
    return_url: z.string().url().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const { paymentId, ...confirmData } = input
      const payment = await ctx.hyperswitchClient.post(
        `/payments/${paymentId}/confirm`,
        confirmData
      )
      return payment
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  
  capture: protectedProcedure.input(z.object({
    paymentId: z.string().min(1),
    amount_to_capture: z.number().positive().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const { paymentId, ...captureData } = input
      const payment = await ctx.hyperswitchClient.post(
        `/payments/${paymentId}/capture`,
        captureData
      )
      return payment
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to capture payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  
  cancel: protectedProcedure.input(z.object({
    paymentId: z.string().min(1),
    cancellation_reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const { paymentId, ...cancelData } = input
      const payment = await ctx.hyperswitchClient.post(
        `/payments/${paymentId}/cancel`,
        cancelData
      )
      return payment
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  
  stats: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      const stats = await ctx.hyperswitchClient.get('/analytics/payments', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return stats
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payment statistics',
      })
    }
  }),
  
  export: protectedProcedure
    .input(
      PaginationSchema.merge(DateRangeSchema).extend({
        customer_id: z.string().optional(),
        status: z.array(z.string()).optional(),
        currency: z.string().optional(),
        amount_gte: z.number().optional(),
        amount_lte: z.number().optional(),
        format: z.enum(['csv', 'json']).default('csv'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const payments = await ctx.hyperswitchClient.get('/payments', {
          params: {
            ...input,
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
          }
        })

        if (input.format === 'json') {
          return {
            format: 'json',
            data: payments,
          }
        } else {
          const fields = [
            'payment_id', 'merchant_id', 'status', 'amount', 'currency',
            'customer_id', 'description', 'payment_method', 'payment_method_type',
            'created_at', 'modified_at', 'metadata'
          ]
          const parser = new Json2csvParser({ fields, defaultValue: '' })
          const csv = parser.parse(payments)
          return {
            format: 'csv',
            data: csv,
          }
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export payments',
        })
      }
    }),
})

const customersRouter = router({
  create: protectedProcedure.input(CustomerCreateSchema).mutation(async ({ input, ctx }) => {
    try {
      const customer = await ctx.hyperswitchClient.post('/customers', {
        ...input,
        merchant_id: ctx.merchantId,
      })
      return customer
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  get: protectedProcedure.input(z.object({ customerId: z.string().min(1) })).query(async ({ input, ctx }) => {
    try {
      const customer = await ctx.hyperswitchClient.get(`/customers/${input.customerId}`)
      return customer
    } catch (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Customer not found: ${input.customerId}`,
      })
    }
  }),
  list: protectedProcedure.input(
    PaginationSchema.merge(DateRangeSchema).extend({
      email: z.string().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const customers = await ctx.hyperswitchClient.get('/customers', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
        }
      })
      return customers
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch customers',
      })
    }
  }),
  update: protectedProcedure.input(
    z.object({ customerId: z.string().min(1) })
      .merge(CustomerCreateSchema.partial())
  ).mutation(async ({ input, ctx }) => {
    try {
      const { customerId, ...updateData } = input
      const customer = await ctx.hyperswitchClient.patch(
        `/customers/${customerId}`,
        updateData
      )
      return customer
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  delete: protectedProcedure.input(z.object({ customerId: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    try {
      await ctx.hyperswitchClient.delete(`/customers/${input.customerId}`)
      return { success: true, customerId: input.customerId }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  search: protectedProcedure.input(z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(50).default(10),
  })).query(async ({ input, ctx }) => {
    try {
      const results = await ctx.hyperswitchClient.get('/customers/search', {
        params: {
          q: input.query,
          limit: input.limit,
          merchant_id: ctx.merchantId,
        }
      })
      return results
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to search customers',
      })
    }
  }),
  stats: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      const stats = await ctx.hyperswitchClient.get('/analytics/customers', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
        }
      })
      return stats
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch customer statistics',
      })
    }
  }),
  export: protectedProcedure
    .input(
      PaginationSchema.merge(DateRangeSchema).extend({
        email: z.string().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
        format: z.enum(['csv', 'json']).default('csv'),
      })
    )
   .mutation(async ({ input, ctx }) => {
    try {
      const customers = await ctx.hyperswitchClient.get('/customers', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
        }
      })

      if (input.format === 'json') {
        return {
          format: 'json',
          data: customers,
          content: JSON.stringify(customers, null, 2),
          contentType: 'application/json',
          filename: `customers-export-${new Date().toISOString().split('T')[0]}.json`
        }
      } else {
        const fields = [
          'customer_id', 'merchant_id', 'name', 'email', 'phone',
          'description', 'created_at', 'modified_at', 'metadata'
        ]
        const parser = new Json2csvParser({ fields, defaultValue: '' })
        const csv = parser.parse(customers)
        return {
          format: 'csv',
          data: csv,
          content: csv,
          contentType: 'text/csv',
          filename: `customers-export-${new Date().toISOString().split('T')[0]}.csv`
        }
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to export customers',
      })
    }
  }),
})

// ========== PAYOUT ROUTER CORREGIDO ==========
const payoutRouter = router({
  create: protectedProcedure.input(PayoutCreateSchema).mutation(async ({ input, ctx }) => {
    try {
      const payout = await ctx.hyperswitchClient.post('/payouts', {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      });
      return payout;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),

  get: protectedProcedure.input(z.object({ payoutId: z.string().min(1) })).query(async ({ input, ctx }) => {
    try {
      const payout = await ctx.hyperswitchClient.get(`/payouts/${input.payoutId}`);
      return payout;
    } catch (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Payout not found: ${input.payoutId}`,
      });
    }
  }),

  // ✅ SCHEMA CORREGIDO CON TIPOS ESPECÍFICOS
  list: protectedProcedure.input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      cursor: z.string().optional(),
      created_after: z.string().datetime().optional(),
      created_before: z.string().datetime().optional(),
      customer_id: z.string().optional(),
      payout_status: z.array(PayoutStatusEnum).optional(), // ✅ CORREGIDO
      payout_type: z.array(PayoutTypeEnum).optional(), // ✅ CORREGIDO
      amount: z.object({
        gte: z.number().optional(),
        lte: z.number().optional(),
      }).optional(),
      currency: z.array(z.string()).optional(),
      payout_id: z.string().optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const params = {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      };
      
      const payouts = await ctx.hyperswitchClient.get('/payouts', { params });
      return payouts;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payouts',
      });
    }
  }),

  update: protectedProcedure.input(PayoutUpdateSchema).mutation(async ({ input, ctx }) => {
    try {
      const { payoutId, ...updateData } = input;
      const payout = await ctx.hyperswitchClient.patch(
        `/payouts/${payoutId}`,
        updateData
      );
      return payout;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),

  confirm: protectedProcedure.input(z.object({
    payoutId: z.string().min(1),
    customer_acceptance: z.object({
      accepted_at: z.string().datetime(),
      online: z.object({
        ip_address: z.string().ip().optional(),
        user_agent: z.string().optional(),
      }).optional(),
    }).optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const { payoutId, ...confirmData } = input;
      const payout = await ctx.hyperswitchClient.post(
        `/payouts/${payoutId}/confirm`,
        confirmData
      );
      return payout;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to confirm payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),

  // ✅ CORREGIDO: USAR payoutId EN LUGAR DE payout_id
  cancel: protectedProcedure.input(z.object({
    payoutId: z.string().min(1),
    cancellation_reason: z.string().max(1000).optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const response = await ctx.hyperswitchClient.post(
        `/payouts/${input.payoutId}/cancel`,
        {
          cancellation_reason: input.cancellation_reason
        }
      );
      return response;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to cancel payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),

  fulfill: protectedProcedure.input(z.object({
    payoutId: z.string().min(1),
  })).mutation(async ({ input, ctx }) => {
    try {
      const payout = await ctx.hyperswitchClient.post(
        `/payouts/${input.payoutId}/fulfill`,
        {}
      );
      return payout;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fulfill payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),

  stats: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      const stats = await ctx.hyperswitchClient.get('/analytics/payouts', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      });
      return stats;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payout statistics',
      });
    }
  }),

  export: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        customer_id: z.string().optional(),
        payout_status: z.array(PayoutStatusEnum).optional(), // ✅ CORREGIDO
        payout_type: z.array(PayoutTypeEnum).optional(), // ✅ CORREGIDO
        created_after: z.string().datetime().optional(),
        created_before: z.string().datetime().optional(),
        format: z.enum(['csv', 'json']).default('csv'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { format, ...params } = input;
        const payouts = await ctx.hyperswitchClient.get('/payouts', {
          params: {
            ...params,
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
          }
        });

        if (format === 'json') {
          return {
            format: 'json',
            data: payouts,
            content: JSON.stringify(payouts, null, 2),
            contentType: 'application/json',
            filename: `payouts-export-${new Date().toISOString().split('T')[0]}.json`
          };
        } else {
          const fields = [
            'payout_id', 'merchant_id', 'customer_id', 'amount', 'currency',
            'payout_type', 'payout_method_type', 'payout_status', 'description',
            'created', 'modified', 'metadata'
          ];
          const parser = new Json2csvParser({ fields, defaultValue: '' });
          const csv = parser.parse(payouts);
          return {
            format: 'csv',
            data: csv,
            content: csv,
            contentType: 'text/csv',
            filename: `payouts-export-${new Date().toISOString().split('T')[0]}.csv`
          };
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export payouts',
        });
      }
    }),

  // ✅ AGREGADO: checkAvailability para resolver el error isAvailable
  checkAvailability: protectedProcedure.query(async ({ ctx }) => {
    try {
      const health = await ctx.hyperswitchClient.get('/payouts/filters');
      return { isAvailable: true, status: 'active' };
    } catch (error) {
      return { isAvailable: false, status: 'inactive' };
    }
  }),
});

// ========== REFUND ROUTER ==========
const refundsRouter = router({
  create: protectedProcedure.input(RefundCreateSchema).mutation(async ({ input, ctx }) => {
    try {
      const refund = await ctx.hyperswitchClient.post('/refunds', {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      })
      return refund
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }),
  get: protectedProcedure.input(z.object({ refundId: z.string().min(1) })).query(async ({ input, ctx }) => {
    try {
      const refund = await ctx.hyperswitchClient.get(`/refunds/${input.refundId}`)
      return refund
    } catch (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Refund not found: ${input.refundId}`,
      })
    }
  }),
  list: protectedProcedure.input(
    PaginationSchema.merge(DateRangeSchema).extend({
      payment_id: z.string().optional(),
      refund_status: z.array(z.string()).optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const refunds = await ctx.hyperswitchClient.get('/refunds', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return refunds
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch refunds',
      })
    }
  }),
  stats: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      const stats = await ctx.hyperswitchClient.get('/analytics/refunds', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return stats
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch refund statistics',
      })
    }
  }),
})

const analyticsRouter = router({
  dashboard: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    try {
      const analytics = await ctx.hyperswitchClient.get('/analytics/dashboard', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return analytics
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard analytics',
      })
    }
  }),
  revenue: protectedProcedure.input(
    DateRangeSchema.extend({
      granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      currency: z.string().optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const revenue = await ctx.hyperswitchClient.get('/analytics/revenue', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return revenue
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch revenue analytics',
      })
    }
  }),
  successRate: protectedProcedure.input(
    DateRangeSchema.extend({
      granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      connector: z.string().optional(),
    })
  ).query(async ({ input, ctx }) => {
    try {
      const successRate = await ctx.hyperswitchClient.get('/analytics/success-rate', {
        params: {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }
      })
      return successRate
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch success rate analytics',
      })
    }
  }),
})

const connectorsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      const connectors = await ctx.hyperswitchClient.get('/connectors')
      return connectors
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch connectors',
      })
    }
  }),
  getConfig: protectedProcedure.input(z.object({ connectorId: z.string().min(1) })).query(async ({ input, ctx }) => {
    try {
      const config = await ctx.hyperswitchClient.get(
        `/account/${ctx.merchantId}/connectors/${input.connectorId}`
      )
      return config
    } catch (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Connector configuration not found: ${input.connectorId}`,
      })
    }
  }),
})

const healthRouter = router({
  check: publicProcedure.query(async ({ ctx }) => {
    try {
      const health = await ctx.hyperswitchClient.get('/health')
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        hyperswitch: health,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }),
})

// ================== SCHEMAS DISPUTES ==================
const DisputeStatusEnum = z.enum([
  'dispute_opened',
  'dispute_expired',
  'dispute_accepted',
  'dispute_cancelled',
  'dispute_challenged',
  'dispute_won',
  'dispute_lost',
])

const DisputeStageEnum = z.enum([
  'pre_dispute',
  'dispute',
  'pre_arbitration'
])

const DisputeListSchema = PaginationSchema.merge(DateRangeSchema).extend({
  dispute_status: z.array(DisputeStatusEnum).optional(),
  dispute_stage: z.array(DisputeStageEnum).optional(),
  amount_gte: z.number().optional(),
  amount_lte: z.number().optional(),
})

const DisputeCreateSchema = z.object({
  payment_id: z.string().min(1),
  dispute_amount: z.number().positive(),
  currency: z.string().length(3),
  reason: z.string().max(1024).optional(),
  evidence: z.record(z.any()).optional(),
  metadata: z.record(z.string()).optional(),
})

const DisputeActionSchema = z.object({
  dispute_id: z.string().min(1),
  evidence: z.record(z.any()).optional(),
})

const DisputeIdSchema = z.object({ disputeId: z.string().min(1) })

// ================== ROUTER DISPUTES ==================
const disputesRouter = router({
  list: protectedProcedure.input(DisputeListSchema).query(async ({ input, ctx }) => {
    const disputes = await ctx.hyperswitchClient.get('/disputes', {
      params: {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      }
    })
    return disputes
  }),
  get: protectedProcedure.input(DisputeIdSchema).query(async ({ input, ctx }) => {
    const dispute = await ctx.hyperswitchClient.get(`/disputes/${input.disputeId}`, {
      params: {
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      }
    })
    return dispute
  }),
  create: protectedProcedure.input(DisputeCreateSchema).mutation(async ({ input, ctx }) => {
    const dispute = await ctx.hyperswitchClient.post('/disputes', {
      ...input,
      merchant_id: ctx.merchantId,
      profile_id: ctx.profileId,
    })
    return dispute
  }),
  accept: protectedProcedure.input(DisputeIdSchema).mutation(async ({ input, ctx }) => {
    const result = await ctx.hyperswitchClient.post(`/disputes/${input.disputeId}/accept`, {
      merchant_id: ctx.merchantId,
      profile_id: ctx.profileId,
    })
    return result
  }),
  challenge: protectedProcedure.input(DisputeActionSchema).mutation(async ({ input, ctx }) => {
    const result = await ctx.hyperswitchClient.post(`/disputes/${input.dispute_id}/challenge`, {
      evidence: input.evidence,
      merchant_id: ctx.merchantId,
      profile_id: ctx.profileId,
    })
    return result
  }),
  stats: protectedProcedure.input(DateRangeSchema.optional()).query(async ({ input, ctx }) => {
    const stats = await ctx.hyperswitchClient.get('/analytics/disputes', {
      params: {
        ...input,
        merchant_id: ctx.merchantId,
        profile_id: ctx.profileId,
      }
    })
    return stats
  }),
})

const MandateListSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  customer_id: z.string().optional(),
  mandate_id: z.string().optional(),
  mandate_status: z.string().optional(),
  mandate_type: z.string().optional(),
  payment_method_type: z.string().optional(),
  created: z.object({
    gte: z.string().optional(),
    lte: z.string().optional(),
  }).optional(),
})

export const mandatesRouter = router({
  list: protectedProcedure.input(MandateListSchema).query(async ({ input, ctx }) => {
    return await ctx.hyperswitchClient.get('/mandates', { params: { ...input, merchant_id: ctx.merchantId } })
  }),
  stats: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.hyperswitchClient.get('/analytics/mandates', { params: { merchant_id: ctx.merchantId } })
  }),
  revoke: protectedProcedure.input(z.object({ mandate_id: z.string() })).mutation(async ({ input, ctx }) => {
    return await ctx.hyperswitchClient.post(`/mandates/${input.mandate_id}/revoke`, {
      merchant_id: ctx.merchantId,
    })
  }),
})

// ========== ROUTER PRINCIPAL ==========
export const appRouter = router({
  payments: paymentsRouter,
  customers: customersRouter,
  payouts: payoutRouter,
  invoices: paymentsRouter,
  refunds: refundsRouter,
  analytics: analyticsRouter,
  connectors: connectorsRouter,
  health: healthRouter,
  disputes: disputesRouter,
  mandates: mandatesRouter,
})

// ========== TIPADO PARA EL FRONTEND ==========
export type AppRouter = typeof appRouter

// ========== CONTEXT FACTORY ==========
export function createTRPCContext(req: NextRequest): Context {
  const hyperswitchClient = new HyperswitchClient({
    baseURL: env.HYPERSWITCH_BASE_URL,
    apiKey: env.HYPERSWITCH_API_KEY,
    timeout: 30000,
  })

  return {
    req,
    hyperswitchClient,
    merchantId: req.headers.get('x-merchant-id') || undefined,
    profileId: req.headers.get('x-profile-id') || undefined,
    apiKey: req.headers.get('authorization')?.replace('Bearer ', '') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    ipAddress: req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown',
  }
}

// ========== EXPORT DEFAULT ==========
export default appRouter