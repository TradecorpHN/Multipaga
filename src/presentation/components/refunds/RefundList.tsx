'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SortAsc,
  SortDesc,
  Eye,
  Plus,
  Calendar,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Badge } from '@/presentation/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Separator } from '@/presentation/components/ui/Separator'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import RefundCard from './RefundCard'
import { formatCurrency } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

// Refund interface (based on Hyperswitch)
interface RefundResponse {
  refund_id: string
  payment_id: string
  merchant_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'pending' | 'processing' | 'requires_merchant_action' | 'cancelled'
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'expired_uncaptured_charge' | 'other'
  description?: string
  metadata?: Record<string, any>
  created: string
  updated: string
  error_code?: string
  error_message?: string
  merchant_connector_id?: string
  connector_transaction_id?: string
  connector_refund_id?: string
  profile_id?: string
}

interface RefundFilters {
  status?: string[]
  created_from?: string
  created_to?: string
  amount_min?: number
  amount_max?: number
  payment_id?: string
  search?: string
}

interface RefundListProps {
  refunds: RefundResponse[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onFiltersChange: (filters: RefundFilters) => void
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onRefresh: () => void
  onRefundAction?: (action: string, refundId: string) => void
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const SORT_FIELDS = [
  { value: 'created', label: 'Fecha de creación' },
  { value: 'amount', label: 'Monto' },
  { value: 'status', label: 'Estado' },
  { value: 'updated', label: 'Última actualización' },
] as const

const REFUND_STATUSES = [
  { value: 'succeeded', label: 'Completado', color: 'success', icon: CheckCircle },
  { value: 'failed', label: 'Fallido', color: 'destructive', icon: XCircle },
  { value: 'pending', label: 'Pendiente', color: 'warning', icon: Clock },
  { value: 'processing', label: 'Procesando', color: 'secondary', icon: RefreshCw },
  { value: 'requires_merchant_action', label: 'Requiere acción', color: 'warning', icon: AlertTriangle },
  { value: 'cancelled', label: 'Cancelado', color: 'secondary', icon: XCircle },
] as const

export default function RefundList({
  refunds,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onFiltersChange,
  onSort,
  onRefresh,
  onRefundAction,
  className = '',
}: RefundListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState(searchParams.get('sort') || 'created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  )
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!refunds.length) return null

    const totalAmount = refunds.reduce((sum, refund) => sum + refund.amount, 0)
    const completedRefunds = refunds.filter(r => r.status === 'succeeded')
    const failedRefunds = refunds.filter(r => r.status === 'failed')
    const pendingRefunds = refunds.filter(r => 
      ['pending', 'processing', 'requires_merchant_action'].includes(r.status)
    )

    return {
      totalAmount,
      currency: refunds[0]?.currency || 'USD',
      completed: completedRefunds.length,
      failed: failedRefunds.length,
      pending: pendingRefunds.length,
    }
  }, [refunds])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const handleSortChange = useCallback((field: string) => {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc'
    setSortField(field)
    setSortDirection(newDirection)
    onSort(field, newDirection)
  }, [sortField, sortDirection, onSort])

  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status)
    onFiltersChange({ 
      status: status ? [status] : undefined,
    })
  }, [onFiltersChange])

  const handleSelectRefund = useCallback((refundId: string, selected: boolean) => {
    if (selected) {
      setSelectedRefunds(prev => [...prev, refundId])
    } else {
      setSelectedRefunds(prev => prev.filter(id => id !== refundId))
    }
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedRefunds(refunds.map(r => r.refund_id))
    } else {
      setSelectedRefunds([])
    }
  }, [refunds])

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedRefunds.length === 0) {
      toast.error('Selecciona al menos un reembolso')
      return
    }

    try {
      switch (action) {
        case 'export':
          toast.success(`Exportando ${selectedRefunds.length} reembolsos...`)
          break
        case 'retry':
          toast.success(`Reintentando ${selectedRefunds.length} reembolsos...`)
          break
        case 'cancel':
          toast.success(`Cancelando ${selectedRefunds.length} reembolsos...`)
          break
        default:
          toast.error('Acción no reconocida')
      }
      
      setSelectedRefunds([])
    } catch (error) {
      toast.error('Error al ejecutar la acción')
    }
  }, [selectedRefunds])

  const exportRefunds = useCallback(() => {
    const dataToExport = selectedRefunds.length > 0 
      ? refunds.filter(r => selectedRefunds.includes(r.refund_id))
      : refunds

    const csv = [
      ['ID Reembolso', 'ID Pago', 'Monto', 'Moneda', 'Estado', 'Fecha', 'Motivo'],
      ...dataToExport.map(refund => [
        refund.refund_id,
        refund.payment_id,
        refund.amount / 100,
        refund.currency,
        refund.status,
        new Date(refund.created).toLocaleDateString(),
        refund.reason || '',
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reembolsos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Datos exportados exitosamente')
  }, [refunds, selectedRefunds])

  const renderPaginationInfo = () => (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div>
        Mostrando {startItem} a {endItem} de {totalCount} reembolsos
      </div>
      
      <div className="flex items-center space-x-2">
        <span>Filas por página:</span>
        <Select 
          value={pageSize.toString()} 
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="w-16 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(size => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderPaginationControls = () => (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={!hasPrevPage || isLoading}
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage || isLoading}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <div className="flex items-center space-x-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
          if (page <= totalPages) {
            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            )
          }
          return null
        })}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage || isLoading}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={!hasNextPage || isLoading}
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  )

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-orange-600" />
                Reembolsos ({totalCount})
              </CardTitle>
              {summaryStats && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Total: {formatCurrency(summaryStats.totalAmount, summaryStats.currency)}</span>
                  <span>✓ {summaryStats.completed}</span>
                  <span>✗ {summaryStats.failed}</span>
                  <span>⏳ {summaryStats.pending}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/refunds/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo reembolso
              </Button>
              
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportRefunds}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar datos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="w-4 h-4 mr-2" />
                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID de reembolso, ID de pago..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {REFUND_STATUSES.map(status => {
                    const Icon = status.icon
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Select value={sortField} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map(field => (
                    <SelectItem key={field.value} value={field.value}>
                      <div className="flex items-center gap-2">
                        {field.label}
                        {sortField === field.value && (
                          sortDirection === 'desc' ? 
                          <SortDesc className="w-3 h-3" /> : 
                          <SortAsc className="w-3 h-3" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSearch(searchQuery)}
                disabled={isLoading}
              >
                Buscar
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRefunds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-sm font-medium">
                {selectedRefunds.length} reembolsos seleccionados
              </span>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkAction('export')}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkAction('retry')}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reintentar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedRefunds([])}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund List */}
      <div className="space-y-4">
        {refunds.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ArrowLeft className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron reembolsos</h3>
              <p className="text-muted-foreground mb-4">
                No hay reembolsos que coincidan con los criterios de búsqueda.
              </p>
              <Button onClick={() => router.push('/dashboard/refunds/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer reembolso
              </Button>
            </CardContent>
          </Card>
        ) : (
          refunds.map((refund) => (
            <RefundCard
              key={refund.refund_id}
              refund={refund}
              variant="detailed"
              onRefresh={onRefresh}
              onCancel={onRefundAction ? (id) => onRefundAction('cancel', id) : undefined}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {renderPaginationInfo()}
              {renderPaginationControls()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}