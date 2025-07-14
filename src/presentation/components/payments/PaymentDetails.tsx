'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  CreditCard,
  User,
  MapPin,
  Shield,
  Zap,
  FileText,
  Eye,
  Share,
  Edit,
  Trash2,
  Play,
  Pause,
  Ban,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Separator } from '@/presentation/components/ui/Separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/presentation/components/ui/Tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/presentation/components/ui/AlertDialog'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Progress } from '@/presentation/components/ui/Progress'
import PaymentStatus from './PaymentStatus'
import { formatCurrency, formatNumber } from '/home/kali/multipaga/src/presentation/lib/utils/formatters'
import { cn } from '@/presentation/lib/utils'
import type { PaymentResponse } from '@/infrastructure/repositories/HttpPaymentRepository'

interface PaymentDetailsProps {
  payment: PaymentResponse
  isLoading?: boolean
  onRefresh?: () => void
  onCapture?: () => Promise<void>
  onCancel?: () => Promise<void>
  onRefund?: () => Promise<void>
  onEdit?: () => void
  className?: string
}

interface TimelineEvent {
  id: string
  timestamp: string
  type: 'created' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'refunded'
  title: string
  description?: string
  amount?: number
  metadata?: any
}

export default function PaymentDetails({
  payment,
  isLoading = false,
  onRefresh,
  onCapture,
  onCancel,
  onRefund,
  onEdit,
  className = '',
}: PaymentDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Generate timeline events
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      {
        id: '1',
        timestamp: payment.created,
        type: 'created',
        title: 'Pago creado',
        description: 'Solicitud de pago iniciada',
        amount: payment.amount,
      },
    ]

    // Add more events based on payment status and history
    if (payment.status === 'succeeded') {
      events.push({
        id: '2',
        timestamp: payment.updated,
        type: 'captured',
        title: 'Pago capturado',
        description: 'Fondos capturados exitosamente',
        amount: payment.amount_received || payment.amount,
      })
    } else if (payment.status === 'failed') {
      events.push({
        id: '2',
        timestamp: payment.updated,
        type: 'failed',
        title: 'Pago fallido',
        description: payment.error_message || 'El pago no pudo ser procesado',
      })
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [payment])

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    setIsActionLoading(true)
    try {
      await action()
      toast.success(`${actionName} ejecutado exitosamente`)
      onRefresh?.()
    } catch (error: any) {
      toast.error(error.message || `Error al ejecutar ${actionName}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'authorized':
        return <Shield className="w-4 h-4 text-yellow-600" />
      case 'captured':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'cancelled':
        return <Ban className="w-4 h-4 text-gray-600" />
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-orange-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-2xl font-bold">
                {formatCurrency(payment.amount, payment.currency)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <PaymentStatus status={payment.status} variant="inline" showIcon />
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Intentos</p>
              <p className="text-lg font-semibold">{payment.attempt_count}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Conector</p>
              <p className="text-lg font-semibold">{payment.connector}</p>
            </div>
          </div>

          {payment.amount_capturable && payment.amount_capturable > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Monto disponible para captura
                  </p>
                  <p className="text-lg font-bold text-yellow-900">
                    {formatCurrency(payment.amount_capturable, payment.currency)}
                  </p>
                </div>
                {onCapture && (
                  <Button
                    onClick={() => handleAction(onCapture, 'Captura')}
                    disabled={isActionLoading}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Capturar
                  </Button>
                )}
              </div>
            </div>
          )}

          {payment.error_code && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Error: {payment.error_code}
                  </p>
                  {payment.error_message && (
                    <p className="text-sm text-red-700 mt-1">
                      {payment.error_message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Information */}
      {payment.customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID del cliente</p>
                <div className="flex items-center space-x-2">
                  <p className="font-mono text-sm">{payment.customer_id}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(payment.customer_id!, 'ID del cliente')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      {payment.payment_method && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Método de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-8 bg-gray-100 rounded border flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Tarjeta terminada en {payment.payment_method.card?.last4}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.payment_method.card?.card_network} • 
                    {payment.payment_method.card?.card_type}
                  </p>
                </div>
              </div>

              {payment.payment_method.card?.card_exp_month && payment.payment_method.card?.card_exp_year && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vencimiento</p>
                    <p>{payment.payment_method.card.card_exp_month}/{payment.payment_method.card.card_exp_year}</p>
                  </div>
                  
                  {payment.payment_method.card.card_issuer && (
                    <div>
                      <p className="text-muted-foreground">Emisor</p>
                      <p>{payment.payment_method.card.card_issuer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderTimelineTab = () => (
    <Card>
      <CardHeader>
        <CardTitle>Timeline del pago</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                )}
                
                {event.amount && (
                  <p className="text-sm font-medium mt-1">
                    {formatCurrency(event.amount, payment.currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const renderTechnicalTab = () => (
    <div className="space-y-6">
      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID del pago</p>
                <div className="flex items-center space-x-2">
                  <p className="font-mono text-sm">{payment.payment_id}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(payment.payment_id, 'ID del pago')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">ID del comerciante</p>
                <p className="font-mono text-sm">{payment.merchant_id}</p>
              </div>

              {payment.profile_id && (
                <div>
                  <p className="text-sm text-muted-foreground">ID del perfil</p>
                  <p className="font-mono text-sm">{payment.profile_id}</p>
                </div>
              )}

              {payment.merchant_connector_id && (
                <div>
                  <p className="text-sm text-muted-foreground">ID del conector</p>
                  <p className="font-mono text-sm">{payment.merchant_connector_id}</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Método de captura</p>
                <p className="text-sm">{payment.capture_method || 'automatic'}</p>
              </div>

              {payment.setup_future_usage && (
                <div>
                  <p className="text-sm text-muted-foreground">Uso futuro</p>
                  <p className="text-sm">{payment.setup_future_usage}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Creado</p>
                <p className="text-sm">
                  {format(new Date(payment.created), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Actualizado</p>
                <p className="text-sm">
                  {format(new Date(payment.updated), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadatos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(payment.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/payments">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver a pagos
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Pago {payment.payment_id.slice(-8)}</h1>
            <p className="text-muted-foreground">
              Creado {format(new Date(payment.created), 'dd/MM/yyyy', { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={isActionLoading}>
              <RefreshCw className={cn('w-4 h-4', isActionLoading && 'animate-spin')} />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {payment.status === 'requires_capture' && onCapture && (
                <DropdownMenuItem onClick={() => handleAction(onCapture, 'Captura')}>
                  <Play className="w-4 h-4 mr-2" />
                  Capturar pago
                </DropdownMenuItem>
              )}
              
              {payment.status === 'succeeded' && onRefund && (
                <DropdownMenuItem onClick={() => handleAction(onRefund, 'Reembolso')}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Crear reembolso
                </DropdownMenuItem>
              )}
              
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar pago
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => handleCopy(payment.payment_id, 'ID del pago')}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar ID
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Descargar recibo
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Share className="w-4 h-4 mr-2" />
                Compartir
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Hyperswitch
              </DropdownMenuItem>
              
              {(payment.status === 'requires_confirmation' || payment.status === 'processing') && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Cancelar pago
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. El pago será cancelado permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleAction(onCancel, 'Cancelación')}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sí, cancelar pago
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="technical">Técnico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {renderTimelineTab()}
        </TabsContent>

        <TabsContent value="technical" className="mt-6">
          {renderTechnicalTab()}
        </TabsContent>
      </Tabs>
    </div>
  )
}