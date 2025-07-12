// src/infrastructure/api/trpc/payments.ts
// ──────────────────────────────────────────────────────────────────────────────
// Router tRPC para gestión de pagos - Hyperswitch API Integration - CORREGIDO
// Implementación completa siguiendo la documentación oficial de Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, publicProcedure } from '../../../presentation/utils/trpc'
import type { 
  PaymentResponse,
  PaymentRequest,
  PaymentListRequest,
  PaymentStatus,
  Currency,
  PaymentMethod,
  PaymentMethodData,
  CardDetails,
} from '@/types/hyperswitch'
import type { TRPCContext } from '../../../presentation/utils/trpc'

// ──────────────────────────────────────────────────────────────────────────────
// Esquemas de validación Zod alineados con Hyperswitch API - CORREGIDOS
// ──────────────────────────────────────────────────────────────────────────────

const paymentStatusEnum = z.enum([
  'requires_payment_method',
  'requires_confirmation', 
  'requires_action',
  'processing',
  'requires_capture',
  'cancelled',
  'succeeded',
  'failed',
  'partially_captured',
  'partially_captured_and_capturable'
])

const currencyEnum = z.enum([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN',
  'AED', 'SGD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'THB',
  'MYR', 'PHP', 'IDR', 'VND', 'KRW', 'TWD', 'HKD', 'NZD', 'ZAR', 'RUB',
  'HNL', 'GTQ'
])

const paymentMethodEnum = z.enum([
  'card', 'bank_transfer', 'wallet', 'crypto', 'pay_later', 
  'bank_redirect', 'bank_debit', 'upi', 'voucher', 'gift_card',
  'mobile_payment', 'reward'
])

// Schema para listar pagos - CORREGIDO con propiedades de filtros
const paymentsListSchema = z.object({
  // Parámetros de paginación
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  
  // Filtros de búsqueda
  customer_id: z.string().optional(),
  payment_id: z.string().optional(),
  status: z.array(paymentStatusEnum).optional(),
  currency: z.array(currencyEnum).optional(),
  payment_method: z.array(paymentMethodEnum).optional(),
  
  // Filtros de rango
  amount: z.object({
    gte: z.number().int().optional(),
    lte: z.number().int().optional(),
  }).optional(),
  
  // Filtros de fecha (formato ISO string)
  created: z.object({
    gte: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
  }).optional(),
  
  // Filtros adicionales de Hyperswitch
  merchant_id: z.string().optional(),
  connector: z.array(z.string()).optional(),
  profile_id: z.string().optional(),
})

