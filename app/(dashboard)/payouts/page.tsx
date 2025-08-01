'use client'

import { useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Plus, Search, Filter, Download, RefreshCw, MoreHorizontal, Eye,
  Copy, CheckCircle, XCircle, Clock, AlertCircle, Building, CreditCard,
  DollarSign, Calendar, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react'

import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle
} from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/Alert'
import { Progress } from '@/presentation/components/ui/Progress'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/presentation/components/ui/DropdownMenu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/presentation/components/ui/Select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/presentation/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Label } from '@/presentation/components/ui/Label'
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/ui/Popover'
import { Calendar as CalendarComponent, DateRange } from '@/presentation/components/ui/Calendar'
import { format } from 'date-fns'
import { trpc } from '@/presentation/utils/trpc'
import { formatCurrency, formatDate } from '@/presentation/lib/utils/formatters'
import { useToast } from '@/presentation/components/ui/use-toast'
import { useDebounce } from '@/presentation/hooks/use-debounce'

const STATUS_CONFIG = {
  success: { label: 'Success', variant: 'success' as const, icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
  initiated: { label: 'Initiated', variant: 'default' as const, icon: Clock },
  expired: { label: 'Expired', variant: 'secondary' as const, icon: Clock },
  reversed: { label: 'Reversed', variant: 'warning' as const, icon: AlertCircle },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  requires_creation: { label: 'Requires Creation', variant: 'outline' as const, icon: AlertCircle },
  requires_fulfillment: { label: 'Requires Fulfillment', variant: 'outline' as const, icon: AlertCircle },
  requires_vendor_account_creation: { label: 'Requires Vendor Setup', variant: 'outline' as const, icon: Building },
  ineligible: { label: 'Ineligible', variant: 'destructive' as const, icon: XCircle },
  requires_confirmation: { label: 'Requires Confirmation', variant: 'outline' as const, icon: AlertCircle },
  requires_payout_method_data: { label: 'Requires Method Data', variant: 'outline' as const, icon: AlertCircle },
}

const PAYOUT_TYPES = {
  bank: { label: 'Bank Transfer', icon: Building },
  card: { label: 'Card', icon: CreditCard },
  wallet: { label: 'Digital Wallet', icon: Send },
}

// ✅ TIPOS ESPECÍFICOS SEGÚN EL ROUTER
type PayoutType = 'card' | 'bank' | 'wallet'
type PayoutStatus = 'success' | 'failed' | 'cancelled' | 'initiated' | 'expired' | 'reversed' | 'pending' | 'ineligible' | 'requires_creation' | 'requires_confirmation' | 'requires_payout_method_data' | 'requires_fulfillment' | 'requires_vendor_account_creation'

interface PayoutFilters {
  payout_status?: PayoutStatus[] // ✅ CORREGIDO: Tipo específico
  payout_type?: PayoutType[] // ✅ CORREGIDO: Tipo específico
  currency?: string[]
  amount_gte?: number
  amount_lte?: number
  customer_id?: string
  created_after?: Date
  created_before?: Date
}

interface Payout {
  payout_id: string
  amount: number
  currency: string
  payment_method?: string
  status: string
  created: string
  description?: string
  connector?: string
  connector_transaction_id?: string
  customer?: { 
    customer_id?: string
    email?: string 
    name?: string
  }
  customer_id?: string
}

export default function PayoutsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<PayoutFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const debouncedSearch = useDebounce(searchQuery, 300)

  // ✅ CORREGIDO: Build query parameters según el router tRPC
  const queryParams = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(debouncedSearch && { 
      payout_id: debouncedSearch, 
      customer_id: debouncedSearch 
    }),
    ...(filters.payout_status && filters.payout_status.length > 0 && { 
      payout_status: filters.payout_status 
    }),
    ...(filters.payout_type && filters.payout_type.length > 0 && { 
      payout_type: filters.payout_type 
    }),
    ...(filters.currency && filters.currency.length > 0 && { 
      currency: filters.currency 
    }),
    ...(filters.amount_gte && filters.amount_lte && {
      amount: {
        gte: filters.amount_gte * 100,
        lte: filters.amount_lte * 100,
      }
    }),
    // ✅ CORREGIDO: Usar created_after/created_before en lugar de created
    ...(filters.created_after && {
      created_after: filters.created_after.toISOString(),
    }),
    ...(filters.created_before && {
      created_before: filters.created_before.toISOString(),
    }),
  }

  // ✅ CORRECTO: Usando trpc.payouts.* con el router implementado
  const { data: payouts, isLoading, refetch } = trpc.payouts.list.useQuery(queryParams)
  
  // ✅ CORREGIDO: Usar created_after/created_before en lugar de time_range
  const { data: stats } = trpc.payouts.stats.useQuery({
    created_after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_before: new Date().toISOString(),
  })

  // ✅ CORREGIDO: Usar checkAvailability en lugar de isAvailable
  const { data: availability } = trpc.payouts.checkAvailability.useQuery()

  // Mutations for payout actions
  const cancelMutation = trpc.payouts.cancel.useMutation({
    onSuccess: () => {
      toast({
        title: 'Payout Cancelled',
        description: 'The payout has been cancelled successfully.',
      })
      refetch()
    },
    onError: (error: { message: string }) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const fulfillMutation = trpc.payouts.fulfill.useMutation({
    onSuccess: () => {
      toast({
        title: 'Payout Fulfilled',
        description: 'The payout has been marked as fulfilled.',
      })
      refetch()
    },
    onError: (error: { message: string }) => {
      toast({
        title: 'Fulfillment Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleCancelPayout = (payoutId: string) => {
    if (confirm('Are you sure you want to cancel this payout? This action may not be reversible.')) {
      // ✅ CORREGIDO: Usar payoutId en lugar de payout_id
      cancelMutation.mutate({
        payoutId: payoutId,
        cancellation_reason: 'requested_by_customer',
      })
    }
  }

  const handleFulfillPayout = (payoutId: string) => {
    // ✅ CORREGIDO: Usar payoutId en lugar de payout_id
    fulfillMutation.mutate({ payoutId: payoutId })
  }

  const handleExport = () => {
    if (!payouts?.data) {
      toast({ title: 'No data to export.' })
      return
    }
    const headers = [
      'Payout ID', 'Amount', 'Currency', 'Type', 'Status', 'Created', 'Customer'
    ]
    const rows = payouts.data.map((payout: Payout) => [
      payout.payout_id,
      formatCurrency(payout.amount, payout.currency),
      payout.currency,
      payout.payment_method || 'N/A',
      payout.status,
      formatDate(payout.created),
      payout.customer?.email || payout.customer?.name || payout.customer_id || '',
    ])
    const csv = [
      headers.join(','),
      ...rows.map((row: string[]) =>
        row.map(field => `"${(field ?? '').toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payouts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'Export Successful', description: 'Your payouts have been exported.' })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The payout ID has been copied to your clipboard.',
    })
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return null
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredPayouts = payouts?.data?.filter((payout: Payout) => {
    if (activeTab === 'pending') return ['initiated', 'pending', 'requires_fulfillment', 'requires_confirmation'].includes(payout.status)
    if (activeTab === 'completed') return payout.status === 'success'
    if (activeTab === 'failed') return ['failed', 'cancelled', 'expired', 'ineligible'].includes(payout.status)
    return true
  }) || []

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground">
            Send money to customers, vendors, and partners
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/payouts/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payout
          </Button>
        </div>
      </div>

      {/* ✅ CORREGIDO: Availability Alert */}
      {availability && !availability.isAvailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payouts Not Available</AlertTitle>
          <AlertDescription>
            Payouts are not currently available for your account. Please contact support to enable this feature.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_payouts || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_amount || 0, stats?.primary_currency || 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.volume_change && stats.volume_change > 0 ? (
                <span className="text-green-600">
                  +{stats.volume_change.toFixed(1)}% from last month
                </span>
              ) : (
                <span className="text-red-600">
                  {stats?.volume_change?.toFixed(1)}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.success_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_payouts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.pending_amount || 0, stats?.primary_currency || 'USD')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Payouts</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {stats?.pending_payouts && stats.pending_payouts > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending_payouts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by payout ID, customer..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Payouts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filter Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.payout_status?.[0] || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          // ✅ CORREGIDO: Type assertion para PayoutStatus
                          payout_status: value === 'all' ? undefined : [value as PayoutStatus],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={filters.payout_type?.[0] || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          // ✅ CORREGIDO: Type assertion para PayoutType
                          payout_type: value === 'all' ? undefined : [value as PayoutType],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {Object.entries(PAYOUT_TYPES).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={filters.currency?.[0] || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          currency: value === 'all' ? undefined : [value],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All currencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All currencies</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.created_after && filters.created_before
                            ? `${format(filters.created_after, 'MMM d')} - ${format(filters.created_before, 'MMM d')}`
                            : 'Select dates'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={dateRange}
                          onSelect={(range?: DateRange) => {
                            setDateRange(range)
                            setFilters(prev => ({
                              ...prev,
                              created_after: range?.from,
                              created_before: range?.to,
                            }))
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({})
                      setDateRange(undefined)
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payouts Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedPayouts.length === filteredPayouts.length &&
                            filteredPayouts.length > 0
                          }
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              setSelectedPayouts(filteredPayouts.map((p: Payout) => p.payout_id) || [])
                            } else {
                              setSelectedPayouts([])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Payout ID</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}>
                            <Skeleton className="h-12 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-muted-foreground">No payouts found</p>
                          {activeTab === 'all' && (
                            <Button
                              className="mt-4"
                              onClick={() => router.push('/payouts/create')}
                            >
                              Create Your First Payout
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayouts.map((payout: Payout) => {
                        const typeConfig = PAYOUT_TYPES[payout.payment_method as keyof typeof PAYOUT_TYPES] || PAYOUT_TYPES.bank
                        const TypeIcon = typeConfig.icon
                        return (
                          <TableRow key={payout.payout_id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedPayouts.includes(payout.payout_id)}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  if (e.target.checked) {
                                    setSelectedPayouts([...selectedPayouts, payout.payout_id])
                                  } else {
                                    setSelectedPayouts(selectedPayouts.filter(id => id !== payout.payout_id))
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {payout.payout_id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(payout.payout_id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {payout.customer?.email || payout.customer?.name || payout.customer_id || 'N/A'}
                                </p>
                                {payout.description && (
                                  <p className="text-xs text-muted-foreground">{payout.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatCurrency(payout.amount, payout.currency)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{typeConfig.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(payout.status)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{formatDate(payout.created)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payout.created), 'HH:mm:ss')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/payouts/${payout.payout_id}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {payout.status === 'requires_fulfillment' && (
                                    <DropdownMenuItem
                                      onClick={() => handleFulfillPayout(payout.payout_id)}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark as Fulfilled
                                    </DropdownMenuItem>
                                  )}
                                  {['initiated', 'pending'].includes(payout.status) && (
                                    <DropdownMenuItem
                                      onClick={() => handleCancelPayout(payout.payout_id)}
                                      className="text-destructive"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel Payout
                                    </DropdownMenuItem>
                                  )}
                                  {payout.connector_transaction_id && (
                                    <DropdownMenuItem>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      View in {payout.connector}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, payouts?.total_count || 0)} of {payouts?.total_count || 0} payouts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    Page {currentPage} of {Math.ceil((payouts?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage * pageSize >= (payouts?.total_count || 0)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}