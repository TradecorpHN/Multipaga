'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MoreHorizontal,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  DollarSign,
  Hash,
  Eye,
  Download,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/presentation/components/ui/Card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { formatCurrency } from '@/presentation/lib/formatters'

// Refund status configuration
const RefundStatusConfig = {
  succeeded: {
    label: 'Completado',
    color: 'success' as const,
    icon: CheckCircle,
    description: 'Reembolso procesado exitosamente',
  },
  failed: {
    label: 'Fallido',
    color: 'destructive' as const,
    icon: XCircle,
    description: 'No se pudo procesar el reembolso',
  },
  pending: {
    label: 'Pendiente',
    color: 'warning' as const,
    icon: Clock,
    description: 'Reembolso en proceso',
  },
  processing: {
    label: 'Procesando',
    color: 'secondary' as const,
    icon: RefreshCw,
    description: 'El reembolso está siendo procesado',
  },
  requires_merchant_action: {
    label: 'Requiere acción',
    color: 'warning' as const,
    icon: AlertCircle,
    description: 'Se requiere acción del comerciante',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'secondary' as const,
    icon: XCircle,
    description: 'El reembolso fue cancelado',
  },
} as const

// Refund reasons in Spanish
const RefundReasonLabels = {
  duplicate: 'Duplicado',
  fraudulent: 'Fraudulento',
  requested_by_customer: 'Solicitado por cliente',
  expired_uncaptured_charge: 'Cargo no capturado expirado',
  other: 'Otro',
} as const

interface RefundResponse {
  refund_id: string
  payment_id: string
  merchant_id: string
  amount: number
  currency: string
  status: keyof typeof RefundStatusConfig
  reason?: keyof typeof RefundReasonLabels
  description?: string
  metadata?: Record<string, any>
  created: string
  updated: string
  error_code?: string
  error_message?: string
  merchant_connector_id?: string
  connector_transaction_id?: string
  connector_refund_id?: string
  profile_id?: string
}

interface RefundCardProps {
  refund: RefundResponse
  paymentAmount?: number
  onRefresh?: () => void
  onCancel?: (refundId: string) => void
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  className?: string
}

export default function RefundCard({
  refund,
  paymentAmount,
  onRefresh,
  onCancel,
  variant = 'default',
  showActions = true,
  className = '',
}: RefundCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const statusConfig = RefundStatusConfig[refund.status] || RefundStatusConfig.failed
  const StatusIcon = statusConfig.icon
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(refund.refund_id)
    toast.success('ID de reembolso copiado')
  }

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText(refund.payment_id)
    toast.success('ID de pago copiado')
  }

  const handleAction = async (action: () => void) => {
    setIsLoading(true)
    try {
      await action()
      toast.success('Acción completada')
    } catch (error) {
      toast.error('Error al ejecutar la acción')
    } finally {
      setIsLoading(false)
    }
  }

  const getRefundPercentage = () => {
    if (!paymentAmount) return null
    return Math.round((refund.amount / paymentAmount) * 100)
  }

  const percentage = getRefundPercentage()

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-orange-600">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {formatCurrency(refund.amount, refund.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {refund.refund_id.slice(-8)}
                </p>
              </div>
            </div>
            <Badge variant={statusConfig.color} size="sm">
              {statusConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm text-muted-foreground">
                {refund.refund_id.slice(-12)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyId}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-orange-600">
                <ArrowLeft className="w-5 h-5 mr-1" />
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold">
                {formatCurrency(refund.amount, refund.currency)}
              </span>
              {percentage && (
                <Badge variant="secondary" size="sm">
                  {percentage}%
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/refunds/${refund.refund_id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalles
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/payments/${refund.payment_id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver pago original
                    </Link>
                  </DropdownMenuItem>
                  
                  {onRefresh && (
                    <DropdownMenuItem onClick={() => handleAction(onRefresh)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualizar estado
                    </DropdownMenuItem>
                  )}
                  
                  {refund.status === 'pending' && onCancel && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onCancel(refund.refund_id))}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar reembolso
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar comprobante
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Reference */}
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center text-blue-600">
            <ArrowLeft className="w-4 h-4 mr-1 rotate-180" />
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Pago original:</span>
              <span className="font-mono text-sm">{refund.payment_id.slice(-12)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPaymentId}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            {paymentAmount && (
              <div className="text-sm text-muted-foreground">
                Monto original: {formatCurrency(paymentAmount, refund.currency)}
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        {refund.reason && (
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">Motivo:</span>
              <span className="text-sm text-muted-foreground ml-2">
                {RefundReasonLabels[refund.reason] || refund.reason}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        {refund.description && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <span className="font-medium">Descripción:</span>
            <div className="mt-1">{refund.description}</div>
          </div>
        )}

        {/* Error Information */}
        {refund.error_code && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Error: {refund.error_code}</span>
            </div>
            {refund.error_message && (
              <p className="text-sm text-destructive/80 mt-1">
                {refund.error_message}
              </p>
            )}
          </div>
        )}

        {/* Connector Information */}
        {variant === 'detailed' && refund.merchant_connector_id && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Conector:</span>
              <div className="font-medium">{refund.merchant_connector_id}</div>
            </div>
            
            {refund.connector_refund_id && (
              <div>
                <span className="text-muted-foreground">ID externo:</span>
                <div className="font-mono text-sm">{refund.connector_refund_id}</div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {variant === 'detailed' && refund.metadata && Object.keys(refund.metadata).length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Metadatos:</span>
            <div className="bg-muted p-3 rounded-lg">
              {Object.entries(refund.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground pt-3">
        <Tooltip>
          <TooltipTrigger>
            <span>
              Creado {formatDistanceToNow(new Date(refund.created), { 
                addSuffix: true,
                locale: es 
              })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{new Date(refund.created).toLocaleString('es-ES')}</p>
          </TooltipContent>
        </Tooltip>

        {refund.updated !== refund.created && (
          <Tooltip>
            <TooltipTrigger>
              <span>
                Actualizado {formatDistanceToNow(new Date(refund.updated), { 
                  addSuffix: true,
                  locale: es 
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(refund.updated).toLocaleString('es-ES')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardFooter>
    </Card>
  )
}