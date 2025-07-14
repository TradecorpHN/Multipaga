import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hyperswitchClient } from '/home/kali/multipaga/src/infrastructure/api/clients/HyperswitchClient'
import type { 
  PaymentRequest, 
  PaymentResponse, 
  Connector
} from '@/types/hyperswitch'

// Lista de conectores válidos para validación
const validConnectors = [
  'adyen', 'stripe', 'checkout', 'square', 'braintree', 'worldpay',
  'paypal', 'razorpay', 'nuvei', 'shift4', 'cybersource', 'rapyd',
  'fiserv', 'globalpay', 'worldline', 'payu', 'klarna', 'mollie'
] as const

// Lista de estados de pago válidos (array literal para z.enum)
const paymentStatuses = [
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
] as const

// Schema de validación para crear pagos
const createPaymentSchema = z.object({
  amount: z.number().min(50, 'Monto mínimo: 50 centavos').max(999999999, 'Monto máximo excedido'),
  currency: z.string().min(3).max(3).toUpperCase(),
  customer_id: z.string().optional(),
  description: z.string().max(1000, 'Descripción muy larga').optional(),
  statement_descriptor: z.string().max(22, 'Descriptor muy largo').optional(),
  payment_method_type: z.enum([
    'card', 'wallet', 'bank_redirect', 'bank_transfer', 
    'pay_later', 'crypto', 'bank_debit', 'reward'
  ]).optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  return_url: z.string().url('URL inválida').optional(),
  metadata: z.record(z.any()).optional(),
  customer: z.object({
    name: z.string().max(100).optional(),
    email: z.string().email('Email inválido').optional(),
    phone: z.string().max(20).optional(),
    phone_country_code: z.string().max(5).optional(),
  }).optional(),
  billing: z.object({
    address: z.object({
      line1: z.string().max(100).optional(),
      line2: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
      state: z.string().max(50).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
      first_name: z.string().max(50).optional(),
      last_name: z.string().max(50).optional(),
    }).optional(),
    email: z.string().email().optional(),
  }).optional(),
  shipping: z.object({
    address: z.object({
      line1: z.string().max(100).optional(),
      line2: z.string().max(100).optional(),
      city: z.string().max(50).optional(),
      state: z.string().max(50).optional(),
      zip: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    }).optional(),
    name: z.string().max(100).optional(),
    email: z.string().email().optional(),
  }).optional(),
  // Corregido: Array de conectores válidos en lugar de strings genéricos
  connector: z.array(z.enum(validConnectors)).optional(),
  business_country: z.string().length(2).optional(),
  business_label: z.string().max(50).optional(),
  profile_id: z.string().optional(),
})

// Schema para listar pagos - Corregido el enum de estados
const listPaymentsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  customer_id: z.string().optional(),
  payment_id: z.string().optional(),
  profile_id: z.string().optional(),
  created: z.string().optional(), // ISO date
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  // Corregido: usar array literal en lugar de tipo
  status: z.enum(paymentStatuses).optional(),
  currency: z.string().length(3).optional(),
  amount: z.coerce.number().optional(),
  connector: z.string().optional(),
})

// Interfaz para la respuesta de listado de pagos
interface PaymentListResponse {
  data: PaymentResponse[]
  has_more: boolean
  total_count: number
}

