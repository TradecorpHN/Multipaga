// app/(dashboard)/refunds/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR, { mutate } from 'swr'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ArrowLeft, 
  Copy, 
  Download, 
  RefreshCw, 
  CreditCard,
  Calendar,
  Clock,
  Building,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  MoreVertical,
  Eye,
  User,
  DollarSign,
  Activity,
  Info,
  Receipt
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
// Importación corregida del cliente de Hyperswitch
import { hyperswitchClient } from '/home/kali/multipaga/src/infrastructure/api/clients/HyperswitchClient'
import type { RefundResponse, PaymentResponse } from '@/types/hyperswitch'

// Refund Status Configuration
const RefundStatus = {
  success: { 
    label: 'Exitoso', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: CheckCircle 
  },
  failure: { 
    label: 'Fallido', 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: XCircle 
  },
  pending: { 
    label: 'Pendiente', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: Clock 
  },
  manual_review: { 
    label: 'Revisión Manual', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    icon: AlertCircle 
  },
}

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  toast.success(`${label} copiado al portapapeles`)
}

// Fetcher functions usando el cliente corregido
const refundFetcher = async (url: string): Promise<RefundResponse> => {
  const refundId = url.split('/').pop()
  if (!refundId) throw new Error('Refund ID is required')
  
  try {
    const response = await hyperswitchClient.get<RefundResponse>(`/refunds/${refundId}`)
    return response
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error('Refund not found')
    }
    throw error
  }
}

const paymentFetcher = async (paymentId: string): Promise<PaymentResponse> => {
  try {
    const response = await hyperswitchClient.get<PaymentResponse>(`/payments/${paymentId}`)
    return response
  } catch (error: any) {
    console.error('Error fetching payment:', error)
    throw error
  }
}

// Definir una interfaz extendida para el pago que incluya las propiedades esperadas
interface ExtendedPaymentResponse extends PaymentResponse {
  customer?: {
    email?: string
    customer_id?: string
  }
  refunds?: Array<{
    refund_id: string
    refund_amount: number
    refund_status: string
  }>
}

