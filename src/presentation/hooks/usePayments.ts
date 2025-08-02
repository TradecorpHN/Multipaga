'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import toast from 'react-hot-toast';
import { z } from 'zod';
import pino from 'pino';

// Logger
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  browser: { asObject: true },
});

// ======================================================================
// SCHEMAS DE VALIDACIÓN
// ======================================================================

const PaymentSchema = z.object({
  payment_id: z.string().min(1),
  merchant_id: z.string().optional(),
  status: z.enum([
    'requires_payment_method',
    'requires_confirmation',
    'requires_capture',
    'processing',
    'requires_customer_action',
    'succeeded',
    'failed',
    'cancelled',
    'captured',
    'partially_captured',
    'partially_captured_and_capturable',
  ]),
  amount: z.number(),
  currency: z.string(),
  amount_capturable: z.number().optional(),
  amount_received: z.number().optional(),
  connector: z.string().optional(),
  client_secret: z.string().optional(),
  created: z.string().datetime(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  customer_id: z.string().optional(),
  connector_transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  cancellation_reason: z.string().optional(),
  capture_method: z.enum(['automatic', 'manual']).optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  profile_id: z.string().optional(),
  return_url: z.string().url().optional(),
  confirm: z.boolean().optional(),
});

const PaymentListResponseSchema = z.object({
  data: z.array(PaymentSchema).default([]),
  size: z.number().optional(),
  count: z.number().optional(),
  has_more: z.boolean().default(false),
  total_count: z.number().optional(),
});

const PaymentCreateRequestSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customer_id: z.string().optional(),
  description: z.string().max(1000).optional(),
  statement_descriptor: z.string().max(22).optional(),
  metadata: z.record(z.any()).optional(),
  return_url: z.string().url().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  confirm: z.boolean().default(false),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  profile_id: z.string().optional(),
  customer: z
    .object({
      name: z.string().max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
      phone_country_code: z.string().max(5).optional(),
    })
    .optional(),
  billing: z
    .object({
      address: z
        .object({
          line1: z.string().max(100).optional(),
          line2: z.string().max(100).optional(),
          city: z.string().max(50).optional(),
          state: z.string().max(50).optional(),
          zip: z.string().max(20).optional(),
          country: z.string().length(2).optional(),
          first_name: z.string().max(50).optional(),
          last_name: z.string().max(50).optional(),
        })
        .optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

const PaymentListRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  customer_id: z.string().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  created: z.string().optional(),
  created_lt: z.string().optional(),
  created_gt: z.string().optional(),
  created_lte: z.string().optional(),
  created_gte: z.string().optional(),
  status: z.string().optional(),
  connector: z.string().optional(),
  payment_method: z.string().optional(),
  payment_method_type: z.string().optional(),
});

// ======================================================================
// TIPOS EXPORTADOS
// ======================================================================

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>;
export type PaymentCreateRequest = z.infer<typeof PaymentCreateRequestSchema>;
export type PaymentListRequest = z.infer<typeof PaymentListRequestSchema>;
export type PaymentUpdateRequest = Partial<Pick<PaymentCreateRequest, 'description' | 'metadata'>>;
export type PaymentCaptureRequest = {
  amount_to_capture?: number;
  reason?: string;
  metadata?: Record<string, any>;
};

// ======================================================================
// ERROR HANDLING
// ======================================================================

export class PaymentApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentApiError';
  }

  static fromApiError(error: any): PaymentApiError {
    if (error?.error) {
      return new PaymentApiError(
        error.error.code || 'API_ERROR',
        error.error.message || 'Error desconocido',
        error.status || error.statusCode || 400,
        error.error.details
      );
    }

    return new PaymentApiError(
      'UNKNOWN_ERROR',
      error.message || 'Error desconocido',
      error.status || error.statusCode || 500,
      error
    );
  }

  static fromValidationError(error: z.ZodError): PaymentApiError {
    const firstError = error.errors[0];
    return new PaymentApiError(
      'VALIDATION_ERROR',
      `Error de validación en ${firstError.path.join('.')}: ${firstError.message}`,
      400,
      error.errors
    );
  }
}

// ======================================================================
// HOOK INTERFACE
// ======================================================================

interface UsePaymentsReturn {
  payments: Payment[];
  currentPayment: Payment | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  createPayment: (data: PaymentCreateRequest) => Promise<Payment>;
  getPayment: (paymentId: string) => Promise<Payment>;
  updatePayment: (paymentId: string, data: PaymentUpdateRequest) => Promise<Payment>;
  capturePayment: (paymentId: string, data?: PaymentCaptureRequest) => Promise<Payment>;
  cancelPayment: (paymentId: string, reason?: string) => Promise<Payment>;
  confirmPayment: (paymentId: string) => Promise<Payment>;
  listPayments: (params?: Partial<PaymentListRequest>) => Promise<void>;
  refreshPayments: () => Promise<void>;
  clearError: () => void;
}

// ======================================================================
// HOOK PRINCIPAL
// ======================================================================

