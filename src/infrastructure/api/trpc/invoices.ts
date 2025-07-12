// /home/kali/multipaga/src/infrastructure/api/trpc/invoices.ts
// ──────────────────────────────────────────────────────────────────────────────
// Invoices Router - Router tRPC especializado para manejo de facturas
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './context'

/**
 * Schemas de validación para invoices
 */

// Schema para filtros de lista de invoices
const InvoiceListSchema = z.object({
  // Paginación
  limit: z.number().min(1).max(100).default(20),
  starting_after: z.string().optional(),
  offset: z.number().min(0).default(0),
  
  // Filtros de búsqueda
  search: z.string().optional(),
  customer_id: z.string().optional(),
  
  // Filtros de estado
  status: z.array(
    z.enum(['draft', 'open', 'paid', 'uncollectible', 'void'])
  ).optional(),
  
  // Filtros de moneda (como array para múltiples monedas)
  currency: z.array(z.string().length(3)).optional(),
  
  // Filtros de monto
  amount_gte: z.number().positive().optional(),
  amount_lte: z.number().positive().optional(),
  
  // Filtros de fecha de vencimiento (como timestamps Unix)
  due_date: z.object({
    gte: z.number().optional(),
    lte: z.number().optional(),
  }).optional(),
  
  // Filtros de fecha de creación (como ISO strings)
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
})

// Schema para crear invoice
const InvoiceCreateSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  description: z.string().max(1000).optional(),
  due_date: z.number().int().positive().optional(), // Unix timestamp
  auto_advance: z.boolean().default(true),
  collection_method: z.enum(['charge_automatically', 'send_invoice']).default('send_invoice'),
  payment_settings: z.object({
    payment_method_types: z.array(z.string()).optional(),
    default_mandate: z.string().optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
  
  // Line items
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive().default(1),
    unit_amount: z.number().positive(),
    currency: z.string().length(3),
    metadata: z.record(z.string()).optional(),
  })).min(1, 'At least one line item is required'),
  
  // Configuración de envío
  invoice_settings: z.object({
    default_payment_method: z.string().optional(),
    footer: z.string().max(5000).optional(),
    custom_fields: z.array(z.object({
      name: z.string().max(30),
      value: z.string().max(30),
    })).max(4).optional(),
  }).optional(),
})

// Schema para actualizar invoice
const InvoiceUpdateSchema = z.object({
  invoice_id: z.string().min(1),
  description: z.string().max(1000).optional(),
  due_date: z.number().int().positive().optional(),
  metadata: z.record(z.string()).optional(),
  footer: z.string().max(5000).optional(),
  auto_advance: z.boolean().optional(),
})

// Schema para enviar invoice
const InvoiceSendSchema = z.object({
  invoice_id: z.string().min(1),
  email: z.string().email().optional(),
  send_email: z.boolean().default(true),
  delivery_method: z.enum(['email', 'sms', 'print']).default('email'),
})

// Schema para anular invoice
const InvoiceVoidSchema = z.object({
  invoice_id: z.string().min(1),
  reason: z.string().max(1000).optional(),
})

// Schema para eliminar invoice
const InvoiceDeleteSchema = z.object({
  invoice_id: z.string().min(1),
})

// Schema para estadísticas
const InvoiceStatsSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  currency: z.string().length(3).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
}).optional()

/**
 * Tipos TypeScript para las respuestas
 */
export interface InvoiceResponse {
  id: string
  object: 'invoice'
  customer_id: string
  subscription_id?: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  amount_due: number
  amount_paid: number
  amount_remaining: number
  total: number
  currency: string
  created: number
  updated: number
  due_date?: number
  description?: string
  hosted_invoice_url?: string
  invoice_pdf?: string
  number?: string
  payment_intent?: string
  period_end: number
  period_start: number
  lines: {
    object: 'list'
    data: InvoiceLineItem[]
    has_more: boolean
    total_count: number
  }
  metadata: Record<string, string>
  auto_advance: boolean
  collection_method: 'charge_automatically' | 'send_invoice'
  attempt_count: number
  attempted: boolean
  billing_reason: string
  charge?: string
  default_payment_method?: string
  default_source?: string
  discount?: any
  discounts?: any[]
  ending_balance?: number
  footer?: string
  receipt_number?: string
  starting_balance?: number
  statement_descriptor?: string
  status_transitions: {
    finalized_at?: number
    marked_uncollectible_at?: number
    paid_at?: number
    voided_at?: number
  }
  tax?: number
  threshold_reason?: any
  webhooks_delivered_at?: number
}

