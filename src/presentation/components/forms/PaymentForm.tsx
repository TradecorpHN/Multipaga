'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CreditCard,
  DollarSign,
  User,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Info,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/presentation/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Input } from '@/presentation/components/ui/Input'
import { Label } from '@/presentation/components/ui/Label'
import { Textarea } from '@/presentation/components/ui/Textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/presentation/components/ui/Select'
import { Switch } from '@/presentation/components/ui/Switch'
import { Badge } from '@/presentation/components/ui/Badge'
import { Separator } from '@/presentation/components/ui/Separator'
import { Alert, AlertDescription } from '@/presentation/components/ui/Alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { formatCurrency } from '@/presentation/lib/formatters'

// Validation schema
const paymentFormSchema = z.object({
  // Basic payment info
  amount: z.number()
    .min(1, 'El monto debe ser mayor a 0')
    .max(999999999, 'El monto es demasiado alto'),
  currency: z.string().min(3, 'Selecciona una moneda'),
  description: z.string().optional(),
  
  // Customer info (optional)
  customer: z.object({
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    name: z.string().min(2, 'Nombre muy corto').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    phone_country_code: z.string().optional().or(z.literal('')),
  }).optional(),
  
  // Payment method preferences
  payment_method_types: z.array(z.string()).min(1, 'Selecciona al menos un método de pago'),
  
  // Business logic
  capture_method: z.enum(['automatic', 'manual']),
  setup_future_usage: z.enum(['none', 'on_session', 'off_session']).optional(),
  
  // URLs
  return_url: z.string().url('URL inválida').optional().or(z.literal('')),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
  
  // Advanced options
  statement_descriptor: z.string().max(22, 'Máximo 22 caracteres').optional().or(z.literal('')),
  billing_email_verification: z.boolean().optional(),
  
  // Shipping (if needed)
  collect_shipping_address: z.boolean().optional(),
})

type PaymentFormData = z.infer<typeof paymentFormSchema>

// Supported currencies
const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$' },
  { code: 'HNL', name: 'Lempira hondureña', symbol: 'L' },
] as const

// Payment method types
const PAYMENT_METHOD_TYPES = [
  { id: 'card', name: 'Tarjeta de crédito/débito', icon: CreditCard },
  { id: 'wallet', name: 'Billeteras digitales', icon: Phone },
  { id: 'bank_transfer', name: 'Transferencia bancaria', icon: Globe },
  { id: 'klarna', name: 'Klarna', icon: CreditCard },
  { id: 'affirm', name: 'Affirm', icon: CreditCard },
] as const

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>
  isLoading?: boolean
  initialData?: Partial<PaymentFormData>
  className?: string
}

