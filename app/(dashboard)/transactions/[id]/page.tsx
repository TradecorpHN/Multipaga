'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Clock,
  Hash,
  Building,
  Globe,
  Shield,
  Activity,
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Download,
  FileText,
  AlertTriangle,
  DollarSign,
  User,
  MapPin,
  Mail,
  Phone,
  Package,
  ShoppingBag,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/Alert'
import { Separator } from '@/presentation/components/ui/Separator'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/Table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/presentation/components/ui/Collapsible'
import { usePayments } from '@/presentation/hooks/usePayments'
import { formatCurrency, formatDate, formatDateTime } from '@/presentation/lib/utils/formatters'
import { copyToClipboard } from '@/presentation/lib/utils/clipboard'
import toast from 'react-hot-toast'
import { cn } from '@/presentation/lib/utils'

// Tipos basados en Hyperswitch API
interface PaymentMethod {
  payment_method: string
  payment_method_type?: string
  payment_method_issuer?: string
  card?: {
    last4: string
    card_type?: string
    card_network?: string
    card_issuer?: string
    card_exp_month?: string
    card_exp_year?: string
  }
}

interface RefundDetails {
  refund_id: string
  amount: number
  currency: string
  status: string
  reason?: string
  created_at: string
  updated_at: string
}

interface DisputeDetails {
  dispute_id: string
  amount: number
  currency: string
  status: string
  stage: string
  reason?: string
  created_at: string
  challenge_required_by?: string
}

interface EventLog {
  event_id: string
  event_type: string
  timestamp: string
  description: string
  metadata?: Record<string, any>
}

