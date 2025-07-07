'use client'

import { useState, useMemo } from 'react'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
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
  Cell
} from 'recharts'
import { useAuthStore } from '@/presentation/stores/AuthStore'
import { usePayments } from '@/presentation/hooks/usePayments'
import { useConnectors } from '@/presentation/hooks/useConnectors'
import { formatCurrency, formatNumber } from '@/presentation/lib/utils/formatters'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'

// Time range options
const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

// Chart colors
const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280',
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    return {
      from: startOfDay(subDays(now, days)),
      to: endOfDay(now),
    }
  }, [timeRange])

  // Fetch data
  const { 
    data: paymentsData, 
    loading: paymentsLoading,
    refetch: refetchPayments 
  } = usePayments({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
    limit: 1000,
  })

  const {
    data: connectorsData,
    loading: connectorsLoading,
  } = useConnectors()

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!paymentsData?.data) {
      return {
        totalVolume: 0,
        totalTransactions: 0,
        successRate: 0,
        averageTicket: 0,
        volumeChange: 0,
        transactionChange: 0,
      }
    }

    const payments = paymentsData.data
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    
    // Current period metrics
    const totalVolume = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100
    const totalTransactions = payments.length
    const successRate = totalTransactions > 0 ? (successfulPayments.length / totalTransactions) * 100 : 0
    const averageTicket = successfulPayments.length > 0 ? totalVolume / successfulPayments.length : 0

    // Calculate previous period for comparison
    const midPoint = new Date(dateRange.from.getTime() + (dateRange.to.getTime() - dateRange.from.getTime()) / 2)
    const currentPeriodPayments = payments.filter(p => new Date(p.created) >= midPoint)
    const previousPeriodPayments = payments.filter(p => new Date(p.created) < midPoint)

    const currentVolume = currentPeriodPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100
    const previousVolume = previousPeriodPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100

    const volumeChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0
    const transactionChange = previousPeriodPayments.length > 0 
      ? ((currentPeriodPayments.length - previousPeriodPayments.length) / previousPeriodPayments.length) * 100 
      : 0

    return {
      totalVolume,
      totalTransactions,
      successRate,
      averageTicket,
      volumeChange,
      transactionChange,
    }
  }, [paymentsData, dateRange])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!paymentsData?.data) return []

    const payments = paymentsData.data
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const interval = days <= 7 ? 'day' : days <= 30 ? 'day' : days <= 90 ? 'week' : 'month'

    // Group payments by date
    const grouped = payments.reduce((acc, payment) => {
      const date = format(new Date(payment.created), interval === 'day' ? 'MMM dd' : interval === 'week' ? 'MMM dd' : 'MMM yyyy')
      
      if (!acc[date]) {
        acc[date] = {
          date,
          volume: 0,
          transactions: 0,
          successful: 0,
          failed: 0,
        }
      }

      acc[date].transactions++
      if (payment.status === 'succeeded') {
        acc[date].volume += (payment.amount || 0) / 100
        acc[date].successful++
      } else if (payment.status === 'failed') {
        acc[date].failed++
      }

      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [paymentsData, timeRange])

  // Payment method distribution
  const paymentMethodData = useMemo(() => {
    if (!paymentsData?.data) return []

    const methods = paymentsData.data.reduce((acc, payment) => {
      const method = payment.payment_method || 'unknown'
      if (!acc[method]) {
        acc[method] = { name: method, value: 0, count: 0 }
      }
      acc[method].value += (payment.amount || 0) / 100
      acc[method].count++
      return acc
    }, {} as Record<string, any>)

    return Object.values(methods).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [paymentsData])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await refetchPayments()
    setRefreshing(false)
  }

  const isLoading = paymentsLoading || connectorsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-dark-text-secondary">
            Welcome back, {user?.company_name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.totalVolume, 'USD')}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {metrics.volumeChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={metrics.volumeChange > 0 ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(metrics.volumeChange).toFixed(1)}%
                  </span>
                  from previous period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.totalTransactions)}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {metrics.transactionChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={metrics.transactionChange > 0 ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(metrics.transactionChange).toFixed(1)}%
                  </span>
                  from previous period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Average transaction success rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.averageTicket, 'USD')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per successful transaction
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a2e', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value, 'USD')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke={CHART_COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorVolume)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a2e', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value, 'USD')}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Connector Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paymentsData?.data.slice(0, 5).map((payment) => (
                  <div key={payment.payment_id} className="flex items-center justify-between p-3 rounded-lg bg-dark-surface/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        payment.status === 'succeeded' ? 'bg-green-500' :
                        payment.status === 'failed' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{payment.payment_id}</p>
                        <p className="text-xs text-dark-text-muted">
                          {format(new Date(payment.created), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency((payment.amount || 0) / 100, payment.currency || 'USD')}
                      </p>
                      <Badge variant={
                        payment.status === 'succeeded' ? 'success' :
                        payment.status === 'failed' ? 'danger' :
                        'warning'
                      } size="sm">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connector Status */}
        <Card>
          <CardHeader>
            <CardTitle>Active Connectors</CardTitle>
          </CardHeader>
          <CardContent>
            {connectorsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {connectorsData?.data.filter(c => !c.disabled).slice(0, 5).map((connector) => (
                  <div key={connector.merchant_connector_id} className="flex items-center justify-between p-3 rounded-lg bg-dark-surface/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                        {connector.connector_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{connector.connector_label || connector.connector_name}</p>
                        <p className="text-xs text-dark-text-muted capitalize">
                          {connector.connector_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}