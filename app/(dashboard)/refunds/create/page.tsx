// app/(dashboard)/refunds/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  DollarSign,
  FileText,
  AlertCircle,
  Info,
  Loader2,
  Check,
  X,
  Calendar,
  Clock,
  User,
  Building,
  Hash,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { getHyperswitchClient } from '@/lib/hyperswitch-client'
import type { PaymentResponse, RefundRequest, RefundResponse } from '@/types/hyperswitch'

// Interfaz para los refunds asociados a un pago
interface PaymentRefund {
  refund_id: string
  refund_amount: number
  refund_status: 'failure' | 'manual_review' | 'pending' | 'success'
  created_at: string
  refund_type: 'instant' | 'regular'
  refund_reason?: string
}

// Extender PaymentResponse para incluir refunds
interface ExtendedPaymentResponse extends PaymentResponse {
  refunds?: PaymentRefund[]
}

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

// Fetcher for payment
const paymentFetcher = async (paymentId: string): Promise<ExtendedPaymentResponse> => {
  try {
    const hyperswitch = getHyperswitchClient()
    const response = await hyperswitch.getPayment(paymentId)
    return response as ExtendedPaymentResponse
  } catch (error: any) {
    throw error
  }
}

export default function CreateRefundPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentIdFromUrl = searchParams.get('payment_id')

  const [paymentId, setPaymentId] = useState(paymentIdFromUrl || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchResults, setSearchResults] = useState<PaymentResponse[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Form state
  const [formData, setFormData] = useState<{
    amount: string
    reason: string
    refund_type: 'instant' | 'regular'
    metadata: Record<string, string>
  }>({
    amount: '',
    reason: '',
    refund_type: 'regular',
    metadata: {}
  })

  // Fetch payment data when paymentId is set
  const { data: payment, error: paymentError, isLoading: paymentLoading } = useSWR<ExtendedPaymentResponse>(
    paymentId ? `/payments/${paymentId}` : null,
    () => paymentFetcher(paymentId),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Calculate refundable amount
  const refundableAmount = payment ? (payment.amount || 0) - (payment.refunds?.reduce((sum: number, r: PaymentRefund) => sum + r.refund_amount, 0) || 0) : 0
  const hasRefunds = payment?.refunds && payment.refunds.length > 0

  // Search for payments
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const hyperswitch = getHyperswitchClient()
      
      // Usar el método listPayments disponible en el cliente
      const response = await hyperswitch.listPayments({
        customer_id: searchQuery,
        limit: 10,
        status: 'succeeded'
      }) as { data: PaymentResponse[] }
      
      if (response.data && response.data.length > 0) {
        setSearchResults(response.data)
        setShowSearchResults(true)
      } else {
        toast.error('No se encontraron pagos para este criterio')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Error al buscar pagos')
    } finally {
      setIsSearching(false)
    }
  }

  // Select payment from search
  const handleSelectPayment = (selectedPayment: PaymentResponse) => {
    setPaymentId(selectedPayment.payment_id)
    setSearchQuery('')
    setShowSearchResults(false)
    setSearchResults([])
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!payment) {
      toast.error('Selecciona un pago para reembolsar')
      return
    }

    const refundAmount = formData.amount ? parseFloat(formData.amount) * 100 : refundableAmount

    if (refundAmount <= 0) {
      toast.error('El monto del reembolso debe ser mayor a 0')
      return
    }

    if (refundAmount > refundableAmount) {
      toast.error('El monto del reembolso excede el monto disponible')
      return
    }

    setIsCreating(true)

    try {
      const hyperswitch = getHyperswitchClient()
      const refundData: RefundRequest = {
        payment_id: payment.payment_id,
        amount: refundAmount,
        reason: formData.reason || undefined,
        refund_type: formData.refund_type,
        metadata: Object.keys(formData.metadata).length > 0 ? formData.metadata : undefined
      }

      // El método createRefund está disponible en HyperswitchClientSide
      const refund = await hyperswitch.createRefund(refundData) as RefundResponse
      
      toast.success('Reembolso creado exitosamente')
      router.push(`/refunds/${refund.refund_id}`)
    } catch (error: any) {
      console.error('Error creating refund:', error)
      toast.error(error.message || 'Error al crear el reembolso')
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/refunds"
                  className="flex items-center gap-2 text-dark-text-secondary hover:text-dark-text-primary transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Volver</span>
                </Link>
                <div className="h-6 w-px bg-dark-border" />
                <h1 className="text-2xl font-semibold text-dark-text-primary">
                  Crear Reembolso
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card rounded-lg border border-dark-border"
            >
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-6">Información del Reembolso</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Payment Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-dark-text-secondary">
                      Pago a Reembolsar
                    </label>

                    {!paymentId ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Buscar por ID de cliente o pago..."
                            className="w-full pl-10 pr-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSearch}
                          disabled={isSearching || !searchQuery.trim()}
                          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-dark-hover disabled:text-dark-text-secondary transition-colors"
                        >
                          {isSearching ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Buscando...
                            </span>
                          ) : (
                            'Buscar Pago'
                          )}
                        </button>

                        {/* Search Results */}
                        {showSearchResults && searchResults.length > 0 && (
                          <div className="border border-dark-border rounded-lg divide-y divide-dark-border">
                            {searchResults.map((result) => (
                              <button
                                key={result.payment_id}
                                type="button"
                                onClick={() => handleSelectPayment(result)}
                                className="w-full p-4 hover:bg-dark-hover transition-colors text-left"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-dark-text-primary">
                                      {result.payment_id}
                                    </p>
                                    <p className="text-sm text-dark-text-secondary">
                                      {result.customer_id || 'Sin cliente'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {formatCurrency(result.amount || 0, result.currency)}
                                    </p>
                                    <p className="text-sm text-dark-text-secondary">
                                      {format(new Date(result.created || ''), 'dd/MM/yyyy')}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paymentLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        ) : payment ? (
                          <div className="bg-dark-hover rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="text-sm text-dark-text-secondary">ID del Pago</p>
                                <p className="font-mono text-dark-text-primary">{payment.payment_id}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPaymentId('')}
                                className="text-dark-text-secondary hover:text-dark-text-primary"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-dark-text-secondary">Cliente</p>
                                <p className="text-dark-text-primary">
                                  {payment.customer_id || 'No especificado'}
                                </p>
                              </div>
                              <div>
                                <p className="text-dark-text-secondary">Monto Total</p>
                                <p className="text-dark-text-primary font-medium">
                                  {formatCurrency(payment.amount || 0, payment.currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-dark-text-secondary">Monto Reembolsable</p>
                                <p className="text-green-500 font-medium">
                                  {formatCurrency(refundableAmount, payment.currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-dark-text-secondary">Estado</p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                  {payment.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-dark-text-secondary">
                            Error al cargar el pago
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Refund Amount */}
                  {payment && refundableAmount > 0 && (
                    <>
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-dark-text-secondary">
                          Monto del Reembolso
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={refundableAmount / 100}
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder={`Máximo: ${formatCurrency(refundableAmount, payment.currency)}`}
                            className="w-full pl-10 pr-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>
                        <p className="text-sm text-dark-text-secondary">
                          Deja vacío para reembolsar el monto completo disponible
                        </p>
                      </div>

                      {/* Refund Reason */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-dark-text-secondary">
                          Motivo del Reembolso
                        </label>
                        <select
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                          <option value="">Seleccionar motivo</option>
                          <option value="duplicate">Pago duplicado</option>
                          <option value="fraudulent">Transacción fraudulenta</option>
                          <option value="requested_by_customer">Solicitado por el cliente</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>

                      {/* Refund Type */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-dark-text-secondary">
                          Tipo de Reembolso
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, refund_type: 'instant' })}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              formData.refund_type === 'instant'
                                ? 'border-primary bg-primary/10'
                                : 'border-dark-border hover:border-dark-text-secondary'
                            }`}
                          >
                            <Clock className="w-5 h-5 mb-2 mx-auto" />
                            <p className="font-medium">Instantáneo</p>
                            <p className="text-sm text-dark-text-secondary mt-1">
                              Procesamiento inmediato
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, refund_type: 'regular' })}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              formData.refund_type === 'regular'
                                ? 'border-primary bg-primary/10'
                                : 'border-dark-border hover:border-dark-text-secondary'
                            }`}
                          >
                            <Calendar className="w-5 h-5 mb-2 mx-auto" />
                            <p className="font-medium">Regular</p>
                            <p className="text-sm text-dark-text-secondary mt-1">
                              3-5 días hábiles
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end gap-4 pt-6">
                        <button
                          type="button"
                          onClick={() => router.push('/refunds')}
                          className="px-6 py-3 border border-dark-border rounded-lg hover:bg-dark-hover transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isCreating || !payment || refundableAmount <= 0}
                          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-dark-hover disabled:text-dark-text-secondary transition-colors"
                        >
                          {isCreating ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creando...
                            </span>
                          ) : (
                            'Crear Reembolso'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                {/* Warnings */}
                {payment && (
                  <div className="mt-6 space-y-4">
                    {payment.status !== 'succeeded' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-500">Pago no completado</p>
                          <p className="text-sm text-dark-text-secondary mt-1">
                            Este pago tiene estado "{payment.status}".
                          </p>
                        </div>
                      </div>
                    )}

                    {refundableAmount <= 0 && payment.status === 'succeeded' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-500">Sin monto disponible</p>
                          <p className="text-sm text-dark-text-secondary mt-1">
                            Este pago ya ha sido reembolsado completamente.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card rounded-lg border border-dark-border p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Información
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-dark-text-primary mb-2">
                    ¿Qué es un reembolso?
                  </h4>
                  <p className="text-dark-text-secondary">
                    Un reembolso devuelve total o parcialmente el dinero de una transacción completada al cliente.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-dark-text-primary mb-2">
                    Tipos de reembolso
                  </h4>
                  <ul className="space-y-2 text-dark-text-secondary">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Instantáneo:</strong> Se procesa inmediatamente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Regular:</strong> Toma 3-5 días hábiles</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-dark-text-primary mb-2">
                    Consideraciones
                  </h4>
                  <ul className="space-y-2 text-dark-text-secondary">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span>Los reembolsos no se pueden cancelar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span>Las comisiones no son reembolsables</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Refund History */}
            {payment && hasRefunds && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-dark-card rounded-lg border border-dark-border p-6 mt-6"
              >
                <h3 className="text-lg font-semibold mb-4">
                  Historial de Reembolsos
                </h3>
                <div className="space-y-3">
                  {payment.refunds?.map((refund: PaymentRefund, index: number) => (
                    <div
                      key={refund.refund_id || index}
                      className="bg-dark-hover rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-mono text-dark-text-secondary">
                          {refund.refund_id}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          refund.refund_status === 'success'
                            ? 'bg-green-500/10 text-green-500'
                            : refund.refund_status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {refund.refund_status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-dark-text-secondary">
                          {format(new Date(refund.created_at || ''), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                        <p className="font-medium">
                          {formatCurrency(refund.refund_amount, payment.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}