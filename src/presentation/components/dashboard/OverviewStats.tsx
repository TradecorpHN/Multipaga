'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  RefreshCw, 
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Calendar,
  Filter,
  Download,
  Eye,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
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
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { formatCurrency, formatNumber, formatPercentage } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'

interface Statistic {
  id: string
  title: string
  value: number | string
  previousValue?: number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<any>
  color: string
  description?: string
  format: 'currency' | 'number' | 'percentage'
  currency?: string
  suffix?: string
  trend?: Array<{ period: string; value: number }>
}

interface OverviewStatsProps {
  statistics: Statistic[]
  isLoading?: boolean
  timeframe?: string
  onTimeframeChange?: (timeframe: string) => void
  showComparison?: boolean
  className?: string
}

const timeframeOptions = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' },
  { value: 'custom', label: 'Personalizado' },
]

export default function OverviewStats({
  statistics,
  isLoading = false,
  timeframe = '30d',
  onTimeframeChange,
  showComparison = true,
  className = '',
}: OverviewStatsProps) {
  const [expandedCards, setExpandedCards] = useState<string[]>([])

  const formatValue = (stat: Statistic) => {
    switch (stat.format) {
      case 'currency':
        return formatCurrency(Number(stat.value), { currency: stat.currency || 'USD' })
      case 'percentage':
        return formatPercentage(Number(stat.value))
      case 'number':
        return formatNumber(Number(stat.value)) + (stat.suffix || '')
      default:
        return String(stat.value)
    }
  }

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'decrease':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  const exportData = () => {
    const data = statistics.map(stat => ({
      metric: stat.title,
      value: stat.value,
      change: stat.change,
      changeType: stat.changeType,
    }))
    
    const csv = [
      ['Métrica', 'Valor', 'Cambio', 'Tipo'],
      ...data.map(row => [row.metric, row.value, row.change || '', row.changeType || ''])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estadisticas-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resumen de métricas</h2>
          <p className="text-muted-foreground">
            Estadísticas clave de tu actividad de pagos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {onTimeframeChange && (
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Exportar datos
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                Configurar filtros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statistics.map((stat) => {
          const Icon = stat.icon
          const isExpanded = expandedCards.includes(stat.id)
          
          return (
            <Card key={stat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="flex items-center space-x-1">
                  <Icon 
                    className={cn('h-4 w-4', stat.color)} 
                  />
                  {stat.trend && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleCardExpansion(stat.id)}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  {/* Main Value */}
                  <div className="text-2xl font-bold">
                    {formatValue(stat)}
                  </div>
                  
                  {/* Change Indicator */}
                  {showComparison && stat.change !== undefined && (
                    <div className="flex items-center space-x-1">
                      {getChangeIcon(stat.changeType)}
                      <span className={cn('text-sm font-medium', getChangeColor(stat.changeType))}>
                        {stat.changeType === 'increase' ? '+' : ''}
                        {stat.format === 'percentage' 
                          ? formatPercentage(stat.change)
                          : stat.format === 'currency'
                          ? formatCurrency(stat.change, { currency: stat.currency || 'USD' })
                          : formatNumber(stat.change)
                        }
                      </span>
                      <span className="text-sm text-muted-foreground">
                        vs período anterior
                      </span>
                    </div>
                  )}
                  
                  {/* Description */}
                  {stat.description && (
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  )}
                  
                  {/* Trend Data (when expanded) */}
                  {isExpanded && stat.trend && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-xs font-medium mb-2">Tendencia:</h4>
                      <div className="space-y-1">
                        {stat.trend.slice(-5).map((item, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{item.period}</span>
                            <span className="font-medium">
                              {stat.format === 'currency' 
                                ? formatCurrency(item.value, { currency: stat.currency || 'USD' })
                                : formatNumber(item.value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Cards for Key Insights */}
      {statistics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Rendimiento general
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics
                  .filter(stat => stat.changeType === 'increase')
                  .slice(0, 3)
                  .map((stat) => (
                    <div key={stat.id} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{stat.title}</span>
                      <div className="flex items-center space-x-1">
                        <ArrowUpRight className="w-3 h-3 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          +{formatPercentage(stat.change || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas de Mejora */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Áreas de atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics
                  .filter(stat => stat.changeType === 'decrease')
                  .slice(0, 3)
                  .map((stat) => (
                    <div key={stat.id} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{stat.title}</span>
                      <div className="flex items-center space-x-1">
                        <ArrowDownRight className="w-3 h-3 text-red-600" />
                        <span className="text-sm font-medium text-red-600">
                          {formatPercentage(stat.change || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                {statistics.filter(stat => stat.changeType === 'decrease').length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      ¡Todas las métricas están mejorando! 🎉
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Default statistics for demo/loading states
export const defaultStatistics: Statistic[] = [
  {
    id: 'total-revenue',
    title: 'Ingresos totales',
    value: 45231.89,
    previousValue: 42100.50,
    change: 7.44,
    changeType: 'increase',
    icon: DollarSign,
    color: 'text-green-600',
    format: 'currency',
    currency: 'USD',
    description: 'Ingresos totales del período',
  },
  {
    id: 'total-payments',
    title: 'Pagos procesados',
    value: 2350,
    previousValue: 2100,
    change: 11.9,
    changeType: 'increase',
    icon: CreditCard,
    color: 'text-blue-600',
    format: 'number',
    description: 'Número total de transacciones',
  },
  {
    id: 'success-rate',
    title: 'Tasa de éxito',
    value: 96.5,
    previousValue: 94.2,
    change: 2.4,
    changeType: 'increase',
    icon: Zap,
    color: 'text-purple-600',
    format: 'percentage',
    description: 'Porcentaje de pagos exitosos',
  },
  {
    id: 'active-customers',
    title: 'Clientes activos',
    value: 573,
    previousValue: 489,
    change: 17.2,
    changeType: 'increase',
    icon: Users,
    color: 'text-orange-600',
    format: 'number',
    description: 'Clientes que realizaron pagos',
  },
]