// GET /api/payments - Listar pagos
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    
    // Validar parámetros
    const validatedParams = listPaymentsSchema.parse(searchParams)
    
    // Construir query string para Hyperswitch
    const queryParams = new URLSearchParams()
    Object.entries(validatedParams).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value))
      }
    })
    
    // Realizar petición a Hyperswitch usando método público tipado
    const paymentsResponse = await hyperswitchClient.get<PaymentListResponse>(
      `/payments/list`,
      Object.fromEntries(queryParams.entries())
    ) as PaymentListResponse
    
    return NextResponse.json({
      success: true,
      data: paymentsResponse.data || [],
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: paymentsResponse.has_more || false,
        total_count: paymentsResponse.total_count || 0,
      }
    })

  } catch (error) {
    console.error('Error listing payments:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Parámetros inválidos',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    // Error de Hyperswitch
    if (typeof error === 'object' && error !== null && 'status_code' in error) {
      return NextResponse.json(
        { 
          success: false,
          error: (error as any).error_message || 'Error de Hyperswitch',
          code: (error as any).error_code 
        },
        { status: (error as any).status_code }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/payments - Crear pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos de entrada
    const validatedData = createPaymentSchema.parse(body)
    
    // Obtener merchant ID de headers (establecido por middleware)
    const merchantId = request.headers.get('x-merchant-id')
    
    if (!merchantId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Merchant ID no encontrado. Verifique su autenticación.' 
        },
        { status: 401 }
      )
    }
    
    // Preparar datos del pago con tipos correctos
    const paymentData: PaymentRequest = {
      ...validatedData,
      // Convertir el array de string a Connector[] si existe
      connector: validatedData.connector as Connector[] | undefined,
      // Agregar datos adicionales requeridos por Hyperswitch
      business_country: validatedData.business_country || 'HN',
      business_label: validatedData.business_label || 'TradecorpHN',
    }
    
    // Si no se especifica return_url, usar una por defecto
    if (!paymentData.return_url) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin')
      paymentData.return_url = `${baseUrl}/payments/complete`
    }
    
    // Crear pago en Hyperswitch usando método público tipado
    const payment = await hyperswitchClient.post<PaymentResponse>('/payments', paymentData)
    
    // Log del pago creado para auditoría
    console.info('Payment created:', {
      payment_id: payment.payment_id,
      merchant_id: merchantId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    })
    
    return NextResponse.json({
      success: true,
      data: payment
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating payment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos de pago inválidos',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    // Error de Hyperswitch
    if (typeof error === 'object' && error !== null && 'status_code' in error) {
      const hyperswitchError = error as any
      
      return NextResponse.json(
        { 
          success: false,
          error: hyperswitchError.error_message || 'Error procesando el pago',
          code: hyperswitchError.error_code,
          type: hyperswitchError.type 
        },
        { status: hyperswitchError.status_code }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// PUT /api/payments - Actualizar configuración de pagos (batch operations)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar que sea una operación de batch válida
    if (!body.operation || !body.payment_ids || !Array.isArray(body.payment_ids)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Operación de batch inválida. Se requiere operation y payment_ids.' 
        },
        { status: 400 }
      )
    }
    
    const { operation, payment_ids, ...operationData } = body
    
    if (payment_ids.length === 0 || payment_ids.length > 50) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Número de payment_ids inválido (1-50).' 
        },
        { status: 400 }
      )
    }
    
    const results = []
    const errors = []
    
    // Procesar operaciones en batch
    for (const paymentId of payment_ids) {
      try {
        let result: PaymentResponse
        
        switch (operation) {
          case 'cancel':
            result = await hyperswitchClient.post<PaymentResponse>(
              `/payments/${paymentId}/cancel`, 
              operationData
            )
            break
          case 'capture':
            result = await hyperswitchClient.post<PaymentResponse>(
              `/payments/${paymentId}/capture`, 
              operationData
            )
            break
          default:
            throw new Error(`Operación '${operation}' no soportada`)
        }
        
        results.push({
          payment_id: paymentId,
          success: true,
          data: result
        })
        
      } catch (error) {
        errors.push({
          payment_id: paymentId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      operation,
      results,
      errors,
      summary: {
        total: payment_ids.length,
        successful: results.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('Error in batch payment operation:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en operación de batch',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/payments - No soportado (los pagos no se pueden eliminar)
export async function DELETE() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Los pagos no pueden ser eliminados. Use cancelación en su lugar.' 
    },
    { status: 405 }
  )
}