export function usePayments(): UsePaymentsReturn {
  const { authState, fetchWithAuth, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastListParams, setLastListParams] = useState<PaymentListRequest>();

  // ======================================================================
  // PAYMENT OPERATIONS
  // ======================================================================

  const createPayment = useCallback(
    async (data: PaymentCreateRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        const validatedData = PaymentCreateRequestSchema.parse({
          ...data,
          business_country: data.business_country || 'HN',
          business_label: data.business_label || 'Multipaga',
          profile_id: data.profile_id || authState?.profileId,
        });

        logger.info({ data: validatedData }, 'Creating payment');

        const response = await fetchWithAuth<Payment>('payments', {
          method: 'POST',
          body: JSON.stringify(validatedData),
        });

        const payment = PaymentSchema.parse(response);

        setPayments((prev) => [payment, ...prev]);
        setCurrentPayment(payment);
        setTotalCount((prev) => prev + 1);

        toast.success('Pago creado exitosamente');
        logger.info({ paymentId: payment.payment_id }, 'Payment created successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al crear el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error }, 'Error creating payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [authState?.profileId, fetchWithAuth]
  );

  const getPayment = useCallback(
    async (paymentId: string): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info({ paymentId }, 'Fetching payment');

        const response = await fetchWithAuth<Payment>(`payments/${paymentId}`);
        const payment = PaymentSchema.parse(response);

        setCurrentPayment(payment);
        setPayments((prev) =>
          prev.some((p) => p.payment_id === paymentId)
            ? prev.map((p) => (p.payment_id === paymentId ? payment : p))
            : [payment, ...prev]
        );

        logger.info({ paymentId }, 'Payment fetched successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al obtener el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, paymentId }, 'Error fetching payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const updatePayment = useCallback(
    async (paymentId: string, data: PaymentUpdateRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info({ paymentId, data }, 'Updating payment');

        const response = await fetchWithAuth<Payment>(`payments/${paymentId}`, {
          method: 'POST', // Hyperswitch uses POST for updates
          body: JSON.stringify(data),
        });

        const payment = PaymentSchema.parse(response);

        setCurrentPayment(payment);
        setPayments((prev) =>
          prev.map((p) => (p.payment_id === paymentId ? payment : p))
        );

        toast.success('Pago actualizado exitosamente');
        logger.info({ paymentId }, 'Payment updated successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al actualizar el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, paymentId }, 'Error updating payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const capturePayment = useCallback(
    async (paymentId: string, data?: PaymentCaptureRequest): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info({ paymentId, data }, 'Capturing payment');

        const response = await fetchWithAuth<Payment>(`payments/${paymentId}/capture`, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        });

        const payment = PaymentSchema.parse(response);

        setCurrentPayment(payment);
        setPayments((prev) =>
          prev.map((p) => (p.payment_id === paymentId ? payment : p))
        );

        toast.success('Pago capturado exitosamente');
        logger.info({ paymentId }, 'Payment captured successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al capturar el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, paymentId }, 'Error capturing payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const cancelPayment = useCallback(
    async (paymentId: string, reason?: string): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info({ paymentId, reason }, 'Canceling payment');

        const body = reason ? { cancellation_reason: reason } : {};
        const response = await fetchWithAuth<Payment>(`payments/${paymentId}/cancel`, {
          method: 'POST',
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        const payment = PaymentSchema.parse(response);

        setCurrentPayment(payment);
        setPayments((prev) =>
          prev.map((p) => (p.payment_id === paymentId ? payment : p))
        );

        toast.success('Pago cancelado exitosamente');
        logger.info({ paymentId }, 'Payment canceled successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al cancelar el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, paymentId }, 'Error canceling payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const confirmPayment = useCallback(
    async (paymentId: string): Promise<Payment> => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info({ paymentId }, 'Confirming payment');

        const response = await fetchWithAuth<Payment>(`payments/${paymentId}/confirm`, {
          method: 'POST',
        });

        const payment = PaymentSchema.parse(response);

        setCurrentPayment(payment);
        setPayments((prev) =>
          prev.map((p) => (p.payment_id === paymentId ? payment : p))
        );

        toast.success('Pago confirmado exitosamente');
        logger.info({ paymentId }, 'Payment confirmed successfully');
        return payment;
      } catch (error) {
        let errorMessage = 'Error al confirmar el pago';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, paymentId }, 'Error confirming payment');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const listPayments = useCallback(
    async (params: Partial<PaymentListRequest> = {}): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const safeParams: PaymentListRequest = {
          limit: 20,
          offset: 0,
          ...params,
        };

        const validatedParams = PaymentListRequestSchema.parse(safeParams);
        setLastListParams(validatedParams);

        logger.info({ params: validatedParams }, 'Fetching payment list');

        const response = await fetchWithAuth<PaymentListResponse>('/payments/list', {
          method: 'POST',
          body: JSON.stringify(validatedParams),
        });

        const paymentList = PaymentListResponseSchema.parse(response);

        setPayments(paymentList.data);
        setTotalCount(paymentList.total_count || paymentList.count || paymentList.data.length);
        setHasMore(paymentList.has_more);

        logger.info(
          { count: paymentList.data.length, totalCount: paymentList.total_count },
          'Payment list fetched successfully'
        );
      } catch (error) {
        let errorMessage = 'Error al cargar los pagos';

        if (error instanceof z.ZodError) {
          errorMessage = PaymentApiError.fromValidationError(error).message;
        } else if (error instanceof PaymentApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        logger.error({ error, params }, 'Error listing payments');
        // Preserve existing payments on error
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const refreshPayments = useCallback(async (): Promise<void> => {
    if (lastListParams) {
      await listPayments(lastListParams);
    } else {
      await listPayments({ limit: 20 });
    }
  }, [listPayments, lastListParams]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ======================================================================
  // EFFECTS
  // ======================================================================

  useEffect(() => {
    if (isAuthenticated && authState?.merchantId && authState?.profileId) {
      listPayments({ limit: 20 });
    }
  }, [isAuthenticated, authState?.merchantId, authState?.profileId, listPayments]);

  return {
    payments,
    currentPayment,
    isLoading,
    error,
    totalCount,
    hasMore,
    createPayment,
    getPayment,
    updatePayment,
    capturePayment,
    cancelPayment,
    confirmPayment,
    listPayments,
    refreshPayments,
    clearError,
  };
}