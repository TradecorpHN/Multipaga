// /home/kali/multipaga/src/presentation/components/refunds/RefundDetails.tsx
// ──────────────────────────────────────────────────────────────────────────────
// RefundDetails - Componente para mostrar detalles completos de un reembolso
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { 
  ArrowLeft,
  RefreshCw,
  Download,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  CreditCard,
  Calendar,
  User,
  FileText,
  Activity,
  Mail,
  Phone,
  MapPin,
  Building,
  Hash,
  Link as LinkIcon,
  Edit,
  MessageSquare,
  Flag,
  MoreHorizontal,
  Share,
  Eye,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  QuickActionsMenu 
} from '@/presentation/components/ui/DropdownMenu'
import { SimpleTooltip } from '@/presentation/components/ui/Tooltip'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/presentation/components/ui/Modal'
import { AlertDialog, DeleteAlertDialog } from '@/presentation/components/ui/AlertDialog'
import { formatCurrency, formatDate, formatPaymentMethod, formatPaymentStatus } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'

// Interfaces
interface RefundData {
  refund_id: string
  payment_id: string
  merchant_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'pending' | 'processing' | 'requires_merchant_action' | 'cancelled'
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'expired_uncaptured_charge' | 'other'
  description?: string
  created: string
  updated: string
  error_code?: string
  error_message?: string
  merchant_connector_id?: string
  connector_transaction_id?: string
  connector_refund_id?: string
  profile_id?: string
  metadata?: Record<string, any>
  
  // Datos adicionales del pago original
  original_payment?: {
    payment_id: string
    amount: number
    currency: string
    status: string
    payment_method: string
    payment_method_type: string
    customer_id?: string
    customer_email?: string
    created: string
    captured_at?: string
    description?: string
    metadata?: Record<string, any>
  }
  
  // Información del cliente
  customer?: {
    customer_id: string
    name?: string
    email?: string
    phone?: string
    billing_address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
  }
  
  // Información del conector
  connector?: {
    connector_name: string
    connector_label?: string
    merchant_connector_id: string
  }
  
  // Timeline de eventos
  timeline?: Array<{
    id: string
    event_type: string
    description: string
    timestamp: string
    metadata?: Record<string, any>
  }>
}

interface RefundDetailsProps {
  refund: RefundData
  isLoading?: boolean
  onBack?: () => void
  onRefresh?: () => void
  onEdit?: () => void
  onCancel?: () => void
  onRetry?: () => void
  onDownloadReceipt?: () => void
  onViewPayment?: () => void
  onContactCustomer?: () => void
  className?: string
}

