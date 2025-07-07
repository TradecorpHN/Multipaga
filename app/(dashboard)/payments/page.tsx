// app/(dashboard)/payments/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreHorizontal,
  Eye,
  Copy,
  Receipt,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { trpc } from '@/utils/trpc'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

// Payment status configurations
const STATUS_CONFIG = {
  succeeded: { label: 'Succeeded', variant: 'success' as const, icon: CheckCircle },
  processing: { label: 'Processing', variant: 'default' as const, icon: Clock },
  requires_payment_method: { label: 'Requires Payment', variant: 'warning' as const, icon: AlertCircle },
  requires_confirmation: { label: 'Requires Confirmation', variant: 'warning' as const, icon: AlertCircle },
  requires_capture: { label: 'Requires Capture', variant: 'secondary' as const, icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
}

interface PaymentFilters {
  status?: string[]
  payment_method?: string[]
  currency?: string[]
  amount_gte?: number
  amount_lte?: number
  customer_id?: string
  date_from?: Date
  date_to?: Date
}

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<PaymentFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<'created_at' | 'amount'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build query parameters
  const queryParams = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(debouncedSearch && { 
      customer_id: debouncedSearch,
      // Could also search by payment_id if it matches a pattern
    }),
    ...(filters.status && filters.status.length > 0 && { status: filters.status }),
    ...(filters.currency && filters.currency.length > 0 && { currency: filters.currency }),
    ...(filters.amount_gte && { amount: { gte: filters.amount_gte * 100 } }),
    ...(filters.amount_lte && { amount: { lte: filters.amount_lte * 100 } }),
    ...(filters.date_from && filters.date_to && {
      created: {
        gte: filters.date_from.toISOString(),
        lte: filters.date_to.toISOString(),
      }
    }),
  }

  // Fetch payments
  const { data: payments, isLoading, refetch } = trpc.payments.list.useQuery(queryParams)

  // Fetch payment methods for filters
  const { data: paymentMethods } = trpc.payments.methods.useQuery({})

  // Export payments mutation
  const exportMutation = trpc.payments.export.useMutation({
    onSuccess: (data) => {
      // Download the exported file
      const blob = new Blob([data.content], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Export Successful',
        description: 'Your payments have been exported.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handle payment actions
  const handleCapturePayment = async (paymentId: string) => {
    try {
      await trpc.payments.capture.mutate({ payment_id: paymentId })
      toast({
        title: 'Payment Captured',
        description: 'The payment has been successfully captured.',
      })
      refetch()
    } catch (error) {
      toast({
        title: 'Capture Failed',
        description: 'Failed to capture the payment. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelPayment = async (paymentId: string) => {
    try {
      await trpc.payments.cancel.mutate({ 
        payment_id: paymentId,
        cancellation_reason: 'requested_by_customer',
      })
      toast({
        title: 'Payment Cancelled',
        description: 'The payment has been cancelled.',
      })
      refetch()
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel the payment. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateRefund = (paymentId: string) => {
    router.push(`/refunds/new?payment_id=${paymentId}`)
  }

  const handleExport = () => {
    exportMutation.mutate({
      filters: queryParams,
      format: 'csv',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The payment ID has been copied to your clipboard.',
    })
  }

  const handleSelectAll = () => {
    if (selectedPayments.length === payments?.data.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(payments?.data.map(p => p.payment_id) || [])
    }
  }

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    )
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, debouncedSearch])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage and track all your payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/payments/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments?.total_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all statuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.data.filter(p => p.status === 'succeeded').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.data.filter(p => ['processing', 'requires_capture'].includes(p.status)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.data.filter(p => p.status === 'failed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by payment ID, customer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            </div>
            <div className="flex items-center gap-2">
              {selectedPayments.length > 0 && (
                <Badge variant="secondary">
                  {selectedPayments.length} selected
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="grid gap-4 md:grid-cols-4 pt-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({
                      ...prev,
                      status: value === 'all' ? undefined : [value]
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
                <Label>Currency</Label>
                <Select
                  value={filters.currency?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({
                      ...prev,
                      currency: value === 'all' ? undefined : [value]
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
                <Label>Amount Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.amount_gte || ''}
                    onChange={(e) => 
                      setFilters(prev => ({
                        ...prev,
                        amount_gte: e.target.value ? Number(e.target.value) : undefined
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.amount_lte || ''}
                    onChange={(e) => 
                      setFilters(prev => ({
                        ...prev,
                        amount_lte: e.target.value ? Number(e.target.value) : undefined
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.date_from && filters.date_to ? (
                        `${format(filters.date_from, 'MMM d')} - ${format(filters.date_to, 'MMM d')}`
                      ) : (
                        'Select dates'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: filters.date_from,
                        to: filters.date_to,
                      }}
                      onSelect={(range: any) => {
                        setFilters(prev => ({
                          ...prev,
                          date_from: range?.from,
                          date_to: range?.to,
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
                onClick={() => setFilters({})}
              >
                Clear Filters
              </Button>
              <Button onClick={() => refetch()}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPayments.length === payments?.data.length && payments?.data.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 p-0 hover:bg-transparent"
                      onClick={() => {
                        if (sortBy === 'amount') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('amount')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 p-0 hover:bg-transparent"
                      onClick={() => {
                        if (sortBy === 'created_at') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('created_at')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      Created
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
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
                ) : payments?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">No payments found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments?.data.map((payment) => {
                    const statusConfig = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG]
                    const StatusIcon = statusConfig?.icon || AlertCircle
                    
                    return (
                      <TableRow key={payment.payment_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPayments.includes(payment.payment_id)}
                            onCheckedChange={() => handleSelectPayment(payment.payment_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {payment.payment_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(payment.payment_id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.customer_id ? (
                            <div>
                              <p className="font-medium">{payment.customer.email || payment.customer_id}</p>
                              {payment.customer.name && (
                                <p className="text-xs text-muted-foreground">{payment.customer.name}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Guest</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                          {payment.amount_capturable && payment.amount_capturable < payment.amount && (
                            <p className="text-xs text-muted-foreground">
                              Capturable: {formatCurrency(payment.amount_capturable, payment.currency)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {payment.payment_method_type && (
                              <Badge variant="outline" className="text-xs">
                                {payment.payment_method_type}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn(
                              "h-4 w-4",
                              statusConfig?.variant === 'success' && "text-green-600",
                              statusConfig?.variant === 'destructive' && "text-red-600",
                              statusConfig?.variant === 'warning' && "text-yellow-600",
                              statusConfig?.variant === 'secondary' && "text-muted-foreground"
                            )} />
                            <Badge variant={statusConfig?.variant || 'secondary'}>
                              {statusConfig?.label || payment.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{formatDate(payment.created_at)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.created_at), 'HH:mm:ss')}
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
                                onClick={() => router.push(`/payments/${payment.payment_id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {payment.status === 'requires_capture' && (
                                <DropdownMenuItem
                                  onClick={() => handleCapturePayment(payment.payment_id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Capture Payment
                                </DropdownMenuItem>
                              )}
                              {payment.status === 'succeeded' && (
                                <DropdownMenuItem
                                  onClick={() => handleCreateRefund(payment.payment_id)}
                                >
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Create Refund
                                </DropdownMenuItem>
                              )}
                              {['processing', 'requires_payment_method', 'requires_confirmation'].includes(payment.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleCancelPayment(payment.payment_id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Payment
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, payments?.total_count || 0)} of {payments?.total_count || 0} payments
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
              <Input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="w-16 text-center"
                min={1}
                max={Math.ceil((payments?.total_count || 0) / pageSize)}
              />
              <span className="text-sm text-muted-foreground">
                of {Math.ceil((payments?.total_count || 0) / pageSize)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * pageSize >= (payments?.total_count || 0)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}