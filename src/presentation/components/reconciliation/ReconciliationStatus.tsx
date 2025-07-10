// /home/kali/multipaga/src/presentation/components/reconciliation/ReconciliationStatus.tsx
// ──────────────────────────────────────────────────────────────────────────────
// ReconciliationStatus - Componente para mostrar estado y estadísticas de reconciliación
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Calendar,
  Building,
  Zap,
  Users,
  Target,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Eye,
  Filter,
  MoreHorizontal,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Progress } from '@/presentation/components/ui/Progress'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/presentation/components/ui/DropdownMenu'
import { SimpleTooltip, InfoTooltip } from '@/presentation/components/ui/Tooltip'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/presentation/components/ui/Modal'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { formatCurrency, formatPercentage, formatDate } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'

// Interfaces
interface ReconciliationStats {
  overview: {
    total_transactions: number
    matched_transactions: number
    unmatched_transactions: number
    pending_transactions: number
    disputed_transactions: number
    reconciliation_rate: number
    total_volume: number
    matched_volume: number
    unmatched_volume: number
    currency: string
  }
  
  trends: {
    period: 'daily' | 'weekly' | 'monthly'
    previous_reconciliation_rate: number
    reconciliation_rate_change: number
    volume_change: number
    transaction_count_change: number
  }
  
  discrepancies: {
    total_discrepancies: number
    amount_discrepancies: number
    status_discrepancies: number
    date_discrepancies: number
    missing_transactions: number
    total_discrepancy_amount: number
    avg_discrepancy_amount: number
  }
  
  connectors: Array<{
    connector_name: string
    total_transactions: number
    matched_transactions: number
    reconciliation_rate: number
    total_volume: number
    last_reconciliation: string
    status: 'active' | 'inactive' | 'error'
  }>
  
  performance: {
    processing_time_avg: number
    processing_time_p95: number
    auto_match_rate: number
    manual_review_rate: number
    error_rate: number
    sla_compliance: number
  }
  
  schedule: {
    next_reconciliation: string
    frequency: 'hourly' | 'daily' | 'weekly'
    last_reconciliation: string
    status: 'scheduled' | 'running' | 'completed' | 'failed'
    progress?: number
  }
}

interface ReconciliationStatusProps {
  stats: ReconciliationStats
  isLoading?: boolean
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  onPeriodChange?: (period: string) => void
  onRefresh?: () => void
  onExportReport?: () => void
  onRunReconciliation?: () => void
  onViewDetails?: (section: string) => void
  onConfigureSchedule?: () => void
  className?: string
}

