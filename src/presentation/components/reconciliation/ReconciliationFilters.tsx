// /home/kali/multipaga/src/presentation/components/reconciliation/ReconciliationFilters.tsx
// ──────────────────────────────────────────────────────────────────────────────
// ReconciliationFilters - Componente de filtros para reconciliación
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { 
  Filter,
  Search,
  Calendar,
  X,
  RotateCcw,
  Download,
  Upload,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Building,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Badge } from '@/presentation/components/ui/Badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/presentation/components/ui/Select'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { Label } from '@/presentation/components/ui/Label'
import { Separator } from '@/presentation/components/ui/Separator'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/presentation/components/ui/Popover'
import { Calendar as CalendarComponent } from '@/presentation/components/ui/Calendar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/presentation/components/ui/DropdownMenu'
import { cn } from '@/presentation/lib/utils'

// Interfaces
interface ReconciliationFilters {
  // Fechas
  dateRange?: {
    from: Date
    to: Date
  }
  
  // Estados de reconciliación
  reconciliationStatus?: ('matched' | 'unmatched' | 'pending' | 'disputed')[]
  
  // Tipos de transacción
  transactionTypes?: ('payment' | 'refund' | 'payout' | 'fee')[]
  
  // Conectores
  connectors?: string[]
  
  // Montos
  amountRange?: {
    min?: number
    max?: number
    currency?: string
  }
  
  // Métodos de pago
  paymentMethods?: string[]
  
  // Búsqueda de texto
  search?: string
  
  // Monedas
  currencies?: string[]
  
  // Países
  countries?: string[]
  
  // Discrepancias
  hasDiscrepancies?: boolean
  discrepancyTypes?: ('amount' | 'status' | 'date' | 'missing')[]
  
  // Archivos de reconciliación
  reconciliationFiles?: string[]
  
  // Fechas de procesamiento
  processedDateRange?: {
    from: Date
    to: Date
  }
}

interface ReconciliationFiltersProps {
  filters: ReconciliationFilters
  onFiltersChange: (filters: ReconciliationFilters) => void
  onReset: () => void
  onExport?: () => void
  onImport?: () => void
  onSavePreset?: (name: string, filters: ReconciliationFilters) => void
  presets?: Array<{
    id: string
    name: string
    filters: ReconciliationFilters
  }>
  onLoadPreset?: (preset: ReconciliationFilters) => void
  
  // Opciones disponibles
  availableConnectors?: Array<{ value: string; label: string }>
  availableCurrencies?: Array<{ value: string; label: string }>
  availableCountries?: Array<{ value: string; label: string }>
  availablePaymentMethods?: Array<{ value: string; label: string }>
  availableReconciliationFiles?: Array<{ value: string; label: string; date: string }>
  
  // Estado
  isLoading?: boolean
  disabled?: boolean
  className?: string
  
  // Configuración
  showAdvanced?: boolean
  collapsible?: boolean
  initialCollapsed?: boolean
}

// Configuración de estados
const RECONCILIATION_STATUS_CONFIG = {
  matched: {
    label: 'Conciliado',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  unmatched: {
    label: 'No Conciliado',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
  },
  disputed: {
    label: 'Disputado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle,
  },
} as const

const TRANSACTION_TYPES_CONFIG = {
  payment: {
    label: 'Pagos',
    icon: CreditCard,
    color: 'text-blue-600',
  },
  refund: {
    label: 'Reembolsos',
    icon: RotateCcw,
    color: 'text-purple-600',
  },
  payout: {
    label: 'Pagos Salientes',
    icon: Upload,
    color: 'text-green-600',
  },
  fee: {
    label: 'Comisiones',
    icon: DollarSign,
    color: 'text-orange-600',
  },
} as const

const DISCREPANCY_TYPES_CONFIG = {
  amount: 'Diferencia de Monto',
  status: 'Estado Diferente',
  date: 'Fecha Diferente',
  missing: 'Transacción Faltante',
} as const

// Rangos de fecha predefinidos
const DATE_RANGES = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: 'Últimos 7 días', value: 'last7days' },
  { label: 'Últimos 30 días', value: 'last30days' },
  { label: 'Este mes', value: 'thisMonth' },
  { label: 'Mes anterior', value: 'lastMonth' },
  { label: 'Personalizado', value: 'custom' },
]

// Componente helper para Select múltiple simple
interface MultiSelectProps {
  label: string
  placeholder: string
  options: Array<{ value: string; label: string }>
  values: string[]
  onValuesChange: (values: string[]) => void
  disabled?: boolean
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder,
  options,
  values,
  onValuesChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleValue = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter(v => v !== value)
      : [...values, value]
    onValuesChange(newValues)
  }

  const selectedLabels = values
    .map(val => options.find(opt => opt.value === val)?.label)
    .filter(Boolean)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {values.length === 0 
                ? placeholder 
                : values.length === 1 
                ? selectedLabels[0]
                : `${values.length} seleccionados`
              }
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                onClick={() => toggleValue(option.value)}
              >
