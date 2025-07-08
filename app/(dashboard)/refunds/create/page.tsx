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
import { hyperswitch } from '@/lib/hyperswitch'
import type { PaymentResponse, RefundRequest } from '@/types/hyperswitch'

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

// Fetcher for payment
const paymentFetcher = async (paymentId: string): Promise<PaymentResponse> => {
  try {
    const response = await hyperswitch.getPayment(paymentId)
    return response as PaymentResponse
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
  const { data: payment, error: paymentError, isLoading: paymentLoading } = useSWR<PaymentResponse>(
    paymentId ? `/payments/${paymentId}` : null,
    () => paymentFetcher(paymentId),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Calculate refundable amount
  const refundableAmount = payment ? (payment.amount || 0) - (payment.refunds?.reduce((sum, r) => sum + r.refund_amount, 0) || 0) : 0
  const hasRefunds = payment?.refunds && payment.refunds.length > 0

  // Search for payments
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await hyperswitch.listPayments({
        customer_id: searchQuery,
        limit: 10,
        status: 'succeeded'
      })
      
      if (response.data && response.data.length > 0) {
        setSearchResults(response.data)
        setShowSearchResults(true)
      } else {
        toast.error('No se encontraron pagos para este criterio')
      }
    } catch (error) {
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
      const refundData: RefundRequest = {
        payment_id: payment.payment_id,
        amount: refundAmount,
        reason: formData.reason || undefined,
        refund_type: formData.refund_type,
        metadata: Object.keys(formData.metadata).length > 0 ? formData.metadata : undefined
      }

      const response = await hyperswitch.createRefund(refundData)
      
      toast.success('Reembolso creado exitosamente')
      router.push(`/refunds/${response.refund_id}`)
    } catch (error: any) {
      console.error('Error creating refund:', error)
      toast.error(error.message || 'Error al crear el reembolso')
    } finally {
      setIsCreating(false)
    }
  }

  // Add metadata field
  const addMetadataField = () => {
    const key = `field_${Date.now()}`
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: ''
      }
    }))
  }

  // Remove metadata field
  const removeMetadataField = (key: string) => {
    setFormData(prev => {
      const newMetadata = { ...prev.metadata }
      delete newMetadata[key]
      return {
        ...prev,
        metadata: newMetadata
      }
    })
  }

  // Update metadata
  const updateMetadata = (oldKey: string, newKey: string, value: string) => {
    setFormData(prev => {
      const newMetadata = { ...prev.metadata }
      if (oldKey !== newKey) {
        delete newMetadata[oldKey]
      }
      newMetadata[newKey] = value
      return {
        ...prev,
        metadata: newMetadata
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/refunds"
            className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Crear Reembolso</h1>
            <p className="text-dark-text-secondary mt-1">
              Reembolsa total o parcialmente un pago exitoso
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            Seleccionar Pago
          </h2>

          {!paymentId ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar por ID de pago o ID de cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Buscar'
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-dark-border" />
                <span className="text-sm text-dark-text-secondary">o</span>
                <div className="flex-1 h-px bg-dark-border" />
              </div>

              <input
                type="text"
                placeholder="Ingresa directamente el ID del pago"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="border border-dark-border rounded-lg overflow-hidden">
                  <div className="bg-dark-hover px-4 py-2 border-b border-dark-border">
                    <p className="text-sm font-medium">Resultados de búsqueda</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.payment_id}
                        type="button"
                        onClick={() => handleSelectPayment(result)}
                        className="w-full px-4 py-3 hover:bg-dark-hover transition-colors text-left border-b border-dark-border last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{result.payment_id}</p>
                            <p className="text-sm text-dark-text-secondary">
                              {result.customer?.email || result.customer_id || 'Cliente desconocido'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(result.amount || 0, result.currency)}
                            </p>
                            <p className="text-sm text-dark-text-secondary">
                              {format(new Date(result.created), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {paymentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : paymentError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-500">Error al cargar el pago</p>
                      <p className="text-sm text-dark-text-secondary mt-1">
                        {paymentError.message || 'No se pudo cargar la información del pago'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPaymentId('')}
                        className="mt-2 text-sm text-purple-500 hover:text-purple-400"
                      >
                        Seleccionar otro pago
                      </button>
                    </div>
                  </div>
                </div>
              ) : payment ? (
                <div className="space-y-4">
                  <div className="bg-dark-hover rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-dark-text-secondary">ID del Pago:</p>
                          <code className="text-sm bg-dark-surface px-2 py-1 rounded">
                            {payment.payment_id}
                          </code>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-dark-text-secondary">Cliente:</p>
                          <p className="font-medium">
                            {payment.customer?.email || payment.customer_id || 'No especificado'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-dark-text-secondary">Fecha:</p>
                          <p>{format(new Date(payment.created), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentId('')}
                        className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-dark-hover rounded-lg p-4">
                      <p className="text-sm text-dark-text-secondary mb-1">Monto Original</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(payment.amount || 0, payment.currency)}
                      </p>
                    </div>
                    <div className="bg-dark-hover rounded-lg p-4">
                      <p className="text-sm text-dark-text-secondary mb-1">Ya Reembolsado</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(
                          payment.refunds?.reduce((sum, r) => sum + r.refund_amount, 0) || 0,
                          payment.currency
                        )}
                      </p>
                    </div>
                    <div className="bg-dark-hover rounded-lg p-4">
                      <p className="text-sm text-dark-text-secondary mb-1">Disponible para Reembolso</p>
                      <p className="text-xl font-bold text-green-500">
                        {formatCurrency(refundableAmount, payment.currency)}
                      </p>
                    </div>
                  </div>

                  {payment.status !== 'succeeded' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-500">Pago no exitoso</p>
                        <p className="text-sm text-dark-text-secondary mt-1">
                          Solo se pueden reembolsar pagos con estado "succeeded". Este pago tiene estado "{payment.status}".
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
              ) : null}
            </div>
          )}
        </motion.div>

        {/* Refund Details */}
        {payment && payment.status === 'succeeded' && refundableAmount > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-surface border border-dark-border rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-500" />
                Detalles del Reembolso
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Monto a Reembolsar
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary">
                      {payment.currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      max={refundableAmount / 100}
                      placeholder={`Máximo: ${(refundableAmount / 100).toFixed(2)}`}
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-16 pr-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, amount: (refundableAmount / 100).toFixed(2) }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-500 rounded text-sm transition-colors"
                    >
                      Máximo
                    </button>
                  </div>
                  <p className="text-xs text-dark-text-secondary mt-1">
                    Deja vacío para reembolsar el monto completo disponible
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Reembolso
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, refund_type: 'regular' }))}
                      className={`
                        px-4 py-3 rounded-lg border transition-all
                        ${formData.refund_type === 'regular'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-500'
                          : 'bg-dark-hover border-dark-border hover:border-purple-500/50'
                        }
                      `}
                    >
                      <Clock className="w-5 h-5 mx-auto mb-1" />
                      <p className="font-medium">Regular</p>
                      <p className="text-xs text-dark-text-secondary mt-1">3-5 días hábiles</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, refund_type: 'instant' }))}
                      className={`
                        px-4 py-3 rounded-lg border transition-all
                        ${formData.refund_type === 'instant'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-500'
                          : 'bg-dark-hover border-dark-border hover:border-purple-500/50'
                        }
                      `}
                    >
                      <Receipt className="w-5 h-5 mx-auto mb-1" />
                      <p className="font-medium">Instantáneo</p>
                      <p className="text-xs text-dark-text-secondary mt-1">Inmediato</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Razón del Reembolso (Opcional)
                  </label>
                  <textarea
                    placeholder="Describe la razón del reembolso..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>
            </motion.div>

            {/* Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-surface border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Hash className="w-5 h-5 text-purple-500" />
                  Metadata (Opcional)
                </h2>
                <button
                  type="button"
                  onClick={addMetadataField}
                  className="text-sm text-purple-500 hover:text-purple-400"
                >
                  + Agregar campo
                </button>
              </div>

              {Object.entries(formData.metadata).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(formData.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Clave"
                        value={key.startsWith('field_') ? '' : key}
                        onChange={(e) => updateMetadata(key, e.target.value || key, value)}
                        className="flex-1 px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={value}
                        onChange={(e) => updateMetadata(key, key, e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeMetadataField(key)}
                        className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-text-secondary text-center py-4">
                  No hay metadata. Haz clic en "Agregar campo" para añadir información adicional.
                </p>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between"
            >
              <Link
                href="/refunds"
                className="px-6 py-2 bg-dark-surface hover:bg-dark-hover rounded-lg transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isCreating || !payment || payment.status !== 'succeeded' || refundableAmount <= 0}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Crear Reembolso
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </form>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">Información importante sobre reembolsos</p>
          <ul className="space-y-1 text-dark-text-secondary">
            <li>• Los reembolsos solo pueden realizarse en pagos exitosos (estado "succeeded")</li>
            <li>• El tiempo de procesamiento depende del método de pago y el banco del cliente</li>
            <li>• Los reembolsos instantáneos están sujetos a disponibilidad del procesador</li>
            <li>• Una vez procesado, el reembolso no puede ser cancelado</li>
          </ul>
        </div>
      </motion.div>
    </div>
  )
}