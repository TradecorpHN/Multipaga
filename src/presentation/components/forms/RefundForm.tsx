'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Info,
  RefreshCw,
  CreditCard,
  Mail,
  MessageSquare,
  Plus,
  X,
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
import PaymentCard from '../payments/PaymentCard'
import type { PaymentResponse } from '@/infrastructure/repositories/HttpPaymentRepository'

// Refund validation schema
const refundFormSchema = z.object({
  payment_id: z.string().min(1, 'ID de pago requerido'),
  amount: z.number()
    .positive('El monto debe ser mayor a cero')
    .optional(),
  reason: z.enum([
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'expired_uncaptured_charge',
    'other'
  ]).optional(),
  description: z.string().max(1000, 'Descripción demasiado larga').optional(),
  notify_customer: z.boolean().default(true),
  reverse_transfer: z.boolean().default(false),
  refund_application_fee: z.boolean().default(false),
  metadata: z.record(z.string()).optional(),
})

type RefundFormData = z.infer<typeof refundFormSchema>

// Refund reasons
const REFUND_REASONS = [
  {
    value: 'requested_by_customer',
    label: 'Solicitado por el cliente',
    description: 'El cliente solicitó el reembolso directamente',
    icon: MessageSquare,
  },
  {
    value: 'duplicate',
    label: 'Pago duplicado',
    description: 'Se realizó un pago duplicado por error',
    icon: RefreshCw,
  },
  {
    value: 'fraudulent',
    label: 'Transacción fraudulenta',
    description: 'El pago fue identificado como fraudulento',
    icon: AlertCircle,
  },
  {
    value: 'expired_uncaptured_charge',
    label: 'Cargo no capturado expirado',
    description: 'El cargo autorizado expiró sin ser capturado',
    icon: CreditCard,
  },
  {
    value: 'other',
    label: 'Otro motivo',
    description: 'Otro motivo no listado anteriormente',
    icon: Info,
  },
] as const

interface RefundFormProps {
  onSubmit: (data: RefundFormData) => Promise<void>
  initialPaymentId?: string
  isLoading?: boolean
  className?: string
}