export interface InvoiceLineItem {
  id: string
  object: 'line_item'
  amount: number
  currency: string
  description?: string
  quantity: number
  unit_amount?: number
  metadata: Record<string, string>
  period: {
    start: number
    end: number
  }
  type: 'invoiceitem' | 'subscription'
}

export interface InvoiceListResponse {
  object: 'list'
  data: InvoiceResponse[]
  has_more: boolean
  total_count: number
  url: string
}

export interface InvoiceStats {
  total_invoices: number
  draft_invoices: number
  open_invoices: number
  paid_invoices: number
  void_invoices: number
  uncollectible_invoices: number
  overdue_invoices: number
  outstanding_amount: number
  total_amount_paid: number
  average_invoice_amount: number
  conversion_rate: number // Porcentaje de invoices pagados
  average_days_to_pay: number
}

/**
 * Utilidades para transformar datos
 */
function transformListFilters(input: z.infer<typeof InvoiceListSchema>) {
  const params: Record<string, any> = {
    limit: input.limit,
    offset: input.offset,
  }

  // Paginación con cursor
  if (input.starting_after) {
    params.starting_after = input.starting_after
  }

  // Búsqueda por texto
  if (input.search) {
    params.search = input.search
  }

  // Filtro por customer
  if (input.customer_id) {
    params.customer = input.customer_id
  }

  // Filtros de estado (convertir array a string separado por comas)
  if (input.status && input.status.length > 0) {
    params.status = input.status.join(',')
  }

  // Filtros de moneda (solo tomar la primera si es array)
  if (input.currency && input.currency.length > 0) {
    params.currency = input.currency[0] // Hyperswitch espera string, no array
  }

  // Filtros de monto
  if (input.amount_gte) {
    params.amount_gte = Math.round(input.amount_gte * 100) // Convertir a centavos
  }
  if (input.amount_lte) {
    params.amount_lte = Math.round(input.amount_lte * 100) // Convertir a centavos
  }

  // Filtros de fecha de vencimiento
  if (input.due_date) {
    if (input.due_date.gte) {
      params.due_date_gte = input.due_date.gte
    }
    if (input.due_date.lte) {
      params.due_date_lte = input.due_date.lte
    }
  }

  // Filtros de fecha de creación
  if (input.created_after) {
    params.created_after = input.created_after
  }
  if (input.created_before) {
    params.created_before = input.created_before
  }

  return params
}

function calculateInvoiceStats(invoices: InvoiceResponse[]): InvoiceStats {
  const stats: InvoiceStats = {
    total_invoices: invoices.length,
    draft_invoices: 0,
    open_invoices: 0,
    paid_invoices: 0,
    void_invoices: 0,
    uncollectible_invoices: 0,
    overdue_invoices: 0,
    outstanding_amount: 0,
    total_amount_paid: 0,
    average_invoice_amount: 0,
    conversion_rate: 0,
    average_days_to_pay: 0,
  }

  let totalAmount = 0
  let paidAmount = 0
  let daysToPay = 0
  let paidCount = 0
  const now = Date.now() / 1000

  invoices.forEach(invoice => {
    // Contar por estado
    switch (invoice.status) {
      case 'draft':
        stats.draft_invoices++
        break
      case 'open':
        stats.open_invoices++
        // Verificar si está vencido
        if (invoice.due_date && invoice.due_date < now) {
          stats.overdue_invoices++
        }
        break
      case 'paid':
        stats.paid_invoices++
        paidCount++
        if (invoice.status_transitions.paid_at) {
          daysToPay += (invoice.status_transitions.paid_at - invoice.created) / (24 * 60 * 60)
        }
        break
      case 'void':
        stats.void_invoices++
        break
      case 'uncollectible':
        stats.uncollectible_invoices++
        break
    }

    // Sumar montos
    totalAmount += invoice.total
    paidAmount += invoice.amount_paid
    
    // Outstanding amount (solo invoices abiertos)
    if (invoice.status === 'open') {
      stats.outstanding_amount += invoice.amount_remaining
    }
  })

  stats.total_amount_paid = paidAmount
  stats.average_invoice_amount = totalAmount / Math.max(invoices.length, 1)
  stats.conversion_rate = (stats.paid_invoices / Math.max(stats.total_invoices, 1)) * 100
  stats.average_days_to_pay = daysToPay / Math.max(paidCount, 1)

  return stats
}

