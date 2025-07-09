'use client'

import { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  X,
  Plus,
  Download,
  Eye,
  Calendar,
  Shield,
  MessageSquare,
  Paperclip,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Label } from '@/presentation/components/ui/Label'
import { Textarea } from '@/presentation/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import { Badge } from '@/presentation/components/ui/Badge'
import { Progress } from '@/presentation/components/ui/Progress'
import { Separator } from '@/presentation/components/ui/Separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/presentation/components/ui/AlertDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/ui/Dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { formatCurrency } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

// Evidence submission schema
const evidenceSubmissionSchema = z.object({
  access_activity_log: z.string().optional(),
  billing_address: z.string().optional(),
  cancellation_policy: z.string().optional(),
  cancellation_policy_disclosure: z.string().optional(),
  cancellation_rebuttal: z.string().optional(),
  customer_communication: z.string().optional(),
  customer_email_address: z.string().email().optional(),
  customer_name: z.string().optional(),
  customer_purchase_ip: z.string().optional(),
  customer_signature: z.string().optional(),
  duplicate_charge_documentation: z.string().optional(),
  duplicate_charge_explanation: z.string().optional(),
  duplicate_charge_id: z.string().optional(),
  product_description: z.string().optional(),
  receipt: z.string().optional(),
  refund_policy: z.string().optional(),
  refund_policy_disclosure: z.string().optional(),
  refund_refusal_explanation: z.string().optional(),
  service_date: z.string().optional(),
  service_documentation: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_carrier: z.string().optional(),
  shipping_date: z.string().optional(),
  shipping_documentation: z.string().optional(),
  shipping_tracking_number: z.string().optional(),
  uncategorized_file: z.string().optional(),
  uncategorized_text: z.string().optional(),
  notes: z.string().optional(),
})

type EvidenceSubmissionData = z.infer<typeof evidenceSubmissionSchema>

// Dispute interface
interface DisputeResponse {
  dispute_id: string
  payment_id: string
  amount: number
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'
  reason_code?: string
  reason_message?: string
  evidence_due_by?: string
  created: string
  updated: string
  evidence?: Partial<EvidenceSubmissionData>
  network_reason_code?: string
  network_reason_description?: string
}

// Evidence field configurations
const EVIDENCE_FIELDS = [
  {
    key: 'customer_communication',
    label: 'Comunicación con el cliente',
    description: 'Emails, chats o llamadas con el cliente',
    category: 'customer',
    required: true,
    type: 'textarea',
    placeholder: 'Describe la comunicación mantenida con el cliente...',
  },
  {
    key: 'receipt',
    label: 'Recibo de la transacción',
    description: 'Comprobante de la transacción procesada',
    category: 'transaction',
    required: true,
    type: 'file',
  },
  {
    key: 'product_description',
    label: 'Descripción del producto/servicio',
    description: 'Detalle de lo que se vendió',
    category: 'product',
    required: false,
    type: 'textarea',
    placeholder: 'Describe el producto o servicio vendido...',
  },
  {
    key: 'shipping_documentation',
    label: 'Documentación de envío',
    description: 'Comprobante de envío del producto',
    category: 'shipping',
    required: false,
    type: 'file',
  },
  {
    key: 'shipping_tracking_number',
    label: 'Número de seguimiento',
    description: 'Código de rastreo del envío',
    category: 'shipping',
    required: false,
    type: 'text',
    placeholder: 'Ej: 1Z123456789',
  },
  {
    key: 'shipping_address',
    label: 'Dirección de envío',
    description: 'Dirección donde se envió el producto',
    category: 'shipping',
    required: false,
    type: 'textarea',
    placeholder: 'Dirección completa de envío...',
  },
  {
    key: 'shipping_carrier',
    label: 'Empresa de transporte',
    description: 'Compañía que realizó el envío',
    category: 'shipping',
    required: false,
    type: 'text',
    placeholder: 'Ej: FedEx, UPS, DHL',
  },
  {
    key: 'shipping_date',
    label: 'Fecha de envío',
    description: 'Cuándo se envió el producto',
    category: 'shipping',
    required: false,
    type: 'date',
  },
  {
    key: 'customer_signature',
    label: 'Firma del cliente',
    description: 'Comprobante de recepción firmado',
    category: 'delivery',
    required: false,
    type: 'file',
  },
  {
    key: 'refund_policy',
    label: 'Política de reembolsos',
    description: 'Términos y condiciones de reembolso',
    category: 'policy',
    required: false,
    type: 'textarea',
    placeholder: 'Política de reembolsos de la empresa...',
  },
  {
    key: 'cancellation_policy',
    label: 'Política de cancelación',
    description: 'Términos de cancelación mostrados al cliente',
    category: 'policy',
    required: false,
    type: 'textarea',
    placeholder: 'Política de cancelación...',
  },
  {
    key: 'uncategorized_text',
    label: 'Información adicional',
    description: 'Cualquier otra información relevante',
    category: 'other',
    required: false,
    type: 'textarea',
    placeholder: 'Información adicional que pueda ayudar con la disputa...',
  },
] as const