// Schema para crear pagos - basado en Hyperswitch Payments API
const paymentCreateSchema = z.object({
  // Campos obligatorios según Hyperswitch
  amount: z.number().int().positive(),
  currency: currencyEnum,
  
  // Información del cliente
  customer_id: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  phone_country_code: z.string().optional(),
  
  // Descripción y metadata
  description: z.string().optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  metadata: z.record(z.any()).optional(),
  
  // Configuración del pago
  capture_method: z.enum(['automatic', 'manual', 'manual_multiple']).default('automatic'),
  confirm: z.boolean().default(false),
  return_url: z.string().url().optional(),
  authentication_type: z.enum(['three_ds', 'no_three_ds']).default('no_three_ds'),
  
  // Método de pago
  payment_method: paymentMethodEnum.optional(),
  payment_method_type: paymentMethodEnum.optional(),
  payment_method_data: z.object({
    card: z.object({
      card_number: z.string().optional(),
      card_exp_month: z.string().length(2).optional(),
      card_exp_year: z.string().length(4).optional(),
      card_cvc: z.string().min(3).max(4).optional(),
      card_holder_name: z.string().optional(),
    }).optional(),
    wallet: z.object({
      type: z.enum(['apple_pay', 'google_pay', 'paypal', 'samsung_pay']),
      data: z.record(z.any()).optional(),
    }).optional(),
    bank_redirect: z.object({
      bank_name: z.string().optional(),
      country: z.string().length(2).optional(),
    }).optional(),
    bank_transfer: z.object({
      bank_account_number: z.string().optional(),
      bank_routing_number: z.string().optional(),
      bank_name: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Tokens y métodos guardados
  payment_method_id: z.string().optional(),
  payment_token: z.string().optional(),
  
  // Direcciones de facturación y envío
  billing: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      line3: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  
  shipping: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      line3: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  
  // Configuración de futuro uso y mandatos
  setup_future_usage: z.enum(['on_session', 'off_session']).optional(),
  customer_acceptance: z.object({
    acceptance_type: z.enum(['online', 'offline']),
    accepted_at: z.string().datetime().optional(),
    online: z.object({
      ip_address: z.string().optional(),
      user_agent: z.string().optional(),
    }).optional(),
    offline: z.object({
      contact_email: z.string().email().optional(),
    }).optional(),
  }).optional(),
  
  // Configuración de conectores
  connector: z.array(z.string()).optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
  profile_id: z.string().optional(),
})

// Schema para confirmar pagos
const paymentConfirmSchema = z.object({
  payment_id: z.string(),
  payment_method: paymentMethodEnum.optional(),
  payment_method_data: z.object({
    card: z.object({
      card_number: z.string().optional(),
      card_exp_month: z.string().length(2).optional(),
      card_exp_year: z.string().length(4).optional(),
      card_cvc: z.string().min(3).max(4).optional(),
      card_holder_name: z.string().optional(),
    }).optional(),
    wallet: z.object({
      type: z.enum(['apple_pay', 'google_pay', 'paypal', 'samsung_pay']),
      data: z.record(z.any()).optional(),
    }).optional(),
  }).optional(),
  payment_method_id: z.string().optional(),
  payment_token: z.string().optional(),
  mandate_id: z.string().optional(),
  off_session: z.boolean().optional(),
  return_url: z.string().url().optional(),
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
  }).optional(),
})

// Schema para capturar pagos
const paymentCaptureSchema = z.object({
  payment_id: z.string(),
  amount_to_capture: z.number().int().positive().optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
})

// Schema para cancelar pagos
const paymentCancelSchema = z.object({
  payment_id: z.string(),
  cancellation_reason: z.enum([
    'requested_by_customer',
    'duplicate',
    'fraudulent',
    'abandoned',
    'failed_to_capture',
  ]).optional(),
})

// Schema para actualizar pagos
const paymentUpdateSchema = z.object({
  payment_id: z.string(),
  amount: z.number().int().positive().optional(),
  currency: currencyEnum.optional(),
  description: z.string().optional(),
  statement_descriptor_name: z.string().max(22).optional(),
  statement_descriptor_suffix: z.string().max(22).optional(),
  shipping: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      line3: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      line3: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    phone: z.object({
      number: z.string().optional(),
      country_code: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
})

// Schema para exportar pagos
const paymentExportSchema = z.object({
  filters: paymentsListSchema.optional(),
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  fields: z.array(z.string()).optional(),
  include_pii: z.boolean().default(false),
})

// Schema para métodos de pago disponibles
const paymentMethodsSchema = z.object({
  currency: currencyEnum.optional(),
  country: z.string().length(2).optional(),
  amount: z.number().int().positive().optional(),
  customer_id: z.string().optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().optional(),
})

// Schema para estadísticas de pagos
const paymentStatsSchema = z.object({
  time_range: z.object({
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
  }).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  connector: z.array(z.string()).optional(),
  currency: z.array(currencyEnum).optional(),
  payment_method: z.array(paymentMethodEnum).optional(),
  status: z.array(paymentStatusEnum).optional(),
})

// ──────────────────────────────────────────────────────────────────────────────
// Funciones auxiliares - CORREGIDAS
// ──────────────────────────────────────────────────────────────────────────────

const buildHyperswitchHeaders = (ctx: TRPCContext) => ({
  'Authorization': `Bearer ${ctx.hyperswitchApiKey}`,
  'Content-Type': 'application/json',
  'api-key': ctx.hyperswitchApiKey,
  'Accept': 'application/json',
})

const handleHyperswitchError = (error: any, operation: string) => {
  console.error(`Hyperswitch ${operation} error:`, error)
  
  if (error.response?.status === 401) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid API credentials for Hyperswitch',
    })
  }
  
  if (error.response?.status === 400) {
    const errorMessage = error.response?.data?.error?.message || 'Invalid request parameters'
    throw new TRPCError({
      code: 'BAD_REQUEST', 
      message: errorMessage,
    })
  }
  
  if (error.response?.status === 404) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Payment not found',
    })
  }
  
  if (error.response?.status === 422) {
    const errorMessage = error.response?.data?.error?.message || 'Unprocessable entity'
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: errorMessage,
    })
  }
  
  if (error.response?.status >= 500) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Hyperswitch service temporarily unavailable',
    })
  }
  
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error.message || `Failed to ${operation}`,
  })
}

