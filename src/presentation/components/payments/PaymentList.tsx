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
  DollarSign,
  CreditCard,
  Users,
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
import PaymentCard from './PaymentCard'
import PaymentFilters from './PaymentFilters'
import type { PaymentResponse } from '@/infrastructure/repositories/HttpPaymentRepository'
import type { PaymentFilters as PaymentFiltersType } from '../forms/validation/payment.schema'
import { formatCurrency } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

interface PaymentListProps {
  payments: PaymentResponse[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onFiltersChange: (filters: PaymentFiltersType) => void
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onRefresh: () => void
  onPaymentAction?: (action: string, paymentId: string) => void
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const SORT_FIELDS = [
  { value: 'created', label: 'Fecha de creación' },
  { value: 'amount', label: 'Monto' },
  { value: 'status', label: 'Estado' },
  { value: 'updated', label: 'Última actualización' },
] as const

export default function PaymentList({
  payments,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onFiltersChange,
  onSort,
  onRefresh,
  onPaymentAction,
  className = '',
}: PaymentListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState(searchParams.get('sort') || 'created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') || 'desc'
  )
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!payments.length) return null

    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const failedPayments = payments.filter(p => p.status === 'failed')
    const processingPayments = payments.filter(p => 
      ['processing', 'requires_confirmation', 'requires_action'].includes(p.status)
    )

    return {
      totalAmount,
      currency: payments[0]?.currency || 'USD',
      successful: successfulPayments.length,
      failed: failedPayments.length,
      processing: processingPayments.length,
    }
  }, [payments])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Update URL and trigger search
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    params.set('page', '1') // Reset to first page
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const handleSortChange = useCallback((field: string) => {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc'
    setSortField(field)
    setSortDirection(newDirection)
    onSort(field, newDirection)
  }, [sortField, sortDirection, onSort])

  const handleSelectPayment = useCallback((paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments(prev => [...prev, paymentId])
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId))
    }
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedPayments(payments.map(p => p.payment_id))
    } else {
      setSelectedPayments([])
    }
  }, [payments])

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedPayments.length === 0) {
      toast.error('Selecciona al menos un pago')
      return
    }

    try {
      // Implement bulk actions
      switch (action) {
        case 'export':
          toast.success(`Exportando ${selectedPayments.length} pagos...`)
          break
        case 'capture':
          toast.success(`Capturando ${selectedPayments.length} pagos...`)
          break
        case 'cancel':
          toast.success(`Cancelando ${selectedPayments.length} pagos...`)
          break
        default:
          toast.error('Acción no reconocida')
      }
      
      setSelectedPayments([])
    } catch (error) {
      toast.error('Error al ejecutar la acción')
    }
  }, [selectedPayments])

  const exportPayments = useCallback(() => {
    // Export current page or all payments
    const dataToExport = selectedPayments.length > 0 
      ? payments.filter(p => selectedPayments.includes(p.payment_id))
      : payments

    const csv = [
      ['ID', 'Monto', 'Moneda', 'Estado', 'Fecha', 'Cliente', 'Conector'],
      ...dataToExport.map(payment => [
        payment.payment_id,
        payment.amount / 100, // Convert to decimal
        payment.currency,
        payment.status,
        new Date(payment.created).toLocaleDateString(),
        payment.customer_id || '',
        payment.connector,
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Datos exportados exitosamente')
  }, [payments, selectedPayments])

  const renderPaginationInfo = () => (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div>
        Mostrando {startItem} a {endItem} de {totalCount} pagos
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
                <CreditCard className="w-5 h-5" />
                Pagos ({totalCount})
              </CardTitle>
              {summaryStats && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Total: {formatCurrency(summaryStats.totalAmount, summaryStats.currency)}</span>
                  <span>✓ {summaryStats.successful}</span>
                  <span>✗ {summaryStats.failed}</span>
                  <span>⏳ {summaryStats.processing}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/payments/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo pago
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
                  <DropdownMenuItem onClick={exportPayments}>
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
          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente, descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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

          {/* Filters */}
          {showFilters && (
            <div className="border rounded-lg p-4">
              <PaymentFilters onFiltersChange={onFiltersChange} />
            </div>
          )}

          {/* Bulk Actions */}
          {selectedPayments.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium">
                {selectedPayments.length} pagos seleccionados
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
                  onClick={() => handleBulkAction('capture')}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Capturar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedPayments([])}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment List */}
      <div className="space-y-4">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron pagos</h3>
              <p className="text-muted-foreground mb-4">
                No hay pagos que coincidan con los criterios de búsqueda.
              </p>
              <Button onClick={() => router.push('/dashboard/payments/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer pago
              </Button>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <PaymentCard
              key={payment.payment_id}
              payment={payment}
              variant="detailed"
              onRefresh={onRefresh}
              onCapture={onPaymentAction ? (id) => onPaymentAction('capture', id) : undefined}
              onCancel={onPaymentAction ? (id) => onPaymentAction('cancel', id) : undefined}
              onRefund={onPaymentAction ? (id) => onPaymentAction('refund', id) : undefined}
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