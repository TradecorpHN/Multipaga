// /home/kali/multipaga/app/(dashboard)/payments/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
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
  User,
  Calendar,
  Clock,
  Globe,
  Shield,
  Building,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  FileText,
  ChevronRight,
  MoreVertical,
  Eye,
  Receipt,
  Ban,
  Send,
  Package,
  MapPin,
  Smartphone
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
// IMPORTACIÓN CORREGIDA
// ✅ Importación correcta
import Hyperswitch from '@/presentation/lib/hyperswitch'
import type { PaymentResponse, PaymentMethodData, CustomerDetails } from '@/presentation/lib/hyperswitch'

const PaymentStatus = {
  succeeded: { label: 'Exitoso', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', icon: CheckCircle },
  failed: { label: 'Fallido', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', icon: XCircle },
  processing: { label: 'Procesando', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', icon: Clock },
  requires_capture: { label: 'Requiere Captura', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/20', icon: Ban },
  requires_payment_method: { label: 'Requiere Método de Pago', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', icon: CreditCard },
  requires_confirmation: { label: 'Requiere Confirmación', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', icon: Shield },
  requires_action: { label: 'Requiere Acción', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', icon: AlertCircle },
  partially_captured: { label: 'Parcialmente Capturado', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', icon: AlertCircle },
  partially_captured_and_capturable: { label: 'Parcial y Capturable', color: 'text-yellow-600', bgColor: 'bg-yellow-600/10', borderColor: 'border-yellow-600/20', icon: AlertCircle },
}

const formatCurrency = (amount: number, currency: string): string => {
  // Usar la utilidad de Hyperswitch para formato correcto
  return Hyperswitch.utils.formatAmount(amount, currency)
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  toast.success(`${label} copiado al portapapeles`)
}

const getInitials = (name: string): string =>
  name ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : ''

const fetcher = async (url: string) => {
  const paymentId = url.split('/').pop()
  if (!paymentId) throw new Error('Payment ID is required')
  try {
    const response = await Hyperswitch.getPayment(paymentId)
    return response as PaymentResponse
  } catch (error: any) {
    if (error.statusCode === 404) throw new Error('Payment not found')
    throw error
  }
}

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  const { data: payment, error, isLoading } = useSWR<PaymentResponse>(
    `/payments/${paymentId}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const status = payment?.status ? PaymentStatus[payment.status as keyof typeof PaymentStatus] : null
  const StatusIcon = status?.icon || AlertCircle

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate(`/payments/${paymentId}`)
    setIsRefreshing(false)
    toast.success('Información actualizada')
  }

  const handleCapture = async () => {
    try {
      await Hyperswitch.capturePayment(paymentId, {
        amount: payment?.amount,
        statement_descriptor: 'Multipaga Capture',
      })
      await mutate(`/payments/${paymentId}`)
      toast.success('Pago capturado exitosamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al capturar el pago')
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar este pago?')) return
    try {
      await Hyperswitch.cancelPayment(paymentId, {
        cancellation_reason: 'requested_by_customer',
      })
      await mutate(`/payments/${paymentId}`)
      toast.success('Pago cancelado exitosamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar el pago')
    }
  }

  const handleCreateRefund = () => {
    router.push(`/refunds/create?payment_id=${paymentId}`)
  }

  const handleExport = () => {
    if (!payment) return
    const data = JSON.stringify(payment, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-${paymentId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success('Pago exportado exitosamente')
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar el pago</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => router.push('/payments')}>Volver a pagos</Button>
        </div>
      </div>
    )
  }

  if (isLoading || !payment) {
    return <PaymentDetailSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/payments" className="p-2 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Detalle del Pago</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-muted-foreground">ID:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {payment.payment_id}
                </code>
                <button
                  onClick={() => copyToClipboard(payment.payment_id, 'ID del pago')}
                  className="p-1 hover:bg-accent rounded transition-colors"
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
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative group">
              <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleExport}
                  className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar JSON
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2"
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${status?.bgColor} ${status?.borderColor} border`}>
                <StatusIcon className={`w-6 h-6 ${status?.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className={`text-lg font-semibold ${status?.color}`}>{status?.label || payment.status}</p>
              </div>
            </div>
            <div className="border-l border-border pl-6">
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-2xl font-bold">{formatCurrency(payment.amount || 0, payment.currency)}</p>
            </div>
            {payment.connector && (
              <div className="border-l border-border pl-6">
                <p className="text-sm text-muted-foreground">Conector</p>
                <p className="text-lg font-medium capitalize">{payment.connector}</p>
              </div>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {payment.status === 'requires_capture' && (
              <Button onClick={handleCapture} className="flex items-center gap-2">
                <Package className="w-4 h-4" /> Capturar
              </Button>
            )}
            {payment.status === 'succeeded' && Hyperswitch.utils.canRefundPayment(payment) && (
              <Button variant="secondary" onClick={handleCreateRefund} className="flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Crear Reembolso
              </Button>
            )}
            {['processing', 'requires_payment_method', 'requires_confirmation'].includes(payment.status) && (
              <Button variant="destructive" onClick={handleCancel} className="flex items-center gap-2">
                <Ban className="w-4 h-4" /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-card border rounded-xl">
        <div className="border-b border-border">
          <nav className="flex gap-6 px-6">
            {[
              { id: 'details', label: 'Detalles', icon: FileText },
              { id: 'customer', label: 'Cliente', icon: User },
              { id: 'timeline', label: 'Línea de Tiempo', icon: Activity },
              { id: 'metadata', label: 'Metadata', icon: Hash },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Información del Pago
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="ID del Pago" value={payment.payment_id || 'N/A'} copyable />
                  <InfoField 
                    label="Método de Pago"
                    value={Hyperswitch.utils.getPaymentMethodDisplayName(payment.payment_method)}
                    icon={<CreditCard className="w-4 h-4" />} 
                  />
                  <InfoField 
                    label="Fecha de Creación"
                    value={payment.created
                      ? format(new Date(payment.created), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })
                      : 'N/A'}
                    icon={<Calendar className="w-4 h-4" />} 
                  />
                  <InfoField 
                    label="Última Actualización"
                    value={payment.updated_at
                      ? format(new Date(payment.updated_at), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })
                      : 'N/A'}
                    icon={<Clock className="w-4 h-4" />} 
                  />
                  {payment.description && (
                    <InfoField label="Descripción" value={payment.description} className="md:col-span-2" />
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              {payment.connector_transaction_id && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" /> Detalles de la Transacción
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="ID de Transacción del Conector" value={payment.connector_transaction_id || 'N/A'} copyable />
                    <InfoField label="Conector" value={payment.connector || 'N/A'} icon={<Building className="w-4 h-4" />} />
                  </div>
                </div>
              )}

              {/* Refunds */}
              {payment.refunds && Array.isArray(payment.refunds) && payment.refunds.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" /> Reembolsos
                  </h3>
                  <div className="space-y-3">
                    {payment.refunds.map((refund: any) => (
                      <div key={refund.refund_id} className="p-4 bg-muted rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{refund.refund_id}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(refund.refund_amount, refund.currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`
                              px-3 py-1 rounded-full text-xs font-medium
                              ${Hyperswitch.utils.getRefundStatusColor(refund.refund_status)}
                            `}>
                              {Hyperswitch.utils.getRefundStatusLabel(refund.refund_status)}
                            </span>
                            <Link href={`/refunds/${refund.refund_id}`} className="p-2 hover:bg-accent rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Customer Tab */}
          {activeTab === 'customer' && (payment.customer || payment.customer_id) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
                  {payment.customer?.name
                    ? getInitials(payment.customer.name)
                    : payment.customer_id
                      ? getInitials(payment.customer_id)
                      : 'C'}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {payment.customer?.name || payment.customer_id || 'Cliente Anónimo'}
                    </h3>
                    {payment.customer?.email && <p className="text-muted-foreground">{payment.customer.email}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField 
                      label="ID del Cliente"
                      value={payment.customer?.customer_id || payment.customer_id || 'N/A'}
                      copyable 
                    />
                    {payment.customer?.phone && (
                      <InfoField label="Teléfono" value={payment.customer.phone} icon={<Smartphone className="w-4 h-4" />} />
                    )}
                  </div>
                  {payment.billing && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> Dirección de Facturación
                      </h4>
                      <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                        {payment.billing.address?.line1 && <p>{payment.billing.address.line1}</p>}
                        {payment.billing.address?.line2 && <p>{payment.billing.address.line2}</p>}
                        <p>
                          {[
                            payment.billing.address?.city,
                            payment.billing.address?.state,
                            payment.billing.address?.zip,
                          ].filter(Boolean).join(', ')}
                        </p>
                        {payment.billing.address?.country && <p>{payment.billing.address.country}</p>}
                      </div>
                    </div>
                  )}
                  {payment.shipping && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Send className="w-4 h-4 text-primary" /> Dirección de Envío
                      </h4>
                      <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                        {payment.shipping.address?.line1 && <p>{payment.shipping.address.line1}</p>}
                        {payment.shipping.address?.line2 && <p>{payment.shipping.address.line2}</p>}
                        <p>
                          {[
                            payment.shipping.address?.city,
                            payment.shipping.address?.state,
                            payment.shipping.address?.zip,
                          ].filter(Boolean).join(', ')}
                        </p>
                        {payment.shipping.address?.country && <p>{payment.shipping.address.country}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                La línea de tiempo de eventos estará disponible próximamente
              </p>
            </motion.div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {payment.metadata && Object.keys(payment.metadata).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(payment.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                      <code className="text-primary text-sm font-medium min-w-[200px]">{key}</code>
                      <code className="text-sm text-muted-foreground flex-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay metadata asociada a este pago
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
      <p className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-medium">{value}</p>
        {copyable && (
          <button 
            onClick={() => copyToClipboard(value, label)}
            className="p-1 hover:bg-accent rounded transition-colors opacity-0 hover:opacity-100"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// Loading Skeleton
function PaymentDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-card border rounded-xl p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
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
  variant?: 'default' | 'secondary' | 'destructive'
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  className?: string
}

function Button({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default', 
  disabled = false, 
  className = '' 
}: ButtonProps) {
  const variants = {
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-md font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}