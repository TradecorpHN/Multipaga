// src/infrastructure/api/trpc/payouts.ts
// ──────────────────────────────────────────────────────────────────────────────
// tRPC Router para gestión de payouts con Hyperswitch API
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/infrastructure/api/trpc/context'
import { TRPCError } from '@trpc/server'

// ──────────────────────────────────────────────────────────────────────────────
// Schemas de validación basados en la API de Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

// Schema para el estado de payout según la API
const PayoutStatusSchema = z.enum([
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

// Schema para el tipo de payout
const PayoutTypeSchema = z.enum(['card', 'bank', 'wallet'])

// Schema para la prioridad de envío
const PayoutSendPrioritySchema = z.enum([
  'instant',
  'fast', 
  'regular',
  'wire',
  'cross_border',
  'internal'
])

// Schema para el tipo de entidad
const PayoutEntityTypeSchema = z.enum(['individual', 'business'])

// Schema para crear un payout
const PayoutCreateSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().optional(),
  merchant_id: z.string().optional(),
  connector: z.array(z.string()).optional(),
  auto_fulfill: z.boolean().default(false),
  payout_type: PayoutTypeSchema.optional(),
  payout_method_data: z.object({
    card: z.object({
      card_number: z.string(),
      card_exp_month: z.string(),
      card_exp_year: z.string(),
      card_holder_name: z.string(),
    }).optional(),
    bank: z.object({
      account_number: z.string(),
      routing_number: z.string(),
      account_holder_name: z.string(),
      bank_name: z.string().optional(),
    }).optional(),
    wallet: z.object({
      wallet_type: z.string(),
      wallet_id: z.string(),
    }).optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().length(2),
    }),
    phone: z.object({
      number: z.string(),
      country_code: z.string(),
    }).optional(),
  }).optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
  description: z.string().optional(),
  entity_type: PayoutEntityTypeSchema.optional(),
  metadata: z.record(z.any()).optional(),
  payout_token: z.string().optional(),
  profile_id: z.string().optional(),
  priority: PayoutSendPrioritySchema.optional(),
  payout_link: z.boolean().default(false),
  session_expiry: z.number().int().min(300).max(86400).optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  phone_country_code: z.string().optional(),
  recurring: z.boolean().default(false),
})

// Schema para actualizar un payout
const PayoutUpdateSchema = z.object({
  payout_id: z.string(),
  amount: z.number().int().min(1).optional(),
  currency: z.string().length(3).optional(),
  connector: z.array(z.string()).optional(),
  confirm: z.boolean().optional(),
  description: z.string().optional(),
  entity_type: PayoutEntityTypeSchema.optional(),
  metadata: z.record(z.any()).optional(),
  payout_token: z.string().optional(),
  profile_id: z.string().optional(),
  priority: PayoutSendPrioritySchema.optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  phone_country_code: z.string().optional(),
})

// Schema para cancelar un payout
const PayoutCancelSchema = z.object({
  payout_id: z.string(),
  cancellation_reason: z.string().optional(),
})

// Schema para cumplir un payout
const PayoutFulfillSchema = z.object({
  payout_id: z.string(),
})

// Schema para listar payouts
const PayoutListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  payout_id: z.string().optional(),
  customer_id: z.string().optional(),
  payout_status: z.array(PayoutStatusSchema).optional(),
  payout_type: z.array(PayoutTypeSchema).optional(),
  currency: z.array(z.string()).optional(),
  amount: z.object({
    gte: z.number().optional(),
    lte: z.number().optional(),
  }).optional(),
  created: z.object({
    gte: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
  }).optional(),
  profile_id: z.string().optional(),
})

// Schema para estadísticas de payouts
const PayoutStatsSchema = z.object({
  time_range: z.object({
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
  }).optional(),
  profile_id: z.string().optional(),
})