/**
 * Router de invoices
 */
export const invoicesRouter = router({
  /**
   * Listar invoices con filtros avanzados
   */
  list: protectedProcedure
    .input(InvoiceListSchema)
    .query(async ({ input, ctx }) => {
      try {
        const params = transformListFilters(input)
        
        const response = await ctx.hyperswitchClient.get('/invoices', {
          params: {
            ...params,
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
          }
        })

        return {
          data: response.data || [],
          has_more: response.has_more || false,
          total_count: response.total_count || 0,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Obtener un invoice por ID
   */
  get: protectedProcedure
    .input(z.object({ invoice_id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const invoice = await ctx.hyperswitchClient.get(`/invoices/${input.invoice_id}`)
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Invoice not found: ${input.invoice_id}`,
        })
      }
    }),

  /**
   * Crear un nuevo invoice
   */
  create: protectedProcedure
    .input(InvoiceCreateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoice = await ctx.hyperswitchClient.post('/invoices', {
          ...input,
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        })
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Actualizar un invoice existente
   */
  update: protectedProcedure
    .input(InvoiceUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_id, ...updateData } = input
        const invoice = await ctx.hyperswitchClient.patch(
          `/invoices/${invoice_id}`,
          updateData
        )
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Enviar un invoice al cliente
   */
  send: protectedProcedure
    .input(InvoiceSendSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_id, ...sendData } = input
        const result = await ctx.hyperswitchClient.post(
          `/invoices/${invoice_id}/send`,
          sendData
        )
        return result
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Finalizar un invoice draft (convertirlo a open)
   */
  finalize: protectedProcedure
    .input(z.object({ 
      invoice_id: z.string().min(1),
      auto_advance: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_id, ...finalizeData } = input
        const invoice = await ctx.hyperswitchClient.post(
          `/invoices/${invoice_id}/finalize`,
          finalizeData
        )
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to finalize invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Anular un invoice (void)
   */
  void: protectedProcedure
    .input(InvoiceVoidSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_id, ...voidData } = input
        const invoice = await ctx.hyperswitchClient.post(
          `/invoices/${invoice_id}/void`,
          voidData
        )
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to void invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Marcar como incobrable
   */
  markUncollectible: protectedProcedure
    .input(z.object({ 
      invoice_id: z.string().min(1),
      reason: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_id, ...markData } = input
        const invoice = await ctx.hyperswitchClient.post(
          `/invoices/${invoice_id}/mark_uncollectible`,
          markData
        )
        return invoice
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to mark invoice as uncollectible: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Eliminar un invoice draft
   */
  delete: protectedProcedure
    .input(InvoiceDeleteSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.hyperswitchClient.delete(`/invoices/${input.invoice_id}`)
        return { 
          success: true, 
          invoice_id: input.invoice_id,
          message: 'Invoice deleted successfully' 
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Obtener estadísticas de invoices
   */
  stats: protectedProcedure
    .input(InvoiceStatsSchema)
    .query(async ({ input, ctx }) => {
      try {
        // Obtener todos los invoices para calcular estadísticas
        const response = await ctx.hyperswitchClient.get('/invoices', {
          params: {
            limit: 1000, // Obtener un número grande para estadísticas
            ...input,
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
          }
        })

        const invoices: InvoiceResponse[] = response.data || []
        const stats = calculateInvoiceStats(invoices)

        return stats
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch invoice statistics',
        })
      }
    }),

  /**
   * Obtener el PDF de un invoice
   */
  getPdf: protectedProcedure
    .input(z.object({ invoice_id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const response = await ctx.hyperswitchClient.get(
          `/invoices/${input.invoice_id}/pdf`,
          {
            responseType: 'blob'
          }
        )
        return {
          pdf_url: response.url || response.invoice_pdf,
          invoice_id: input.invoice_id,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Buscar invoices por texto
   */
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const results = await ctx.hyperswitchClient.get('/invoices/search', {
          params: {
            q: input.query,
            limit: input.limit,
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
          }
        })
        return results
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search invoices',
        })
      }
    }),
})

/**
 * Tipo del router para usar en el cliente
 */
export type InvoicesRouter = typeof invoicesRouter

/**
 * Export default para compatibilidad
 */
export default invoicesRouter