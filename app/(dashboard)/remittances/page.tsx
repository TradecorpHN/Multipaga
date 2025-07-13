// app/(dashboard)/remittances/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Globe,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Building,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Info
} from 'lucide-react'
// ✅ CORRECCIÓN: Usar rutas correctas de componentes UI
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
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
// ✅ CORRECCIÓN: Usar formatters desde la ubicación correcta
import { formatCurrency, formatDate } from '@/presentation/lib/utils/formatters'
import { cn } from '@/presentation/lib/utils'
// ✅ CORRECCIÓN: Usar toast de react-hot-toast en lugar de componente
import { toast } from 'react-hot-toast'

// ✅ CORRECCIÓN: Hook personalizado simple para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ✅ CORRECCIÓN: Mock de datos mientras se configura tRPC
const mockRemittancesData = {
  data: [
    {
      reference_number: 'REM-001',
      type: 'outbound',
      sender_name: 'Juan Pérez',
      sender_country: 'US',
      recipient_name: 'María González',
      recipient_country: 'NI',
      send_amount: 50000,
      send_currency: 'USD',
      receive_amount: 165000,
      receive_currency: 'NIO',
      status: 'completed',
      created_at: new Date().toISOString(),
      source_flag: '🇺🇸',
      destination_flag: '🇳🇮',
      tracking_url: 'https://example.com/track/REM-001',
    },
    // Más datos mock aquí...
  ],
  total_count: 1,
  has_more: false,
}

const mockStats = {
  total_volume: 250000,
  total_transfers: 45,
  success_rate: 98.5,
  average_transfer_amount: 55556,
  new_transfers_this_month: 12,
  inbound_count: 15,
  outbound_count: 30,
  pending_count: 2,
  popular_corridors: [
    {
      flag_from: '🇺🇸',
      flag_to: '🇳🇮',
      count: 25,
      volume: 125000,
    },
    {
      flag_from: '🇺🇸',
      flag_to: '🇭🇳',
      count: 18,
      volume: 90000,
    },
    {
      flag_from: '🇺🇸',
      flag_to: '🇨🇷',
      count: 12,
      volume: 60000,
    },
  ],
}

// Remittance status configurations
const STATUS_CONFIG = {
  completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
  pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
  processing: { label: 'Processing', variant: 'secondary' as const, icon: Clock },
  cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
}

// Remittance type configurations
const REMITTANCE_TYPES = {
  inbound: { 
    label: 'Inbound', 
    icon: ArrowDownLeft,
    description: 'Funds received from international sources',
    color: 'text-green-600'
  },
  outbound: { 
    label: 'Outbound', 
    icon: ArrowUpRight,
    description: 'Funds sent to international destinations',
    color: 'text-blue-600'
  },
}

interface RemittanceFilters {
  status?: string[]
  type?: string
  source_country?: string
  destination_country?: string
  amount_gte?: number
  amount_lte?: number
  created_after?: Date
  created_before?: Date
}