export default function PaymentForm({
  onSubmit,
  isLoading = false,
  initialData,
  className = '',
}: PaymentFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([])
  const [amountPreview, setAmountPreview] = useState<string>('')

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      currency: 'USD',
      capture_method: 'automatic',
      payment_method_types: ['card'],
      billing_email_verification: false,
      collect_shipping_address: false,
      ...initialData,
    },
  })

  const watchedAmount = watch('amount')
  const watchedCurrency = watch('currency')

  // Update amount preview
  useEffect(() => {
    if (watchedAmount && watchedCurrency) {
      const currency = CURRENCIES.find(c => c.code === watchedCurrency)
      setAmountPreview(formatCurrency(watchedAmount, watchedCurrency))
    }
  }, [watchedAmount, watchedCurrency])

  // Handle metadata changes
  const addMetadataField = () => {
    setMetadataFields([...metadataFields, { key: '', value: '' }])
  }

  const removeMetadataField = (index: number) => {
    const newFields = metadataFields.filter((_, i) => i !== index)
    setMetadataFields(newFields)
    updateMetadata(newFields)
  }

  const updateMetadataField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = metadataFields.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    setMetadataFields(newFields)
    updateMetadata(newFields)
  }

  const updateMetadata = (fields: Array<{ key: string; value: string }>) => {
    const metadata = fields.reduce((acc, { key, value }) => {
      if (key.trim() && value.trim()) {
        acc[key.trim()] = value.trim()
      }
      return acc
    }, {} as Record<string, string>)
    
    setValue('metadata', Object.keys(metadata).length > 0 ? metadata : undefined)
  }

  const handleFormSubmit = async (data: PaymentFormData) => {
    try {
      await onSubmit(data)
      toast.success('Pago creado exitosamente')
      reset()
      setMetadataFields([])
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el pago')
    }
  }

  const getEstimatedFees = () => {
    // Simple fee estimation (this would come from your backend)
    const amount = watchedAmount || 0
    const baseRate = 0.029 // 2.9%
    const fixedFee = 0.30
    return amount * baseRate + fixedFee
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Información del pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
                error={!!errors.amount}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda *</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{currency.code}</span>
                            <span>{currency.symbol}</span>
                            <span className="text-muted-foreground">{currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Amount Preview */}
          {amountPreview && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vista previa:</span>
                <span className="text-lg font-semibold">{amountPreview}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Comisión estimada:</span>
                <span>{formatCurrency(getEstimatedFees(), watchedCurrency)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción del pago (opcional)"
              rows={2}
              {...register('description')}
            />
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <Label>Métodos de pago aceptados *</Label>
            <Controller
              name="payment_method_types"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHOD_TYPES.map(method => {
                    const Icon = method.icon
                    const isSelected = field.value.includes(method.id)
                    
                    return (
                      <div
                        key={method.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          const newValue = isSelected
                            ? field.value.filter(v => v !== method.id)
                            : [...field.value, method.id]
                          field.onChange(newValue)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{method.name}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            />
            {errors.payment_method_types && (
              <p className="text-sm text-destructive">{errors.payment_method_types.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del cliente (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer.email">Email</Label>
              <Input
                id="customer.email"
                type="email"
                placeholder="cliente@ejemplo.com"
                leftIcon={<Mail className="w-4 h-4" />}
                {...register('customer.email')}
                error={!!errors.customer?.email}
              />
              {errors.customer?.email && (
                <p className="text-sm text-destructive">{errors.customer.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer.name">Nombre completo</Label>
              <Input
                id="customer.name"
                placeholder="Juan Pérez"
                leftIcon={<User className="w-4 h-4" />}
                {...register('customer.name')}
                error={!!errors.customer?.name}
              />
              {errors.customer?.name && (
                <p className="text-sm text-destructive">{errors.customer.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer.phone_country_code">Código país</Label>
              <Input
                id="customer.phone_country_code"
                placeholder="+504"
                {...register('customer.phone_country_code')}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="customer.phone">Teléfono</Label>
              <Input
                id="customer.phone"
                placeholder="9999-9999"
                leftIcon={<Phone className="w-4 h-4" />}
                {...register('customer.phone')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opciones avanzadas</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        
        {showAdvanced && (
          <CardContent className="space-y-4">
            {/* Capture Method */}
            <div className="space-y-2">
              <Label>Método de captura</Label>
              <Controller
                name="capture_method"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">
                        <div>
                          <div className="font-medium">Automático</div>
                          <div className="text-sm text-muted-foreground">
                            Capturar inmediatamente al autorizar
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div>
                          <div className="font-medium">Manual</div>
                          <div className="text-sm text-muted-foreground">
                            Autorizar ahora, capturar después
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Return URL */}
            <div className="space-y-2">
              <Label htmlFor="return_url">URL de retorno</Label>
              <Input
                id="return_url"
                type="url"
                placeholder="https://mi-sitio.com/pago-completado"
                leftIcon={<Globe className="w-4 h-4" />}
                {...register('return_url')}
                error={!!errors.return_url}
              />
              {errors.return_url && (
                <p className="text-sm text-destructive">{errors.return_url.message}</p>
              )}
            </div>

            {/* Statement Descriptor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="statement_descriptor">Descriptor del estado de cuenta</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Texto que aparecerá en el estado de cuenta del cliente</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="statement_descriptor"
                placeholder="MI NEGOCIO"
                maxLength={22}
                {...register('statement_descriptor')}
                error={!!errors.statement_descriptor}
              />
              {errors.statement_descriptor && (
                <p className="text-sm text-destructive">{errors.statement_descriptor.message}</p>
              )}
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="billing_email_verification">Verificar email de facturación</Label>
                  <p className="text-sm text-muted-foreground">
                    Requerir verificación del email antes del pago
                  </p>
                </div>
                <Controller
                  name="billing_email_verification"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="collect_shipping_address">Recopilar dirección de envío</Label>
                  <p className="text-sm text-muted-foreground">
                    Solicitar dirección de envío durante el checkout
                  </p>
                </div>
                <Controller
                  name="collect_shipping_address"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Metadatos personalizados</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMetadataField}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {metadataFields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Clave"
                    value={field.key}
                    onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Valor"
                    value={field.value}
                    onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMetadataField(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {metadataFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Los metadatos te permiten almacenar información adicional del pago
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={!isValid || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4 mr-2" />
          )}
          Crear pago
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            reset()
            setMetadataFields([])
          }}
          disabled={isLoading}
        >
          Limpiar
        </Button>
      </div>

      {/* Form Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Por favor revisa los campos marcados en rojo y corrige los errores.
          </AlertDescription>
        </Alert>
      )}
    </form>
  )
}