// Configuración de estados
const STATUS_CONFIG = {
  succeeded: {
    label: 'Exitoso',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  failed: {
    label: 'Fallido',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: Clock,
  },
  processing: {
    label: 'Procesando',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: RefreshCw,
  },
  requires_merchant_action: {
    label: 'Requiere Acción',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: XCircle,
  },
} as const

const REASON_CONFIG = {
  duplicate: 'Duplicado',
  fraudulent: 'Fraudulento',
  requested_by_customer: 'Solicitado por Cliente',
  expired_uncaptured_charge: 'Cargo Expirado',
  other: 'Otro',
} as const

// Componente principal
const RefundDetails = React.forwardRef<HTMLDivElement, RefundDetailsProps>(({
  refund,
  isLoading = false,
  onBack,
  onRefresh,
  onEdit,
  onCancel,
  onRetry,
  onDownloadReceipt,
  onViewPayment,
  onContactCustomer,
  className,
}, ref) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRetryDialog, setShowRetryDialog] = useState(false)

  // Estado del reembolso
  const statusConfig = STATUS_CONFIG[refund.status]
  const StatusIcon = statusConfig.icon

  // Copiar al portapapeles
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copiado al portapapeles`)
    } catch (error) {
      toast.error('Error al copiar al portapapeles')
    }
  }, [])

  // Acciones disponibles según el estado
  const availableActions = React.useMemo(() => {
    const actions = []
    
    if (refund.status === 'failed' && onRetry) {
      actions.push('retry')
    }
    
    if (['pending', 'processing'].includes(refund.status) && onCancel) {
      actions.push('cancel')
    }
    
    if (refund.status === 'succeeded' && onDownloadReceipt) {
      actions.push('download')
    }
    
    if (onEdit) {
      actions.push('edit')
    }
    
    return actions
  }, [refund.status, onRetry, onCancel, onDownloadReceipt, onEdit])

  return (
    <div ref={ref} className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Detalles del Reembolso</h1>
            <p className="text-muted-foreground">
              {refund.refund_id}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Actualizar
            </Button>
          )}
          
          <QuickActionsMenu
            onEdit={availableActions.includes('edit') ? onEdit : undefined}
            onDownload={availableActions.includes('download') ? onDownloadReceipt : undefined}
            editLabel="Editar Reembolso"
            downloadLabel="Descargar Recibo"
          >
            {availableActions.includes('retry') && (
              <DropdownMenuItem onClick={() => setShowRetryDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </DropdownMenuItem>
            )}
            
            {availableActions.includes('cancel') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowCancelDialog(true)}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Reembolso
                </DropdownMenuItem>
              </>
            )}
          </QuickActionsMenu>
        </div>
      </div>

      {/* Estado principal */}
      <Card className={cn('border-2', statusConfig.bgColor)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-full', statusConfig.bgColor)}>
                <StatusIcon className={cn('h-6 w-6', statusConfig.color)} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {statusConfig.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(refund.amount, { currency: refund.currency })}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Actualizado</p>
              <p className="font-medium">
                {formatDate(refund.updated, { relative: true })}
              </p>
            </div>
          </div>
          
          {refund.error_message && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Error</span>
              </div>
              <p className="text-sm text-destructive mt-1">{refund.error_message}</p>
              {refund.error_code && (
                <p className="text-xs text-destructive/80 mt-1">
                  Código: {refund.error_code}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="payment">Pago Original</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="technical">Técnico</TabsTrigger>
        </TabsList>
        
        {/* Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Información del Reembolso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">ID del Reembolso</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono">{refund.refund_id}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(refund.refund_id, 'ID del reembolso')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Monto</p>
                    <p className="font-semibold">
                      {formatCurrency(refund.amount, { currency: refund.currency })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Razón</p>
                    <p>{refund.reason ? REASON_CONFIG[refund.reason] : 'No especificada'}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Creado</p>
                    <p>{formatDate(refund.created)}</p>
                  </div>
                </div>
                
                {refund.description && (
                  <div>
                    <p className="text-muted-foreground text-sm">Descripción</p>
                    <p className="text-sm mt-1">{refund.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información del cliente */}
            {refund.customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {refund.customer.name || 'Cliente'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {refund.customer.customer_id}
                        </p>
                      </div>
                    </div>
                    
                    {refund.customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${refund.customer.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {refund.customer.email}
                        </a>
                      </div>
                    )}
                    
                    {refund.customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`tel:${refund.customer.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {refund.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {onContactCustomer && (
                    <Button size="sm" variant="outline" onClick={onContactCustomer}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contactar Cliente
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* Pago Original */}
        <TabsContent value="payment" className="space-y-6">
          {refund.original_payment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pago Original
                  </div>
                  {onViewPayment && (
                    <Button variant="outline" size="sm" onClick={onViewPayment}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Pago
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-muted-foreground text-sm">ID del Pago</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono">{refund.original_payment.payment_id}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(refund.original_payment!.payment_id, 'ID del pago')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground text-sm">Monto Original</p>
                      <p className="font-semibold">
                        {formatCurrency(refund.original_payment.amount, { 
                          currency: refund.original_payment.currency 
                        })}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground text-sm">Estado del Pago</p>
                      <Badge variant="outline">
                        {formatPaymentStatus(refund.original_payment.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Método de Pago</p>
                      <p>
                        {formatPaymentMethod(refund.original_payment.payment_method)}
                        {refund.original_payment.payment_method_type && 
                          ` (${refund.original_payment.payment_method_type})`
                        }
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground text-sm">Fecha de Creación</p>
                      <p>{formatDate(refund.original_payment.created)}</p>
                    </div>
                    
                    {refund.original_payment.captured_at && (
                      <div>
                        <p className="text-muted-foreground text-sm">Fecha de Captura</p>
                        <p>{formatDate(refund.original_payment.captured_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Información del pago no disponible
                </h3>
                <p className="text-muted-foreground">
                  No se pudo cargar la información del pago original.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Historial de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {refund.timeline && refund.timeline.length > 0 ? (
                <div className="space-y-4">
                  {refund.timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                        {index < refund.timeline!.length - 1 && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{event.description}</h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.timestamp, { includeTime: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.event_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Sin eventos registrados
                  </h3>
                  <p className="text-muted-foreground">
                    El historial de eventos aparecerá aquí.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Información Técnica */}
        <TabsContent value="technical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del conector */}
            {refund.connector && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Conector
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-sm">Nombre</p>
                    <p className="font-medium">{refund.connector.connector_name}</p>
                  </div>
                  
                  {refund.connector.connector_label && (
                    <div>
                      <p className="text-muted-foreground text-sm">Etiqueta</p>
                      <p>{refund.connector.connector_label}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-muted-foreground text-sm">ID del Conector</p>
                    <p className="font-mono text-sm">{refund.connector.merchant_connector_id}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* IDs de transacción */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  IDs de Transacción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {refund.connector_transaction_id && (
                  <div>
                    <p className="text-muted-foreground text-sm">ID Transacción Conector</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{refund.connector_transaction_id}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(refund.connector_transaction_id!, 'ID transacción')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {refund.connector_refund_id && (
                  <div>
                    <p className="text-muted-foreground text-sm">ID Reembolso Conector</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{refund.connector_refund_id}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(refund.connector_refund_id!, 'ID reembolso conector')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {refund.profile_id && (
                  <div>
                    <p className="text-muted-foreground text-sm">ID del Perfil</p>
                    <p className="font-mono text-sm">{refund.profile_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Metadata */}
          {refund.metadata && Object.keys(refund.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Metadatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                  {JSON.stringify(refund.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DeleteAlertDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="¿Cancelar reembolso?"
        description="Esta acción cancelará el reembolso y no se podrá revertir."
        itemName={`reembolso ${refund.refund_id}`}
        onConfirm={() => {
          onCancel?.()
          setShowCancelDialog(false)
        }}
      />

      <AlertDialog
        open={showRetryDialog}
        onOpenChange={setShowRetryDialog}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">¿Reintentar reembolso?</h3>
              <p className="text-sm text-muted-foreground">
                Se volverá a procesar el reembolso fallido.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRetryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              onRetry?.()
              setShowRetryDialog(false)
            }}>
              Reintentar
            </Button>
          </div>
        </div>
      </AlertDialog>
    </div>
  )
})

RefundDetails.displayName = 'RefundDetails'

export default RefundDetails
export type { RefundData, RefundDetailsProps }