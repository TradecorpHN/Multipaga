// src/infrastructure/api/trpc/remittances.ts
// ──────────────────────────────────────────────────────────────────────────────
// tRPC Router - Remittances usando conector Lafise de Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Parser as Json2csvParser } from 'json2csv'
// ✅ CORRECCIÓN: Importar las exportaciones correctas del router
import { router, publicProcedure, middleware } from './router'
import type { Context } from './router'

// ========== CREAR PROTECTED PROCEDURE LOCALMENTE ==========
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
      apiKey: apiKey || process.env.HYPERSWITCH_API_KEY,
    },
  })
})

const protectedProcedure = publicProcedure.use(authMiddleware)

// ========== SCHEMAS PARA REMESAS ==========
const RemittanceValidationSchema = z.object({
  remittance_code: z.string().min(1, 'Remittance code is required'),
  beneficiary_phone: z.string().min(1, 'Beneficiary phone is required'),
  beneficiary_name: z.string().min(1, 'Beneficiary name is required'),
  beneficiary_last_name: z.string().min(1, 'Beneficiary last name is required'),
  beneficiary_identification: z.string().min(1, 'Beneficiary identification is required'),
  beneficiary_id_type: z.string().default('CED_IDE'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  country: z.string().length(2, 'Country must be 2 characters').default('NI'),
  remittance_provider: z.string().default('LAFISE'),
  user_name: z.string().default('default'),
  description: z.string().optional(),
})

const RemittancePaymentSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  transaction_number_id: z.string().min(1, 'Transaction number ID is required'),
})

const RemittanceStatusCheckSchema = z.object({
  remittance_code: z.string().min(1, 'Remittance code is required'),
  country: z.string().length(2).default('NI'),
  beneficiary_phone: z.string().optional(),
  external_reference: z.string().optional(),
  remittance_provider: z.string().default('LAFISE'),
  user_name: z.string().default('default'),
})

const RemittanceDetailsSchema = z.object({
  remittance_code: z.string().min(1, 'Remittance code is required'),
  country: z.string().length(2).default('NI'),
  remittance_provider: z.string().default('LAFISE'),
  user_name: z.string().default('default'),
})

const RemittanceListSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  status: z.array(z.string()).optional(),
  type: z.enum(['inbound', 'outbound']).optional(),
  source_country: z.string().optional(),
  destination_country: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  reference_number: z.string().optional(),
  sender_name: z.string().optional(),
  recipient_name: z.string().optional(),
})

const RemittanceStatsSchema = z.object({
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
})

