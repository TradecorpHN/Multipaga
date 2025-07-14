'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Badge } from '@/presentation/components/ui/Badge'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { Alert, AlertDescription } from '@/presentation/components/ui/Alert'
import { formatCurrency, formatDate } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'
import { useToast } from '@/presentation/components/ui/use-toast'

import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Shield,
  Copy,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

// Tipos para disputas
interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'
  connector: string
  connector_status: string
  connector_dispute_id: string
  connector_reason?: string
  connector_reason_code?: string
  challenge_required_by?: string
  connector_created_at?: string
  connector_updated_at?: string
  created_at: string
  profile_id?: string
  merchant_connector_id?: string
}

interface DisputeFilters {
  status?: string[]
  stage?: string[]
  connector?: string[]
  amount_gte?: number
  amount_lte?: number
  currency?: string[]
  date_from?: Date
  date_to?: Date
  payment_id?: string
  search?: string
}

interface DisputeListProps {
  disputes: DisputeResponse[]
  totalCount: number
  hasMore: boolean
  isLoading?: boolean
  error?: string | null
  filters?: DisputeFilters
  onFiltersChange?: (filters: DisputeFilters) => void
  onRefresh?: () => void
  onLoadMore?: () => void
  onDisputeClick?: (dispute: DisputeResponse) => void
  className?: string
}

// Configuración de estados
const DISPUTE_STATUS_CONFIG = {
  dispute_opened: {
    label: 'Opened',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    color: 'text-red-400'
  },
  dispute_expired: {
    label: 'Expired',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-gray-400'
  },
  dispute_accepted: {
    label: 'Accepted',
    variant: 'secondary' as const,
    icon: CheckCircle,
    color: 'text-blue-400'
  },
  dispute_cancelled: {
    label: 'Cancelled',
    variant: 'secondary' as const,
    icon: XCircle,
    color: 'text-gray-400'
  },
  dispute_challenged: {
    label: 'Challenged',
    variant: 'warning' as const,
    icon: Shield,
    color: 'text-yellow-400'
  },
  dispute_won: {
    label: 'Won',
    variant: 'success' as const,
    icon: CheckCircle,
    color: 'text-green-400'
  },
  dispute_lost: {
    label: 'Lost',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-400'
  },
}

const DISPUTE_STAGE_CONFIG = {
  pre_dispute: { label: 'Pre-Dispute', color: 'text-yellow-400' },
  dispute: { label: 'Dispute', color: 'text-orange-400' },
  pre_arbitration: { label: 'Pre-Arbitration', color: 'text-red-400' },
}

// Función para copiar al portapapeles
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    return false
  }
}