interface DisputeActionsProps {
  dispute: DisputeResponse
  onSubmitEvidence?: (evidence: EvidenceSubmissionData) => Promise<void>
  onAcceptDispute?: () => Promise<void>
  onRefreshStatus?: () => Promise<void>
  className?: string
}

export default function DisputeActions({
  dispute,
  onSubmitEvidence,
  onAcceptDispute,
  onRefreshStatus,
  className = '',
}: DisputeActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<EvidenceSubmissionData>({
    resolver: zodResolver(evidenceSubmissionSchema),
    defaultValues: dispute.evidence || {},
  })

  const watchedValues = watch()

  // Calculate evidence completion percentage
  const evidenceCompletion = EVIDENCE_FIELDS.reduce((acc, field) => {
    const value = watchedValues[field.key as keyof EvidenceSubmissionData]
    const hasValue = value && value.toString().trim().length > 0
    const weight = field.required ? 2 : 1
    
    acc.total += weight
    if (hasValue) acc.completed += weight
    
    return acc
  }, { completed: 0, total: 0 })

  const completionPercentage = evidenceCompletion.total > 0 
    ? Math.round((evidenceCompletion.completed / evidenceCompletion.total) * 100) 
    : 0

  // Get days until deadline
  const getDaysUntilDeadline = () => {
    if (!dispute.evidence_due_by) return null
    const deadline = new Date(dispute.evidence_due_by)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDeadline = getDaysUntilDeadline()
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 3

  const handleFileUpload = useCallback((fieldKey: string, file: File) => {
    setUploadedFiles(prev => ({ ...prev, [fieldKey]: file }))
    
    // Simulate file upload and set the URL
    const mockUrl = `https://evidence.multipaga.com/${file.name}`
    setValue(fieldKey as keyof EvidenceSubmissionData, mockUrl)
    
    toast.success(`Archivo ${file.name} subido exitosamente`)
  }, [setValue])

  const handleSubmitEvidence = async (data: EvidenceSubmissionData) => {
    if (!onSubmitEvidence) return

    setIsSubmitting(true)
    try {
      await onSubmitEvidence(data)
      toast.success('Evidencia enviada exitosamente')
      setShowEvidenceDialog(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar evidencia')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptDispute = async () => {
    if (!onAcceptDispute) return

    setIsSubmitting(true)
    try {
      await onAcceptDispute()
      toast.success('Disputa aceptada')
    } catch (error: any) {
      toast.error(error.message || 'Error al aceptar disputa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderEvidenceField = (field: typeof EVIDENCE_FIELDS[0]) => {
    const value = watchedValues[field.key as keyof EvidenceSubmissionData] || ''
    const hasValue = value && value.toString().trim().length > 0

    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {hasValue && <CheckCircle className="w-4 h-4 text-green-600" />}
        </div>
        
        <p className="text-xs text-muted-foreground">{field.description}</p>

        <Controller
          name={field.key as keyof EvidenceSubmissionData}
          control={control}
          render={({ field: formField }) => {
            switch (field.type) {
              case 'textarea':
                return (
                  <Textarea
                    {...formField}
                    placeholder={field.placeholder}
                    rows={3}
                    className="min-h-[80px]"
                  />
                )
              
              case 'file':
                return (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(field.key, file)
                          }
                        }}
                        className="hidden"
                        id={`file-${field.key}`}
                      />
                      
                      <Label
                        htmlFor={`file-${field.key}`}
                        className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Subir archivo</span>
                      </Label>
                      
                      {hasValue && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Paperclip className="w-3 h-3" />
                          <span>Archivo subido</span>
                        </div>
                      )}
                    </div>
                    
                    {uploadedFiles[field.key] && (
                      <p className="text-xs text-muted-foreground">
                        {uploadedFiles[field.key].name} ({Math.round(uploadedFiles[field.key].size / 1024)} KB)
                      </p>
                    )}
                  </div>
                )
              
              case 'date':
                return (
                  <Input
                    {...formField}
                    type="date"
                  />
                )
              
              default:
                return (
                  <Input
                    {...formField}
                    placeholder={field.placeholder}
                  />
                )
            }
          }}
        />
      </div>
    )
  }

  const canSubmitEvidence = dispute.dispute_status === 'dispute_opened' && daysUntilDeadline && daysUntilDeadline > 0
  const canAcceptDispute = dispute.dispute_status === 'dispute_opened'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Estado de la disputa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monto disputado</p>
              <p className="text-2xl font-bold">
                {formatCurrency(dispute.amount, dispute.currency)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={dispute.dispute_status === 'dispute_opened' ? 'destructive' : 'secondary'}>
                {dispute.dispute_status === 'dispute_opened' ? 'Abierta' : 'Cerrada'}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Etapa</p>
              <p className="text-lg font-semibold capitalize">
                {dispute.dispute_stage.replace('_', ' ')}
              </p>
            </div>
          </div>

          {dispute.evidence_due_by && (
            <div className={cn(
              'p-3 rounded-lg border',
              isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn(
                    'font-medium',
                    isUrgent ? 'text-red-800' : 'text-yellow-800'
                  )}>
                    Fecha límite para evidencia
                  </p>
                  <p className={cn(
                    'text-sm',
                    isUrgent ? 'text-red-700' : 'text-yellow-700'
                  )}>
                    {new Date(dispute.evidence_due_by).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={cn(
                    'text-2xl font-bold',
                    isUrgent ? 'text-red-800' : 'text-yellow-800'
                  )}>
                    {daysUntilDeadline}
                  </p>
                  <p className={cn(
                    'text-sm',
                    isUrgent ? 'text-red-700' : 'text-yellow-700'
                  )}>
                    días restantes
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence Progress */}
      {canSubmitEvidence && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Progreso de evidencia
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {completionPercentage}% completado
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completionPercentage} className="h-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {evidenceCompletion.completed} de {evidenceCompletion.total} campos completados
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>
                  {EVIDENCE_FIELDS.filter(f => f.required).length} campos requeridos
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Submit Evidence */}
            {canSubmitEvidence && (
              <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
                <DialogTrigger asChild>
                  <Button className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6" />
                    <div className="text-center">
                      <div className="font-medium">Enviar evidencia</div>
                      <div className="text-xs opacity-80">
                        Contestar la disputa con documentos
                      </div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Enviar evidencia para disputa</DialogTitle>
                    <DialogDescription>
                      Proporciona la documentación necesaria para defender tu posición en esta disputa.
                      Los campos marcados con * son requeridos.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit(handleSubmitEvidence)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                          Progreso de evidencia: {completionPercentage}%
                        </span>
                        <Progress value={completionPercentage} className="w-32 h-2" />
                      </div>
                    </div>

                    <Tabs defaultValue="required" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="required">Requeridos</TabsTrigger>
                        <TabsTrigger value="shipping">Envío</TabsTrigger>
                        <TabsTrigger value="policy">Políticas</TabsTrigger>
                        <TabsTrigger value="other">Otros</TabsTrigger>
                      </TabsList>

                      <TabsContent value="required" className="space-y-4">
                        <h3 className="font-medium text-red-600">Campos requeridos</h3>
                        {EVIDENCE_FIELDS.filter(f => f.required).map(renderEvidenceField)}
                      </TabsContent>

                      <TabsContent value="shipping" className="space-y-4">
                        <h3 className="font-medium">Información de envío</h3>
                        {EVIDENCE_FIELDS.filter(f => f.category === 'shipping').map(renderEvidenceField)}
                      </TabsContent>

                      <TabsContent value="policy" className="space-y-4">
                        <h3 className="font-medium">Políticas y términos</h3>
                        {EVIDENCE_FIELDS.filter(f => f.category === 'policy').map(renderEvidenceField)}
                      </TabsContent>

                      <TabsContent value="other" className="space-y-4">
                        <h3 className="font-medium">Información adicional</h3>
                        {EVIDENCE_FIELDS.filter(f => f.category === 'other').map(renderEvidenceField)}
                      </TabsContent>
                    </Tabs>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEvidenceDialog(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar evidencia
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Accept Dispute */}
            {canAcceptDispute && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <XCircle className="w-6 h-6" />
                    <div className="text-center">
                      <div className="font-medium">Aceptar disputa</div>
                      <div className="text-xs opacity-80">
                        No contestar y aceptar el cargo
                      </div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Aceptar disputa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Al aceptar esta disputa, reconoces que el cargo es válido y no proporcionarás 
                      evidencia para contestarla. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleAcceptDispute}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, aceptar disputa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Refresh Status */}
            {onRefreshStatus && (
              <Button
                variant="outline"
                onClick={onRefreshStatus}
                disabled={isSubmitting}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <RefreshCw className={cn('w-6 h-6', isSubmitting && 'animate-spin')} />
                <div className="text-center">
                  <div className="font-medium">Actualizar estado</div>
                  <div className="text-xs opacity-80">
                    Verificar cambios en la disputa
                  </div>
                </div>
              </Button>
            )}

            {/* View Original Payment */}
            <Button
              variant="outline"
              asChild
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <a href={`/dashboard/payments/${dispute.payment_id}`}>
                <Eye className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium">Ver pago original</div>
                  <div className="text-xs opacity-80">
                    Revisar detalles del pago
                  </div>
                </div>
              </a>
            </Button>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Consejos para contestar disputas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Proporciona toda la documentación disponible</li>
                  <li>Incluye comunicación clara con el cliente</li>
                  <li>Adjunta comprobantes de entrega si aplica</li>
                  <li>Responde antes de la fecha límite</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}