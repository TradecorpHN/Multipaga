'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ArrowRight,
  Filter,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Calendar,
  Activity as ActivityIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Separator } from '@/presentation/components/ui/Separator'
import { ScrollArea } from '@/presentation/components/ui/ScrollArea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/Avatar'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { formatCurrency } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

// Activity types configuration
const ActivityTypeConfig = {
  payment_created: {
    label: 'Pago creado',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Se creó un nuevo pago',
  },
  payment_succeeded: {
    label: 'Pago exitoso',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'El pago fue procesado exitosamente',
  },
  payment_failed: {
    label: 'Pago fallido',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'El pago no pudo ser procesado',
  },
  payment_captured: {
    label: 'Pago capturado',
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'El pago autorizado fue capturado',
  },
  refund_created: {
    label: 'Reembolso creado',
    icon: RefreshCw,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Se procesó un reembolso',
  },
  dispute_created: {
    label: 'Disputa abierta',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Se abrió una nueva disputa',
  },
  customer_created: {
    label: 'Cliente registrado',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'Se registró un nuevo cliente',
  },
  connector_enabled: {
    label: 'Conector activado',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Se activó un conector de pago',
  },
  connector_disabled: {
    label: 'Conector desactivado',
    icon: Zap,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    description: 'Se desactivó un conector de pago',
  },
} as const

interface ActivityItem {
  id: string
  type: keyof typeof ActivityTypeConfig
  title: string
  description?: string
  timestamp: string
  amount?: number
  currency?: string
  entity_id: string
  entity_type: 'payment' | 'refund' | 'dispute' | 'customer' | 'connector'
  user?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  metadata?: Record<string, any>
}

interface RecentActivityProps {
  activities: ActivityItem[]
  isLoading?: boolean
  showFilters?: boolean
  maxItems?: number
  timeRange?: string
  onTimeRangeChange?: (range: string) => void
  className?: string
}

const timeRangeOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo el tiempo' },
]

const activityTypeFilters = [
  { value: 'all', label: 'Todas las actividades' },
  { value: 'payments', label: 'Solo pagos' },
  { value: 'refunds', label: 'Solo reembolsos' },
  { value: 'disputes', label: 'Solo disputas' },
  { value: 'customers', label: 'Solo clientes' },
  { value: 'connectors', label: 'Solo conectores' },
]

