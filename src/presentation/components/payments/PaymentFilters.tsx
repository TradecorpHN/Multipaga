'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Filter,
  X,
  Calendar,
  DollarSign,
  CreditCard,
  Users,
  Zap,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Label } from '@/presentation/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { Badge } from '@/presentation/components/ui/Badge'
import { Separator } from '@/presentation/components/ui/Separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/presentation/components/ui/Collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/Popover'
import { cn } from '@/presentation/lib/utils'
import { formatCurrency } from '@/presentation/lib/formatters'

// Filter schema
const paymentFiltersSchema = z.object({
  // Status filters
  status: z.array(z.string()).optional(),
  
  // Amount filters
  amount_min: z.number().min(0).optional(),
  amount_max: z.number().min(0).optional(),
  
  // Currency filters
  currency: z.array(z.string()).optional(),
  
  // Date filters
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  
  // Payment method filters
  payment_methods: z.array(z.string()).optional(),
  
  // Customer filters
  customer_id: z.string().optional(),
  customer_email: z.string().optional(),
  
  // Connector filters
  connectors: z.array(z.string()).optional(),
  
  // Search
  search: z.string().optional(),
  
  // Advanced filters
  has_refunds: z.boolean().optional(),
  has_disputes: z.boolean().optional(),
  capture_method: z.array(z.string()).optional(),
})

type PaymentFiltersData = z.infer<typeof paymentFiltersSchema>