// Configuración de estados
const STATUS_CONFIG = {
  matched: {
    label: 'Conciliados',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
  },
  unmatched: {
    label: 'No Conciliados',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  pending: {
    label: 'Pendientes',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  disputed: {
    label: 'Disputados',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
} as const

const SCHEDULE_STATUS_CONFIG = {
  scheduled: {
    label: 'Programado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Clock,
  },
  running: {
    label: 'Ejecutándose',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: PlayCircle,
  },
  completed: {
    label: 'Completado',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  failed: {
    label: 'Fallido',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
} as const

// Componente principal
const ReconciliationStatus = React.forwardRef<HTMLDivElement, ReconciliationStatusProps>(({
  stats,
  isLoading = false,
  period = 'day',
  onPeriodChange,
  onRefresh,
  onExportReport,
  onRunReconciliation,
  onViewDetails,
  onConfigureSchedule,
  className,
}, ref) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Calcular métricas derivadas
  const metrics = useMemo(() => {
    const { overview, trends, discrepancies, performance } = stats
    
    return {
      reconciliationRate: overview.reconciliation_rate,
      reconciliationRateChange: trends.reconciliation_rate_change,
      volumeMatched: (overview.matched_volume / overview.total_volume) * 100,
      discrepancyRate: (discrepancies.total_discrepancies / overview.total_transactions) * 100,
      avgDiscrepancyAmount: discrepancies.avg_discrepancy_amount,
      topConnector: stats.connectors.reduce((prev, current) => 
        (current.reconciliation_rate > prev.reconciliation_rate) ? current : prev
      ),
      worstConnector: stats.connectors.reduce((prev, current) => 
        (current.reconciliation_rate < prev.reconciliation_rate) ? current : prev
      ),
    }
  }, [stats])

  // Formatear cambio de tendencia
  const formatTrendChange = useCallback((change: number, isPercentage = false) => {
    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus
    const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
    const prefix = change > 0 ? '+' : ''
    const suffix = isPercentage ? '%' : ''
    
    return (
      <div className={cn('flex items-center gap-1', color)}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {prefix}{change.toFixed(isPercentage ? 1 : 0)}{suffix}
        </span>
      </div>
    )
  }, [])

  // Renderizar tarjeta de métrica
  const renderMetricCard = useCallback((
    title: string,
    value: string | number,
    change?: number,
    icon?: React.ReactNode,
    description?: string,
    colorClass?: string
  ) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn('p-2 rounded-lg', colorClass || 'bg-primary/10')}>
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          {change !== undefined && (
            <div className="text-right">
              {formatTrendChange(change, typeof value === 'string' && value.includes('%'))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  ), [formatTrendChange])

  if (isLoading) {
    return (
      <div ref={ref} className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const scheduleConfig = SCHEDULE_STATUS_CONFIG[stats.schedule.status]
  const ScheduleIcon = scheduleConfig.icon

  return (
    <div ref={ref} className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estado de Reconciliación</h1>
          <p className="text-muted-foreground">
            Último procesamiento: {formatDate(stats.schedule.last_reconciliation, { relative: true })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
          
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          )}
          
          {onExportReport && (
            <Button variant="outline" onClick={onExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          
          {onRunReconciliation && (
            <Button onClick={onRunReconciliation}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Ejecutar
            </Button>
          )}
        </div>
      </div>

      {/* Estado del cronograma */}
      <Card className={cn('border-2', scheduleConfig.bgColor, 'border-current')}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-full', scheduleConfig.bgColor)}>
                <ScheduleIcon className={cn('h-6 w-6', scheduleConfig.color)} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {scheduleConfig.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Próxima ejecución: {formatDate(stats.schedule.next_reconciliation)}
                </p>
                {stats.schedule.status === 'running' && stats.schedule.progress && (
                  <div className="mt-2">
                    <Progress value={stats.schedule.progress} className="w-64" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.schedule.progress}% completado
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {onConfigureSchedule && (
              <Button variant="outline" onClick={onConfigureSchedule}>
                <Calendar className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Tasa de Reconciliación',
          formatPercentage(stats.overview.reconciliation_rate),
          stats.trends.reconciliation_rate_change,
          <Target className="h-5 w-5 text-green-600" />,
          `${stats.overview.matched_transactions} de ${stats.overview.total_transactions} transacciones`,
          'bg-green-50'
        )}
        
        {renderMetricCard(
          'Volumen Total',
          formatCurrency(stats.overview.total_volume, { currency: stats.overview.currency, compact: true }),
          stats.trends.volume_change,
          <DollarSign className="h-5 w-5 text-blue-600" />,
          `${formatPercentage(metrics.volumeMatched)} conciliado`,
          'bg-blue-50'
        )}
        
        {renderMetricCard(
          'Discrepancias',
          stats.discrepancies.total_discrepancies.toString(),
          undefined,
          <AlertTriangle className="h-5 w-5 text-orange-600" />,
          `${formatPercentage(metrics.discrepancyRate)} de transacciones`,
          'bg-orange-50'
        )}
        
        {renderMetricCard(
          'Rendimiento SLA',
          formatPercentage(stats.performance.sla_compliance),
          undefined,
          <Activity className="h-5 w-5 text-purple-600" />,
          `${stats.performance.processing_time_avg}ms promedio`,
          'bg-purple-50'
        )}
      </div>

      {/* Tabs de detalles */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="connectors">Conectores</TabsTrigger>
          <TabsTrigger value="discrepancies">Discrepancias</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>
        
        {/* Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribución por estado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución de Estados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const count = stats.overview[`${status}_transactions` as keyof typeof stats.overview] as number
                  const percentage = (count / stats.overview.total_transactions) * 100
                  const Icon = config.icon
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-4 w-4', config.color)} />
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={cn('h-2 rounded-full', config.bgColor.replace('bg-', 'bg-').replace('-50', '-500'))}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold min-w-[3rem] text-right">
                          {count}
                        </span>
                        <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            
            {/* Tendencias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencias del Período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasa de Reconciliación</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatPercentage(stats.overview.reconciliation_rate)}
                    </span>
                    {formatTrendChange(stats.trends.reconciliation_rate_change, true)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Volumen de Transacciones</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatCurrency(stats.overview.total_volume, { 
                        currency: stats.overview.currency, 
                        compact: true 
                      })}
                    </span>
                    {formatTrendChange(stats.trends.volume_change)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Número de Transacciones</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {stats.overview.total_transactions.toLocaleString()}
                    </span>
                    {formatTrendChange(stats.trends.transaction_count_change)}
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto-Match Rate</span>
                  <span className="text-sm font-semibold">
                    {formatPercentage(stats.performance.auto_match_rate)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error Rate</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatPercentage(stats.performance.error_rate)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Conectores */}
        <TabsContent value="connectors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Estado de Conectores
              </CardTitle>
              <CardDescription>
                Rendimiento de reconciliación por conector
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.connectors.map((connector, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        connector.status === 'active' ? 'bg-green-500' :
                        connector.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                      )} />
                      <div>
                        <h4 className="font-medium">{connector.connector_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {connector.total_transactions} transacciones • 
                          Última: {formatDate(connector.last_reconciliation, { relative: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatPercentage(connector.reconciliation_rate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {connector.matched_transactions}/{connector.total_transactions}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(connector.total_volume, { 
                            currency: stats.overview.currency, 
                            compact: true 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">Volumen</p>
                      </div>
                      
                      {onViewDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(`connector-${connector.connector_name}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Discrepancias */}
        <TabsContent value="discrepancies" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Tipos de Discrepancias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Diferencias de Monto</span>
                  <Badge variant="destructive">
                    {stats.discrepancies.amount_discrepancies}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estados Diferentes</span>
                  <Badge variant="warning">
                    {stats.discrepancies.status_discrepancies}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fechas Diferentes</span>
                  <Badge variant="secondary">
                    {stats.discrepancies.date_discrepancies}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Transacciones Faltantes</span>
                  <Badge variant="destructive">
                    {stats.discrepancies.missing_transactions}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Discrepancias</span>
                  <span className="text-lg font-bold text-red-600">
                    {stats.discrepancies.total_discrepancies}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Impacto Financiero
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total de Discrepancias</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.discrepancies.total_discrepancy_amount, {
                      currency: stats.overview.currency
                    })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Promedio por Discrepancia</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(stats.discrepancies.avg_discrepancy_amount, {
                      currency: stats.overview.currency
                    })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">% del Volumen Total</p>
                  <p className="text-lg font-semibold">
                    {formatPercentage(
                      (stats.discrepancies.total_discrepancy_amount / stats.overview.total_volume) * 100
                    )}
                  </p>
                </div>
                
                {onViewDetails && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onViewDetails('discrepancies')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Detalles de Discrepancias
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Rendimiento */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tiempos de Procesamiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                  <p className="text-xl font-bold">
                    {stats.performance.processing_time_avg}ms
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Percentil 95</p>
                  <p className="text-lg font-semibold">
                    {stats.performance.processing_time_p95}ms
                  </p>
                </div>
                
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>SLA Compliance</span>
                    <span className="font-semibold">
                      {formatPercentage(stats.performance.sla_compliance)}
                    </span>
                  </div>
                  <Progress 
                    value={stats.performance.sla_compliance} 
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Tasas de Automatización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Auto-Match</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPercentage(stats.performance.auto_match_rate)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Revisión Manual</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatPercentage(stats.performance.manual_review_rate)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Tasa de Error</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatPercentage(stats.performance.error_rate)}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métricas Clave
                  <InfoTooltip content="Indicadores de rendimiento del sistema de reconciliación" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mejor Conector</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">{metrics.topConnector.connector_name}</p>
                      <p className="text-xs text-green-600">
                        {formatPercentage(metrics.topConnector.reconciliation_rate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Requiere Atención</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">{metrics.worstConnector.connector_name}</p>
                      <p className="text-xs text-red-600">
                        {formatPercentage(metrics.worstConnector.reconciliation_rate)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats.connectors.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Conectores Activos
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
})

ReconciliationStatus.displayName = 'ReconciliationStatus'

export default ReconciliationStatus
export type { ReconciliationStats, ReconciliationStatusProps }