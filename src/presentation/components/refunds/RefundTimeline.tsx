'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  DollarSign,
  FileText,
  User,
  MessageSquare,
  Zap,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { formatCurrency } from '/home/kali/multipaga/src/presentation/lib/utils/formatters'
import { cn } from '@/presentation/lib/utils'

// Timeline event types
interface TimelineEvent {
  id: string
  type: 'refund_initiated' | 'refund_processing' | 'refund_completed' | 'refund_failed' | 'refund_cancelled' | 'note_added' | 'status_changed' | 'manual_review'
  title: string
  description?: string
  timestamp: string
  status: 'completed' | 'current' | 'pending' | 'failed'
  amount?: number
  currency?: string
  user?: {
    name: string
    email: string
    role: string
  }
  metadata?: Record<string, any>
  connector?: string
  error_code?: string
  error_message?: string
}

// Event type configuration
const EventTypeConfig = {
  refund_initiated: {
    label: 'Reembolso iniciado',
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  refund_processing: {
    label: 'Procesando reembolso',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  refund_completed: {
    label: 'Reembolso completado',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  refund_failed: {
    label: 'Reembolso fallido',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  refund_cancelled: {
    label: 'Reembolso cancelado',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  note_added: {
    label: 'Nota agregada',
    icon: MessageSquare,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  status_changed: {
    label: 'Estado actualizado',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  manual_review: {
    label: 'Revisión manual',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
} as const

interface RefundTimelineProps {
  events: TimelineEvent[]
  refundId: string
  paymentId?: string
  showPaymentLink?: boolean
  className?: string
}

export default function RefundTimeline({
  events,
  refundId,
  paymentId,
  showPaymentLink = true,
  className = '',
}: RefundTimelineProps) {
  // Sort events by timestamp (newest first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [events])

  // Get current event index
  const currentEventIndex = useMemo(() => {
    return sortedEvents.findIndex(event => event.status === 'current')
  }, [sortedEvents])

  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'current':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
    }
  }

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: format(date, 'dd MMM yyyy', { locale: es }),
      time: format(date, 'HH:mm', { locale: es }),
    }
  }

  const getTimelineLineClass = (index: number, event: TimelineEvent) => {
    if (index === sortedEvents.length - 1) return 'h-0' // Last item

    const nextEvent = sortedEvents[index + 1]
    
    if (event.status === 'completed') {
      return 'bg-green-200'
    } else if (event.status === 'current') {
      return 'bg-blue-200'
    } else if (event.status === 'failed') {
      return 'bg-red-200'
    } else {
      return 'bg-gray-200'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timeline del reembolso
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {refundId.slice(-8)}
            </Badge>
            
            {showPaymentLink && paymentId && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/dashboard/payments/${paymentId}`}>
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Ver pago
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay eventos en el timeline aún
            </p>
          </div>
        ) : (
          <div className="relative">
            {sortedEvents.map((event, index) => {
              const config = EventTypeConfig[event.type]
              const Icon = config.icon
              const timeData = formatEventTime(event.timestamp)
              const isLast = index === sortedEvents.length - 1

              return (
                <div key={event.id} className="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className={cn(
                      'absolute left-6 top-12 w-px h-16 z-0',
                      getTimelineLineClass(index, event)
                    )} />
                  )}

                  <div className="relative flex items-start space-x-4 pb-8">
                    {/* Icon */}
                    <div className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 z-10',
                      config.bgColor,
                      config.borderColor,
                      event.status === 'current' && 'ring-2 ring-blue-200 ring-offset-2'
                    )}>
                      <Icon className={cn('w-5 h-5', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-medium">{event.title}</h3>
                            {getStatusIcon(event.status)}
                            
                            {event.amount && event.currency && (
                              <Badge variant="secondary" className="text-xs">
                                {formatCurrency(event.amount, event.currency)}
                              </Badge>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                          )}

                          {/* Error details */}
                          {event.error_code && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                              <div className="flex items-center space-x-2 text-red-800">
                                <AlertCircle className="w-4 h-4" />
                                <span className="font-medium">Error: {event.error_code}</span>
                              </div>
                              {event.error_message && (
                                <p className="text-sm text-red-700 mt-1">
                                  {event.error_message}
                                </p>
                              )}
                            </div>
                          )}

                          {/* User information */}
                          {event.user && (
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                              <User className="w-3 h-3" />
                              <span>por {event.user.name}</span>
                              <Badge variant="outline" size="sm">
                                {event.user.role}
                              </Badge>
                            </div>
                          )}

                          {/* Connector information */}
                          {event.connector && (
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                              <Zap className="w-3 h-3" />
                              <span>Procesado por {event.connector}</span>
                            </div>
                          )}

                          {/* Metadata */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-2">
                              <details className="group">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver detalles técnicos
                                </summary>
                                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                  {Object.entries(event.metadata).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-muted-foreground">{key}:</span>
                                      <span>{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-right text-xs text-muted-foreground ml-4">
                          <Tooltip>
                            <TooltipTrigger>
                              <div>
                                <div className="font-medium">{timeData.time}</div>
                                <div>{timeData.date}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{new Date(event.timestamp).toLocaleString('es-ES')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {sortedEvents.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total de eventos: {sortedEvents.length}
              </span>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-muted-foreground">
                    {sortedEvents.filter(e => e.status === 'completed').length} completados
                  </span>
                </div>
                
                {sortedEvents.some(e => e.status === 'failed') && (
                  <div className="flex items-center space-x-1">
                    <XCircle className="w-3 h-3 text-red-600" />
                    <span className="text-muted-foreground">
                      {sortedEvents.filter(e => e.status === 'failed').length} fallidos
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Demo data for development
export const demoTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'refund_completed',
    title: 'Reembolso completado exitosamente',
    description: 'El reembolso fue procesado y los fondos están en camino a la cuenta del cliente',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    status: 'completed',
    amount: 7500,
    currency: 'USD',
    connector: 'Stripe',
    user: {
      name: 'Sistema',
      email: 'system@multipaga.com',
      role: 'Automático',
    },
  },
  {
    id: '2',
    type: 'refund_processing',
    title: 'Reembolso en proceso',
    description: 'El reembolso está siendo procesado por el proveedor de pagos',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'completed',
    connector: 'Stripe',
    metadata: {
      processing_time: '1.2s',
      batch_id: 'batch_123456',
    },
  },
  {
    id: '3',
    type: 'manual_review',
    title: 'Revisión manual aprobada',
    description: 'El reembolso fue revisado manualmente y aprobado por el equipo de operaciones',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    status: 'completed',
    user: {
      name: 'Ana López',
      email: 'ana.lopez@multipaga.com',
      role: 'Operaciones',
    },
  },
  {
    id: '4',
    type: 'note_added',
    title: 'Nota agregada al reembolso',
    description: 'Cliente reportó que no recibió el producto. Verificado con el transportista.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    status: 'completed',
    user: {
      name: 'Carlos Méndez',
      email: 'carlos.mendez@multipaga.com',
      role: 'Soporte',
    },
  },
  {
    id: '5',
    type: 'refund_initiated',
    title: 'Reembolso iniciado',
    description: 'Solicitud de reembolso creada por solicitud del cliente',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    status: 'completed',
    amount: 7500,
    currency: 'USD',
    user: {
      name: 'María García',
      email: 'maria.garcia@multipaga.com',
      role: 'Atención al cliente',
    },
  },
]

// Compact version for smaller spaces
export function RefundTimelineCompact({
  events,
  className = '',
}: {
  events: TimelineEvent[]
  className?: string
}) {
  const recentEvents = events.slice(0, 3)

  return (
    <div className={cn('space-y-3', className)}>
      {recentEvents.map((event) => {
        const config = EventTypeConfig[event.type]
        const Icon = config.icon
        const timeData = formatEventTime(event.timestamp)

        return (
          <div key={event.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              config.bgColor
            )}>
              <Icon className={cn('w-4 h-4', config.color)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.title}</p>
              <p className="text-xs text-muted-foreground">{timeData.time}</p>
            </div>
            
            {getStatusIcon(event.status)}
          </div>
        )
      })}
      
      {events.length > 3 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs">
            Ver {events.length - 3} eventos más
          </Button>
        </div>
      )}
    </div>
  )
}

function getStatusIcon(status: TimelineEvent['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'current':
      return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
    case 'pending':
      return <Clock className="w-4 h-4 text-gray-400" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-600" />
  }
}

function formatEventTime(timestamp: string) {
  const date = new Date(timestamp)
  return {
    date: format(date, 'dd MMM yyyy', { locale: es }),
    time: format(date, 'HH:mm', { locale: es }),
  }
}