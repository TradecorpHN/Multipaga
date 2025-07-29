// lib/error-utils.ts
// UTILIDADES DE MANEJO DE ERRORES: Gestión centralizada y robusta

import { NextResponse } from 'next/server'
import { z } from 'zod'

// ======================================================================
// TIPOS DE ERROR ESTANDARIZADOS
// ======================================================================

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code: string
    type: 'validation_error' | 'authentication_error' | 'authorization_error' | 
          'not_found_error' | 'rate_limit_error' | 'server_error' | 'network_error' | 
          'hyperswitch_error' | 'unknown_error'
    details?: any
    timestamp: string
    requestId?: string
  }
}

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  pagination?: {
    limit: number
    offset: number
    total_count: number
    has_more: boolean
    count: number
  }
  metadata?: Record<string, any>
}

// ======================================================================
// CLASES DE ERROR PERSONALIZADAS
// ======================================================================

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly type: ApiErrorResponse['error']['type']
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    type: ApiErrorResponse['error']['type'] = 'server_error',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.type = type
    this.details = details
    this.isOperational = isOperational

    // Capturar stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', 'validation_error', details)
    this.name = 'ValidationError'
  }

  static fromZod(error: z.ZodError): ValidationError {
    const firstError = error.errors[0]
    const message = `Validation failed: ${firstError.path.join('.')} - ${firstError.message}`
    return new ValidationError(message, {
      fields: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))
    })
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 401, 'AUTHENTICATION_ERROR', 'authentication_error', details)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 403, 'AUTHORIZATION_ERROR', 'authorization_error', details)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', 'not_found_error', details)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, 'RATE_LIMIT_ERROR', 'rate_limit_error', details)
    this.name = 'RateLimitError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error', details?: any) {
    super(message, 503, 'NETWORK_ERROR', 'network_error', details)
    this.name = 'NetworkError'
  }
}

export class HyperswitchError extends AppError {
  constructor(message: string, statusCode: number = 500, hyperswitchCode?: string, details?: any) {
    super(
      message, 
      statusCode, 
      hyperswitchCode || 'HYPERSWITCH_ERROR', 
      'hyperswitch_error', 
      details
    )
    this.name = 'HyperswitchError'
  }

  static fromHyperswitchResponse(response: any, statusCode: number): HyperswitchError {
    const error = response.error || response
    const message = error.message || error.error_message || 'Hyperswitch API error'
    const code = error.code || error.error_code || 'HYPERSWITCH_ERROR'
    
    return new HyperswitchError(message, statusCode, code, {
      originalError: response,
      hyperswitchCode: code,
    })
  }
}

// ======================================================================
// UTILIDADES DE RESPUESTA
// ======================================================================

export function createErrorResponse(
  error: AppError | Error | unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let type: ApiErrorResponse['error']['type'] = 'server_error'
  let message = 'Internal server error'
  let details: any = undefined

  if (error instanceof AppError) {
    statusCode = error.statusCode
    code = error.code
    type = error.type
    message = error.message
    details = error.details
  } else if (error instanceof Error) {
    message = error.message
    
    // Detectar tipos de error comunes
    if (error.name === 'AbortError') {
      statusCode = 408
      code = 'REQUEST_TIMEOUT'
      type = 'network_error'
      message = 'Request timeout'
    } else if (error.message.includes('fetch failed')) {
      statusCode = 503
      code = 'NETWORK_ERROR'
      type = 'network_error'
      message = 'Network connection failed'
    }
    
    // En desarrollo, incluir stack trace
    if (process.env.NODE_ENV === 'development') {
      details = { stack: error.stack }
    }
  }

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code,
      type,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    }
  }

  // Log del error para monitoring
  logError(error, { statusCode, code, type, requestId })

  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId || crypto.randomUUID(),
    }
  })
}

export function createSuccessResponse<T>(
  data: T,
  pagination?: ApiSuccessResponse<T>['pagination'],
  metadata?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(pagination && { pagination }),
    ...(metadata && { metadata }),
  }

  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

// ======================================================================
// UTILIDADES DE LOGGING
// ======================================================================

interface LogContext {
  statusCode?: number
  code?: string
  type?: string
  requestId?: string
  userId?: string
  merchantId?: string
  endpoint?: string
  method?: string
  duration?: number
  userAgent?: string
  ip?: string
  [key: string]: any
}

export function logError(error: unknown, context: LogContext = {}): void {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    error: {
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    },
    context,
  }

  // En producción, usar un servicio de logging real
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrar con servicio de logging (Sentry, DataDog, etc.)
    console.error('🚨 ERROR:', JSON.stringify(logData))
  } else {
    console.error('🚨 ERROR:', error)
    if (Object.keys(context).length > 0) {
      console.error('📋 Context:', context)
    }
  }
}

export function logInfo(message: string, context: LogContext = {}): void {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    context,
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ INFO:', JSON.stringify(logData))
  } else {
    console.log('ℹ️', message, context)
  }
}

export function logWarning(message: string, context: LogContext = {}): void {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'warning',
    message,
    context,
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING:', JSON.stringify(logData))
  } else {
    console.warn('⚠️', message, context)
  }
}

// ======================================================================
// UTILIDADES DE VALIDACIÓN
// ======================================================================

export function validateAndParseBody<T>(
  body: any,
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZod(error)
    }
    throw new ValidationError('Invalid request body format')
  }
}

export function validateAndParseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  try {
    const queryObject = Object.fromEntries(searchParams.entries())
    return schema.parse(queryObject)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZod(error)
    }
    throw new ValidationError('Invalid query parameters')
  }
}

// ======================================================================
// UTILIDADES DE AUTENTICACIÓN
// ======================================================================

export function requireAuth(authState: any): void {
  if (!authState?.isAuthenticated) {
    throw new AuthenticationError('Authentication required')
  }
  
  if (!authState.merchantId || !authState.profileId || !authState.apiKey) {
    throw new AuthenticationError('Invalid authentication context')
  }
}

export function requirePermission(userPermissions: string[], requiredPermission: string): void {
  if (!userPermissions.includes(requiredPermission)) {
    throw new AuthorizationError(`Permission required: ${requiredPermission}`)
  }
}

// ======================================================================
// WRAPPER PARA HANDLERS DE API
// ======================================================================

export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()
    
    try {
      const result = await handler(...args)
      
      const duration = Date.now() - startTime
      logInfo('Request completed successfully', {
        requestId,
        duration,
        handler: handler.name,
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      return createErrorResponse(error, requestId)
    }
  }
}

// ======================================================================
// UTILIDADES DE RETRY
// ======================================================================

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // No reintentar en errores 4xx (excepto 429)
      if (error instanceof AppError && 
          error.statusCode >= 400 && 
          error.statusCode < 500 && 
          error.statusCode !== 429) {
        throw error
      }
      
      if (attempt < maxRetries - 1) {
        const waitTime = delay * Math.pow(backoffMultiplier, attempt)
        logWarning(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
          waitTime,
        })
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError!
}

// ======================================================================
// EXPORT DEFAULT
// ======================================================================

export default {
  // Clases de error
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  HyperswitchError,
  
  // Utilidades de respuesta
  createErrorResponse,
  createSuccessResponse,
  
  // Utilidades de logging
  logError,
  logInfo,
  logWarning,
  
  // Utilidades de validación
  validateAndParseBody,
  validateAndParseQuery,
  
  // Utilidades de autenticación
  requireAuth,
  requirePermission,
  
  // Decoradores
  withErrorHandling,
  withRetry,
}