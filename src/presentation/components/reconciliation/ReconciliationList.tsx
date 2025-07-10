// /home/kali/multipaga/src/presentation/components/reconciliation/ReconciliationList.tsx
// ──────────────────────────────────────────────────────────────────────────────
// ReconciliationList - Componente para mostrar lista de transacciones de reconciliación
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  CreditCard,
  RefreshCw,
  Upload,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  FileText,
  Building,
  Calendar,
  Filter,
  Search,
  Zap,
  ExternalLink,
  Copy,
  Flag,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Input } from '@/presentation/components/ui/Input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/Table'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  QuickActionsMenu,
} from '@/presentation/components/ui/DropdownMenu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import { SimpleTooltip } from '@/presentation/components/ui/Tooltip'
import { CompletePagination } from '@/presentation/components/ui/Pagination'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/presentation/components/ui/formatters'
import { cn } from '@/presentation/lib/utils'

// Interfaces
interface ReconciliationItem {
  id: string
  transaction_id: string
  type: 'payment' | 'refund' | 'payout' | 'fee'
  status: 'matched' | 'unmatched' | 'pending' | 'disputed'
  amount: number
  currency: string
  connector: string
  merchant_reference: string
  connector_reference?: string
  payment_method?: string
  customer_id?: string
  created_at: string
  reconciled_at?: string
  processed_at?: string
  
  // Información de discrepancias
  discrepancy?: {
    type: 'amount' | 'status' | 'date' | 'missing'
    description: string
    expected_value?: any
    actual_value?: any
    difference?: number
  }
  
  // Metadatos adicionales
  metadata?: {
    country?: string
    business_label?: string
    payment_method_type?: string
    profile_id?: string
    webhook_id?: string
    reconciliation_file_id?: string
    batch_id?: string
  }
  
  // Información de auditoria
  audit?: {
    created_by: string
    updated_by?: string
    notes?: string
    flags?: string[]
  }
}

interface ReconciliationListProps {
  items: ReconciliationItem[]
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onItemAction?: (action: string, itemId: string) => void
  onBulkAction?: (action: string, itemIds: string[]) => void
  onItemSelect?: (itemId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  
  // Estado
  isLoading?: boolean
  selectedItems?: string[]
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  
  // Configuración
  showActions?: boolean
  showSelection?: boolean
  showBulkActions?: boolean
  showFilters?: boolean
  enableDrillDown?: boolean
  compactMode?: boolean
  
  // Callbacks
  onViewDetails?: (item: ReconciliationItem) => void
  onEditItem?: (item: ReconciliationItem) => void
  onResolveDiscrepancy?: (item: ReconciliationItem) => void
  onMarkAsMatched?: (item: ReconciliationItem) => void
  onAddNote?: (item: ReconciliationItem) => void
  onExportItems?: (itemIds: string[]) => void
  
  className?: string
}

// Configuración de estados
const STATUS_CONFIG = {
  matched: {
    label: 'Conciliado',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    variant: 'success' as const,
    icon: CheckCircle,
  },
  unmatched: {
    label: 'No Conciliado',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    variant: 'destructive' as const,
    icon: XCircle,
  },
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    variant: 'warning' as const,
    icon: Clock,
  },
  disputed: {
    label: 'Disputado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    variant: 'warning' as const,
    icon: AlertTriangle,
  },
} as const

