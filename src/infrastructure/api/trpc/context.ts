// /home/kali/multipaga/src/infrastructure/api/trpc/context.ts
// ──────────────────────────────────────────────────────────────────────────────
// tRPC Context - Configuración base y contexto para tRPC
// ──────────────────────────────────────────────────────────────────────────────
import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import SuperJSON from 'superjson'
import { HyperswitchClient } from '../clients/HyperswitchClient'
import { env } from '../../../presentation/lib/env-config'
import type { NextRequest } from 'next/server'

/**
 * Contexto tRPC con autenticación e información de request
 */
export interface Context {
  req: NextRequest
  hyperswitchClient: HyperswitchClient
  merchantId?: string
  profileId?: string
  apiKey?: string
  userAgent?: string
  ipAddress?: string
}

/**
 * Inicialización de tRPC con transformador SuperJSON
 */
const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
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

/**
 * Router y procedimientos base
 */
export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// ✅ AGREGADO: Exportar createTRPCRouter (alias para router)
export const createTRPCRouter = t.router

/**
 * Middleware de autenticación para procedimientos protegidos
 */
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

/**
 * Procedimiento protegido que requiere autenticación
 */
export const protectedProcedure = publicProcedure.use(authMiddleware)

/**
 * Middleware de rate limiting
 */
const rateLimitMiddleware = middleware(async ({ ctx, next }) => {
  const ipAddress = ctx.req.headers.get('x-forwarded-for') ||
    ctx.req.headers.get('x-real-ip') ||
    'unknown'

  // TODO: Implementar rate limiting con Redis o memoria
  // Por ahora solo logging
  console.log(`[tRPC] Request from IP: ${ipAddress}`)

  return next({
    ctx: {
      ...ctx,
      ipAddress,
    },
  })
})

/**
 * Función para crear contexto tRPC
 */
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