// ========== ROUTER DE REMESAS ==========
export const remittancesRouter = router({
  /**
   * Verifica si el servicio de remesas está disponible
   */
  isAvailable: publicProcedure.query(async ({ ctx }: { ctx: Context }) => {
    try {
      // Verificar conectividad con Hyperswitch para remesas
      const health = await ctx.hyperswitchClient.get('/health')
      // En un escenario real, aquí verificarías específicamente el conector Lafise
      return { is_available: true, provider: 'LAFISE', status: 'active' }
    } catch (error) {
      return { is_available: false, provider: 'LAFISE', status: 'inactive' }
    }
  }),

  /**
   * Valida una remesa antes de procesarla
   */
  validate: protectedProcedure
    .input(RemittanceValidationSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof RemittanceValidationSchema>, ctx: Context }) => {
      try {
        // Crear pago usando Hyperswitch con conector Lafise
        const paymentPayload = {
          amount: Math.round(input.amount * 100), // Convertir a centavos
          currency: input.currency,
          confirm: false,
          payment_method: 'bank_transfer',
          description: input.description || `Remittance to ${input.beneficiary_name}`,
          metadata: {
            remittance_code: input.remittance_code,
            beneficiary_phone: input.beneficiary_phone,
            beneficiary_name: input.beneficiary_name,
            beneficiary_last_name: input.beneficiary_last_name,
            beneficiary_identification: input.beneficiary_identification,
            beneficiary_id_type: input.beneficiary_id_type,
            country: input.country,
            remittance_provider: input.remittance_provider,
            user_name: input.user_name,
            type: 'remittance_validation'
          },
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
          // Configuración específica para el conector Lafise
          connector: 'lafise',
          payment_method_data: {
            bank_transfer: {
              remittance_data: {
                beneficiary_name: `${input.beneficiary_name} ${input.beneficiary_last_name}`,
                beneficiary_phone: input.beneficiary_phone,
                beneficiary_identification: input.beneficiary_identification,
                beneficiary_id_type: input.beneficiary_id_type,
                remittance_code: input.remittance_code,
                country: input.country,
              }
            }
          }
        }

        const payment = await ctx.hyperswitchClient.post('/payments', paymentPayload)

        return {
          success: true,
          payment_id: payment.payment_id,
          transaction_id: payment.connector_transaction_id || payment.payment_id,
          status: payment.status,
          message: 'Remittance validated successfully',
          data: {
            ...payment,
            transaction_number_id: payment.connector_metadata?.transaction_number_id || `tnx_${Date.now()}`
          },
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to validate remittance: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Procesa el pago de una remesa validada
   */
  processPayment: protectedProcedure
    .input(RemittancePaymentSchema)
    .mutation(async ({ input, ctx }: { input: z.infer<typeof RemittancePaymentSchema>, ctx: Context }) => {
      try {
        // Confirmar el pago en Hyperswitch
        const payment = await ctx.hyperswitchClient.post(
          `/payments/${input.payment_id}/confirm`,
          {
            payment_method_data: {
              bank_transfer: {
                transaction_number_id: input.transaction_number_id
              }
            }
          }
        )

        return {
          success: true,
          transaction_id: payment.connector_transaction_id || payment.payment_id,
          status: payment.status,
          message: 'Remittance payment processed successfully',
          data: payment,
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to process remittance payment: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Verifica el estado de una remesa
   */
  checkStatus: protectedProcedure
    .input(RemittanceStatusCheckSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof RemittanceStatusCheckSchema>, ctx: Context }) => {
      try {
        // Buscar pagos por metadata para encontrar la remesa
        const payments = await ctx.hyperswitchClient.get('/payments', {
          params: {
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
            limit: 10,
            metadata: {
              remittance_code: input.remittance_code,
              type: 'remittance_validation'
            }
          }
        })

        if (!payments.data || payments.data.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Remittance not found: ${input.remittance_code}`,
          })
        }

        const payment = payments.data[0]
        return {
          transaction_id: payment.connector_transaction_id || payment.payment_id,
          status: payment.status,
          remittance_code: input.remittance_code,
          amount: payment.amount ? payment.amount / 100 : 0, // Convertir de centavos
          currency: payment.currency,
          created_date: payment.created,
          modified_date: payment.modified,
          data: payment,
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to check remittance status: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Obtiene información detallada de una remesa
   */
  getDetails: protectedProcedure
    .input(RemittanceDetailsSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof RemittanceDetailsSchema>, ctx: Context }) => {
      try {
        // Buscar pagos por metadata
        const payments = await ctx.hyperswitchClient.get('/payments', {
          params: {
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
            limit: 10,
            metadata: {
              remittance_code: input.remittance_code,
              type: 'remittance_validation'
            }
          }
        })

        if (!payments.data || payments.data.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Remittance not found: ${input.remittance_code}`,
          })
        }

        const payment = payments.data[0]
        const metadata = payment.metadata || {}

        return {
          transaction_id: payment.connector_transaction_id || payment.payment_id,
          status: payment.status,
          remittance_code: input.remittance_code,
          amount: payment.amount ? payment.amount / 100 : 0,
          currency: payment.currency,
          sender_name: metadata.user_name || 'Unknown',
          beneficiary_name: metadata.beneficiary_name || 'Unknown',
          beneficiary_phone: metadata.beneficiary_phone || 'Unknown',
          created_date: payment.created,
          remittance_provider: metadata.remittance_provider || input.remittance_provider,
          data: payment,
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get remittance details: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Lista remesas con filtros
   */
  list: protectedProcedure
    .input(RemittanceListSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof RemittanceListSchema>, ctx: Context }) => {
      try {
        const queryParams: any = {
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
          limit: input.limit,
          offset: input.offset,
        }

        // Agregar filtros de fecha si están presentes
        if (input.created_after) queryParams.created_after = input.created_after
        if (input.created_before) queryParams.created_before = input.created_before

        const payments = await ctx.hyperswitchClient.get('/payments', {
          params: queryParams
        })

        // Filtrar solo remesas y transformar datos
        const remittances = (payments.data || [])
          .filter((payment: any) => payment.metadata?.type === 'remittance_validation')
          .map((payment: any) => {
            const metadata = payment.metadata || {}
            return {
              reference_number: metadata.remittance_code || payment.payment_id,
              type: 'outbound',
              sender_name: metadata.user_name || 'Unknown Sender',
              sender_country: 'US',
              recipient_name: metadata.beneficiary_name || 'Unknown Recipient',
              recipient_country: metadata.country || 'NI',
              send_amount: payment.amount ? payment.amount / 100 : 0,
              send_currency: payment.currency || 'USD',
              receive_amount: payment.amount ? (payment.amount / 100) * 33 : 0, // Estimación de conversión
              receive_currency: metadata.country === 'NI' ? 'NIO' : 
                               metadata.country === 'HN' ? 'HNL' : 'CRC',
              status: payment.status === 'succeeded' ? 'completed' : 
                     payment.status === 'failed' ? 'failed' : 'pending',
              created_at: payment.created,
              source_flag: '🇺🇸',
              destination_flag: metadata.country === 'NI' ? '🇳🇮' : 
                               metadata.country === 'HN' ? '🇭🇳' : '🇨🇷',
              tracking_url: `https://multipaga.com/track/${metadata.remittance_code || payment.payment_id}`,
            }
          })

        // Aplicar filtros del frontend
        let filteredRemittances = remittances
        if (input.status && input.status.length > 0) {
          filteredRemittances = filteredRemittances.filter((r: any) => input.status!.includes(r.status))
        }
        if (input.type) {
          filteredRemittances = filteredRemittances.filter((r: any) => r.type === input.type)
        }
        if (input.reference_number) {
          filteredRemittances = filteredRemittances.filter((r: any) => 
            r.reference_number.toLowerCase().includes(input.reference_number!.toLowerCase())
          )
        }
        if (input.sender_name) {
          filteredRemittances = filteredRemittances.filter((r: any) => 
            r.sender_name.toLowerCase().includes(input.sender_name!.toLowerCase())
          )
        }
        if (input.recipient_name) {
          filteredRemittances = filteredRemittances.filter((r: any) => 
            r.recipient_name.toLowerCase().includes(input.recipient_name!.toLowerCase())
          )
        }

        return {
          data: filteredRemittances,
          total_count: filteredRemittances.length,
          has_more: filteredRemittances.length === input.limit,
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to list remittances: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Obtiene estadísticas de remesas
   */
  stats: protectedProcedure
    .input(RemittanceStatsSchema)
    .query(async ({ input, ctx }: { input: z.infer<typeof RemittanceStatsSchema>, ctx: Context }) => {
      try {
        // Obtener estadísticas desde analytics de Hyperswitch
        const analyticsParams: any = {
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }

        if (input.created_after) analyticsParams.created_after = input.created_after
        if (input.created_before) analyticsParams.created_before = input.created_before

        // Mock stats basado en datos reales que podrían venir de Hyperswitch
        return {
          total_volume: 250000,
          total_transfers: 45,
          success_rate: 98.5,
          average_transfer_amount: 55556,
          new_transfers_this_month: 12,
          inbound_count: 15,
          outbound_count: 30,
          pending_count: 2,
          popular_corridors: [
            {
              flag_from: '🇺🇸',
              flag_to: '🇳🇮',
              count: 25,
              volume: 125000,
            },
            {
              flag_from: '🇺🇸',
              flag_to: '🇭🇳',
              count: 18,
              volume: 90000,
            },
            {
              flag_from: '🇺🇸',
              flag_to: '🇨🇷',
              count: 12,
              volume: 60000,
            },
          ],
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get remittance statistics: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Exporta remesas en formato CSV o JSON
   */
  export: protectedProcedure
    .input(
      RemittanceListSchema.extend({
        format: z.enum(['csv', 'json']).default('csv'),
      })
    )
    .mutation(async ({ input, ctx }: { input: z.infer<typeof RemittanceListSchema> & { format: 'csv' | 'json' }, ctx: Context }) => {
      try {
        const { format, ...listParams } = input

        // Reutilizar la lógica de list para obtener datos
        const remittancesResult = await ctx.hyperswitchClient.get('/payments', {
          params: {
            merchant_id: ctx.merchantId,
            profile_id: ctx.profileId,
            limit: listParams.limit,
            offset: listParams.offset,
          }
        })

        const data = (remittancesResult.data || [])
          .filter((payment: any) => payment.metadata?.type === 'remittance_validation')
          .map((payment: any) => {
            const metadata = payment.metadata || {}
            return {
              reference_number: metadata.remittance_code || payment.payment_id,
              type: 'outbound',
              sender_name: metadata.user_name || 'Unknown Sender',
              recipient_name: metadata.beneficiary_name || 'Unknown Recipient',
              amount: payment.amount ? payment.amount / 100 : 0,
              currency: payment.currency || 'USD',
              status: payment.status === 'succeeded' ? 'completed' : 
                     payment.status === 'failed' ? 'failed' : 'pending',
              created_at: payment.created,
            }
          })

        if (format === 'json') {
          return {
            format: 'json',
            data,
            content: JSON.stringify(data, null, 2),
            contentType: 'application/json',
            filename: `remittances-export-${new Date().toISOString().split('T')[0]}.json`,
          }
        }

        // Generar CSV usando json2csv como en el resto del sistema
        const fields = [
          'reference_number',
          'type',
          'sender_name',
          'recipient_name',
          'amount',
          'currency',
          'status',
          'created_at',
        ]
        const parser = new Json2csvParser({ fields, defaultValue: '' })
        const csv = parser.parse(data)

        return {
          format: 'csv',
          data,
          content: csv,
          contentType: 'text/csv',
          filename: `remittances-export-${new Date().toISOString().split('T')[0]}.csv`,
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to export remittances: ${error.message}`,
          cause: error,
        })
      }
    }),

  /**
   * Crea una nueva remesa
   */
  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive('Amount must be positive'),
        currency: z.string().length(3, 'Currency must be 3 characters'),
        remittance_code: z.string().min(1, 'Remittance code is required'),
        beneficiary_phone: z.string().min(1, 'Beneficiary phone is required'),
        beneficiary_name: z.string().min(1, 'Beneficiary name is required'),
        beneficiary_last_name: z.string().min(1, 'Beneficiary last name is required'),
        beneficiary_identification: z.string().min(1, 'Beneficiary identification is required'),
        country: z.string().length(2).default('NI'),
        description: z.string().optional(),
        auto_process: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }: { input: any, ctx: Context }) => {
      try {
        // Primero validar la remesa
        const validationPayload = {
          remittance_code: input.remittance_code,
          beneficiary_phone: input.beneficiary_phone,
          beneficiary_name: input.beneficiary_name,
          beneficiary_last_name: input.beneficiary_last_name,
          beneficiary_identification: input.beneficiary_identification,
          amount: input.amount,
          currency: input.currency,
          country: input.country,
          description: input.description,
        }

        // Crear pago para validación
        const paymentPayload = {
          amount: Math.round(input.amount * 100),
          currency: input.currency,
          confirm: input.auto_process,
          payment_method: 'bank_transfer',
          description: input.description || `Remittance to ${input.beneficiary_name}`,
          metadata: {
            ...validationPayload,
            type: 'remittance_validation'
          },
          merchant_id: ctx.merchantId,
          profile_id: ctx.profileId,
        }

        const payment = await ctx.hyperswitchClient.post('/payments', paymentPayload)

        return {
          success: true,
          payment_id: payment.payment_id,
          transaction_id: payment.connector_transaction_id || payment.payment_id,
          status: payment.status,
          message: input.auto_process 
            ? 'Remittance created and processed successfully'
            : 'Remittance created successfully. Call processPayment to complete.',
          auto_processed: input.auto_process,
          data: payment,
        }
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create remittance: ${error.message}`,
          cause: error,
        })
      }
    }),
})