// Filter options
const PAYMENT_STATUSES = [
  { value: 'succeeded', label: 'Exitoso', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Fallido', color: 'bg-red-100 text-red-800' },
  { value: 'processing', label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  { value: 'requires_confirmation', label: 'Requiere confirmación', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'requires_action', label: 'Requiere acción', color: 'bg-orange-100 text-orange-800' },
  { value: 'requires_capture', label: 'Requiere captura', color: 'bg-purple-100 text-purple-800' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
  { value: 'requires_payment_method', label: 'Requiere método de pago', color: 'bg-yellow-100 text-yellow-800' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Libra esterlina' },
  { value: 'JPY', label: 'JPY - Yen japonés' },
  { value: 'CAD', label: 'CAD - Dólar canadiense' },
  { value: 'HNL', label: 'HNL - Lempira hondureña' },
]

const PAYMENT_METHODS = [
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'wallet', label: 'Billetera digital', icon: CreditCard },
  { value: 'bank_transfer', label: 'Transferencia bancaria', icon: CreditCard },
  { value: 'klarna', label: 'Klarna', icon: CreditCard },
  { value: 'affirm', label: 'Affirm', icon: CreditCard },
]

const CONNECTORS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'adyen', label: 'Adyen' },
  { value: 'checkout', label: 'Checkout.com' },
  { value: 'braintree', label: 'Braintree' },
  { value: 'square', label: 'Square' },
]

const CAPTURE_METHODS = [
  { value: 'automatic', label: 'Automático' },
  { value: 'manual', label: 'Manual' },
]

interface PaymentFiltersProps {
  initialFilters?: Partial<PaymentFiltersData>
  onFiltersChange: (filters: PaymentFiltersData) => void
  onReset?: () => void
  className?: string
  variant?: 'default' | 'compact' | 'sidebar'
}

export default function PaymentFilters({
  initialFilters = {},
  onFiltersChange,
  onReset,
  className = '',
  variant = 'default',
}: PaymentFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  const {
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty },
  } = useForm<PaymentFiltersData>({
    resolver: zodResolver(paymentFiltersSchema),
    defaultValues: {
      status: [],
      currency: [],
      payment_methods: [],
      connectors: [],
      capture_method: [],
      ...initialFilters,
    },
  })

  const watchedValues = watch()

  // Count active filters
  useEffect(() => {
    const count = Object.entries(watchedValues).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') return acc
      if (Array.isArray(value) && value.length === 0) return acc
      return acc + 1
    }, 0)
    setActiveFiltersCount(count)
  }, [watchedValues])

  // Apply filters when values change
  useEffect(() => {
    if (isDirty) {
      onFiltersChange(watchedValues)
    }
  }, [watchedValues, isDirty, onFiltersChange])

  const handleReset = useCallback(() => {
    reset()
    setShowAdvanced(false)
    onReset?.()
  }, [reset, onReset])

  const removeFilter = useCallback((filterKey: keyof PaymentFiltersData, value?: string) => {
    const currentValue = watchedValues[filterKey]
    
    if (Array.isArray(currentValue) && value) {
      setValue(filterKey, currentValue.filter(v => v !== value) as any)
    } else {
      setValue(filterKey, undefined as any)
    }
  }, [watchedValues, setValue])

  const renderStatusFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Estado del pago</Label>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_STATUSES.map(status => (
          <Controller
            key={status.value}
            name="status"
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={field.value?.includes(status.value) || false}
                  onCheckedChange={(checked) => {
                    const currentValues = field.value || []
                    if (checked) {
                      field.onChange([...currentValues, status.value])
                    } else {
                      field.onChange(currentValues.filter(v => v !== status.value))
                    }
                  }}
                />
                <Label
                  htmlFor={`status-${status.value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  <span className={cn('px-2 py-1 rounded-full text-xs', status.color)}>
                    {status.label}
                  </span>
                </Label>
              </div>
            )}
          />
        ))}
      </div>
    </div>
  )

  const renderAmountFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Rango de monto</Label>
      <div className="grid grid-cols-2 gap-2">
        <Controller
          name="amount_min"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label htmlFor="amount-min" className="text-xs text-muted-foreground">
                Mínimo
              </Label>
              <Input
                id="amount-min"
                type="number"
                placeholder="0.00"
                leftIcon={<DollarSign className="w-3 h-3" />}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          )}
        />
        
        <Controller
          name="amount_max"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label htmlFor="amount-max" className="text-xs text-muted-foreground">
                Máximo
              </Label>
              <Input
                id="amount-max"
                type="number"
                placeholder="1000.00"
                leftIcon={<DollarSign className="w-3 h-3" />}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          )}
        />
      </div>
    </div>
  )

  const renderDateFilter = () => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Rango de fecha</Label>
      <div className="grid grid-cols-2 gap-2">
        <Controller
          name="created_from"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input
                id="date-from"
                type="date"
                value={field.value || ''}
                onChange={field.onChange}
              />
            </div>
          )}
        />
        
        <Controller
          name="created_to"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="date-to"
                type="date"
                value={field.value || ''}
                onChange={field.onChange}
              />
            </div>
          )}
        />
      </div>
    </div>
  )

  const renderActiveFilters = () => {
    if (activeFiltersCount === 0) return null

    const filters = []

    // Status filters
    if (watchedValues.status?.length) {
      watchedValues.status.forEach(status => {
        const statusConfig = PAYMENT_STATUSES.find(s => s.value === status)
        if (statusConfig) {
          filters.push({
            key: 'status',
            value: status,
            label: `Estado: ${statusConfig.label}`,
          })
        }
      })
    }

    // Amount filters
    if (watchedValues.amount_min || watchedValues.amount_max) {
      const min = watchedValues.amount_min || 0
      const max = watchedValues.amount_max || '∞'
      filters.push({
        key: 'amount',
        label: `Monto: $${min} - $${max}`,
      })
    }

    // Currency filters
    if (watchedValues.currency?.length) {
      watchedValues.currency.forEach(currency => {
        filters.push({
          key: 'currency',
          value: currency,
          label: `Moneda: ${currency}`,
        })
      })
    }

    // Other filters...
    
    return (
      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">Filtros activos:</span>
        {filters.map((filter, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => removeFilter(filter.key as keyof PaymentFiltersData, filter.value)}
          >
            {filter.label}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-6 px-2 text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Limpiar todo
        </Button>
      </div>
    )
  }

  // Compact variant for smaller spaces
  if (variant === 'compact') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={className}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtrar pagos</h4>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {renderActiveFilters()}
            {renderStatusFilter()}
            {renderAmountFilter()}
            {renderDateFilter()}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </div>

        {renderActiveFilters()}
        
        <div className="space-y-6">
          {renderStatusFilter()}
          <Separator />
          {renderAmountFilter()}
          <Separator />
          {renderDateFilter()}
        </div>

        {activeFiltersCount > 0 && (
          <Button variant="outline" onClick={handleReset} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    )
  }

  // Default variant - full filters panel
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtrar pagos
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Ocultar avanzados
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Mostrar avanzados
                </>
              )}
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderActiveFilters()}

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>{renderStatusFilter()}</div>
          <div>{renderAmountFilter()}</div>
          <div>{renderDateFilter()}</div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="space-y-6">
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Currency Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Moneda</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {CURRENCIES.map(currency => (
                        <div key={currency.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`currency-${currency.value}`}
                            checked={field.value?.includes(currency.value) || false}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || []
                              if (checked) {
                                field.onChange([...currentValues, currency.value])
                              } else {
                                field.onChange(currentValues.filter(v => v !== currency.value))
                              }
                            }}
                          />
                          <Label
                            htmlFor={`currency-${currency.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {currency.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Métodos de pago</Label>
                <Controller
                  name="payment_methods"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map(method => {
                        const Icon = method.icon
                        return (
                          <div key={method.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`method-${method.value}`}
                              checked={field.value?.includes(method.value) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || []
                                if (checked) {
                                  field.onChange([...currentValues, method.value])
                                } else {
                                  field.onChange(currentValues.filter(v => v !== method.value))
                                }
                              }}
                            />
                            <Label
                              htmlFor={`method-${method.value}`}
                              className="text-sm cursor-pointer flex items-center space-x-2"
                            >
                              <Icon className="w-3 h-3" />
                              <span>{method.label}</span>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                />
              </div>

              {/* Connectors */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Conectores</Label>
                <Controller
                  name="connectors"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {CONNECTORS.map(connector => (
                        <div key={connector.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`connector-${connector.value}`}
                            checked={field.value?.includes(connector.value) || false}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || []
                              if (checked) {
                                field.onChange([...currentValues, connector.value])
                              } else {
                                field.onChange(currentValues.filter(v => v !== connector.value))
                              }
                            }}
                          />
                          <Label
                            htmlFor={`connector-${connector.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {connector.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Customer Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="customer-id" className="text-sm font-medium">
                      ID del cliente
                    </Label>
                    <Input
                      id="customer-id"
                      placeholder="cust_xxxxxxxxxx"
                      leftIcon={<Users className="w-4 h-4" />}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </div>
                )}
              />

              <Controller
                name="customer_email"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="customer-email" className="text-sm font-medium">
                      Email del cliente
                    </Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="cliente@ejemplo.com"
                      leftIcon={<Users className="w-4 h-4" />}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </div>
                )}
              />
            </div>

            {/* Boolean Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Controller
                name="has_refunds"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-refunds"
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="has-refunds" className="text-sm cursor-pointer">
                      Tiene reembolsos
                    </Label>
                  </div>
                )}
              />

              <Controller
                name="has_disputes"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-disputes"
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="has-disputes" className="text-sm cursor-pointer">
                      Tiene disputas
                    </Label>
                  </div>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}