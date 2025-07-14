'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Search, Filter, Download, RefreshCw, MoreHorizontal, Eye, MessageSquare,
  FileText, CheckCircle, XCircle, Clock, TrendingUp, DollarSign, Shield, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react'

import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/Alert'
import { Progress } from '@/presentation/components/ui/Progress'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/presentation/components/ui/Select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/presentation/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Label } from '@/presentation/components/ui/Label'
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/ui/Popover'
import { Calendar as CalendarComponent } from '@/presentation/components/ui/Calendar'
import { useToast } from '@/presentation/components/ui/use-toast'

import { formatCurrency, formatDate } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'
import { trpc } from '@/presentation/utils/trpc'
import { useDebounce } from '@/presentation/hooks/useDebounce'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'

// Opciones de formato moneda
const USD_FORMAT: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }

const STATUS_CONFIG = {
  dispute_opened: { label: 'Opened', variant: 'destructive' as const, icon: AlertTriangle },
  dispute_expired: { label: 'Expired', variant: 'secondary' as const, icon: Clock },
  dispute_accepted: { label: 'Accepted', variant: 'secondary' as const, icon: CheckCircle },
  dispute_cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
  dispute_challenged: { label: 'Challenged', variant: 'default' as const, icon: MessageSquare },
  dispute_won: { label: 'Won', variant: 'default' as const, icon: CheckCircle },
  dispute_lost: { label: 'Lost', variant: 'destructive' as const, icon: XCircle },
}
const STAGE_CONFIG = {
  pre_dispute: { label: 'Pre-Dispute', description: 'Initial inquiry from customer' },
  dispute: { label: 'Dispute', description: 'Formal chargeback initiated' },
  pre_arbitration: { label: 'Pre-Arbitration', description: 'Second chargeback' },
}

type DisputeStatusType = keyof typeof STATUS_CONFIG
type DisputeStageType = keyof typeof STAGE_CONFIG

interface DisputeType {
  dispute_id: string
  payment_id: string
  dispute_amount: number
  currency: string
  dispute_stage: DisputeStageType | string
  dispute_status: DisputeStatusType | string
  dispute_due_by?: string
  created_at: string
  connector?: string
  connector_dispute_id?: string
}

interface DisputeFilters {
  dispute_status?: DisputeStatusType[]
  dispute_stage?: DisputeStageType[]
  amount_gte?: number
  amount_lte?: number
  created_after?: Date
  created_before?: Date
}

