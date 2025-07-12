'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  Ban,
  FileText
} from 'lucide-react'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/Alert'
import { Progress } from '@/presentation/components/ui/Progress'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Label } from '@/presentation/components/ui/Label'
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/ui/Popover'
import { Calendar as CalendarComponent } from '@/presentation/components/ui/Calendar'
import { format } from 'date-fns'
import { trpc } from '@/presentation/utils/trpc'
import { cn } from '@/presentation/lib/utils'
import { useToast } from '@/presentation/components/ui/use-toast'
import { useDebounce } from '@/presentation/hooks/useDebounce'

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
  inactive: { label: 'Inactive', variant: 'secondary' as const, icon: Clock },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  revoked: { label: 'Revoked', variant: 'destructive' as const, icon: XCircle },
  expired: { label: 'Expired', variant: 'secondary' as const, icon: Clock },
}

const MANDATE_TYPES = {
  single_use: { label: 'Single Use', description: 'Can be used for one payment only' },
  multi_use: { label: 'Multi Use', description: 'Can be used for multiple payments' },
}

const PAYMENT_METHOD_TYPES = {
  card: { label: 'Card', icon: CreditCard },
  sepa_debit: { label: 'SEPA Debit', icon: FileText },
  ach_debit: { label: 'ACH Debit', icon: FileText },
  bacs_debit: { label: 'BACS Debit', icon: FileText },
}

interface MandateFilters {
  status?: string
  mandate_type?: string
  payment_method_type?: string
  customer_id?: string
  created_after?: Date
  created_before?: Date
}

interface Mandate {
  mandate_id: string
  mandate_type: keyof typeof MANDATE_TYPES | string
  payment_method_type: keyof typeof PAYMENT_METHOD_TYPES | string
  mandate_status: keyof typeof STATUS_CONFIG | string
  customer_id: string
  customer?: {
    name?: string
    email?: string
  }
  usage_count: number
  created_at: string | number | Date
  payment_id?: string
}

export default function MandatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<MandateFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  const queryParams = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(debouncedSearch && { 
      customer_id: debouncedSearch,
      mandate_id: debouncedSearch,
    }),
    ...(filters.status && { mandate_status: filters.status }),
    ...(filters.mandate_type && { mandate_type: filters.mandate_type }),
    ...(filters.payment_method_type && { payment_method_type: filters.payment_method_type }),
    ...(filters.created_after && filters.created_before && {
      created: {
        gte: filters.created_after.toISOString(),
        lte: filters.created_before.toISOString(),
      }
    }),
  }

 const { data: mandates, isLoading, refetch } = trpc.mandates.list.useQuery(queryParams)
