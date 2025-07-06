import { useState, useCallback } from 'react'
import { hyperswitchClient, HyperswitchError } from '@/infrastructure/api/HyperswitchClient'
import { 
  Payment, 
  PaymentCreateRequest, 
  PaymentUpdateRequest,
  PaymentCaptureRequest,
  PaymentListRequest,
  PaymentListResponse,
  PaymentSchema,
  PaymentListResponseSchema
} from '@/domain/entities/Payment'
import { useAuth } from '@/presentation/contexts/AuthContext'
import toast from 'react-hot-toast'
import { z } from 'zod'

interface UsePaymentsReturn {
  // State
  payments: Payment[]
  currentPayment: Payment | null
  isLoading: boolean
  error: string | null
  totalCount: number
  
  // Actions
  createPayment: (data: PaymentCreateRequest) => Promise<Payment>
  getPayment: (paymentId: string) => Promise<Payment>
  updatePayment: (paymentId: string, data: PaymentUpdateRequest) => Promise<Payment>
  capturePayment: (paymentId: string, data?: PaymentCaptureRequest) => Promise<Payment>
  cancelPayment: (paymentId: string) => Promise<Payment>
  listPayments: (params?: PaymentListRequest) => Promise<void>
  refreshPayments: () => Promise<void>
}

export function usePayments(): UsePaymentsReturn {
  const { authState } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [lastListParams, setLastListParams] = useState<PaymentListRequest>()

  // Create a new payment
  const createPayment = useCallback(async (data: PaymentCreateRequest): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await hyperswitchClient.post('/payments', {
        ...data,
        merchant_id: authState?.merchantId,
        profile_id: authState?.profileId,
      })

      const payment = PaymentSchema.parse(response)
      
      // Add to local state
      setPayments(prev => [payment, ...prev])
      setCurrentPayment(payment)
      
      toast.success('Payment created successfully')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to create payment'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [authState?.merchantId, authState?.profileId])

  // Get payment details
  const getPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await hyperswitchClient.get(`/payments/${paymentId}`)
      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      
      // Update in local state if exists
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to fetch payment details'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update payment
  const updatePayment = useCallback(async (
    paymentId: string, 
    data: PaymentUpdateRequest
  ): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await hyperswitchClient.post(`/payments/${paymentId}`, data)
      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      
      // Update in local state
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Payment updated successfully')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to update payment'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Capture payment
  const capturePayment = useCallback(async (
    paymentId: string,
    data?: PaymentCaptureRequest
  ): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await hyperswitchClient.post(
        `/payments/${paymentId}/capture`,
        data || {}
      )
      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      
      // Update in local state
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Payment captured successfully')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to capture payment'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cancel payment
  const cancelPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await hyperswitchClient.post(
        `/payments/${paymentId}/cancel`,
        { cancellation_reason: 'Cancelled by merchant' }
      )
      const payment = PaymentSchema.parse(response)
      
      setCurrentPayment(payment)
      
      // Update in local state
      setPayments(prev => prev.map(p => 
        p.payment_id === paymentId ? payment : p
      ))
      
      toast.success('Payment cancelled successfully')
      return payment
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to cancel payment'
      
      setError(errorMessage)
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // List payments
  const listPayments = useCallback(async (params?: PaymentListRequest): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setLastListParams(params)

    try {
      const response = await hyperswitchClient.post('/payments/list', {
        limit: params?.limit || 25,
        offset: params?.offset || 0,
        ...params,
      })

      const listResponse = PaymentListResponseSchema.parse(response)
      
      setPayments(listResponse.data)
      setTotalCount(listResponse.total_count)
      
    } catch (error) {
      const errorMessage = error instanceof HyperswitchError 
        ? error.message 
        : 'Failed to fetch payments'
      
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Set empty state on error
      setPayments([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh payments with last parameters
  const refreshPayments = useCallback(async (): Promise<void> => {
    await listPayments(lastListParams)
  }, [listPayments, lastListParams])

  return {
    // State
    payments,
    currentPayment,
    isLoading,
    error,
    totalCount,
    
    // Actions
    createPayment,
    getPayment,
    updatePayment,
    capturePayment,
    cancelPayment,
    listPayments,
    refreshPayments,
  }
}

// Hook for payment statistics
export function usePaymentStats(payments: Payment[]) {
  const calculateStats = useCallback(() => {
    const stats = {
      total: payments.length,
      successful: 0,
      pending: 0,
      failed: 0,
      totalVolume: 0,
      averageAmount: 0,
      currencies: new Set<string>(),
    }

    payments.forEach(payment => {
      if (payment.status === 'succeeded') {
        stats.successful++
        stats.totalVolume += payment.amount
      } else if (['processing', 'requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'].includes(payment.status)) {
        stats.pending++
      } else if (['failed', 'cancelled', 'voided'].includes(payment.status)) {
        stats.failed++
      }
      
      stats.currencies.add(payment.currency)
    })

    stats.averageAmount = stats.total > 0 ? stats.totalVolume / stats.total : 0

    return {
      ...stats,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
      currencies: Array.from(stats.currencies),
    }
  }, [payments])

  return calculateStats()
}