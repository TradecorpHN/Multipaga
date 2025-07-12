'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, Search, Download, RefreshCw, MoreHorizontal, Eye, Mail, Phone, Calendar,
  CreditCard, ShoppingBag, TrendingUp, UserCheck, UserX, ChevronLeft, ChevronRight, Copy, Edit, Ban
} from 'lucide-react'

// UI components – paths explícitos
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/Avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/presentation/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { Label } from '@/presentation/components/ui/Label'
import { useToast } from '@/presentation/components/ui/use-toast'

// Utilities – paths explícitos
import { formatCurrency, formatDate } from '@/presentation/components/ui/formatters'
import { trpc } from '@/presentation/utils/trpc'
import { useDebounce } from '@/presentation/hooks/useDebounce'

interface CustomerFilters {
  email?: string
  name?: string
  phone?: string
  created_after?: string
  created_before?: string
  has_live_payment?: boolean
}

// Si formatCurrency espera CurrencyFormatOptions, crea el objeto:
const USD_FORMAT: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }

export default function CustomersPage() {
  const router = useRouter()
  // Si tu hook useToast retorna { toast }, usa destructuring, si no, solo haz: const toast = useToast()
const toast = useToast() 
  

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<CustomerFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build query parameters
  const queryParams = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    ...(debouncedSearch && {
      email: debouncedSearch.includes('@') ? debouncedSearch : undefined,
      name: !debouncedSearch.includes('@') ? debouncedSearch : undefined,
    }),
    ...filters,
  }

  // Fetch customers
  const { data: customers, isLoading, refetch } = trpc.customers.list.useQuery(queryParams)

  // Fetch customer stats
  const { data: stats } = trpc.customers.stats.useQuery({})

  // Delete customer mutation
  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
 toast({
  message: 'Customer Deleted: The customer has been successfully deleted.',
  type: 'success',
})
      refetch()
    },
    onError: (error: any) => {
toast({
  message: `Delete Failed: ${error.message}`,
  type: 'error',
})
    },
  })

  // Export customers mutation
// Export customers query (SIN onSuccess/onError)
const exportQuery = trpc.customers.export.useQuery(
  { ...queryParams, format: 'csv' },
  { enabled: false }
)

const handleExport = async () => {
  try {
    const { data } = await exportQuery.refetch()
    if (data && data.format === 'csv') {
      const blob = new Blob([data.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        message: 'Export Successful. Your customers have been exported.',
        type: 'success',
      })
    } else {
      toast({
        message: 'No data to export.',
        type: 'info',
      })
    }
  } catch (error: any) {
    toast({
      message: `Export Failed: ${error.message}`,
      type: 'error',
    })
  }
}


  const handleDeleteCustomer = (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      deleteMutation.mutate({ customerId })

    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
toast({
  message: 'Copied to clipboard. The information has been copied.',
  type: 'info',
})
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    if (email) return email.substring(0, 2).toUpperCase()
    return 'NA'
  }

  // Typing para evitar any
  type CustomerType = {
    customer_id: string
    name?: string
    email?: string
    phone?: string
    created_at: string
    payments_count: number
    total_spent: number
  }

  const filteredCustomers = customers?.data.filter((customer: CustomerType) => {
    if (activeTab === 'active') return customer.payments_count > 0
    if (activeTab === 'new') {
      const createdDate = new Date(customer.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdDate > thirtyDaysAgo
    }
    return true
  }) || []

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer base and their payment information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push('/customers/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.new_customers_this_month || 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_customers || 0}</div>
            <p className="text-xs text-muted-foreground">
              With successful payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.average_customer_value || 0, USD_FORMAT)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.churn_rate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Customers</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomers.length > 0 && (
                    <Badge variant="secondary">
                      {selectedCustomers.length} selected
                    </Badge>
                  )}
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
                        Export to CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Customers Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                          onCheckedChange={(checked: boolean | "indeterminate") => {
                            if (checked) {
                              setSelectedCustomers(filteredCustomers.map((c: CustomerType) => c.customer_id) || [])
                            } else {
                              setSelectedCustomers([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Status</TableHead>
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
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-muted-foreground">No customers found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer: CustomerType) => (
                        <TableRow key={customer.customer_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCustomers.includes(customer.customer_id)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                if (checked) {
                                  setSelectedCustomers([...selectedCustomers, customer.customer_id])
                                } else {
                                  setSelectedCustomers(selectedCustomers.filter((id) => id !== customer.customer_id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://avatar.vercel.sh/${customer.email}`} />
                                <AvatarFallback>
                                  {getInitials(customer.name, customer.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{customer.name || 'Unnamed'}</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {customer.customer_id}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                    onClick={() => copyToClipboard(customer.customer_id)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a
                                    href={`mailto:${customer.email}`}
                                    className="hover:underline"
                                  >
                                    {customer.email}
                                  </a>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <a
                                    href={`tel:${customer.phone}`}
                                    className="hover:underline"
                                  >
                                    {customer.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(customer.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span>{customer.payments_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(customer.total_spent || 0, USD_FORMAT)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={customer.payments_count > 0 ? 'success' : 'secondary'}>
                              {customer.payments_count > 0 ? 'Active' : 'Inactive'}
                            </Badge>
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
                                  onClick={() => router.push(`/customers/${customer.customer_id}`)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/customers/${customer.customer_id}/edit`)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Customer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/payments?customer_id=${customer.customer_id}`)}
                                >
                                  <ShoppingBag className="mr-2 h-4 w-4" />
                                  View Payments
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCustomer(customer.customer_id)}
                                  className="text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Delete Customer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, customers?.total_count || 0)} of {customers?.total_count || 0} customers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    Page {currentPage} of {Math.ceil((customers?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage * pageSize >= (customers?.total_count || 0)}
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