const { data: stats } = trpc.mandates.stats.useQuery()


  const revokeMutation = trpc.mandates.revoke.useMutation({
    onSuccess: () => {
      toast({
        title: 'Mandate Revoked',
        description: 'The mandate has been revoked successfully.',
      })
      refetch()
    },
    onError: (error: { message: string }) => {
      toast({
        title: 'Revoke Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleRevokeMandate = (mandateId: string) => {
    if (confirm('Are you sure you want to revoke this mandate? This action cannot be undone.')) {
      revokeMutation.mutate({ mandate_id: mandateId })
    }
  }

  const handleExport = () => {
    // Implement export functionality real aquí si lo necesitas
    console.log('Exporting mandates...')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The mandate ID has been copied to your clipboard.',
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

  const formatMandateDate = (date: string | number | Date): string => {
    try {
      if (!date) return '-'
      const d = typeof date === 'number' ? new Date(date) : new Date(date)
      return format(d, 'MMM d, yyyy')
    } catch {
      return '-'
    }
  }

  const filteredMandates: Mandate[] = (mandates?.data as Mandate[])?.filter((mandate: Mandate) => {
    if (activeTab === 'active') return mandate.mandate_status === 'active'
    if (activeTab === 'pending') return mandate.mandate_status === 'pending'
    if (activeTab === 'revoked') return ['revoked', 'expired'].includes(mandate.mandate_status)
    return true
  }) ?? []

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mandates</h1>
          <p className="text-muted-foreground">
            Manage recurring payment authorizations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/mandates/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Mandate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mandates</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_mandates || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all statuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mandates</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_mandates || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_mandates || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting customer action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Rate</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usage_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.usage_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alert for expiring mandates */}
      {stats?.expiring_soon && stats.expiring_soon > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mandates Expiring Soon</AlertTitle>
          <AlertDescription>
            You have {stats.expiring_soon} mandate{stats.expiring_soon > 1 ? 's' : ''} expiring within the next 30 days.
            Consider renewing them to avoid payment disruptions.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Mandates</TabsTrigger>
            <TabsTrigger value="active">
              Active
              {stats?.active_mandates && stats.active_mandates > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.active_mandates}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {stats?.pending_mandates && stats.pending_mandates > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending_mandates}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="revoked">Revoked</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by mandate ID, customer..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                  Export Mandates
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
                <CardTitle className="text-base">Filter Mandates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          status: value === 'all' ? undefined : value
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
                      value={filters.mandate_type || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          mandate_type: value === 'all' ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {Object.entries(MANDATE_TYPES).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={filters.payment_method_type || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          payment_method_type: value === 'all' ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All methods</SelectItem>
                        {Object.entries(PAYMENT_METHOD_TYPES).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.created_after && filters.created_before ? (
                            `${format(filters.created_after, 'MMM d')} - ${format(filters.created_before, 'MMM d')}`
                          ) : (
                            'Select dates'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{
                            from: filters.created_after,
                            to: filters.created_before,
                          }}
                          onSelect={(range: { from?: Date; to?: Date } | undefined) => {
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
                    onClick={() => setFilters({})}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mandates Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mandate ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
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
                    ) : filteredMandates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-muted-foreground">No mandates found</p>
                          {activeTab === 'all' && (
                            <Button 
                              className="mt-4" 
                              onClick={() => router.push('/mandates/create')}
                            >
                              Create Your First Mandate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMandates.map((mandate: Mandate) => {
                        const typeConfig = MANDATE_TYPES[mandate.mandate_type as keyof typeof MANDATE_TYPES]
                        const methodConfig = PAYMENT_METHOD_TYPES[mandate.payment_method_type as keyof typeof PAYMENT_METHOD_TYPES]
                        const MethodIcon = methodConfig?.icon || CreditCard
                        
                        return (
                          <TableRow key={mandate.mandate_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {mandate.mandate_id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(mandate.mandate_id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{mandate.customer?.email || mandate.customer_id}</p>
                                {mandate.customer?.name && (
                                  <p className="text-xs text-muted-foreground">{mandate.customer.name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {typeConfig?.label || mandate.mandate_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MethodIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{methodConfig?.label || mandate.payment_method_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(mandate.mandate_status)}
                            </TableCell>
                            <TableCell>
                              {mandate.mandate_type === 'single_use' ? (
                                <Badge variant={mandate.usage_count > 0 ? 'secondary' : 'outline'}>
                                  {mandate.usage_count > 0 ? 'Used' : 'Unused'}
                                </Badge>
                              ) : (
                                <div className="text-sm">
                                  <span className="font-medium">{mandate.usage_count || 0}</span>
                                  <span className="text-muted-foreground"> payments</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{formatMandateDate(mandate.created_at)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(mandate.created_at), 'HH:mm:ss')}
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
                                    onClick={() => router.push(`/mandates/${mandate.mandate_id}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {mandate.mandate_status === 'active' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/payments/create?mandate_id=${mandate.mandate_id}`)}
                                      >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Create Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleRevokeMandate(mandate.mandate_id)}
                                        className="text-destructive"
                                      >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Revoke Mandate
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {mandate.payment_id && (
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/payments?mandate_id=${mandate.mandate_id}`)}
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      View Payments
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, mandates?.total_count || 0)} of {mandates?.total_count || 0} mandates
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
                    Page {currentPage} of {Math.ceil((mandates?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage * pageSize >= (mandates?.total_count || 0)}
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