export default function RecentActivity({
  activities,
  isLoading = false,
  showFilters = true,
  maxItems = 10,
  timeRange = '7d',
  onTimeRangeChange,
  className = '',
}: RecentActivityProps) {
  const [typeFilter, setTypeFilter] = useState('all')

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => {
        switch (typeFilter) {
          case 'payments':
            return activity.type.startsWith('payment_')
          case 'refunds':
            return activity.type.startsWith('refund_')
          case 'disputes':
            return activity.type.startsWith('dispute_')
          case 'customers':
            return activity.type.startsWith('customer_')
          case 'connectors':
            return activity.type.startsWith('connector_')
          default:
            return true
        }
      })
    }

    // Apply time range filter
    if (timeRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()

      switch (timeRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'yesterday':
          cutoff.setDate(cutoff.getDate() - 1)
          cutoff.setHours(0, 0, 0, 0)
          filtered = filtered.filter(activity => {
            const activityDate = new Date(activity.timestamp)
            return activityDate >= cutoff && activityDate < now && !isToday(activityDate)
          })
          break
        case '7d':
          cutoff.setDate(cutoff.getDate() - 7)
          break
        case '30d':
          cutoff.setDate(cutoff.getDate() - 30)
          break
      }

      if (timeRange !== 'yesterday') {
        filtered = filtered.filter(activity => 
          new Date(activity.timestamp) >= cutoff
        )
      }
    }

    return filtered.slice(0, maxItems)
  }, [activities, typeFilter, timeRange, maxItems])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {}

    filteredActivities.forEach(activity => {
      const activityDate = new Date(activity.timestamp)
      let dateKey: string

      if (isToday(activityDate)) {
        dateKey = 'Hoy'
      } else if (isYesterday(activityDate)) {
        dateKey = 'Ayer'
      } else {
        dateKey = format(activityDate, 'EEEE, d MMMM', { locale: es })
      }

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })

    return groups
  }, [filteredActivities])

  const getEntityLink = (activity: ActivityItem) => {
    switch (activity.entity_type) {
      case 'payment':
        return `/dashboard/payments/${activity.entity_id}`
      case 'refund':
        return `/dashboard/refunds/${activity.entity_id}`
      case 'dispute':
        return `/dashboard/disputes/${activity.entity_id}`
      case 'customer':
        return `/dashboard/customers/${activity.entity_id}`
      case 'connector':
        return `/dashboard/connectors/${activity.entity_id}`
      default:
        return '#'
    }
  }

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return format(date, 'HH:mm')
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" />
            Actividad reciente
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showFilters && (
              <>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypeFilters.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {onTimeRangeChange && (
                  <Select value={timeRange} onValueChange={onTimeRangeChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRangeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/activity">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver toda la actividad
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="w-4 h-4 mr-2" />
                  Exportar actividad
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-6 space-y-6">
            {Object.keys(groupedActivities).length === 0 ? (
              <div className="text-center py-8">
                <ActivityIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay actividad reciente para mostrar
                </p>
              </div>
            ) : (
              Object.entries(groupedActivities).map(([dateKey, activities], index) => (
                <div key={dateKey}>
                  {index > 0 && <Separator className="my-6" />}
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {dateKey}
                    </h3>
                    
                    <div className="space-y-3">
                      {activities.map((activity) => {
                        const config = ActivityTypeConfig[activity.type]
                        const Icon = config.icon
                        
                        return (
                          <div
                            key={activity.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            {/* Icon */}
                            <div className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                              config.bgColor
                            )}>
                              <Icon className={cn('w-5 h-5', config.color)} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium truncate">
                                  {activity.title}
                                </p>
                                {activity.amount && activity.currency && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatCurrency(activity.amount, activity.currency)}
                                  </Badge>
                                )}
                              </div>
                              
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                              )}
                              
                              {activity.user && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={activity.user.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    por {activity.user.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Time and Actions */}
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {formatActivityTime(activity.timestamp)}
                              </span>
                              
                              <Link href={getEntityLink(activity)}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {filteredActivities.length > 0 && (
        <div className="px-6 py-4 border-t">
          <Link href="/dashboard/activity">
            <Button variant="ghost" className="w-full">
              Ver toda la actividad
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}

// Compact version for smaller spaces
export function RecentActivityCompact({ 
  activities, 
  className = '' 
}: { 
  activities: ActivityItem[]
  className?: string 
}) {
  return (
    <RecentActivity
      activities={activities}
      className={className}
      showFilters={false}
      maxItems={5}
    />
  )
}

// Demo data for development
export const demoActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'payment_succeeded',
    title: 'Pago de $150.00 completado',
    description: 'Pago de Juan Pérez procesado exitosamente',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    amount: 15000,
    currency: 'USD',
    entity_id: 'pay_123',
    entity_type: 'payment',
    user: {
      id: 'user_1',
      name: 'Juan Pérez',
      email: 'juan@ejemplo.com',
    },
  },
  {
    id: '2',
    type: 'refund_created',
    title: 'Reembolso procesado',
    description: 'Reembolso de $75.00 para pedido #ORD-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    amount: 7500,
    currency: 'USD',
    entity_id: 'ref_456',
    entity_type: 'refund',
    user: {
      id: 'user_2',
      name: 'María García',
      email: 'maria@ejemplo.com',
    },
  },
  {
    id: '3',
    type: 'customer_created',
    title: 'Nuevo cliente registrado',
    description: 'Cliente Carlos López se registró en el sistema',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    entity_id: 'cust_789',
    entity_type: 'customer',
  },
  {
    id: '4',
    type: 'connector_enabled',
    title: 'Conector Stripe activado',
    description: 'El conector de Stripe fue activado exitosamente',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    entity_id: 'conn_stripe',
    entity_type: 'connector',
    user: {
      id: 'admin_1',
      name: 'Admin',
      email: 'admin@multipaga.com',
    },
  },
]