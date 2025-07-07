// app/(dashboard)/page.tsx
'use client'

import { useState } from 'react'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  CreditCard, 
  TrendingUp,
  Users,
  Activity,
  AlertCircle,
  RefreshCw,
  Download,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { trpc } from '@/utils/trpc'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

// Chart colors
const COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshKey, setRefreshKey] = useState(0)

  // Calculate date range
  const getDateRange = () => {
    const end = new Date()
    let start: Date

    switch (timeRange) {
      case '24h':
        start = subDays(end, 1)
        break
      case '7d':
        start = subDays(end, 7)
        break
      case '30d':
        start = subDays(end, 30)
        break
      case 'mtd':
        start = startOfMonth(end)
        break
      default:
        start = subDays(end, 7)
    }

    return { start, end }
  }

  const { start, end } = getDateRange()

  // Fetch data
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery(
    {
      time_range: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  )

  const { data: recentPayments, isLoading: loadingPayments } = trpc.payments.list.useQuery({
    limit: 5,
    created: {
      gte: start.toISOString(),
      lte: end.toISOString(),
    },
  })

  const { data: recentRefunds } = trpc.refunds.list.useQuery({
    limit: 5,
    created: {
      gte: start.toISOString(),
      lte: end.toISOString(),
    },
  })

  const { data: connectors } = trpc.connectors.list.useQuery({})

  // Process chart data
  const chartData = stats?.daily_volume?.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    volume: item.amount / 100,
    count: item.count,
  })) || []

  const paymentMethodData = Object.entries(stats?.payment_methods || {}).map(([method, data]: [string, any]) => ({
    name: method,
    value: data.count,
    amount: data.amount / 100,
  }))

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting dashboard data...')
  }

  if (loadingStats) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.company_name}
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your payments today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="mtd">Month to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_volume || 0, stats?.primary_currency || 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.volume_change && stats.volume_change > 0 ? (
                <span className="flex items-center text-green-600">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  +{stats.volume_change.toFixed(1)}% from last period
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                  {stats?.volume_change?.toFixed(1)}% from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate?.toFixed(1)}%</div>
            <Progress value={stats?.success_rate} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {stats?.successful_payments || 0} of {stats?.total_payments || 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_customers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.new_customers || 0} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.average_ticket_size || 0, stats?.primary_currency || 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Per successful payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Daily transaction volume for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Distribution by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/payments">
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments?.data.slice(0, 5).map((payment) => (
                <div key={payment.payment_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{payment.customer_id || 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <Badge variant={payment.status === 'succeeded' ? 'success' : 'secondary'} className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!recentPayments || recentPayments.data.length === 0) && (
                <p className="text-center text-sm text-muted-foreground">
                  No recent payments
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Connector Status</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/connectors">
                Manage
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connectors?.data.slice(0, 5).map((connector) => (
                <div key={connector.merchant_connector_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background border">
                      {CONNECTOR_LOGOS[connector.connector_name.toLowerCase()] || '🔌'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{connector.connector_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {connector.connector_type}
                      </p>
                    </div>
                  </div>
                  <Badge variant={connector.status === 'active' ? 'success' : 'secondary'}>
                    {connector.status}
                  </Badge>
                </div>
              ))}
              {(!connectors || connectors.data.length === 0) && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No connectors configured
                  </p>
                  <Button size="sm" asChild>
                    <a href="/connectors">Add Connector</a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats?.pending_refunds && stats.pending_refunds > 0 && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Action Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have {stats.pending_refunds} pending refunds that require your attention.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <a href="/refunds?status=pending">Review Refunds</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}