// Status configurations
const statusConfig = {
  succeeded: {
    label: 'Exitoso',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  processing: {
    label: 'Procesando',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  requires_payment_method: {
    label: 'Requiere método de pago',
    icon: CreditCard,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  requires_confirmation: {
    label: 'Requiere confirmación',
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  requires_action: {
    label: 'Requiere acción',
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  failed: {
    label: 'Fallido',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transactionId = params.id as string
  
  const { getPayment, currentPayment, isLoading, error } = usePayments()
  const [activeTab, setActiveTab] = useState('details')
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Cargar detalles de la transacción
  useEffect(() => {
    if (transactionId) {
      getPayment(transactionId)
    }
  }, [transactionId, getPayment])

  // Refresh transaction
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await getPayment(transactionId)
      toast.success('Transacción actualizada')
    } catch (error) {
      toast.error('Error al actualizar la transacción')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Copy transaction ID
  const handleCopyId = () => {
    copyToClipboard(transactionId)
    toast.success('ID copiado al portapapeles')
  }

  // Export transaction details
  const handleExport = () => {
    if (!currentPayment) return
    
    const data = JSON.stringify(currentPayment, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transaction-${transactionId}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Detalles exportados')
  }

  // Mock data for events (en producción vendría de la API)
  const mockEvents: EventLog[] = useMemo(() => {
    if (!currentPayment) return []
    
    return [
      {
        event_id: '1',
        event_type: 'payment_created',
        timestamp: currentPayment.created_at,
        description: 'Pago creado',
      },
      ...(currentPayment.status === 'succeeded' ? [{
        event_id: '2',
        event_type: 'payment_succeeded',
        timestamp: currentPayment.updated_at || currentPayment.created_at,
        description: 'Pago completado exitosamente',
      }] : []),
      ...(currentPayment.status === 'failed' ? [{
        event_id: '3',
        event_type: 'payment_failed',
        timestamp: currentPayment.updated_at || currentPayment.created_at,
        description: 'Pago falló',
        metadata: {
          error_code: currentPayment.error_code,
          error_message: currentPayment.error_message,
        }
      }] : []),
    ]
  }, [currentPayment])

  if (isLoading && !currentPayment) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !currentPayment) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'No se pudo cargar la transacción'}
          </AlertDescription>
        </Alert>
        <Button
          variant="secondary"
          onClick={() => router.push('/transactions')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a transacciones
        </Button>
      </div>
    )
  }

  const status = statusConfig[currentPayment.status as keyof typeof statusConfig] || statusConfig.processing
  const StatusIcon = status.icon

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/transactions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalles de Transacción</h1>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm text-muted-foreground">{transactionId}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopyId}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={cn("border-0", status.bgColor)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <StatusIcon className={cn("h-5 w-5", status.color)} />
            <div>
              <p className="font-semibold">{status.label}</p>
              <p className="text-sm text-muted-foreground">
                Actualizado {formatDateTime(currentPayment.updated_at || currentPayment.created_at)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {formatCurrency(currentPayment.amount / 100, currentPayment.currency)}
            </p>
            {currentPayment.amount_capturable && currentPayment.amount_capturable !== currentPayment.amount && (
              <p className="text-sm text-muted-foreground">
                Capturable: {formatCurrency(currentPayment.amount_capturable / 100, currentPayment.currency)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Método de Pago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPayment.payment_method || 'N/A'}
            </div>
            {currentPayment.payment_method_type && (
              <p className="text-xs text-muted-foreground">
                {currentPayment.payment_method_type}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conector</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPayment.connector || 'N/A'}
            </div>
            {currentPayment.merchant_connector_id && (
              <p className="text-xs text-muted-foreground truncate">
                {currentPayment.merchant_connector_id}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intentos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPayment.attempt_count || 1}
            </div>
            <p className="text-xs text-muted-foreground">
              Intentos de pago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Creado</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(currentPayment.created_at), 'dd MMM', { locale: es })}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(currentPayment.created_at), 'HH:mm:ss')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
          <TabsTrigger value="refunds">
            Reembolsos
            {currentPayment.refunds && currentPayment.refunds.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {currentPayment.refunds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            Disputas
            {currentPayment.disputes && currentPayment.disputes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {currentPayment.disputes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="raw">JSON</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Información del Pago</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID de Pago</p>
                  <p className="font-mono text-sm">{currentPayment.payment_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID de Comerciante</p>
                  <p className="font-mono text-sm">{currentPayment.merchant_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monto</p>
                  <p className="font-semibold">
                    {formatCurrency(currentPayment.amount / 100, currentPayment.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge variant={currentPayment.status === 'succeeded' ? 'success' : 'secondary'}>
                    {status.label}
                  </Badge>
                </div>
                {currentPayment.description && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-sm">{currentPayment.description}</p>
                  </div>
                )}
                {currentPayment.statement_descriptor_name && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Descriptor de Estado de Cuenta</p>
                    <p className="text-sm">{currentPayment.statement_descriptor_name}</p>
                  </div>
                )}
              </div>

              {/* Payment Method Details */}
              {currentPayment.payment_method_data && (
                <Separator />
              )}
              
              {/* Metadata */}
              {currentPayment.metadata && Object.keys(currentPayment.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                    <div className="bg-muted rounded-lg p-3">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(currentPayment.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          {currentPayment.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Información del Cliente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {currentPayment.customer_id && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ID de Cliente</p>
                      <p className="font-mono text-sm">{currentPayment.customer_id}</p>
                    </div>
                  )}
                  {currentPayment.customer.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{showSensitiveData ? currentPayment.customer.email : '••••••@••••••'}</span>
                      </p>
                    </div>
                  )}
                  {currentPayment.customer.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                      <p className="text-sm flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{showSensitiveData ? currentPayment.customer.phone : '••••••••••'}</span>
                      </p>
                    </div>
                  )}
                  {currentPayment.customer.name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                      <p className="text-sm">{currentPayment.customer.name}</p>
                    </div>
                  )}
                </div>
                
                {/* Toggle sensitive data */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                >
                  {showSensitiveData ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ocultar datos sensibles
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Mostrar datos sensibles
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Billing/Shipping Information */}
          {(currentPayment.billing || currentPayment.shipping) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Información de Envío y Facturación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {currentPayment.billing && (
                    <div>
                      <h4 className="font-medium mb-2">Dirección de Facturación</h4>
                      <address className="text-sm text-muted-foreground not-italic space-y-1">
                        {currentPayment.billing.address?.line1 && <p>{currentPayment.billing.address.line1}</p>}
                        {currentPayment.billing.address?.line2 && <p>{currentPayment.billing.address.line2}</p>}
                        {currentPayment.billing.address?.city && (
                          <p>
                            {currentPayment.billing.address.city}
                            {currentPayment.billing.address.state && `, ${currentPayment.billing.address.state}`}
                            {currentPayment.billing.address.zip && ` ${currentPayment.billing.address.zip}`}
                          </p>
                        )}
                        {currentPayment.billing.address?.country && <p>{currentPayment.billing.address.country}</p>}
                      </address>
                    </div>
                  )}
                  
                  {currentPayment.shipping && (
                    <div>
                      <h4 className="font-medium mb-2">Dirección de Envío</h4>
                      <address className="text-sm text-muted-foreground not-italic space-y-1">
                        {currentPayment.shipping.address?.line1 && <p>{currentPayment.shipping.address.line1}</p>}
                        {currentPayment.shipping.address?.line2 && <p>{currentPayment.shipping.address.line2}</p>}
                        {currentPayment.shipping.address?.city && (
                          <p>
                            {currentPayment.shipping.address.city}
                            {currentPayment.shipping.address.state && `, ${currentPayment.shipping.address.state}`}
                            {currentPayment.shipping.address.zip && ` ${currentPayment.shipping.address.zip}`}
                          </p>
                        )}
                        {currentPayment.shipping.address?.country && <p>{currentPayment.shipping.address.country}</p>}
                      </address>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Information */}
          {currentPayment.error_message && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error en el Pago</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{currentPayment.error_message}</p>
                {currentPayment.error_code && (
                  <p className="text-sm">
                    Código de error: <code className="font-mono">{currentPayment.error_code}</code>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Línea de Tiempo del Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockEvents.map((event, index) => (
                  <div key={event.event_id} className="flex space-x-4">
                    <div className="relative">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        index === 0 ? "bg-primary" : "bg-muted"
                      )}>
                        <Activity className="h-4 w-4 text-primary-foreground" />
                      </div>
                      {index < mockEvents.length - 1 && (
                        <div className="absolute top-8 left-4 w-0.5 h-16 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.description}</h4>
                        <time className="text-sm text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.event_type}
                      </p>
                      {event.metadata && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reembolsos</CardTitle>
            </CardHeader>
            <CardContent>
              {currentPayment.refunds && currentPayment.refunds.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID de Reembolso</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayment.refunds.map((refund: any) => (
                      <TableRow key={refund.refund_id}>
                        <TableCell className="font-mono text-sm">
                          {refund.refund_id}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(refund.amount / 100, refund.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={refund.status === 'succeeded' ? 'success' : 'secondary'}>
                            {refund.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{refund.reason || '-'}</TableCell>
                        <TableCell>{formatDate(refund.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/refunds/${refund.refund_id}`)}
                          >
                            Ver detalles
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay reembolsos para esta transacción</p>
                  {currentPayment.status === 'succeeded' && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push(`/refunds/create?payment_id=${currentPayment.payment_id}`)}
                    >
                      Crear Reembolso
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Disputas</CardTitle>
            </CardHeader>
            <CardContent>
              {currentPayment.disputes && currentPayment.disputes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID de Disputa</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayment.disputes.map((dispute: any) => (
                      <TableRow key={dispute.dispute_id}>
                        <TableCell className="font-mono text-sm">
                          {dispute.dispute_id}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(dispute.amount / 100, dispute.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {dispute.dispute_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{dispute.dispute_stage}</TableCell>
                        <TableCell>
                          {dispute.challenge_required_by 
                            ? formatDate(dispute.challenge_required_by)
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/disputes/${dispute.dispute_id}`)}
                          >
                            Ver detalles
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay disputas para esta transacción</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw JSON Tab */}
        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Datos Raw (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs">
                  {JSON.stringify(currentPayment, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {currentPayment.status === 'requires_capture' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Captura Requerida</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Este pago requiere captura manual para completarse
                </p>
              </div>
              <Button
                onClick={() => router.push(`/payments/${currentPayment.payment_id}/capture`)}
              >
                Capturar Pago
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/transactions')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Transacciones
        </Button>
        
        <div className="flex items-center space-x-2">
          {currentPayment.status === 'succeeded' && !currentPayment.refunds?.length && (
            <Button
              variant="outline"
              onClick={() => router.push(`/refunds/create?payment_id=${currentPayment.payment_id}`)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Crear Reembolso
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => window.open(`https://dashboard.hyperswitch.io/payments/${currentPayment.payment_id}`, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver en Hyperswitch
          </Button>
        </div>
      </div>
    </div>
  )
}