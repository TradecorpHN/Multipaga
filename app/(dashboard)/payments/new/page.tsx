// app/(dashboard)/payments/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CreditCard, 
  DollarSign, 
  User, 
  Mail, 
  Phone, 
  Building, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Importar componentes UI del proyecto
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { Textarea } from '@/presentation/components/ui/Textarea'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { RadioGroup, RadioGroupItem } from '@/presentation/components/ui/RadioGroup'
import { Label } from '@/presentation/components/ui/Label'
import { Separator } from '@/presentation/components/ui/Separator'

// Hooks del proyecto
import { useAuth } from '@/presentation/contexts/AuthContext'
import { useConnectors } from '@/presentation/hooks/useConnectors'
import { usePayments } from '@/presentation/hooks/usePayments'
import { formatCurrency } from '@/presentation/lib/utils/formatters'

// Interfaces corregidas según el proyecto
interface PaymentFormData {
  amount: number
  currency: string
  capture_method: 'automatic' | 'manual'
  confirm: boolean
  payment_method_type: string
  customer?: {
    email?: string
    name?: string
    phone?: string
    phone_country_code?: string
  }
  description?: string
  return_url?: string
  webhook_url?: string
  metadata?: Record<string, any>
  setup_future_usage?: 'off_session' | 'on_session'
}

// Tipos de métodos de pago disponibles
const PAYMENT_METHODS = [
  { value: 'card', label: 'Tarjeta de Crédito/Débito', icon: CreditCard, description: 'Visa, Mastercard, AMEX' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria', icon: Building, description: 'ACH, Wire Transfer' },
  { value: 'wallet', label: 'Billeteras Digitales', icon: Phone, description: 'PayPal, Google Pay, Apple Pay' },
]

// Monedas soportadas
const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar Estadounidense', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'HNL', label: 'HNL - Lempira Hondureña', symbol: 'L' },
  { value: 'GTQ', label: 'GTQ - Quetzal Guatemalteco', symbol: 'Q' },
]