// Schema de respuesta de payout
const PayoutResponseSchema = z.object({
  payout_id: z.string(),
  merchant_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  connector: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  payment_method: PayoutTypeSchema.optional(),
  payout_method_type: z.string().optional(),
  connector_transaction_id: z.string().optional(),
  cancellation_reason: z.string().optional(),
  unified_code: z.string().optional(),
  unified_message: z.string().optional(),
  status: PayoutStatusSchema,
  created: z.string(),
  updated: z.string().optional(),
  client_secret: z.string().optional(),
  customer_id: z.string().optional(),
  customer: z.object({
    customer_id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  entity_type: PayoutEntityTypeSchema.optional(),
  metadata: z.record(z.any()).optional(),
  priority: PayoutSendPrioritySchema.optional(),
  profile_id: z.string().optional(),
  attempt_count: z.number().optional(),
  return_url: z.string().optional(),
})

// Schema de respuesta de lista de payouts
const PayoutListResponseSchema = z.object({
  size: z.number(),
  data: z.array(PayoutResponseSchema),
  total_count: z.number().optional(),
})

// Schema de estadísticas de payouts
const PayoutStatsResponseSchema = z.object({
  total_payouts: z.number(),
  total_amount: z.number(),
  primary_currency: z.string(),
  volume_change: z.number().optional(),
  success_rate: z.number(),
  pending_payouts: z.number(),
  pending_amount: z.number(),
  failed_payouts: z.number().optional(),
  successful_payouts: z.number().optional(),
  is_available: z.boolean().default(true),
  monthly_trend: z.array(z.object({
    month: z.string(),
    count: z.number(),
    amount: z.number(),
    success_rate: z.number(),
  })).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Funciones auxiliares para llamadas a la API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Realiza una llamada HTTP a la API de Hyperswitch através del proxy
 */
async function apiCall<T>(
  endpoint: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    searchParams?: Record<string, string>
  }
): Promise<T> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = new URL(`/api/hyperswitch${endpoint}`, baseUrl)
    
    // Agregar parámetros de consulta si existen
    if (options.searchParams) {
      Object.entries(options.searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value)
        }
      })
    }

    const requestOptions: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (options.body && options.method !== 'GET') {
      requestOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url.toString(), requestOptions)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new TRPCError({
        code: response.status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
        message: errorData.error?.message || `API Error: ${response.status}`,
        cause: errorData,
      })
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }
    
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to connect to payment service',
      cause: error,
    })
  }
}

/**
 * Convierte filtros a parámetros de consulta para la API
 */
function buildSearchParams(filters: any): Record<string, string> {
  const params: Record<string, string> = {}
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params[key] = value.join(',')
      } else if (typeof value === 'object') {
        // Manejar objetos anidados como amount, created
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subValue !== undefined && subValue !== null) {
            params[`${key}[${subKey}]`] = String(subValue)
          }
        })
      } else {
        params[key] = String(value)
      }
    }
  })
  
  return params
}

// ──────────────────────────────────────────────────────────────────────────────
// Router de tRPC para payouts
// ──────────────────────────────────────────────────────────────────────────────