const TYPE_CONFIG = {
  payment: {
    label: 'Pago',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  refund: {
    label: 'Reembolso',
    icon: RefreshCw,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  payout: {
    label: 'Pago Saliente',
    icon: Upload,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  fee: {
    label: 'Comisión',
    icon: DollarSign,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
} as const

const DISCREPANCY_CONFIG = {
  amount: {
    label: 'Diferencia de Monto',
    icon: DollarSign,
    color: 'text-red-600',
  },
  status: {
    label: 'Estado Diferente',
    icon: AlertTriangle,
    color: 'text-yellow-600',
  },
  date: {
    label: 'Fecha Diferente',
    icon: Calendar,
    color: 'text-blue-600',
  },
  missing: {
    label: 'Transacción Faltante',
    icon: XCircle,
    color: 'text-red-600',
  },
} as const

// Componente principal
const ReconciliationList = React.forwardRef<HTMLDivElement, ReconciliationListProps>(({
  items,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  onItemAction,
  onBulkAction,
  onItemSelect,
  onSelectAll,
  isLoading = false,
  selectedItems = [],
  sortField,
  sortDirection,
  showActions = true,
  showSelection = true,
  showBulkActions = true,
  showFilters = true,
  enableDrillDown = true,
  compactMode = false,
  onViewDetails,
  onEditItem,
  onResolveDiscrepancy,
  onMarkAsMatched,
  onAddNote,
  onExportItems,
  className,
}, ref) => {
  const [quickFilter, setQuickFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filtrar items localmente
  const filteredItems = useMemo(() => {
    if (!quickFilter) return items
    
    const filter = quickFilter.toLowerCase()
    return items.filter(item => 
      item.transaction_id.toLowerCase().includes(filter) ||
      item.merchant_reference.toLowerCase().includes(filter) ||
      item.connector_reference?.toLowerCase().includes(filter) ||
      item.connector.toLowerCase().includes(filter) ||
      item.customer_id?.toLowerCase().includes(filter)
    )
  }, [items, quickFilter])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = items.length
    const matched = items.filter(item => item.status === 'matched').length
    const unmatched = items.filter(item => item.status === 'unmatched').length
    const pending = items.filter(item => item.status === 'pending').length
    const disputed = items.filter(item => item.status === 'disputed').length
    const withDiscrepancies = items.filter(item => item.discrepancy).length
    
    return { total, matched, unmatched, pending, disputed, withDiscrepancies }
  }, [items])

  // Manejar selección
  const handleSelectAll = useCallback((checked: boolean) => {
    onSelectAll?.(checked)
  }, [onSelectAll])

  const handleItemSelect = useCallback((itemId: string, checked: boolean) => {
    onItemSelect?.(itemId, checked)
  }, [onItemSelect])

  // Manejar ordenamiento
  const handleSort = useCallback((field: string) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(field, direction)
  }, [sortField, sortDirection, onSort])

  // Expandir/colapsar fila
  const toggleRowExpansion = useCallback((itemId: string) => {
    if (!enableDrillDown) return
    
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [enableDrillDown])

  // Copiar al portapapeles
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copiado al portapapeles`)
    } catch (error) {
      toast.error('Error al copiar al portapapeles')
    }
  }, [])

  // Acciones en lote disponibles
  const bulkActions = useMemo(() => {
    if (!showBulkActions || selectedItems.length === 0) return []
    
    const actions = []
    
    // Solo mostrar "Marcar como conciliado" si hay items no conciliados seleccionados
    const hasUnmatched = selectedItems.some(id => {
      const item = items.find(i => i.id === id)
      return item && item.status !== 'matched'
    })
    
    if (hasUnmatched) {
      actions.push({
        label: 'Marcar como Conciliado',
        action: 'mark_matched',
        icon: CheckCircle,
      })
    }
    
    actions.push(
      {
        label: 'Exportar Seleccionados',
        action: 'export',
        icon: Download,
      },
      {
        label: 'Agregar Nota',
        action: 'add_note',
        icon: MessageSquare,
      }
    )
    
    return actions
  }, [showBulkActions, selectedItems, items])

  // Renderizar celda de estado
  const renderStatusCell = useCallback((item: ReconciliationItem) => {
    const config = STATUS_CONFIG[item.status]
    const Icon = config.icon
    
    return (
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.color)} />
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
        {item.discrepancy && (
          <SimpleTooltip content={`Discrepancia: ${item.discrepancy.description}`}>
            <Flag className="h-3 w-3 text-red-500" />
          </SimpleTooltip>
        )}
      </div>
    )
  }, [])

  // Renderizar celda de tipo
  const renderTypeCell = useCallback((item: ReconciliationItem) => {
    const config = TYPE_CONFIG[item.type]
    const Icon = config.icon
    
    return (
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded-full', config.bgColor)}>
          <Icon className={cn('h-3 w-3', config.color)} />
        </div>
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    )
  }, [])

  // Renderizar fila expandida
  const renderExpandedRow = useCallback((item: ReconciliationItem) => {
    return (
      <TableRow>
        <TableCell colSpan={showSelection ? 8 : 7}>
          <div className="p-4 bg-muted/50 rounded-md space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Información adicional */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Detalles de Transacción</h4>
                <div className="space-y-1 text-xs">
                  {item.customer_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-mono">{item.customer_id}</span>
                    </div>
                  )}
                  {item.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método:</span>
                      <span>{formatPaymentMethod(item.payment_method)}</span>
                    </div>
                  )}
                  {item.metadata?.business_label && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Negocio:</span>
                      <span>{item.metadata.business_label}</span>
                    </div>
                  )}
                  {item.metadata?.country && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">País:</span>
                      <span>{item.metadata.country}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Fechas */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Fechas</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creado:</span>
                    <span>{formatDate(item.created_at, { includeTime: true })}</span>
                  </div>
                  {item.processed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Procesado:</span>
                      <span>{formatDate(item.processed_at, { includeTime: true })}</span>
                    </div>
                  )}
                  {item.reconciled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conciliado:</span>
                      <span>{formatDate(item.reconciled_at, { includeTime: true })}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Discrepancia */}
              {item.discrepancy && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-red-600">Discrepancia</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{DISCREPANCY_CONFIG[item.discrepancy.type].label}</span>
                    </div>
                    <div className="text-red-600">
                      {item.discrepancy.description}
                    </div>
                    {item.discrepancy.difference && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diferencia:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(item.discrepancy.difference, { currency: item.currency })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Notas de auditoría */}
            {item.audit?.notes && (
              <div className="pt-2 border-t">
                <h4 className="font-medium text-sm mb-2">Notas</h4>
                <p className="text-xs text-muted-foreground">{item.audit.notes}</p>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }, [showSelection])

  if (isLoading) {
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('space-y-6', className)}>
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Conciliados</p>
              <p className="text-lg font-semibold text-green-600">{stats.matched}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">No Conciliados</p>
              <p className="text-lg font-semibold text-red-600">{stats.unmatched}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-semibold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-muted-foreground">Disputados</p>
              <p className="text-lg font-semibold text-orange-600">{stats.disputed}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Con Discrepancias</p>
              <p className="text-lg font-semibold text-red-600">{stats.withDiscrepancies}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transacciones de Reconciliación</CardTitle>
              <CardDescription>
                {totalCount} transacciones encontradas
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Filtro rápido */}
              {showFilters && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar transacciones..."
                    value={quickFilter}
                    onChange={(e) => setQuickFilter(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              )}
              
              {/* Acciones en lote */}
              {bulkActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Acciones ({selectedItems.length})
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {bulkActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <DropdownMenuItem
                          key={action.action}
                          onClick={() => onBulkAction?.(action.action, selectedItems)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showSelection && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  
                  {enableDrillDown && <TableHead className="w-12"></TableHead>}
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('transaction_id')}
                      className="h-auto p-0 font-semibold"
                    >
                      ID Transacción
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  
                  <TableHead>Tipo</TableHead>
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="h-auto p-0 font-semibold"
                    >
                      Estado
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('amount')}
                      className="h-auto p-0 font-semibold"
                    >
                      Monto
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  
                  <TableHead>Conector</TableHead>
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('created_at')}
                      className="h-auto p-0 font-semibold"
                    >
                      Fecha
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  
                  {showActions && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <TableRow className={cn(
                      'hover:bg-muted/50',
                      selectedItems.includes(item.id) && 'bg-muted/30'
                    )}>
                      {showSelection && (
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                          />
                        </TableCell>
                      )}
                      
                      {enableDrillDown && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleRowExpansion(item.id)}
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{item.transaction_id}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => copyToClipboard(item.transaction_id, 'ID de transacción')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {item.merchant_reference && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {item.merchant_reference}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>{renderTypeCell(item)}</TableCell>
                      <TableCell>{renderStatusCell(item)}</TableCell>
                      
                      <TableCell className="text-right">
                        <span className="font-semibold">
                          {formatCurrency(item.amount, { currency: item.currency })}
                        </span>
                        {item.discrepancy?.difference && (
                          <div className="text-xs text-red-600">
                            Diff: {formatCurrency(item.discrepancy.difference, { currency: item.currency })}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{item.connector}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(item.created_at)}
                        </div>
                        {item.reconciled_at && (
                          <div className="text-xs text-muted-foreground">
                            Conciliado: {formatDate(item.reconciled_at, { relative: true })}
                          </div>
                        )}
                      </TableCell>
                      
                      {showActions && (
                        <TableCell>
                          <QuickActionsMenu
                            onView={() => onViewDetails?.(item)}
                            onEdit={item.status !== 'matched' ? () => onEditItem?.(item) : undefined}
                            viewLabel="Ver Detalles"
                            editLabel="Editar"
                          >
                            {item.discrepancy && onResolveDiscrepancy && (
                              <DropdownMenuItem onClick={() => onResolveDiscrepancy(item)}>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Resolver Discrepancia
                              </DropdownMenuItem>
                            )}
                            
                            {item.status !== 'matched' && onMarkAsMatched && (
                              <DropdownMenuItem onClick={() => onMarkAsMatched(item)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Conciliado
                              </DropdownMenuItem>
                            )}
                            
                            {onAddNote && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onAddNote(item)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Agregar Nota
                                </DropdownMenuItem>
                              </>
                            )}
                          </QuickActionsMenu>
                        </TableCell>
                      )}
                    </TableRow>
                    
                    {/* Fila expandida */}
                    {expandedRows.has(item.id) && renderExpandedRow(item)}
                  </React.Fragment>
                ))}
                
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={showSelection && showActions ? 8 : showSelection || showActions ? 7 : 6}
                      className="text-center py-8"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No hay transacciones</h3>
                        <p className="text-muted-foreground">
                          {quickFilter ? 'No se encontraron transacciones que coincidan con el filtro.' : 'No hay transacciones para mostrar.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      <CompletePagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / pageSize)}
        onPageChange={onPageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageSizeChange={onPageSizeChange}
        showFirstLast
        showPageSize
        showInfo
        size={compactMode ? 'sm' : 'default'}
      />
    </div>
  )
})

ReconciliationList.displayName = 'ReconciliationList'

export default ReconciliationList
export type { ReconciliationItem, ReconciliationListProps }