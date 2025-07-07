// app/(dashboard)/invoices/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Send,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Edit,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { trpc } from '@/utils/trpc'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

// Invoice status configurations
const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: Clock },
  open: { label: 'Open', variant: 'default' as const, icon: AlertCircle },
  paid: { label: 'Paid', variant: 'success' as const, icon: CheckCircle },
  uncollectible: { label: 'Uncollectible', variant: 'destructive' as const, icon: XCircle },
  void: { label: 'Void', variant: 'secondary' as const, icon: XCircle },
}

interface InvoiceFilters {
  status?: string[]
  currency?: string[]
  amount_gte?: number
  amount_lte?: number
  due_date_gte?: Date
  due_date_lte?: Date
  customer_id?: string
}

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build query parameters
  const queryParams = {
    limit: pageSize,
    starting_after: currentPage > 1 ? ((currentPage - 1) * pageSize).toString() : undefined,
    ...(debouncedSearch && { 
      search: debouncedSearch,
    }),
    ...(filters.status && filters.status.length > 0 && { 
      status: filters.status 
    }),
    ...(filters.currency && filters.currency.length > 0 && { 
      currency: filters.currency 
    }),
    ...(filters.customer_id && { customer: filters.customer_id }),
    ...(filters.due_date_gte && filters.due_date_lte && {
      due_date: {
        gte: Math.floor(filters.due_date_gte.getTime() / 1000),
        lte: Math.floor(filters.due_date_lte.getTime() / 1000),
      }
    }),
  }

  // Fetch invoices
  const { data: invoices, isLoading, refetch } = trpc.invoices.list.useQuery(queryParams)

  // Fetch invoice statistics
  const { data: stats } = trpc.invoices.stats.useQuery({})

  // Send invoice mutation
  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invoice Sent',
        description: 'The invoice has been sent to the customer.',
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Void invoice mutation
  const voidMutation = trpc.invoices.void.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invoice Voided',
        description: 'The invoice has been voided successfully.',
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: 'Void Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete invoice mutation
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invoice Deleted',
        description: 'The invoice has been deleted.',
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSendInvoice = (invoiceId: string) => {
    sendMutation.mutate({ invoice_id: invoiceId })
  }

  const handleVoidInvoice = (invoiceId: string) => {
    if (confirm('Are you sure you want to void this invoice? This action cannot be undone.')) {
      voidMutation.mutate({ invoice_id: invoiceId })
    }
  }

  const handleDeleteInvoice = (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteMutation.mutate({ invoice_id: invoiceId })
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting invoices...')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The invoice number has been copied to your clipboard.',
    })
  }

  const getDaysOverdue = (dueDate?: number) => {
    if (!dueDate) return null
    const due = new Date(dueDate * 1000)
    const now = new Date()
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : null
  }

  const filteredInvoices = invoices?.data.filter(invoice => {
    if (activeTab === 'draft') return invoice.status === 'draft'
    if (activeTab === 'open') return invoice.status === 'open'
    if (activeTab === 'paid') return invoice.status === 'paid'
    if (activeTab === 'overdue') {
      return invoice.status === 'open' && getDaysOverdue(invoice.due_date) !== null
    }
    return true
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Create and manage customer invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/invoices/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.outstanding_amount || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats?.open_invoices || 0} open invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.overdue_amount || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdue_invoices || 0} invoices past due
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.paid_this_month || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.paid_invoices_this_month || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.collection_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
            <TabsTrigger value="draft">
              Draft
              {stats?.draft_invoices && stats.draft_invoices > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.draft_invoices}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="open">
              Open
              {stats?.open_invoices && stats.open_invoices > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.open_invoices}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue
              {stats?.overdue_invoices && stats.overdue_invoices > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.overdue_invoices}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, customer..."
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
                  Export Invoices
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
                <CardTitle className="text-base">Filter Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
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
                    <Label>Due Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.due_date_gte && filters.due_date_lte ? (
                            `${format(filters.due_date_gte, 'MMM d')} - ${format(filters.due_date_lte, 'MMM d')}`
                          ) : (
                            'Select dates'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{
                            from: filters.due_date_gte,
                            to: filters.due_date_lte,
                          }}
                          onSelect={(range: any) => {
                            setFilters(prev => ({
                              ...prev,
                              due_date_gte: range?.from,
                              due_date_lte: range?.to,
                            }))
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Input
                      placeholder="Customer ID"
                      value={filters.customer_id || ''}
                      onChange={(e) => 
                        setFilters(prev => ({
                          ...prev,
                          customer_id: e.target.value || undefined
                        }))
                      }
                    />
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

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.length === filteredInvoices?.length && filteredInvoices?.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices(filteredInvoices?.map(i => i.id) || [])
                            } else {
                              setSelectedInvoices([])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
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
                    ) : filteredInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-muted-foreground">No invoices found</p>
                          {activeTab === 'all' && (
                            <Button 
                              className="mt-4" 
                              onClick={() => router.push('/invoices/create')}
                            >
                              Create Your First Invoice
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices?.map((invoice) => {
                        const statusConfig = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG]
                        const StatusIcon = statusConfig?.icon || AlertCircle
                        const daysOverdue = getDaysOverdue(invoice.due_date)
                        
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedInvoices.includes(invoice.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInvoices([...selectedInvoices, invoice.id])
                                  } else {
                                    setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id))
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {invoice.number || invoice.id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(invoice.number || invoice.id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{invoice.customer_name || invoice.customer}</p>
                                {invoice.customer_email && (
                                  <p className="text-xs text-muted-foreground">{invoice.customer_email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatCurrency(invoice.amount_due || invoice.total, invoice.currency)}
                              </div>
                              {invoice.amount_paid > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Paid: {formatCurrency(invoice.amount_paid, invoice.currency)}
                                </p>
                              )}
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
                                  {statusConfig?.label || invoice.status}
                                </Badge>
                                {daysOverdue && (
                                  <Badge variant="destructive" className="ml-1">
                                    {daysOverdue}d overdue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {invoice.due_date ? (
                                <div className={cn(
                                  daysOverdue && "text-destructive font-medium"
                                )}>
                                  {format(new Date(invoice.due_date * 1000), 'MMM d, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{formatDate(invoice.created * 1000)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(invoice.created * 1000), 'HH:mm:ss')}
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
                                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Invoice
                                  </DropdownMenuItem>
                                  {invoice.status === 'draft' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Invoice
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleSendInvoice(invoice.id)}
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Invoice
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {invoice.status === 'open' && (
                                    <DropdownMenuItem
                                      onClick={() => handleSendInvoice(invoice.id)}
                                    >
                                      <Mail className="mr-2 h-4 w-4" />
                                      Send Reminder
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {['draft', 'open'].includes(invoice.status) && (
                                    <DropdownMenuItem
                                      onClick={() => handleVoidInvoice(invoice.id)}
                                      className="text-destructive"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Void Invoice
                                    </DropdownMenuItem>
                                  )}
                                  {invoice.status === 'draft' && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteInvoice(invoice.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Invoice
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, invoices?.total_count || 0)} of {invoices?.total_count || 0} invoices
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
                    Page {currentPage} of {Math.ceil((invoices?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!invoices?.has_more}
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