// CORREGIDO: Función para formatear pagos para exportación
const formatPaymentForExport = (payment: PaymentResponse) => {
  const exportData: Record<string, any> = {
    payment_id: payment.payment_id,
    merchant_id: payment.merchant_id,
    status: payment.status,
    amount: payment.amount / 100, // Convert from cents
    currency: payment.currency,
    customer_id: payment.customer_id || '',
    description: payment.description || '',
    created: payment.created,
    connector: payment.connector || '',
    payment_method_type: payment.payment_method?.type || '',
    card_last4: payment.payment_method?.card?.last4 || '',
    card_network: payment.payment_method?.card?.card_network || '',
    statement_descriptor: payment.statement_descriptor || '',
    error_code: payment.error_code || '',
    error_message: payment.error_message || '',
    amount_capturable: payment.amount_capturable || 0,
    amount_received: payment.amount_received || 0,
  }
  
  return exportData
}

// ──────────────────────────────────────────────────────────────────────────────
// Router de pagos principal - CORREGIDO
// ──────────────────────────────────────────────────────────────────────────────

export const paymentsRouter = createTRPCRouter({
  // Listar pagos con filtros avanzados
  list: publicProcedure
    .input(paymentsListSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof paymentsListSchema>, ctx: TRPCContext }) => {
      try {
        const { limit, offset, starting_after, ending_before, ...filters } = input
        
        // Construir parámetros de consulta según la API de Hyperswitch
        const queryParams = new URLSearchParams()
        
        queryParams.append('limit', limit.toString())
        if (starting_after) {
          queryParams.append('starting_after', starting_after)
        } else {
          queryParams.append('offset', offset.toString())
        }
        if (ending_before) {
          queryParams.append('ending_before', ending_before)
        }
        
        // Agregar filtros opcionales - CORREGIDO para acceder a propiedades correctas
        if (filters.customer_id) {
          queryParams.append('customer_id', filters.customer_id)
        }
        
        if (filters.payment_id) {
          queryParams.append('payment_id', filters.payment_id)
        }
        
        if (filters.status?.length) {
          filters.status.forEach((status: string) => queryParams.append('status', status))
        }
        
        if (filters.currency?.length) {
          filters.currency.forEach((currency: string) => queryParams.append('currency', currency))
        }
        
        if (filters.payment_method?.length) {
          filters.payment_method.forEach((method: string) => queryParams.append('payment_method', method))
        }
        
        if (filters.created?.gte) {
          queryParams.append('created[gte]', filters.created.gte)
        }
        
        if (filters.created?.lte) {
          queryParams.append('created[lte]', filters.created.lte)
        }
        
        if (filters.amount?.gte) {
          queryParams.append('amount[gte]', filters.amount.gte.toString())
        }
        
        if (filters.amount?.lte) {
          queryParams.append('amount[lte]', filters.amount.lte.toString())
        }

        if (filters.connector?.length) {
          filters.connector.forEach((connector: string) => queryParams.append('connector', connector))
        }

        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments?${queryParams}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        return {
          data: data.data || [],
          count: data.count || 0,
          has_more: data.has_more || false,
        }
      } catch (error) {
        handleHyperswitchError(error, 'list payments')
      }
    }),

  // Obtener detalles de un pago específico
  get: publicProcedure
    .input(z.object({ payment_id: z.string() }))
    .query(async ({ input, ctx }: { input: { payment_id: string }, ctx: TRPCContext }) => {
      try {
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${input.payment_id}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'get payment')
      }
    }),

  // Crear un nuevo pago
  create: publicProcedure
    .input(paymentCreateSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof paymentCreateSchema>, ctx: TRPCContext }) => {
      try {
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments`,
          {
            method: 'POST',
            headers: buildHyperswitchHeaders(ctx),
            body: JSON.stringify(input),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'create payment')
      }
    }),

  // Actualizar un pago existente
  update: publicProcedure
    .input(paymentUpdateSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof paymentUpdateSchema>, ctx: TRPCContext }) => {
      try {
        const { payment_id, ...updateData } = input
        
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${payment_id}`,
          {
            method: 'POST',
            headers: buildHyperswitchHeaders(ctx),
            body: JSON.stringify(updateData),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'update payment')
      }
    }),

  // Confirmar un pago
  confirm: publicProcedure
    .input(paymentConfirmSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof paymentConfirmSchema>, ctx: TRPCContext }) => {
      try {
        const { payment_id, ...confirmData } = input
        
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${payment_id}/confirm`,
          {
            method: 'POST',
            headers: buildHyperswitchHeaders(ctx),
            body: JSON.stringify(confirmData),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'confirm payment')
      }
    }),

  // Capturar un pago autorizado
  capture: publicProcedure
    .input(paymentCaptureSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof paymentCaptureSchema>, ctx: TRPCContext }) => {
      try {
        const { payment_id, ...captureData } = input
        
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${payment_id}/capture`,
          {
            method: 'POST',
            headers: buildHyperswitchHeaders(ctx),
            body: JSON.stringify(captureData),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'capture payment')
      }
    }),

  // Cancelar un pago
  cancel: publicProcedure
    .input(paymentCancelSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof paymentCancelSchema>, ctx: TRPCContext }) => {
      try {
        const { payment_id, ...cancelData } = input
        
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${payment_id}/cancel`,
          {
            method: 'POST',
            headers: buildHyperswitchHeaders(ctx),
            body: JSON.stringify(cancelData),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'cancel payment')
      }
    }),

  // Exportar pagos en múltiples formatos
  export: publicProcedure
   .input(paymentExportSchema)
.mutation(async ({ input, ctx }: { input: z.infer<typeof paymentExportSchema>, ctx: TRPCContext }) => {
  try {
    const filters = (input.filters ?? {}) as z.infer<typeof paymentsListSchema>;
    const { format, fields, include_pii } = input;

    // Obtener todos los pagos que coinciden con los filtros
    const queryParams = new URLSearchParams({
      limit: '1000', // Límite alto para exportación
      offset: '0',
    });

    // Aplicar filtros si existen - ya no dará error de tipado
    if (filters.customer_id) {
      queryParams.append('customer_id', filters.customer_id);
    }
    if (filters.status?.length) {
      filters.status.forEach((status: string) => queryParams.append('status', status));
    }
    if (filters.currency?.length) {
      filters.currency.forEach((currency: string) => queryParams.append('currency', currency));
    }
    if (filters.created?.gte) {
      queryParams.append('created[gte]', filters.created.gte);
    }
    if (filters.created?.lte) {
      queryParams.append('created[lte]', filters.created.lte);
    }


        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments?${queryParams}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const payments = data.data || []
        
        // Formatear datos para exportación
        const exportData = payments.map((payment: PaymentResponse) => {
          const formatted = formatPaymentForExport(payment)
          
          // Remover información sensible si no se incluye PII
          if (!include_pii && 'client_secret' in formatted) {
            const { client_secret, ...safeData } = formatted
            return safeData
          }
          
          return formatted
        })
        
        let content: string
        let contentType: string
        
        switch (format) {
          case 'csv':
            const headers = fields || Object.keys(exportData[0] || {})
            const csvRows = [
              headers.join(','),
              ...exportData.map((row: Record<string, any>) => 
                headers.map((field: string) => {
                  const value = row[field]
                  return typeof value === 'string' && value.includes(',') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : String(value || '')
                }).join(',')
              )
            ]
            content = csvRows.join('\n')
            contentType = 'text/csv'
            break
            
          case 'json':
            content = JSON.stringify(exportData, null, 2)
            contentType = 'application/json'
            break
            
          case 'xlsx':
            // Para XLSX se podría implementar con una librería como xlsx
            // Por simplicidad, devolvemos CSV con header diferente
            const xlsxHeaders = fields || Object.keys(exportData[0] || {})
            const xlsxRows = [
              xlsxHeaders.join(','),
              ...exportData.map((row: Record<string, any>) => 
                xlsxHeaders.map((field: string) => {
                  const value = row[field]
                  return typeof value === 'string' && value.includes(',') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : String(value || '')
                }).join(',')
              )
            ]
            content = xlsxRows.join('\n')
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            break
            
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported export format',
            })
        }
        
        return {
          content,
          contentType,
          filename: `payments-export-${new Date().toISOString().split('T')[0]}.${format}`,
          count: exportData.length,
        }
      } catch (error) {
        handleHyperswitchError(error, 'export payments')
      }
    }),

  // Obtener métodos de pago disponibles
  methods: publicProcedure
    .input(paymentMethodsSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof paymentMethodsSchema>, ctx: TRPCContext }) => {
      try {
        const queryParams = new URLSearchParams()
        
        if (input.currency) {
          queryParams.append('currency', input.currency)
        }
        
        if (input.country) {
          queryParams.append('country', input.country)
        }
        
        if (input.amount) {
          queryParams.append('amount', input.amount.toString())
        }
        
        if (input.customer_id) {
          queryParams.append('customer_id', input.customer_id)
        }

        if (input.business_country) {
          queryParams.append('business_country', input.business_country)
        }

        if (input.business_label) {
          queryParams.append('business_label', input.business_label)
        }

        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payment_methods?${queryParams}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'get payment methods')
      }
    }),

  // Obtener estadísticas de pagos
  stats: publicProcedure
    .input(paymentStatsSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof paymentStatsSchema>, ctx: TRPCContext }) => {
      try {
        const queryParams = new URLSearchParams({
          granularity: input.granularity,
        })
        
        if (input.time_range) {
          queryParams.append('start_time', input.time_range.start_time)
          queryParams.append('end_time', input.time_range.end_time)
        }

        if (input.connector?.length) {
          input.connector.forEach((connector: string) => queryParams.append('connector', connector))
        }

        if (input.currency?.length) {
          input.currency.forEach((currency: string) => queryParams.append('currency', currency))
        }

        if (input.payment_method?.length) {
          input.payment_method.forEach((method: string) => queryParams.append('payment_method', method))
        }

        if (input.status?.length) {
          input.status.forEach((status: string) => queryParams.append('status', status))
        }

        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/analytics/payments?${queryParams}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'get payment stats')
      }
    }),

  // Obtener intentos de pago de un pago específico
  attempts: publicProcedure
    .input(z.object({ payment_id: z.string() }))
    .query(async ({ input, ctx }: { input: { payment_id: string }, ctx: TRPCContext }) => {
      try {
        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${input.payment_id}/attempts`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'get payment attempts')
      }
    }),

  // Obtener sesión de pago para SDK
  session: publicProcedure
    .input(z.object({ 
      payment_id: z.string(),
      client_secret: z.string().optional()
    }))
    .query(async ({ input, ctx }: { input: { payment_id: string, client_secret?: string }, ctx: TRPCContext }) => {
      try {
        const queryParams = new URLSearchParams()
        
        if (input.client_secret) {
          queryParams.append('client_secret', input.client_secret)
        }

        const response = await fetch(
          `${ctx.hyperswitchBaseUrl}/payments/${input.payment_id}/session_tokens?${queryParams}`,
          {
            method: 'GET',
            headers: buildHyperswitchHeaders(ctx),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        handleHyperswitchError(error, 'get payment session')
      }
    }),
})