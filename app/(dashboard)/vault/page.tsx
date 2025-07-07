// app/(dashboard)/vault/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield,
  CreditCard,
  Building,
  Plus,
  Search,
  Filter,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Fingerprint,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { trpc } from '@/utils/trpc'
import { formatDate, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

// Token status configurations
const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
  inactive: { label: 'Inactive', variant: 'secondary' as const, icon: Clock },
  expired: { label: 'Expired', variant: 'destructive' as const, icon: AlertCircle },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
}

// Token type configurations
const TOKEN_TYPES = {
  card: { 
    label: 'Card', 
    icon: CreditCard,
    description: 'Credit and debit card tokens'
  },
  bank_account: { 
    label: 'Bank Account', 
    icon: Building,
    description: 'Bank account tokens for ACH and wire transfers'
  },
  pci_card: { 
    label: 'PCI Card', 
    icon: ShieldCheck,
    description: 'PCI-compliant card tokens'
  },
}

interface TokenFilters {
  status?: string
  type?: string
  customer_id?: string
}

export default function VaultPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TokenFilters>({})
  const [activeTab, setActiveTab] = useState('all')
  const [selectedTokens, setSelectedTokens] = useState<string[]>([])
  const [showSensitive, setShowSensitive] = useState<string[]>([])
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build query parameters
  const queryParams = {
    ...(debouncedSearch && { 
      customer_id: debouncedSearch,
    }),
    ...(filters.status && { status: filters.status }),
    ...(filters.type && { payment_method_type: filters.type }),
  }

  // Fetch tokens
  const { data: tokens, isLoading, refetch } = trpc.vault.listTokens.useQuery(queryParams)

  // Fetch vault statistics
  const { data: stats } = trpc.vault.stats.useQuery({})

  // Delete token mutation
  const deleteMutation = trpc.vault.deleteToken.useMutation({
    onSuccess: () => {
      toast({
        title: 'Token Deleted',
        description: 'The payment method has been removed from the vault.',
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

  // Retrieve sensitive data mutation
  const retrieveMutation = trpc.vault.retrieveToken.useMutation({
    onSuccess: (data, variables) => {
      // Store the sensitive data temporarily in state
      setShowSensitive(prev => [...prev, variables.token])
      setTimeout(() => {
        setShowSensitive(prev => prev.filter(t => t !== variables.token))
      }, 30000) // Hide after 30 seconds
    },
    onError: (error) => {
      toast({
        title: 'Retrieval Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleDeleteToken = (token: string) => {
    if (confirm('Are you sure you want to delete this payment method? This action cannot be undone.')) {
      deleteMutation.mutate({ token })
    }
  }

  const handleShowSensitive = (token: string) => {
    if (showSensitive.includes(token)) {
      setShowSensitive(prev => prev.filter(t => t !== token))
    } else {
      retrieveMutation.mutate({ token })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'The token has been copied to your clipboard.',
    })
  }

  const maskCardNumber = (number: string) => {
    return `•••• •••• •••• ${number.slice(-4)}`
  }

  const maskAccountNumber = (number: string) => {
    return `••••${number.slice(-4)}`
  }

  const filteredTokens = tokens?.payment_methods.filter(token => {
    if (activeTab === 'cards') return token.payment_method === 'card'
    if (activeTab === 'bank_accounts') return token.payment_method === 'bank_transfer'
    return true
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Vault
          </h1>
          <p className="text-muted-foreground">
            Securely store and manage payment methods
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Bank-Grade Security</AlertTitle>
        <AlertDescription>
          All payment methods are tokenized and encrypted using PCI DSS Level 1 compliant infrastructure. 
          Sensitive data is never stored on our servers.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tokens || 0}</div>
            <p className="text-xs text-muted-foreground">
              Stored payment methods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_cards || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bank_accounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              For ACH transfers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Fingerprint className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.security_score || 100}%</div>
            <Progress value={stats?.security_score || 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Methods</TabsTrigger>
            <TabsTrigger value="cards">
              Cards
              {stats?.active_cards && stats.active_cards > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.active_cards}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bank_accounts">
              Bank Accounts
              {stats?.bank_accounts && stats.bank_accounts > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.bank_accounts}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({
                  ...prev,
                  status: value === 'all' ? undefined : value
                }))
              }
            >
              <SelectTrigger className="w-[140px]">
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
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Tokens Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredTokens?.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">No payment methods stored</p>
                  <p className="text-sm text-muted-foreground">
                    Payment methods will appear here when customers save them during checkout
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTokens?.map((token) => {
                const isCard = token.payment_method === 'card'
                const isSensitiveVisible = showSensitive.includes(token.payment_token)
                const statusConfig = STATUS_CONFIG[token.status as keyof typeof STATUS_CONFIG]
                const StatusIcon = statusConfig?.icon || AlertCircle
                
                return (
                  <Card key={token.payment_token} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {isCard ? (
                            <div className="p-2 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg">
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg">
                              <Building className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">
                              {isCard ? token.card?.card_network : 'Bank Account'}
                            </CardTitle>
                            <Badge variant={statusConfig?.variant || 'secondary'} className="mt-1">
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusConfig?.label || token.status}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(token.payment_token)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Token
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleShowSensitive(token.payment_token)}
                            >
                              {isSensitiveVisible ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Show Details
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteToken(token.payment_token)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isCard ? (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Card Number</p>
                            <p className="font-mono">
                              {isSensitiveVisible && token.card?.card_number 
                                ? token.card.card_number 
                                : maskCardNumber(token.card?.last4 || '0000')}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Expires</p>
                              <p className="font-mono">
                                {token.card?.card_exp_month?.toString().padStart(2, '0')}/
                                {token.card?.card_exp_year?.toString().slice(-2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Brand</p>
                              <p className="capitalize">{token.card?.card_network}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Account Number</p>
                            <p className="font-mono">
                              {isSensitiveVisible && token.bank_transfer?.account_number
                                ? token.bank_transfer.account_number
                                : maskAccountNumber(token.bank_transfer?.last4 || '0000')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Routing Number</p>
                            <p className="font-mono">
                              {isSensitiveVisible 
                                ? token.bank_transfer?.routing_number || '•••••••••'
                                : '•••••••••'}
                            </p>
                          </div>
                        </>
                      )}
                      
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Customer</span>
                          <code className="bg-muted px-1 py-0.5 rounded">
                            {token.customer_id}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Created</span>
                          <span>{formatDate(token.created)}</span>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Security indicator */}
                    <div className="absolute top-0 right-0 p-2">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}