export default function CreatePaymentPage() {
  const router = useRouter()
  const { authState } = useAuth()
  const { connectors, isLoading: connectorsLoading } = useConnectors()
  const { createPayment } = usePayments()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Estados del formulario con tipos corregidos
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 0,
    currency: 'USD',
    capture_method: 'automatic',
    confirm: true,
    payment_method_type: 'card',
    customer: {},
    metadata: {}
  })

  // Estados para metadata dinámica
  const [metadataEntries, setMetadataEntries] = useState<Array<{key: string, value: string}>>([
    { key: '', value: '' }
  ])

  useEffect(() => {
    // Verificar si hay conectores disponibles
    if (!connectorsLoading && (!connectors || connectors.length === 0)) {
      toast.error('No hay conectores configurados. Configure al menos uno para continuar.')
    }
  }, [connectors, connectorsLoading])

  // Manejar cambios en campos del formulario
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        return {
          ...prev,
          [parent]: {
            ...prev[parent as keyof PaymentFormData] as any,
            [child]: value
          }
        }
      }
      return { ...prev, [field]: value }
    })
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Manejar metadata dinámica
  const handleMetadataChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEntries = [...metadataEntries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setMetadataEntries(newEntries)
    
    // Actualizar formData.metadata
    const metadata: Record<string, any> = {}
    newEntries.forEach(entry => {
      if (entry.key && entry.value) {
        metadata[entry.key] = entry.value
      }
    })
    setFormData(prev => ({ ...prev, metadata }))
  }

  const addMetadataEntry = () => {
    setMetadataEntries([...metadataEntries, { key: '', value: '' }])
  }

  const removeMetadataEntry = (index: number) => {
    if (metadataEntries.length > 1) {
      const newEntries = metadataEntries.filter((_, i) => i !== index)
      setMetadataEntries(newEntries)
    }
  }

  // Validación del formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0'
    }

    if (!formData.currency) {
      newErrors.currency = 'Selecciona una moneda'
    }

    if (!formData.payment_method_type) {
      newErrors.payment_method_type = 'Selecciona un método de pago'
    }

    if (formData.customer?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer.email)) {
      newErrors['customer.email'] = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Preparar datos según la interface CreatePaymentParams
      const paymentData = {
        amount: Math.round(formData.amount * 100), // Convertir a centavos
        currency: formData.currency,
        capture_method: formData.capture_method,
        confirm: formData.confirm,
        description: formData.description,
        metadata: formData.metadata,
        return_url: formData.return_url,
        setup_future_usage: formData.setup_future_usage,
        customer_id: formData.customer?.email, // Usar email como customer_id
        profile_id: authState?.profileId,
      }
      
      const payment = await createPayment(paymentData)
      
      toast.success('Pago creado exitosamente')
      router.push(`/dashboard/payments/${payment.payment_id}`)
      
    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error('Error inesperado al crear el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener símbolo de moneda
  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find(c => c.value === currency)?.symbol || '$'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 text-white p-3 md:p-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-lg">
              <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            Crear Nuevo Pago
          </h1>
          <p className="text-cyan-200/80 text-sm md:text-base">Configure los detalles del pago que desea procesar</p>
        </motion.div>
      </div>

      {/* Verificación de conectores */}
      {!connectorsLoading && (!connectors || connectors.length === 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className="bg-yellow-500/20 border-yellow-500/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-8 h-8 md:w-12 md:h-12 text-yellow-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-yellow-400 mb-2">Conectores requeridos</h3>
                  <p className="text-yellow-300/80 mb-4 text-sm md:text-base">
                    Necesitas configurar al menos un conector de pago antes de crear pagos.
                  </p>
                  <Link href="/dashboard/connectors">
                    <Button 
                      variant="default"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Configurar Conector
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Formulario */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Información básica del pago */}
          <Card className="bg-white/10 backdrop-blur-xl border border-cyan-400/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Información del Pago
              </CardTitle>
              <CardDescription className="text-cyan-200/80">
                Configure el monto y los detalles básicos del pago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white font-medium">
                    Monto *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 font-bold">
                      {getCurrencySymbol(formData.currency)}
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount || ''}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                      className="pl-8 bg-white/10 border-cyan-400/30 text-white"
                      placeholder="100.00"
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-red-400 text-sm">{errors.amount}</p>
                  )}
                </div>

                {/* Moneda */}
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-white font-medium">
                    Moneda *
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currency && (
                    <p className="text-red-400 text-sm">{errors.currency}</p>
                  )}
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-3">
                <Label className="text-white font-medium">Método de Pago *</Label>
                <RadioGroup
                  value={formData.payment_method_type}
                  onValueChange={(value) => handleInputChange('payment_method_type', value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <div key={method.value} className="relative">
                      <div className="flex items-center space-x-2 p-4 bg-white/5 border border-cyan-400/30 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                        <RadioGroupItem value={method.value} id={method.value} />
                        <div className="flex-1">
                          <Label
                            htmlFor={method.value}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <method.icon className="w-5 h-5 text-cyan-400" />
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">{method.label}</div>
                              <div className="text-cyan-200/60 text-xs md:text-sm">{method.description}</div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                {errors.payment_method_type && (
                  <p className="text-red-400 text-sm">{errors.payment_method_type}</p>
                )}
              </div>

              {/* Configuración de captura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white font-medium">Método de Captura</Label>
                  <Select
                    value={formData.capture_method}
                    onValueChange={(value: 'automatic' | 'manual') => handleInputChange('capture_method', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automático</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium">Confirmar automáticamente</Label>
                  <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg border border-cyan-400/30">
                    <Checkbox
                      id="confirm"
                      checked={formData.confirm}
                      onCheckedChange={(checked) => handleInputChange('confirm', checked)}
                    />
                    <Label htmlFor="confirm" className="text-white text-sm">
                      Confirmar pago automáticamente
                    </Label>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white font-medium">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-white/10 border-cyan-400/30 text-white"
                  placeholder="Describe el propósito de este pago..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card className="bg-white/10 backdrop-blur-xl border border-cyan-400/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <User className="w-5 h-5 text-cyan-400" />
                Información del Cliente
              </CardTitle>
              <CardDescription className="text-cyan-200/80">
                Datos opcionales del cliente para este pago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="customer.name" className="text-white font-medium">
                    Nombre Completo
                  </Label>
                  <Input
                    id="customer.name"
                    value={formData.customer?.name || ''}
                    onChange={(e) => handleInputChange('customer.name', e.target.value)}
                    className="bg-white/10 border-cyan-400/30 text-white"
                    placeholder="Juan Pérez"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="customer.email" className="text-white font-medium">
                    Email
                  </Label>
                  <Input
                    id="customer.email"
                    type="email"
                    value={formData.customer?.email || ''}
                    onChange={(e) => handleInputChange('customer.email', e.target.value)}
                    className="bg-white/10 border-cyan-400/30 text-white"
                    placeholder="cliente@ejemplo.com"
                  />
                  {errors['customer.email'] && (
                    <p className="text-red-400 text-sm">{errors['customer.email']}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="customer.phone" className="text-white font-medium">
                    Teléfono
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.customer?.phone_country_code || '+504'}
                      onValueChange={(value) => handleInputChange('customer.phone_country_code', value)}
                    >
                      <SelectTrigger className="w-20 bg-white/10 border-cyan-400/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+504">+504</SelectItem>
                        <SelectItem value="+502">+502</SelectItem>
                        <SelectItem value="+1">+1</SelectItem>
                        <SelectItem value="+34">+34</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="customer.phone"
                      value={formData.customer?.phone || ''}
                      onChange={(e) => handleInputChange('customer.phone', e.target.value)}
                      className="flex-1 bg-white/10 border-cyan-400/30 text-white"
                      placeholder="99887766"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración avanzada */}
          <Card className="bg-white/10 backdrop-blur-xl border border-cyan-400/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-white">Configuración Avanzada</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-cyan-400 hover:text-white"
                >
                  {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAdvanced ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
            </CardHeader>
            
            {showAdvanced && (
              <CardContent className="space-y-4">
                {/* URLs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="return_url" className="text-white font-medium">
                      URL de Retorno
                    </Label>
                    <Input
                      id="return_url"
                      type="url"
                      value={formData.return_url || ''}
                      onChange={(e) => handleInputChange('return_url', e.target.value)}
                      className="bg-white/10 border-cyan-400/30 text-white"
                      placeholder="https://ejemplo.com/success"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook_url" className="text-white font-medium">
                      URL de Webhook
                    </Label>
                    <Input
                      id="webhook_url"
                      type="url"
                      value={formData.webhook_url || ''}
                      onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                      className="bg-white/10 border-cyan-400/30 text-white"
                      placeholder="https://ejemplo.com/webhook"
                    />
                  </div>
                </div>

                {/* Uso futuro */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Uso futuro</Label>
                  <Select
                    value={formData.setup_future_usage || 'none'}
                    onValueChange={(value) => handleInputChange('setup_future_usage', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No guardar</SelectItem>
                      <SelectItem value="on_session">En sesión</SelectItem>
                      <SelectItem value="off_session">Fuera de sesión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-white font-medium">Metadata Personalizada</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addMetadataEntry}
                      className="text-cyan-400 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {metadataEntries.map((entry, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={entry.key}
                          onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                          className="flex-1 bg-white/10 border-cyan-400/30 text-white"
                          placeholder="Clave"
                        />
                        <Input
                          value={entry.value}
                          onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                          className="flex-1 bg-white/10 border-cyan-400/30 text-white"
                          placeholder="Valor"
                        />
                        {metadataEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMetadataEntry(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Resumen y botones */}
          <Card className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-center lg:text-left">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    Resumen del Pago
                  </h3>
                  <div className="text-cyan-200/80 space-y-1">
                    <p>Monto: <span className="font-bold text-white">{formatCurrency(formData.amount, formData.currency)}</span></p>
                    <p>Método: <span className="font-bold text-white">{PAYMENT_METHODS.find(m => m.value === formData.payment_method_type)?.label}</span></p>
                    <p>Captura: <span className="font-bold text-white">{formData.capture_method === 'automatic' ? 'Automática' : 'Manual'}</span></p>
                    {formData.customer?.email && (
                      <p>Cliente: <span className="font-bold text-white">{formData.customer.email}</span></p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isSubmitting || (!connectors || connectors.length === 0)}
                    className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Crear Pago
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  )
}