export default function DisputesPage() {
  const router = useRouter()
  // ✅ Corregir destructuring del hook useToast
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<DisputeFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Query params corregidos para tu router tRPC (sin objetos anidados, solo propiedades planas)
  const queryParams = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(debouncedSearch && {
      dispute_id: debouncedSearch,
      payment_id: debouncedSearch,
    }),
    ...(filters.dispute_status && filters.dispute_status.length > 0 && {
      dispute_status: filters.dispute_status,
    }),
    ...(filters.dispute_stage && filters.dispute_stage.length > 0 && {
      dispute_stage: filters.dispute_stage,
    }),
    ...(filters.amount_gte && { amount_gte: filters.amount_gte * 100 }),
    ...(filters.amount_lte && { amount_lte: filters.amount_lte * 100 }),
    ...(filters.created_after && { created_after: filters.created_after.toISOString() }),
    ...(filters.created_before && { created_before: filters.created_before.toISOString() }),
  }

  // Data hooks corregidos (stats NO espera time_range, solo fechas planas)
  const { data: disputes, isLoading, refetch } = trpc.disputes.list.useQuery(queryParams)
  const { data: stats } = trpc.disputes.stats.useQuery({
    created_after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_before: new Date().toISOString(),
  })

  // Accept mutation - usa disputeId
  const acceptMutation = trpc.disputes.accept.useMutation({
    onSuccess: () => {
      toast({
        title: 'Dispute Accepted',
        description: 'The dispute has been accepted and will be processed.',
      })
      refetch()
    },
    onError: (error: { message: string }) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive'
      })
    },
  })

  // Challenge mutation
  const challengeMutation = trpc.disputes.challenge.useMutation({
    onSuccess: () => {
      toast({
        title: 'Evidence Submitted',
        description: 'Your evidence has been submitted successfully.',
      })
      refetch()
    },
    onError: (error: { message: string }) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive'
      })
    },
  })

  // ✅ Cambia dispute_id por disputeId (lo que espera tu router)
  const handleAcceptDispute = (disputeId: string) => {
    if (confirm('Are you sure you want to accept this dispute? This action cannot be undone.')) {
      acceptMutation.mutate({ disputeId })
    }
  }

  const handleExport = () => {
    toast({
      title: 'Export not implemented yet',
      description: 'This feature will be available soon.',
    })
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as DisputeStatusType]
    if (!config) return null
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getDaysRemaining = (dueBy?: string) => {
    if (!dueBy) return null
    const due = new Date(dueBy)
    const now = new Date()
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const filteredDisputes = disputes?.data?.filter((dispute: DisputeType) => {
    if (activeTab === 'action_required') {
      return ['dispute_opened', 'dispute_challenged'].includes(dispute.dispute_status)
    }
    if (activeTab === 'won') return dispute.dispute_status === 'dispute_won'
    if (activeTab === 'lost') return dispute.dispute_status === 'dispute_lost'
    return true
  }) || []

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground">
            Manage chargebacks and disputes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert for urgent disputes */}
      {stats?.disputes_due_soon && stats.disputes_due_soon > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You have {stats.disputes_due_soon} dispute{stats.disputes_due_soon > 1 ? 's' : ''} due for response within 48 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_disputes || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.new_disputes_this_month || 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.win_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.win_rate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.disputes_won || 0} won, {stats?.disputes_lost || 0} lost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.amount_at_risk || 0, USD_FORMAT)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats?.open_disputes || 0} open disputes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.response_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Evidence submitted on time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              All Disputes
              {disputes && (
                <Badge variant="secondary" className="ml-2">
                  {disputes.total_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="action_required">
              Action Required
              {stats?.open_disputes && stats.open_disputes > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.open_disputes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
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
              <DropdownMenuContent side="bottom" className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Disputes
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
                <CardTitle className="text-base">Filter Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Dispute ID or Payment ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.dispute_status?.[0] || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          dispute_status: value === 'all' ? undefined : [value as DisputeStatusType]
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
                    <Label>Stage</Label>
                    <Select
                      value={filters.dispute_stage?.[0] || 'all'}
                      onValueChange={(value: string) =>
                        setFilters(prev => ({
                          ...prev,
                          dispute_stage: value === 'all' ? undefined : [value as DisputeStageType]
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stages</SelectItem>
                        {Object.entries(STAGE_CONFIG).map(([value, config]) => (
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
                            `${format(filters.created_after, 'MMM d', { locale: esLocale })} - ${format(filters.created_before, 'MMM d', { locale: esLocale })}`
                          ) : (
                            'Select dates'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" className="w-auto p-0">
                        <CalendarComponent
                          mode="range"
                          selected={{
                            from: filters.created_after,
                            to: filters.created_before,
                          }}
                          onSelect={(range?: { from?: Date; to?: Date }) => {
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

          {/* Disputes Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispute ID</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due By</TableHead>
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
                    ) : filteredDisputes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Shield className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No disputes found</p>
                            <p className="text-sm text-muted-foreground">
                              Great job! Keep up the good work.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDisputes.map((dispute: DisputeType) => {
                        const daysRemaining = getDaysRemaining(dispute.dispute_due_by)
                        const isUrgent = daysRemaining !== null && daysRemaining <= 2
                        return (
                          <TableRow key={dispute.dispute_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {dispute.dispute_id}
                                </code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <code className="text-xs text-muted-foreground">
                                  {dispute.payment_id}
                                </code>
                                {dispute.connector_dispute_id && (
                                  <p className="text-xs text-muted-foreground">
                                    via {dispute.connector}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatCurrency(dispute.dispute_amount, USD_FORMAT)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {STAGE_CONFIG[dispute.dispute_stage as DisputeStageType]?.label || dispute.dispute_stage}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(dispute.dispute_status)}
                            </TableCell>
                            <TableCell>
                              {dispute.dispute_due_by ? (
                                <div className={cn(
                                  "flex items-center gap-1",
                                  isUrgent && "text-destructive font-medium"
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {daysRemaining} days
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{formatDate(dispute.created_at)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(dispute.created_at), 'HH:mm:ss')}
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
                                <DropdownMenuContent side="bottom" className="w-44">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/disputes/${dispute.dispute_id}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {dispute.dispute_status === 'dispute_opened' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/disputes/${dispute.dispute_id}/challenge`)}
                                      >
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Submit Evidence
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleAcceptDispute(dispute.dispute_id)}
                                        className="text-destructive"
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Accept Dispute
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/payments/${dispute.payment_id}`)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Payment
                                  </DropdownMenuItem>
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, disputes?.total_count || 0)} of {disputes?.total_count || 0} disputes
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
                    Page {currentPage} of {Math.ceil((disputes?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage * pageSize >= (disputes?.total_count || 0)}
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