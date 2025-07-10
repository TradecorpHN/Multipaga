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
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  Hash,
  Eye,
  Download,
  MessageSquare,
  Upload,
  Shield,
  Calendar,
  CreditCard,
  User,
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
import { Progress } from '@/presentation/components/ui/Progress'
import { formatCurrency, formatNumber, formatPercentage } from '@/presentation/components/ui/formatters'

// Dispute status configuration
const DisputeStatusConfig = {
  dispute_opened: {
    label: 'Abierta',
    color: 'destructive' as const,
    icon: AlertTriangle,
    description: 'Disputa abierta, requiere respuesta',
    urgency: 'high',
  },
  dispute_expired: {
    label: 'Expirada',
    color: 'secondary' as const,
    icon: Clock,
    description: 'El tiempo para responder ha expirado',
    urgency: 'low',
  },
  dispute_accepted: {
    label: 'Aceptada',
    color: 'secondary' as const,
    icon: CheckCircle,
    description: 'Disputa aceptada por el comerciante',
    urgency: 'low',
  },
  dispute_cancelled: {
    label: 'Cancelada',
    color: 'secondary' as const,
    icon: XCircle,
    description: 'Disputa cancelada',
    urgency: 'low',
  },
  dispute_challenged: {
    label: 'Contestada',
    color: 'warning' as const,
    icon: Shield,
    description: 'Disputa contestada, esperando resolución',
    urgency: 'medium',
  },
  dispute_won: {
    label: 'Ganada',
    color: 'success' as const,
    icon: CheckCircle,
    description: 'Disputa resuelta a favor del comerciante',
    urgency: 'low',
  },
  dispute_lost: {
    label: 'Perdida',
    color: 'destructive' as const,
    icon: XCircle,
    description: 'Disputa resuelta a favor del cliente',
    urgency: 'low',
  },
} as const

// Dispute reasons in Spanish
const DisputeReasonLabels = {
  credit_not_processed: 'Crédito no procesado',
  duplicate_processing: 'Procesamiento duplicado',
  fraudulent: 'Fraudulento',
  general: 'General',
  incorrect_currency: 'Moneda incorrecta',
  late_presentment: 'Presentación tardía',
  non_receipt: 'No recibido',
  other: 'Otro',
  processing_error: 'Error de procesamiento',
  product_not_received: 'Producto no recibido',
  product_unacceptable: 'Producto inaceptable',
  subscription_cancelled: 'Suscripción cancelada',
  unrecognized: 'No reconocido',
} as const

interface DisputeResponse {
  dispute_id: string
  payment_id: string
  amount: number
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: keyof typeof DisputeStatusConfig
  reason_code?: keyof typeof DisputeReasonLabels
  reason_message?: string
  evidence_due_by?: string
  created: string
  updated: string
  connector_dispute_id?: string
  connector_status?: string
  network_reason_code?: string
  network_reason_description?: string
  evidence?: {
    access_activity_log?: string
    billing_address?: string
    cancellation_policy?: string
    cancellation_policy_disclosure?: string
    cancellation_rebuttal?: string
    customer_communication?: string
    customer_email_address?: string
    customer_name?: string
    customer_purchase_ip?: string
    customer_signature?: string
    duplicate_charge_documentation?: string
    duplicate_charge_explanation?: string
    duplicate_charge_id?: string
    product_description?: string
    receipt?: string
    refund_policy?: string
    refund_policy_disclosure?: string
    refund_refusal_explanation?: string
    service_date?: string
    service_documentation?: string
    shipping_address?: string
    shipping_carrier?: string
    shipping_date?: string
    shipping_documentation?: string
    shipping_tracking_number?: string
    uncategorized_file?: string
    uncategorized_text?: string
  }
}

interface DisputeCardProps {
  dispute: DisputeResponse
  onRefresh?: () => void
  onSubmitEvidence?: (disputeId: string) => void
  onAccept?: (disputeId: string) => void
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  className?: string
}