export const payoutsRouter = createTRPCRouter({
  /**
   * Listar payouts con filtros y paginación
   */
  list: publicProcedure
    .input(PayoutListSchema)
    .output(PayoutListResponseSchema)
    .query(async ({ input }) => {
      const searchParams = buildSearchParams(input)
      
      const response = await apiCall<any>('/payouts', {
        method: 'GET',
        searchParams,
      })

      return PayoutListResponseSchema.parse(response)
    }),

  /**
   * Obtener un payout específico por ID
   */
  get: publicProcedure
    .input(z.object({ payout_id: z.string() }))
    .output(PayoutResponseSchema)
    .query(async ({ input }) => {
      const response = await apiCall<any>(`/payouts/${input.payout_id}`, {
        method: 'GET',
      })

      return PayoutResponseSchema.parse(response)
    }),

  /**
   * Crear un nuevo payout
   */
  create: publicProcedure
    .input(PayoutCreateSchema)
    .output(PayoutResponseSchema)
    .mutation(async ({ input }) => {
      const response = await apiCall<any>('/payouts', {
        method: 'POST',
        body: input,
      })

      return PayoutResponseSchema.parse(response)
    }),

  /**
   * Actualizar un payout existente
   */
  update: publicProcedure
    .input(PayoutUpdateSchema)
    .output(PayoutResponseSchema)
    .mutation(async ({ input }) => {
      const { payout_id, ...updateData } = input
      
      const response = await apiCall<any>(`/payouts/${payout_id}`, {
        method: 'POST',
        body: updateData,
      })

      return PayoutResponseSchema.parse(response)
    }),

  /**
   * Cancelar un payout
   */
  cancel: publicProcedure
    .input(PayoutCancelSchema)
    .output(PayoutResponseSchema)
    .mutation(async ({ input }) => {
      const { payout_id, ...cancelData } = input
      
      const response = await apiCall<any>(`/payouts/${payout_id}/cancel`, {
        method: 'POST',
        body: cancelData,
      })

      return PayoutResponseSchema.parse(response)
    }),

  /**
   * Cumplir un payout (marcar como completado)
   */
  fulfill: publicProcedure
    .input(PayoutFulfillSchema)
    .output(PayoutResponseSchema)
    .mutation(async ({ input }) => {
      const response = await apiCall<any>(`/payouts/${input.payout_id}/fulfill`, {
        method: 'POST',
        body: {},
      })

      return PayoutResponseSchema.parse(response)
    }),

  /**
   * Obtener estadísticas de payouts
   */
  stats: publicProcedure
    .input(PayoutStatsSchema)
    .output(PayoutStatsResponseSchema)
    .query(async ({ input }) => {
      // Para estadísticas, podemos hacer múltiples llamadas o usar un endpoint específico
      // Como no hay un endpoint específico de stats en la documentación,
      // simularemos las estadísticas basadas en la lista de payouts
      
      const searchParams = buildSearchParams({
        limit: 1000, // Obtener una cantidad grande para calcular estadísticas
        ...input,
      })
      
      const response = await apiCall<any>('/payouts', {
        method: 'GET',
        searchParams,
      })

      const payouts = PayoutListResponseSchema.parse(response)
      
      // Calcular estadísticas basadas en los datos obtenidos
      const totalPayouts = payouts.total_count || payouts.data.length
      const successfulPayouts = payouts.data.filter(p => p.status === 'success').length
      const pendingPayouts = payouts.data.filter(p => 
        ['initiated', 'pending', 'requires_fulfillment'].includes(p.status)
      ).length
      const failedPayouts = payouts.data.filter(p => 
        ['failed', 'cancelled', 'expired'].includes(p.status)
      ).length
      
      const totalAmount = payouts.data.reduce((sum, payout) => sum + payout.amount, 0)
      const pendingAmount = payouts.data
        .filter(p => ['initiated', 'pending', 'requires_fulfillment'].includes(p.status))
        .reduce((sum, payout) => sum + payout.amount, 0)
      
      const successRate = totalPayouts > 0 ? (successfulPayouts / totalPayouts) * 100 : 0
      
      // Usar la primera moneda encontrada o USD como fallback
      const primaryCurrency = payouts.data[0]?.currency || 'USD'
      
      const stats = {
        total_payouts: totalPayouts,
        total_amount: totalAmount,
        primary_currency: primaryCurrency,
        success_rate: Number(successRate.toFixed(2)),
        pending_payouts: pendingPayouts,
        pending_amount: pendingAmount,
        failed_payouts: failedPayouts,
        successful_payouts: successfulPayouts,
        is_available: true,
      }

      return PayoutStatsResponseSchema.parse(stats)
    }),

  /**
   * Verificar disponibilidad del servicio de payouts
   */
  isAvailable: publicProcedure
    .output(z.object({ is_available: z.boolean() }))
    .query(async () => {
      try {
        // Intentar hacer una llamada simple para verificar disponibilidad
        await apiCall('/payouts', {
          method: 'GET',
          searchParams: { limit: '1' },
        })
        
        return { is_available: true }
      } catch (error) {
        // Si hay error, asumir que no está disponible
        return { is_available: false }
      }
    }),
})

export type PayoutsRouter = typeof payoutsRouter