export default function RefundDetailPage() {
  const params = useParams()
  const router = useRouter()
  const refundId = params.id as string

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Fetch refund data
  const { data: refund, error, isLoading } = useSWR<RefundResponse>(
    `/refunds/${refundId}`,
    refundFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Fetch associated payment data
  const { data: payment } = useSWR<ExtendedPaymentResponse>(
    refund?.payment_id ? `/payments/${refund.payment_id}` : null,
    () => paymentFetcher(refund!.payment_id) as Promise<ExtendedPaymentResponse>,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const status = refund?.refund_status ? RefundStatus[refund.refund_status as keyof typeof RefundStatus] : null
  const StatusIcon = status?.icon || AlertCircle

  // Actions
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate(`/refunds/${refundId}`)
    if (refund?.payment_id) {
      await mutate(`/payments/${refund.payment_id}`)
    }
    setIsRefreshing(false)
    toast.success('Información actualizada')
  }

  const handleRetryRefund = async () => {
    if (!confirm('¿Estás seguro de que deseas reintentar este reembolso?')) return

    try {
      // En un caso real, aquí llamarías a un endpoint para reintentar el reembolso
      await mutate(`/refunds/${refundId}`)
      toast.success('Reembolso reintentado exitosamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al reintentar el reembolso')
    }
  }

  const handleExport = () => {
    if (!refund) return
    
    const data = JSON.stringify({ refund, payment }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `refund-${refundId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Reembolso exportado exitosamente')
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar el reembolso</h2>
          <p className="text-dark-text-secondary mb-4">{error.message}</p>
          <Button onClick={() => router.push('/refunds')}>
            Volver a reembolsos
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !refund) {
    return <RefundDetailSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/refunds"
              className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Detalle del Reembolso</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-dark-text-secondary">ID:</span>
                <code className="text-sm bg-dark-surface px-2 py-1 rounded">
                  {refund.refund_id}
                </code>
                <button
                  onClick={() => copyToClipboard(refund.refund_id, 'ID del reembolso')}
                  className="p-1 hover:bg-dark-surface rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-dark-surface rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <div className="relative group">
              <button className="p-2 hover:bg-dark-surface rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleExport}
                  className="w-full text-left px-4 py-2 hover:bg-dark-hover text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar JSON
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full text-left px-4 py-2 hover:bg-dark-hover text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status and Amount Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${status?.bgColor} ${status?.borderColor} border`}>
                <StatusIcon className={`w-6 h-6 ${status?.color}`} />
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary">Estado</p>
                <p className={`text-lg font-semibold ${status?.color}`}>
                  {status?.label || refund.refund_status}
                </p>
              </div>
            </div>
            
            <div className="border-l border-dark-border pl-6">
              <p className="text-sm text-dark-text-secondary">Monto del Reembolso</p>
              <p className="text-2xl font-bold">
                {formatCurrency(refund.refund_amount, refund.currency)}
              </p>
            </div>

            {refund.total_amount !== refund.refund_amount && (
              <div className="border-l border-dark-border pl-6">
                <p className="text-sm text-dark-text-secondary">Monto Original</p>
                <p className="text-lg font-medium">
                  {formatCurrency(refund.total_amount, refund.currency)}
                </p>
              </div>
            )}

            {refund.connector && (
              <div className="border-l border-dark-border pl-6">
                <p className="text-sm text-dark-text-secondary">Conector</p>
                <p className="text-lg font-medium capitalize">{refund.connector}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {refund.refund_status === 'failure' && (
              <button
                onClick={handleRetryRefund}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            )}
            
            {payment && (
              <Link
                href={`/payments/${payment.payment_id}`}
                className="px-4 py-2 bg-dark-hover rounded-lg transition-colors flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Ver Pago
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-dark-surface border border-dark-border rounded-xl">
        <div className="border-b border-dark-border">
          <nav className="flex gap-6 px-6">
            {[
              { id: 'details', label: 'Detalles', icon: FileText },
              { id: 'payment', label: 'Pago Original', icon: CreditCard },
              { id: 'timeline', label: 'Línea de Tiempo', icon: Activity },
              { id: 'metadata', label: 'Metadata', icon: Hash },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-dark-text-secondary hover:text-white'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Refund Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-purple-500" />
                  Información del Reembolso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    label="ID del Reembolso"
                    value={refund.refund_id}
                    copyable
                  />
                  <InfoField
                    label="ID del Pago"
                    value={refund.payment_id}
                    copyable
                  />
                  <InfoField
                    label="Tipo de Reembolso"
                    value={refund.refund_type === 'instant' ? 'Instantáneo' : 'Regular'}
                  />
                  <InfoField
                    label="Enviado al Gateway"
                    value={refund.sent_to_gateway ? 'Sí' : 'No'}
                  />
                  <InfoField
                    label="Fecha de Creación"
                    value={format(new Date(refund.created_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <InfoField
                    label="Última Actualización"
                    value={format(new Date(refund.updated_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    icon={<Clock className="w-4 h-4" />}
                  />
                  {refund.refund_reason && (
                    <InfoField
                      label="Razón del Reembolso"
                      value={refund.refund_reason}
                      className="md:col-span-2"
                    />
                  )}
                  {refund.description && (
                    <InfoField
                      label="Descripción"
                      value={refund.description}
                      className="md:col-span-2"
                    />
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              {refund.connector_refund_id && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-500" />
                    Detalles de la Transacción
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField
                      label="ID de Reembolso del Conector"
                      value={refund.connector_refund_id}
                      copyable
                    />
                    <InfoField
                      label="ID de Transacción del Conector"
                      value={refund.connector_transaction_id || 'N/A'}
                    />
                    {refund.merchant_connector_id && (
                      <InfoField
                        label="ID del Conector del Comerciante"
                        value={refund.merchant_connector_id}
                      />
                    )}
                    {refund.refund_arn && (
                      <InfoField
                        label="ARN del Reembolso"
                        value={refund.refund_arn}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Error Information */}
              {(refund.failure_reason || refund.error_message) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    Información del Error
                  </h3>
                  {refund.failure_reason && (
                    <p className="text-sm mb-2">
                      <span className="font-medium">Razón del fallo:</span> {refund.failure_reason}
                    </p>
                  )}
                  {refund.error_message && (
                    <p className="text-sm mb-2">
                      <span className="font-medium">Mensaje de error:</span> {refund.error_message}
                    </p>
                  )}
                  {refund.error_code && (
                    <p className="text-sm">
                      <span className="font-medium">Código de error:</span> {refund.error_code}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && payment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-dark-hover rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    Pago Original
                  </h3>
                  <Link
                    href={`/payments/${payment.payment_id}`}
                    className="text-purple-500 hover:text-purple-400 text-sm flex items-center gap-1"
                  >
                    Ver detalles completos
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    label="ID del Pago"
                    value={payment.payment_id}
                    copyable
                  />
                  <InfoField
                    label="Monto Original"
                    value={formatCurrency(payment.amount || 0, payment.currency)}
                  />
                  <InfoField
                    label="Estado del Pago"
                    value={payment.status}
                  />
                  <InfoField
                    label="Método de Pago"
                    value={typeof payment.payment_method === 'string' ? payment.payment_method : 'No especificado'}
                  />
                  <InfoField
                    label="Cliente"
                    value={payment.customer?.email || payment.customer?.customer_id || 'No especificado'}
                  />
                  <InfoField
                    label="Fecha del Pago"
                    value={format(new Date(payment.created), "dd 'de' MMMM, yyyy", { locale: es })}
                  />
                </div>

                {/* Refunds Summary */}
                {payment.refunds && payment.refunds.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-dark-border">
                    <h4 className="font-medium mb-3">Resumen de Reembolsos</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-text-secondary">Total de reembolsos:</span>
                        <span>{payment.refunds.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-text-secondary">Monto total reembolsado:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            payment.refunds.reduce((sum: number, r: any) => sum + r.refund_amount, 0),
                            payment.currency
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-text-secondary">Monto restante:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            (payment.amount || 0) - payment.refunds.reduce((sum: number, r: any) => sum + r.refund_amount, 0),
                            payment.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Línea de tiempo del reembolso</p>
                  <p className="text-dark-text-secondary">
                    La línea de tiempo muestra todos los eventos relacionados con este reembolso,
                    desde su creación hasta su estado actual.
                  </p>
                </div>
              </div>

              {/* Timeline Events */}
              <div className="space-y-4">
                {/* Created Event */}
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-dark-border" />
                  </div>
                  <div className="flex-1 pb-8">
                    <p className="font-medium">Reembolso creado</p>
                    <p className="text-sm text-dark-text-secondary mt-1">
                      {format(new Date(refund.created_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                    <p className="text-sm mt-2">
                      Monto: {formatCurrency(refund.refund_amount, refund.currency)}
                    </p>
                  </div>
                </div>

                {/* Status Events */}
                {refund.sent_to_gateway && (
                  <div className="flex gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-dark-border" />
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium">Enviado al gateway de pago</p>
                      <p className="text-sm text-dark-text-secondary mt-1">
                        El reembolso fue enviado al procesador de pagos
                      </p>
                      {refund.connector_refund_id && (
                        <p className="text-sm mt-2">
                          ID del conector: <code className="text-xs bg-dark-hover px-2 py-1 rounded">
                            {refund.connector_refund_id}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Status */}
                <div className="flex gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 ${status?.bgColor} rounded-full flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${status?.color}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      Estado actual: <span className={status?.color}>{status?.label}</span>
                    </p>
                    <p className="text-sm text-dark-text-secondary mt-1">
                      {format(new Date(refund.updated_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                    {refund.failure_reason && (
                      <p className="text-sm mt-2 text-red-400">
                        Razón: {refund.failure_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {refund.metadata && Object.keys(refund.metadata).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(refund.metadata).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start gap-4 p-3 bg-dark-hover rounded-lg"
                    >
                      <code className="text-purple-500 text-sm font-medium min-w-[200px]">
                        {key}
                      </code>
                      <code className="text-sm text-dark-text-secondary flex-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-text-secondary text-center py-8">
                  No hay metadata asociada a este reembolso
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// Info Field Component
interface InfoFieldProps {
  label: string
  value: string
  icon?: React.ReactNode
  copyable?: boolean
  className?: string
}

function InfoField({ label, value, icon, copyable, className }: InfoFieldProps) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <p className="text-sm text-dark-text-secondary flex items-center gap-2">
        {icon}
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="font-medium">{value}</p>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="p-1 hover:bg-dark-hover rounded transition-colors opacity-0 hover:opacity-100"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// Loading Skeleton
function RefundDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-dark-surface rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-dark-surface rounded animate-pulse" />
            <div className="h-4 w-64 bg-dark-surface rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-dark-hover rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-dark-hover rounded animate-pulse" />
            <div className="h-6 w-32 bg-dark-hover rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-dark-hover rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Button Component
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = ''
}: ButtonProps) {
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-dark-hover hover:bg-dark-border text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}