export default function RemittancesPage() {
  const router = useRouter()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<RemittanceFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean>(true) // Mock como disponible
  const [isLoading, setIsLoading] = useState(false)
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // ✅ MOCK: Simular datos mientras se configura tRPC
  const remittances = mockRemittancesData
  const stats = mockStats

  const handleExport = () => {
    console.log('Exporting remittances...')
    toast.success('Export functionality will be implemented')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Reference number copied to clipboard')
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

  const filteredRemittances = remittances?.data.filter((remittance: any) => {
    if (activeTab === 'inbound') return remittance.type === 'inbound'
    if (activeTab === 'outbound') return remittance.type === 'outbound'
    if (activeTab === 'pending') return remittance.status === 'pending'
    return true
  })

  if (isAvailable === false) {
    return (
      <div className="flex-1 p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-muted rounded-full">
                <Globe className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>Remittances Not Available</CardTitle>
                <CardDescription>
                  International money transfers are not currently enabled for your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Enable Remittances</AlertTitle>
              <AlertDescription>
                To start processing international money transfers, you need to:
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium">1</span>
                </div>
                <div>
                  <p className="font-medium">Complete compliance verification</p>
                  <p className="text-sm text-muted-foreground">
                    Provide required documentation for international transfers
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium">2</span>
                </div>
                <div>
                  <p className="font-medium">Configure corridor settings</p>
                  <p className="text-sm text-muted-foreground">
                    Set up supported countries and currencies
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium">3</span>
                </div>
                <div>
                  <p className="font-medium">Enable remittance connectors</p>
                  <p className="text-sm text-muted-foreground">
                    Connect with international payment partners
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button>Contact Sales</Button>
            <Button variant="outline">Learn More</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remittances</h1>
          <p className="text-muted-foreground">
            Manage international money transfers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsLoading(!isLoading)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_volume || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.new_transfers_this_month || 0} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.success_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transfer</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.average_transfer_amount || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Corridors */}
      {stats?.popular_corridors && stats.popular_corridors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Corridors</CardTitle>
            <CardDescription>Most used transfer routes this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stats.popular_corridors.map((corridor: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg flex-shrink-0"
                >
                  <span className="text-2xl">{corridor.flag_from}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl">{corridor.flag_to}</span>
                  <div className="ml-2 text-sm">
                    <p className="font-medium">{corridor.count} transfers</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(corridor.volume, 'USD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Transfers</TabsTrigger>
            <TabsTrigger value="inbound">
              Inbound
              {stats?.inbound_count && stats.inbound_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.inbound_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outbound">
              Outbound
              {stats?.outbound_count && stats.outbound_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.outbound_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {stats?.pending_count && stats.pending_count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending_count}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, sender, recipient..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
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
                  Export Transfers
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
                <CardTitle className="text-base">Filter Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status?.[0] || 'all'}
                      onValueChange={(value: any) => 
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
                    <Label>Source Country</Label>
                    <Select
                      value={filters.source_country || 'all'}
                      onValueChange={(value: any) => 
                        setFilters(prev => ({
                          ...prev,
                          source_country: value === 'all' ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Destination Country</Label>
                    <Select
                      value={filters.destination_country || 'all'}
                      onValueChange={(value: any) => 
                        setFilters(prev => ({
                          ...prev,
                          destination_country: value === 'all' ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        <SelectItem value="MX">Mexico</SelectItem>
                        <SelectItem value="IN">India</SelectItem>
                        <SelectItem value="PH">Philippines</SelectItem>
                        <SelectItem value="CN">China</SelectItem>
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
                            `${formatDate(filters.created_after)} - ${formatDate(filters.created_before)}`
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
                          onSelect={(range: any) => {
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

          {/* Remittances Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={9}>
                            <Skeleton className="h-12 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredRemittances?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <p className="text-muted-foreground">No transfers found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRemittances?.map((remittance: any) => {
                        const typeConfig = REMITTANCE_TYPES[remittance.type as keyof typeof REMITTANCE_TYPES]
                        const TypeIcon = typeConfig?.icon || Globe
                        
                        return (
                          <TableRow key={remittance.reference_number}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {remittance.reference_number}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(remittance.reference_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className={cn("h-4 w-4", typeConfig?.color)} />
                                <span className="text-sm">{typeConfig?.label || remittance.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{remittance.sender_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {remittance.sender_country}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{remittance.recipient_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {remittance.recipient_country}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {formatCurrency(remittance.send_amount, remittance.send_currency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  → {formatCurrency(remittance.receive_amount, remittance.receive_currency)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-lg">{remittance.source_flag}</span>
                                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-lg">{remittance.destination_flag}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(remittance.status)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{formatDate(new Date(remittance.created_at))}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(remittance.created_at), 'HH:mm:ss')}
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
                                    onClick={() => router.push(`/remittances/${remittance.reference_number}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => copyToClipboard(remittance.reference_number)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Reference
                                  </DropdownMenuItem>
                                  {remittance.tracking_url && (
                                    <DropdownMenuItem
                                      onClick={() => window.open(remittance.tracking_url, '_blank')}
                                    >
                                      <MapPin className="mr-2 h-4 w-4" />
                                      Track Transfer
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
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, remittances?.total_count || 0)} of {remittances?.total_count || 0} transfers
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
                    Page {currentPage} of {Math.ceil((remittances?.total_count || 0) / pageSize)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage * pageSize >= (remittances?.total_count || 0)}
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