export function DisputeList({
  disputes,
  totalCount,
  hasMore,
  isLoading = false,
  error = null,
  filters = {},
  onFiltersChange,
  onRefresh,
  onLoadMore,
  onDisputeClick,
  className
}: DisputeListProps) {
  const router = useRouter()
  // CORRECCIÓN: Usar la desestructuración correcta del hook useToast
  const { toast } = useToast()
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'created_at' | 'amount' | 'status'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Ordenar disputas
  const sortedDisputes = useMemo(() => {
    return [...disputes].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortBy) {
        case 'amount':
          aVal = parseInt(a.amount)
          bVal = parseInt(b.amount)
          break
        case 'status':
          aVal = a.dispute_status
          bVal = b.dispute_status
          break
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }, [disputes, sortBy, sortOrder])

  // Handlers
  const handleSort = (field: 'created_at' | 'amount' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleSelectDispute = (disputeId: string, checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedDisputes(prev => [...prev, disputeId])
    } else {
      setSelectedDisputes(prev => prev.filter(id => id !== disputeId))
    }
  }

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedDisputes(
      checked === true ? disputes.map(d => d.dispute_id) : []
    )
  }

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      toast({
        title: "Success",
        description: `${label} copied to clipboard`
      })
    }
  }

  const handleDisputeClick = (dispute: DisputeResponse) => {
    if (onDisputeClick) {
      onDisputeClick(dispute)
    } else {
      router.push(`/disputes/${dispute.dispute_id}`)
    }
  }

  // Estadísticas resumidas
  const stats = useMemo(() => {
    const total = disputes.length
    const opened = disputes.filter(d => d.dispute_status === 'dispute_opened').length
    const won = disputes.filter(d => d.dispute_status === 'dispute_won').length
    const lost = disputes.filter(d => d.dispute_status === 'dispute_lost').length
    const totalAmount = disputes.reduce((sum, d) => sum + parseInt(d.amount), 0)

    return { total, opened, won, lost, totalAmount }
  }, [disputes])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Total Disputes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm text-gray-500">Opened</p>
                <p className="text-2xl font-bold text-red-400">{stats.opened}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-500">Won</p>
                <p className="text-2xl font-bold text-green-400">{stats.won}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm text-gray-500">Lost</p>
                <p className="text-2xl font-bold text-red-400">{stats.lost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Disputes</span>
                <Badge variant="secondary">{totalCount.toLocaleString()}</Badge>
              </CardTitle>
              <CardDescription>
                Manage and track payment disputes
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search disputes by ID, payment ID, or reason..."
                value={filters.search || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFiltersChange?.({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={filters.status?.[0] || 'all'}
                onValueChange={(value: string) =>
                  onFiltersChange?.({
                    ...filters,
                    status: value === 'all' ? undefined : [value]
                  })
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(DISPUTE_STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.stage?.[0] || 'all'}
                onValueChange={(value: string) =>
                  onFiltersChange?.({
                    ...filters,
                    stage: value === 'all' ? undefined : [value]
                  })
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(DISPUTE_STAGE_CONFIG).map(([stage, config]) => (
                    <SelectItem key={stage} value={stage}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de disputas */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDisputes.length === disputes.length && disputes.length > 0}
                      indeterminate={selectedDisputes.length > 0 && selectedDisputes.length < disputes.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="h-auto p-0 font-medium"
                    >
                      Dispute
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('amount')}
                      className="h-auto p-0 font-medium"
                    >
                      Amount
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="h-auto p-0 font-medium"
                    >
                      Status
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Connector</TableHead>
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
                ) : sortedDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No disputes found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDisputes.map((dispute) => {
                    const statusConfig = DISPUTE_STATUS_CONFIG[dispute.dispute_status]
                    const stageConfig = DISPUTE_STAGE_CONFIG[dispute.dispute_stage]
                    const StatusIcon = statusConfig.icon

                    return (
                      <TableRow
                        key={dispute.dispute_id}
                        className="cursor-pointer hover:bg-gray-50/5"
                        onClick={() => handleDisputeClick(dispute)}
                      >
                        <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDisputes.includes(dispute.dispute_id)}
                            onCheckedChange={(checked) =>
                              handleSelectDispute(dispute.dispute_id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-mono text-sm">{dispute.dispute_id}</p>
                            <Badge variant="outline" className={cn('text-xs', stageConfig.color)}>
                              {stageConfig.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-mono text-sm">{dispute.payment_id}</p>
                            {dispute.connector_reason && (
                              <p className="text-xs text-gray-500 max-w-[200px] truncate">
                                {dispute.connector_reason}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {formatCurrency(parseInt(dispute.amount), { currency: dispute.currency })}
                            </p>
                            <p className="text-xs text-gray-500">{dispute.currency}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="flex items-center space-x-1 w-fit">
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium capitalize">{dispute.connector}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">{formatDate(dispute.created_at)}</p>
                            {dispute.challenge_required_by && (
                              <p className="text-xs text-yellow-500">
                                Challenge by {formatDate(dispute.challenge_required_by)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleDisputeClick(dispute)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopy(dispute.dispute_id, 'Dispute ID')}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Dispute ID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopy(dispute.payment_id, 'Payment ID')}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Payment ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <FileText className="w-4 h-4 mr-2" />
                                View Evidence
                              </DropdownMenuItem>
                              {dispute.dispute_status === 'dispute_opened' && (
                                <>
                                  <DropdownMenuItem>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Challenge Dispute
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Accept Dispute
                                  </DropdownMenuItem>
                                </>
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
        {/* Paginación */}
        {hasMore && (
          <CardContent className="border-t border-gray-200/20">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {disputes.length} of {totalCount.toLocaleString()} disputes
              </p>
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Load More
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}