export default function DisputeCard({
  dispute,
  onRefresh,
  onSubmitEvidence,
  onAccept,
  variant = 'default',
  showActions = true,
  className = '',
}: DisputeCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const statusConfig = DisputeStatusConfig[dispute.dispute_status]
  const StatusIcon = statusConfig.icon
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(dispute.dispute_id)
    toast.success('ID de disputa copiado')
  }

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText(dispute.payment_id)
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

  const getDaysUntilDeadline = () => {
    if (!dispute.evidence_due_by) return null
    const deadline = new Date(dispute.evidence_due_by)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDeadline = getDaysUntilDeadline()
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 3

  const getEvidenceCompleteness = () => {
    if (!dispute.evidence) return 0
    const evidenceFields = Object.values(dispute.evidence).filter(Boolean)
    const totalFields = Object.keys(dispute.evidence).length
    return Math.round((evidenceFields.length / totalFields) * 100)
  }

  const evidenceCompleteness = getEvidenceCompleteness()

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`w-5 h-5 ${
                statusConfig.urgency === 'high' ? 'text-red-600' :
                statusConfig.urgency === 'medium' ? 'text-yellow-600' :
                'text-gray-600'
              }`} />
              <div>
                <p className="font-medium text-sm">
                  {formatCurrency(dispute.amount, { currency: dispute.currency })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dispute.dispute_id.slice(-8)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={statusConfig.color} size="sm">
                {statusConfig.label}
              </Badge>
              {isUrgent && (
                <Badge variant="destructive" size="sm">
                  Urgente
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${
      isUrgent ? 'ring-2 ring-red-200 border-red-200' : ''
    } ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm text-muted-foreground">
                {dispute.dispute_id.slice(-12)}
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
              <DollarSign className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold">
                {formatCurrency(dispute.amount, { currency: dispute.currency })}
              </span>
              <Badge 
                variant={dispute.dispute_stage === 'dispute' ? 'destructive' : 'warning'}
                size="sm"
              >
                {dispute.dispute_stage === 'pre_dispute' ? 'Pre-disputa' :
                 dispute.dispute_stage === 'dispute' ? 'Disputa' : 'Pre-arbitraje'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            
            {isUrgent && (
              <Badge variant="destructive">
                Urgente
              </Badge>
            )}
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/disputes/${dispute.dispute_id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalles
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/payments/${dispute.payment_id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver pago original
                    </Link>
                  </DropdownMenuItem>
                  
                  {dispute.dispute_status === 'dispute_opened' && onSubmitEvidence && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onSubmitEvidence(dispute.dispute_id))}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar evidencia
                    </DropdownMenuItem>
                  )}
                  
                  {dispute.dispute_status === 'dispute_opened' && onAccept && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onAccept(dispute.dispute_id))}
                      className="text-orange-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceptar disputa
                    </DropdownMenuItem>
                  )}
                  
                  {onRefresh && (
                    <DropdownMenuItem onClick={() => handleAction(onRefresh)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualizar estado
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar evidencia
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
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Pago:</span>
              <span className="font-mono text-sm">{dispute.payment_id.slice(-12)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPaymentId}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Reason */}
        {dispute.reason_code && (
          <div className="flex items-start space-x-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                {DisputeReasonLabels[dispute.reason_code] || dispute.reason_code}
              </div>
              {dispute.reason_message && (
                <div className="text-sm text-muted-foreground mt-1">
                  {dispute.reason_message}
                </div>
              )}
              {dispute.network_reason_description && (
                <div className="text-xs text-muted-foreground mt-1">
                  Red: {dispute.network_reason_description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deadline */}
        {dispute.evidence_due_by && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fecha límite de evidencia:</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {new Date(dispute.evidence_due_by).toLocaleDateString('es-ES')}
                </div>
                {daysUntilDeadline !== null && (
                  <div className={`text-xs ${
                    daysUntilDeadline <= 1 ? 'text-red-600' :
                    daysUntilDeadline <= 3 ? 'text-orange-600' :
                    'text-muted-foreground'
                  }`}>
                    {daysUntilDeadline > 0 
                      ? `${daysUntilDeadline} días restantes`
                      : daysUntilDeadline === 0
                      ? 'Vence hoy'
                      : 'Vencida'
                    }
                  </div>
                )}
              </div>
            </div>
            
            {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
              <Progress 
                value={Math.max(0, 100 - ((daysUntilDeadline / 14) * 100))}
                className="h-2"
              />
            )}
          </div>
        )}

        {/* Evidence Progress */}
        {variant === 'detailed' && dispute.evidence && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Evidencia completada:</span>
              <span className="text-sm text-muted-foreground">{evidenceCompleteness}%</span>
            </div>
            <Progress value={evidenceCompleteness} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Object.values(dispute.evidence).filter(Boolean).length} de {Object.keys(dispute.evidence).length} campos completados
            </div>
          </div>
        )}

        {/* Status Description */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-start space-x-2">
            <StatusIcon className={`w-4 h-4 mt-0.5 ${
              statusConfig.urgency === 'high' ? 'text-red-600' :
              statusConfig.urgency === 'medium' ? 'text-yellow-600' :
              'text-gray-600'
            }`} />
            <div className="text-sm text-muted-foreground">
              {statusConfig.description}
            </div>
          </div>
        </div>

        {/* Network Information */}
        {variant === 'detailed' && (dispute.connector_dispute_id || dispute.network_reason_code) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Información de red:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {dispute.connector_dispute_id && (
                <div>
                  <span className="text-muted-foreground">ID externo:</span>
                  <div className="font-mono text-xs">{dispute.connector_dispute_id}</div>
                </div>
              )}
              
              {dispute.network_reason_code && (
                <div>
                  <span className="text-muted-foreground">Código de red:</span>
                  <div className="font-mono text-xs">{dispute.network_reason_code}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground pt-3">
        <Tooltip>
          <TooltipTrigger>
            <span>
              Creado {formatDistanceToNow(new Date(dispute.created), { 
                addSuffix: true,
                locale: es 
              })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{new Date(dispute.created).toLocaleString('es-ES')}</p>
          </TooltipContent>
        </Tooltip>

        {dispute.updated !== dispute.created && (
          <Tooltip>
            <TooltipTrigger>
              <span>
                Actualizado {formatDistanceToNow(new Date(dispute.updated), { 
                  addSuffix: true,
                  locale: es 
                })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(dispute.updated).toLocaleString('es-ES')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardFooter>
    </Card>
  )
}
