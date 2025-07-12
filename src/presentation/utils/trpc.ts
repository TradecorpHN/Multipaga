// src/presentation/utils/trpc.ts
// Configuración avanzada tRPC para Multipaga

import { createTRPCReact, inferReactQueryProcedureOptions } from '@trpc/react-query'
import { httpBatchLink, loggerLink, createTRPCProxyClient } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { env } from '../lib/env-config'

// ========================================
// IMPORTACIONES PARA EL SERVIDOR tRPC
// ========================================
import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateNextContextOptions } from '@trpc/server/adapters/next'

// ========================================
// CONTEXTO tRPC DEL SERVIDOR
// ========================================
// Define el tipo aquí si no lo exportas desde utils/trpc.ts
export interface TRPCContext {
  hyperswitchApiKey: string
  hyperswitchBaseUrl: string
  merchantId?: string
  profileId?: string
  userId?: string
}


export const createTRPCContext = async (opts: CreateNextContextOptions): Promise<TRPCContext> => {
  const { req } = opts

  // Extraer headers de autenticación
  const hyperswitchApiKey = process.env.HYPERSWITCH_API_KEY || req.headers['api-key'] as string
  const hyperswitchBaseUrl = process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io'

  // Extraer información del merchant desde headers
  const merchantId = req.headers['x-merchant-id'] as string
  const profileId = req.headers['x-profile-id'] as string
  const authorization = req.headers['authorization'] as string

  if (!hyperswitchApiKey) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key is required',
    })
  }

  return {
    hyperswitchApiKey,
    hyperswitchBaseUrl,
    merchantId,
    profileId,
    userId: authorization ? extractUserIdFromToken(authorization) : undefined,
  }
}

// Función auxiliar para extraer user ID del token JWT
function extractUserIdFromToken(authorization: string): string | undefined {
  try {
    const token = authorization.replace('Bearer ', '')
    // Aquí podrías decodificar el JWT si es necesario
    // Por ahora retornamos un placeholder
    return 'user_id_from_token'
  } catch {
    return undefined
  }
}

// ========================================
// INICIALIZACIÓN tRPC
// ========================================
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    }
  },
})

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.hyperswitchApiKey) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key is required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      // Garantiza que tenemos las credenciales
      hyperswitchApiKey: ctx.hyperswitchApiKey,
    },
  })
})

// ========================================
// EXPORTACIONES PARA CREAR ROUTERS
// ========================================
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure.use(isAuthenticated)
export const createCallerFactory = t.createCallerFactory

// ========================================
// CLIENTE REACT tRPC
// ========================================
// Importar tipo del router principal (esto debe existir en tu proyecto)
import type { AppRouter } from '../../infrastructure/api/trpc/router'

export const trpc = createTRPCReact<AppRouter>()

// ========================================
// CLIENTE VANILLA (Node, scripts)
// ========================================
export const trpcVanilla = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: getBaseUrl() + '/api/trpc',
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
        }
        const merchantId = getMerchantId()
        const profileId = getProfileId()
        const apiKey = getApiKey()
        if (merchantId) headers['x-merchant-id'] = merchantId
        if (profileId) headers['x-profile-id'] = profileId
        if (apiKey) headers['authorization'] = `Bearer ${apiKey}`
        return headers
      },
    }),
  ],
})

// ========================================
// CONFIGURACIÓN REACT QUERY/tRPC
// ========================================
export function getTRPCConfig() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry(failureCount, error: any) {
          if (error?.data?.code === 'UNAUTHORIZED') return false
          return failureCount < 3
        },
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
        onError: (error: any) => {
          console.error('tRPC Mutation Error:', error)
          if (error?.data?.code === 'UNAUTHORIZED') {
            window.location.href = '/login'
          }
        },
      },
    },
  })

  const trpcClient = trpc.createClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: getBaseUrl() + '/api/trpc',
        transformer: superjson,
        headers() {
          const headers: Record<string, string> = {
            'content-type': 'application/json',
          }
          const merchantId = getMerchantId()
          const profileId = getProfileId()
          const apiKey = getApiKey()
          if (merchantId) headers['x-merchant-id'] = merchantId
          if (profileId) headers['x-profile-id'] = profileId
          if (apiKey) headers['authorization'] = `Bearer ${apiKey}`
          return headers
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          }).catch((error) => {
            console.error('tRPC Network Error:', error)
            throw new Error('Network error: Unable to connect to the server')
          })
        },
      }),
    ],
  })

  return { queryClient, trpcClient }
}