<Checkbox
  checked={values.includes(option.value)}
  onCheckedChange={() => {}} // No-op since click is handled by parent div
/>
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Componente principal
const ReconciliationFilters = React.forwardRef<HTMLDivElement, ReconciliationFiltersProps>(({
  filters,
  onFiltersChange,
  onReset,
  onExport,
  onImport,
  onSavePreset,
  presets = [],
  onLoadPreset,
  availableConnectors = [],
  availableCurrencies = [],
  availableCountries = [],
  availablePaymentMethods = [],
  availableReconciliationFiles = [],
  isLoading = false,
  disabled = false,
  className,
  showAdvanced = true,
  collapsible = true,
  initialCollapsed = false,
}, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showProcessedDatePicker, setShowProcessedDatePicker] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  // Contar filtros activos
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    
    if (filters.search) count++
    if (filters.dateRange) count++
    if (filters.reconciliationStatus?.length) count++
    if (filters.transactionTypes?.length) count++
    if (filters.connectors?.length) count++
    if (filters.amountRange?.min || filters.amountRange?.max) count++
    if (filters.paymentMethods?.length) count++
    if (filters.currencies?.length) count++
    if (filters.countries?.length) count++
    if (filters.hasDiscrepancies !== undefined) count++
    if (filters.discrepancyTypes?.length) count++
    if (filters.reconciliationFiles?.length) count++
    if (filters.processedDateRange) count++
    
    return count
  }, [filters])

  // Handlers para actualizar filtros
  const updateFilters = useCallback((updates: Partial<ReconciliationFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }, [filters, onFiltersChange])

  const updateSearch = useCallback((search: string) => {
    updateFilters({ search: search || undefined })
  }, [updateFilters])

  const updateDateRange = useCallback((range: { from: Date; to: Date } | undefined) => {
    updateFilters({ dateRange: range })
  }, [updateFilters])

  const updateProcessedDateRange = useCallback((range: { from: Date; to: Date } | undefined) => {
    updateFilters({ processedDateRange: range })
  }, [updateFilters])

  const toggleReconciliationStatus = useCallback((status: string) => {
    const current = filters.reconciliationStatus || []
    const updated = current.includes(status as any)
      ? current.filter(s => s !== status)
      : [...current, status as any]
    updateFilters({ reconciliationStatus: updated.length ? updated : undefined })
  }, [filters.reconciliationStatus, updateFilters])

  const toggleTransactionType = useCallback((type: string) => {
    const current = filters.transactionTypes || []
    const updated = current.includes(type as any)
      ? current.filter(t => t !== type)
      : [...current, type as any]
    updateFilters({ transactionTypes: updated.length ? updated : undefined })
  }, [filters.transactionTypes, updateFilters])

  const toggleConnector = useCallback((connector: string) => {
    const current = filters.connectors || []
    const updated = current.includes(connector)
      ? current.filter(c => c !== connector)
      : [...current, connector]
    updateFilters({ connectors: updated.length ? updated : undefined })
  }, [filters.connectors, updateFilters])

  const updateAmountRange = useCallback((field: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined
    updateFilters({
      amountRange: {
        ...filters.amountRange,
        [field]: numValue,
      }
    })
  }, [filters.amountRange, updateFilters])

  // Aplicar rango de fecha predefinido
  const applyDateRange = useCallback((rangeType: string) => {
    const now = new Date()
    let from: Date, to: Date

    switch (rangeType) {
      case 'today':
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case 'yesterday':
        from = startOfDay(subDays(now, 1))
        to = endOfDay(subDays(now, 1))
        break
      case 'last7days':
        from = startOfDay(subDays(now, 7))
        to = endOfDay(now)
        break
      case 'last30days':
        from = startOfDay(subDays(now, 30))
        to = endOfDay(now)
        break
      case 'thisMonth':
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
        to = endOfDay(now)
        break
      case 'lastMonth':
        from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
        break
      default:
        return
    }

    updateDateRange({ from, to })
  }, [updateDateRange])

  // Guardar preset
  const handleSavePreset = useCallback(() => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filters)
      setPresetName('')
      setShowSavePreset(false)
    }
  }, [presetName, filters, onSavePreset])

  if (collapsible && isCollapsed) {
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
            
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('space-y-4', className)}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Reconciliación
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">
                  {activeFiltersCount}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
              
              {/* Presets */}
              {presets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Presets
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {presets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.id}
                        onClick={() => onLoadPreset?.(preset.filters)}
                      >
                        {preset.name}
                      </DropdownMenuItem>
                    ))}
                    {onSavePreset && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowSavePreset(true)}>
                          Guardar Preset
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Acciones */}
              <div className="flex items-center gap-1">
                {onImport && (
                  <Button variant="outline" size="sm" onClick={onImport}>
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
                {onExport && (
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, monto, descripción..."
                  value={filters.search || ''}
                  onChange={(e) => updateSearch(e.target.value)}
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
            </div>
            
            {/* Rango de fechas */}
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={applyDateRange}
                  disabled={disabled}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar rango" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={disabled}>
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          updateDateRange(range as { from: Date; to: Date })
                          setShowDatePicker(false)
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {filters.dateRange && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {format(filters.dateRange.from, 'dd/MM/yyyy', { locale: es })} -
                    {format(filters.dateRange.to, 'dd/MM/yyyy', { locale: es })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => updateDateRange(undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Estados de reconciliación */}
          <div className="space-y-3">
            <Label>Estado de Reconciliación</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(RECONCILIATION_STATUS_CONFIG).map(([status, config]) => {
                const Icon = config.icon
                const isSelected = filters.reconciliationStatus?.includes(status as any)
                
                return (
                  <div
                    key={status}
                    onClick={() => toggleReconciliationStatus(status)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected 
                        ? `${config.bgColor} border-current ${config.color}` 
                        : 'border-input hover:bg-accent'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected ? config.color : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', isSelected ? config.color : 'text-foreground')}>
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tipos de transacción */}
          <div className="space-y-3">
            <Label>Tipos de Transacción</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(TRANSACTION_TYPES_CONFIG).map(([type, config]) => {
                const Icon = config.icon
                const isSelected = filters.transactionTypes?.includes(type as any)
                
                return (
                  <div
                    key={type}
                    onClick={() => toggleTransactionType(type)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected 
                        ? `bg-primary/10 border-primary text-primary` 
                        : 'border-input hover:bg-accent'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {showAdvanced && (
            <>
              <Separator />
              
              {/* Filtros avanzados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Conectores */}
                {availableConnectors.length > 0 && (
                  <MultiSelect
                    label="Conectores"
                    placeholder="Seleccionar conectores"
                    options={availableConnectors}
                    values={filters.connectors || []}
                    onValuesChange={(values) => updateFilters({ connectors: values.length ? values : undefined })}
                    disabled={disabled}
                  />
                )}
                
                {/* Monedas */}
                {availableCurrencies.length > 0 && (
                  <MultiSelect
                    label="Monedas"
                    placeholder="Seleccionar monedas"
                    options={availableCurrencies}
                    values={filters.currencies || []}
                    onValuesChange={(values) => updateFilters({ currencies: values.length ? values : undefined })}
                    disabled={disabled}
                  />
                )}
                
                {/* Métodos de pago */}
                {availablePaymentMethods.length > 0 && (
                  <MultiSelect
                    label="Métodos de Pago"
                    placeholder="Seleccionar métodos"
                    options={availablePaymentMethods}
                    values={filters.paymentMethods || []}
                    onValuesChange={(values) => updateFilters({ paymentMethods: values.length ? values : undefined })}
                    disabled={disabled}
                  />
                )}
              </div>
              
              {/* Rango de montos */}
              <div className="space-y-3">
                <Label>Rango de Montos</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    placeholder="Monto mínimo"
                    value={filters.amountRange?.min || ''}
                    onChange={(e) => updateAmountRange('min', e.target.value)}
                    disabled={disabled}
                  />
                  <Input
                    type="number"
                    placeholder="Monto máximo"
                    value={filters.amountRange?.max || ''}
                    onChange={(e) => updateAmountRange('max', e.target.value)}
                    disabled={disabled}
                  />
                  <Select
                    value={filters.amountRange?.currency || ''}
                    onValueChange={(currency: string) => updateFilters({
                      amountRange: { ...filters.amountRange, currency }
                    })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((currency: { value: string; label: string }) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Discrepancias */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="hasDiscrepancies"
                    checked={filters.hasDiscrepancies || false}
                    onCheckedChange={(checked) => updateFilters({ 
                      hasDiscrepancies: checked ? true : undefined 
                    })}
                    disabled={disabled}
                  />
                  <Label htmlFor="hasDiscrepancies">Solo transacciones con discrepancias</Label>
                </div>
                
                {filters.hasDiscrepancies && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">Tipos de Discrepancia</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(DISCREPANCY_TYPES_CONFIG).map(([type, label]) => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            id={`discrepancy-${type}`}
                            checked={filters.discrepancyTypes?.includes(type as any) || false}
                            onCheckedChange={(checked) => {
                              const current = filters.discrepancyTypes || []
                              const updated = checked
                                ? [...current, type as any]
                                : current.filter(t => t !== type)
                              updateFilters({ 
                                discrepancyTypes: updated.length ? updated : undefined 
                              })
                            }}
                            disabled={disabled}
                          />
                          <Label htmlFor={`discrepancy-${type}`} className="text-sm">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para guardar preset */}
      {showSavePreset && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Guardar Preset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nombre del preset"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSavePreset(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
})

ReconciliationFilters.displayName = 'ReconciliationFilters'

export default ReconciliationFilters
export type { ReconciliationFilters, ReconciliationFiltersProps }