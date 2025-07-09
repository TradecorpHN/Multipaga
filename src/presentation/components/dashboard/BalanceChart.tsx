'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Eye,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/presentation/components/ui/Tabs'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { formatCurrency, formatNumber, formatPercentage } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

interface BalanceDataPoint {
  date: string
  timestamp: number
  balance: number
  income: number
  expenses: number
  net_flow: number
  pending_settlements: number
  volume: number
  transactions: number
}

interface ChartMetrics {
  current_balance: number
  previous_balance: number
  balance_change: number
  balance_change_percentage: number
  total_income: number
  total_expenses: number
  net_flow: number
  currency: string
  last_updated: string
}

interface BalanceChartProps {
  data: BalanceDataPoint[]
  metrics: ChartMetrics
  isLoading?: boolean
  timeframe?: string
  onTimeframeChange?: (timeframe: string) => void
  onRefresh?: () => void
  className?: string
}

const timeframeOptions = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' },
]

const chartColors = {
  primary: '#2563eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  muted: '#6b7280',
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {formatCurrency(entry.value, 'USD')}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function BalanceChart({
  data,
  metrics,
  isLoading = false,
  timeframe = '30d',
  onTimeframeChange,
  onRefresh,
  className = '',
}: BalanceChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')

  // Process data for different chart views
  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      date: new Date(point.timestamp).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
        ...(timeframe === '1y' && { year: '2-digit' }),
      }),
      balance_formatted: formatCurrency(point.balance, metrics.currency),
      income_formatted: formatCurrency(point.income, metrics.currency),
      expenses_formatted: formatCurrency(point.expenses, metrics.currency),
    }))
  }, [data, metrics.currency, timeframe])

  // Calculate trend data
  const trendData = useMemo(() => {
    if (data.length < 2) return null

    const recent = data[data.length - 1]
    const previous = data[data.length - 2]
    
    return {
      balance_trend: recent.balance - previous.balance,
      volume_trend: recent.volume - previous.volume,
      transactions_trend: recent.transactions - previous.transactions,
    }
  }, [data])

  // Distribution data for pie chart
  const distributionData = useMemo(() => {
    const totalIncome = data.reduce((sum, point) => sum + point.income, 0)
    const totalExpenses = data.reduce((sum, point) => sum + point.expenses, 0)
    
    return [
      { name: 'Ingresos', value: totalIncome, color: chartColors.success },
      { name: 'Gastos', value: totalExpenses, color: chartColors.danger },
    ]
  }, [data])

  const renderMetricCard = (
    title: string,
    value: number,
    change?: number,
    format: 'currency' | 'number' | 'percentage' = 'currency',
    icon?: React.ComponentType<any>
  ) => {
    const Icon = icon || DollarSign
    const isPositive = (change || 0) >= 0
    
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {format === 'currency' && formatCurrency(value, metrics.currency)}
            {format === 'number' && formatNumber(value)}
            {format === 'percentage' && formatPercentage(value)}
          </div>
          
          {change !== undefined && (
            <div className={cn(
              'flex items-center space-x-1 text-sm',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {isPositive ? '+' : ''}{formatPercentage(Math.abs(change))}
              </span>
              <span className="text-muted-foreground">vs período anterior</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, metrics.currency, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke={chartColors.primary}
            strokeWidth={3}
            dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: chartColors.primary, strokeWidth: 2 }}
            name="Balance"
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke={chartColors.success}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Ingresos"
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke={chartColors.danger}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Gastos"
          />
        </LineChart>
      )
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, metrics.currency, { compact: true })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={chartColors.primary}
            fill={chartColors.primary}
            fillOpacity={0.3}
            strokeWidth={2}
            name="Balance"
          />
        </AreaChart>
      )
    }

    // Bar chart
    return (
      <BarChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCurrency(value, metrics.currency, { compact: true })}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="income" fill={chartColors.success} name="Ingresos" />
        <Bar dataKey="expenses" fill={chartColors.danger} name="Gastos" />
      </BarChart>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Balance y flujo de caja
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {new Date(metrics.last_updated).toLocaleString('es-ES')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {onTimeframeChange && (
              <Select value={timeframe} onValueChange={onTimeframeChange}>
                <SelectTrigger className="w-40">
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
            
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard(
            'Balance actual',
            metrics.current_balance,
            metrics.balance_change_percentage,
            'currency',
            DollarSign
          )}
          
          {renderMetricCard(
            'Ingresos totales',
            metrics.total_income,
            trendData?.volume_trend,
            'currency',
            TrendingUp
          )}
          
          {renderMetricCard(
            'Gastos totales',
            metrics.total_expenses,
            undefined,
            'currency',
            TrendingDown
          )}
          
          {renderMetricCard(
            'Flujo neto',
            metrics.net_flow,
            undefined,
            'currency',
            Activity
          )}
        </div>

        {/* Chart Tabs */}
        <Tabs defaultValue="balance" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="balance">Balance</TabsTrigger>
              <TabsTrigger value="flow">Flujo de caja</TabsTrigger>
              <TabsTrigger value="distribution">Distribución</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="line">Línea</SelectItem>
                  <SelectItem value="bar">Barras</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="balance" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value, metrics.currency, { compact: true })}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill={chartColors.success} name="Ingresos" />
                  <Bar dataKey="expenses" fill={chartColors.danger} name="Gastos" />
                  <Bar dataKey="net_flow" fill={chartColors.primary} name="Flujo neto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-80">
                <h3 className="text-sm font-medium mb-4">Ingresos vs Gastos</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value, metrics.currency), 'Valor']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Resumen del período</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium">Ingresos totales</span>
                    </div>
                    <span className="font-bold">
                      {formatCurrency(metrics.total_income, metrics.currency)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-sm font-medium">Gastos totales</span>
                    </div>
                    <span className="font-bold">
                      {formatCurrency(metrics.total_expenses, metrics.currency)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-sm font-medium">Ganancia neta</span>
                    </div>
                    <span className={cn(
                      'font-bold',
                      metrics.net_flow >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatCurrency(metrics.net_flow, metrics.currency)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Margen de ganancia</span>
                    </div>
                    <span className="font-bold">
                      {formatPercentage(
                        metrics.total_income > 0 
                          ? (metrics.net_flow / metrics.total_income) * 100 
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Demo data for development
export const demoBalanceData: BalanceDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  
  const baseIncome = 5000 + Math.random() * 3000
  const baseExpenses = 2000 + Math.random() * 1500
  const netFlow = baseIncome - baseExpenses
  
  return {
    date: date.toISOString().split('T')[0],
    timestamp: date.getTime(),
    balance: 50000 + (i * netFlow) + (Math.random() - 0.5) * 5000,
    income: baseIncome,
    expenses: baseExpenses,
    net_flow: netFlow,
    pending_settlements: Math.random() * 10000,
    volume: baseIncome,
    transactions: Math.floor(Math.random() * 100) + 50,
  }
})

export const demoMetrics: ChartMetrics = {
  current_balance: 187500,
  previous_balance: 175000,
  balance_change: 12500,
  balance_change_percentage: 7.14,
  total_income: 245000,
  total_expenses: 87500,
  net_flow: 157500,
  currency: 'USD',
  last_updated: new Date().toISOString(),
}