// ========================================
// UTILS PARA HEADERS Y AUTENTICACIÓN
// ========================================
function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL
  return `http://localhost:${process.env.PORT ?? 3000}`
}

function getMerchantId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const authData = localStorage.getItem('multipaga_auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.merchantId || null
    }
  } catch (error) {
    console.warn('Error reading merchant ID from localStorage:', error)
  }
  return null
}

function getProfileId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const authData = localStorage.getItem('multipaga_auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.profileId || null
    }
  } catch (error) {
    console.warn('Error reading profile ID from localStorage:', error)
  }
  return null
}

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const authData = localStorage.getItem('multipaga_auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.apiKey || null
    }
  } catch (error) {
    console.warn('Error reading API key from localStorage:', error)
  }
  return null
}

// ========================================
// HOOKS PERSONALIZADOS DE INVALIDACIÓN
// ========================================
export function useInvalidatePaymentQueries() {
  const utils = trpc.useUtils()
  return {
    invalidatePayments: () => utils.payments.invalidate(),
    invalidatePayment: (paymentId: string) =>
      utils.payments.get.invalidate({ paymentId }),
    invalidatePaymentsList: () => utils.payments.list.invalidate(),
    invalidatePaymentStats: () => utils.payments.stats.invalidate(),
  }
}

export function useInvalidateCustomerQueries() {
  const utils = trpc.useUtils()
  return {
    invalidateCustomers: () => utils.customers.invalidate(),
    invalidateCustomer: (customerId: string) =>
      utils.customers.get.invalidate({ customerId }),
    invalidateCustomersList: () => utils.customers.list.invalidate(),
    invalidateCustomerStats: () => utils.customers.stats.invalidate(),
  }
}

export function useInvalidateRefundQueries() {
  const utils = trpc.useUtils()
  return {
    invalidateRefunds: () => utils.refunds.invalidate(),
    invalidateRefund: (refundId: string) =>
      utils.refunds.get.invalidate({ refundId }),
    invalidateRefundsList: () => utils.refunds.list.invalidate(),
    invalidateRefundStats: () => utils.refunds.stats.invalidate(),
  }
}

// ========================================
// MANEJO GLOBAL DE ERRORES tRPC
// ========================================
export function useTRPCErrorHandler() {
  return {
    handleError: (error: any) => {
      console.error('tRPC Error:', error)
      if (error?.data?.code === 'UNAUTHORIZED') {
        localStorage.removeItem('multipaga_auth')
        window.location.href = '/login'
        return
      }
      if (error?.data?.code === 'FORBIDDEN') {
        console.warn('Access forbidden:', error.message)
        return
      }
      if (error?.data?.code === 'TOO_MANY_REQUESTS') {
        console.warn('Rate limit exceeded:', error.message)
        return
      }
      console.error('Unexpected error:', error.message)
    },
  }
}

// ========================================
// TIPOS UTILITARIOS PARA ENTRADAS/SALIDAS DEL ROUTER
// ========================================
export type RouterInputs = {
  [K in keyof AppRouter['_def']['procedures']]: Parameters<
    AppRouter['_def']['procedures'][K]['call']
  >[0]
}

export type RouterOutputs = {
  [K in keyof AppRouter['_def']['procedures']]: Awaited<
    ReturnType<AppRouter['_def']['procedures'][K]['call']>
  >
}

export default trpc
