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
  DollarSign,
  CreditCard,
  User,
  Calendar,
  Hash,
  Eye,
  Download,
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
import { formatCurrency } from '/home/kali/multipaga/src/presentation/lib/utils/formatters'
import type { PaymentResponse } from '@/infrastructure/repositories/HttpPaymentRepository'

// Status configuration with colors and icons
const PaymentStatusConfig = {
  succeeded: {
    label: 'Exitoso',
    color: 'success' as const,
    icon: CheckCircle,
    description: 'Pago completado exitosamente',
  },
  failed: {
    label: 'Fallido',
    color: 'destructive' as const,
    icon: XCircle,
    description: 'El pago no pudo ser procesado',
  },
  requires_payment_method: {
    label: 'Requiere método de pago',
    color: 'warning' as const,
    icon: CreditCard,
    description: 'Se necesita agregar un método de pago',
  },
  requires_confirmation: {
    label: 'Requiere confirmación',
    color: 'warning' as const,
    icon: AlertCircle,
    description: 'El pago necesita ser confirmado',
  },
  requires_action: {
    label: 'Requiere acción',
    color: 'warning' as const,
    icon: AlertCircle,
    description: 'Se requiere acción adicional del cliente',
  },
  processing: {
    label: 'Procesando',
    color: 'secondary' as const,
    icon: RefreshCw,
    description: 'El pago está siendo procesado',
  },
  requires_capture: {
    label: 'Requiere captura',
    color: 'warning' as const,
    icon: Clock,
    description: 'El pago está autorizado, pendiente de captura',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'secondary' as const,
    icon: XCircle,
    description: 'El pago fue cancelado',
  },
  partially_captured: {
    label: 'Parcialmente capturado',
    color: 'warning' as const,
    icon: Clock,
    description: 'Solo una parte del monto fue capturada',
  },
  partially_captured_and_capturable: {
    label: 'Parcial y capturable',
    color: 'warning' as const,
    icon: Clock,
    description: 'Parcialmente capturado con monto restante capturable',
  },
} as const

interface PaymentCardProps {
  payment: PaymentResponse
  onRefresh?: () => void
  onCapture?: (paymentId: string) => void
  onCancel?: (paymentId: string) => void
  onRefund?: (paymentId: string) => void
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  className?: string
}

export default function PaymentCard({
  payment,
  onRefresh,
  onCapture,
  onCancel,
  onRefund,
  variant = 'default',
  showActions = true,
  className = '',
}: PaymentCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const statusConfig = PaymentStatusConfig[payment.status] || PaymentStatusConfig.failed
  const StatusIcon = statusConfig.icon
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(payment.payment_id)
    toast.success('ID copiado al portapapeles')
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

  const getPaymentMethodDisplay = () => {
    if (payment.payment_method?.card) {
      const card = payment.payment_method.card
      return {
        type: 'Tarjeta',
        details: `•••• ${card.last4}`,
        brand: card.card_network,
      }
    }
    
    if (payment.payment_method?.wallet) {
      return {
        type: 'Billetera',
        details: payment.payment_method.type,
        brand: payment.payment_method.type,
      }
    }
    
    return {
      type: 'Otro',
      details: payment.payment_method?.type || 'N/A',
      brand: null,
    }
  }

  const paymentMethod = getPaymentMethodDisplay()

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className="w-5 h-5" style={{ color: statusConfig.color }} />
              <div>
                <p className="font-medium text-sm">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.payment_id.slice(-8)}
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
                {payment.payment_id.slice(-12)}
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
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">
                {formatCurrency(payment.amount, payment.currency)}
              </span>
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
                    <Link href={`/dashboard/payments/${payment.payment_id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalles
                    </Link>
                  </DropdownMenuItem>
                  
                  {onRefresh && (
                    <DropdownMenuItem onClick={() => handleAction(onRefresh)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualizar
                    </DropdownMenuItem>
                  )}
                  
                  {payment.status === 'requires_capture' && onCapture && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onCapture(payment.payment_id))}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Capturar pago
                    </DropdownMenuItem>
                  )}
                  
                  {payment.status === 'succeeded' && onRefund && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onRefund(payment.payment_id))}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Crear reembolso
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar recibo
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver en Hyperswitch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Method */}
        <div className="flex items-center space-x-3">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">{paymentMethod.type}</span>
            <span className="text-sm text-muted-foreground ml-2">
              {paymentMethod.details}
            </span>
            {paymentMethod.brand && (
              <Badge variant="secondary" size="sm" className="ml-2">
                {paymentMethod.brand}
              </Badge>
            )}
          </div>
        </div>

        {/* Customer */}
        {payment.customer_id && (
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Cliente: {payment.customer_id}</span>
          </div>
        )}

        {/* Connector */}
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-sm">Procesado por {payment.connector}</span>
        </div>

        {/* Description */}
        {payment.description && (
          <div className="text-sm text-muted-foreground">
            {payment.description}
          </div>
        )}

        {/* Amounts */}
        {variant === 'detailed' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {payment.amount_capturable && (
              <div>
                <span className="text-muted-foreground">Capturable:</span>
                <div className="font-medium">
                  {formatCurrency(payment.amount_capturable, payment.currency)}
                </div>
              </div>
            )}
            
            {payment.amount_received && (
              <div>
                <span className="text-muted-foreground">Recibido:</span>
                <div className="font-medium">
                  {formatCurrency(payment.amount_received, payment.currency)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground pt-3">
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <Tooltip>
            <TooltipTrigger>
              <span>
                {formatDistanceToNow(new Date(payment.created), { 
                  addSuffix: true,
                  locale: es 
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(payment.created).toLocaleString('es-ES')}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs">Intentos: {payment.attempt_count}</span>
          {payment.updated !== payment.created && (
            <span className="text-xs">
              Actualizado {formatDistanceToNow(new Date(payment.updated), { 
                addSuffix: true,
                locale: es 
              })}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}