export default function RefundForm({
  onSubmit,
  initialPaymentId = '',
  isLoading = false,
  className = '',
}: RefundFormProps) {
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [searchingPayment, setSearchingPayment] = useState(false)
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([])
  const [maxRefundAmount, setMaxRefundAmount] = useState<number>(0)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<RefundFormData>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      payment_id: initialPaymentId,
      notify_customer: true,
      reverse_transfer: false,
      refund_application_fee: false,
    },
  })

  const watchedPaymentId = watch('payment_id')
  const watchedAmount = watch('amount')
  const watchedReason = watch('reason')

  // Search for payment when payment ID changes
  useEffect(() => {
    if (watchedPaymentId && watchedPaymentId.length > 10) {
      searchPayment(watchedPaymentId)
    } else {
      setPayment(null)
      setMaxRefundAmount(0)
    }
  }, [watchedPaymentId])

  // Calculate max refund amount when payment is loaded
  useEffect(() => {
    if (payment) {
      const refundableAmount = calculateRefundableAmount(payment)
      setMaxRefundAmount(refundableAmount)
      
      // Set default amount to full refundable amount if not specified
      if (!watchedAmount) {
        setValue('amount', refundableAmount)
      }
    }
  }, [payment, setValue, watchedAmount])

  const searchPayment = async (paymentId: string) => {
    setSearchingPayment(true)
    try {
      // This would call your payment search API
      // const result = await hyperswitch.getPayment(paymentId)
      // setPayment(result)
      
      // Mock payment for demo
      const mockPayment: PaymentResponse = {
        payment_id: paymentId,
        merchant_id: 'merchant_123',
        status: 'succeeded',
        amount: 10000, // $100.00
        currency: 'USD',
        connector: 'stripe',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        attempt_count: 1,
        customer_id: 'customer_123',
        description: 'Pago de prueba',
        amount_received: 10000,
      }
      setPayment(mockPayment)
      toast.success('Pago encontrado')
    } catch (error: any) {
      toast.error(error.message || 'Pago no encontrado')
      setPayment(null)
    } finally {
      setSearchingPayment(false)
    }
  }

  const calculateRefundableAmount = (payment: PaymentResponse): number => {
    // Calculate refundable amount considering existing refunds
    const totalRefunded = payment.refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0
    const refundableAmount = (payment.amount_received || payment.amount) - totalRefunded
    return Math.max(0, refundableAmount)
  }

  const handleMetadataChange = (fields: Array<{ key: string; value: string }>) => {
    setMetadataFields(fields)
    const metadata = fields.reduce((acc, { key, value }) => {
      if (key.trim() && value.trim()) {
        acc[key.trim()] = value.trim()
      }
      return acc
    }, {} as Record<string, string>)
    
    setValue('metadata', Object.keys(metadata).length > 0 ? metadata : undefined)
  }

  const addMetadataField = () => {
    const newFields = [...metadataFields, { key: '', value: '' }]
    setMetadataFields(newFields)
  }

  const removeMetadataField = (index: number) => {
    const newFields = metadataFields.filter((_, i) => i !== index)
    setMetadataFields(newFields)
    handleMetadataChange(newFields)
  }

  const updateMetadataField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = metadataFields.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    setMetadataFields(newFields)
    handleMetadataChange(newFields)
  }

  const handleFormSubmit = async (data: RefundFormData) => {
    try {
      await onSubmit(data)
      toast.success('Reembolso creado exitosamente')
      reset()
      setPayment(null)
      setMetadataFields([])
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el reembolso')
    }
  }

  const getRefundPercentage = () => {
    if (!payment || !watchedAmount) return 0
    return Math.round((watchedAmount / payment.amount) * 100)
  }

  const selectedReason = REFUND_REASONS.find(r => r.value === watchedReason)

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={`space-y-6 ${className}`}>
      {/* Payment Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar pago a reembolsar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_id">ID del pago *</Label>
            <div className="relative">
              <Input
                id="payment_id"
                placeholder="pay_xxxxxxxxxxxxxxxx"
                {...register('payment_id')}
                error={!!errors.payment_id}
                leftIcon={<Search className="w-4 h-4" />}
                rightIcon={searchingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              />
            </div>
            {errors.payment_id && (
              <p className="text-sm text-destructive">{errors.payment_id.message}</p>
            )}
          </div>

          {/* Payment Information */}
          {payment && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Información del pago</h3>
                <PaymentCard 
                  payment={payment}
                  variant="compact"
                  showActions={false}
                />
              </div>

              {/* Refundable Amount Info */}
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Monto disponible para reembolso:</span>
                    <span className="font-semibold">
                      {formatCurrency(maxRefundAmount, payment.currency)}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Details */}
      {payment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-orange-600" />
              Detalles del reembolso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto a reembolsar</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={maxRefundAmount}
                  placeholder="0.00"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  {...register('amount', { 
                    valueAsNumber: true,
                    validate: (value) => {
                      if (!value) return true // Allow empty for full refund
                      if (value > maxRefundAmount) {
                        return `El monto excede el disponible para reembolso (${formatCurrency(maxRefundAmount, payment.currency)})`
                      }
                      return true
                    }
                  })}
                  error={!!errors.amount}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Vista previa</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">
                    {watchedAmount 
                      ? formatCurrency(watchedAmount, payment.currency)
                      : formatCurrency(maxRefundAmount, payment.currency)
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getRefundPercentage()}% del pago original
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del reembolso</Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_REASONS.map(reason => {
                        const Icon = reason.icon
                        return (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{reason.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {reason.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Selected reason info */}
            {selectedReason && (
              <Alert>
                <selectedReason.icon className="w-4 h-4" />
                <AlertDescription>
                  <strong>{selectedReason.label}:</strong> {selectedReason.description}
                </AlertDescription>
              </Alert>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción adicional</Label>
              <Textarea
                id="description"
                placeholder="Información adicional sobre el reembolso (opcional)"
                rows={3}
                {...register('description')}
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <Separator />
              <h3 className="text-sm font-medium">Opciones del reembolso</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_customer">Notificar al cliente</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar email de confirmación del reembolso
                    </p>
                  </div>
                  <Controller
                    name="notify_customer"
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
                  <div className="space-y-0.5">
                    <Label htmlFor="reverse_transfer">Revertir transferencia</Label>
                    <p className="text-sm text-muted-foreground">
                      Revertir transferencias a cuentas conectadas
                    </p>
                  </div>
                  <Controller
                    name="reverse_transfer"
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
                  <div className="space-y-0.5">
                    <Label htmlFor="refund_application_fee">Reembolsar comisión</Label>
                    <p className="text-sm text-muted-foreground">
                      Incluir la comisión de aplicación en el reembolso
                    </p>
                  </div>
                  <Controller
                    name="refund_application_fee"
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
                  Los metadatos te permiten almacenar información adicional del reembolso
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={!isValid || !payment || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ArrowLeft className="w-4 h-4 mr-2" />
          )}
          Procesar reembolso
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            reset()
            setPayment(null)
            setMetadataFields([])
          }}
          disabled={isLoading}
        >
          Limpiar
        </Button>
      </div>

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Por favor revisa los campos marcados en rojo y corrige los errores.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      {!payment && watchedPaymentId && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Ingresa un ID de pago válido para comenzar el proceso de reembolso.
          </AlertDescription>
        </Alert>
      )}
    </form>
  )
}