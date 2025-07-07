'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft, 
  Shield, 
  Upload, 
  FileText, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Trash2,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Schema de validación para el formulario de disputa
const challengeSchema = z.object({
  evidence_type: z.enum(['transaction_receipt', 'customer_communication', 'shipping_documentation', 'cancellation_policy', 'refund_policy', 'other']),
  evidence_description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  shipping_tracking_number: z.string().optional(),
  refund_amount: z.number().min(0).optional(),
  additional_notes: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
})

type ChallengeFormData = z.infer<typeof challengeSchema>

// Interfaces según Hyperswitch API
interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: string
  connector: string
  connector_dispute_id: string
  challenge_required_by?: string
  created_at: string
}

interface EvidenceFile {
  id: string
  name: string
  size: number
  type: string
  uploaded_at: string
  url?: string
}

// Tipos de evidencia disponibles
const evidenceTypes = {
  transaction_receipt: {
    label: 'Recibo de Transacción',
    description: 'Comprobante de que la transacción fue autorizada por el cliente'
  },
  customer_communication: {
    label: 'Comunicación con Cliente',
    description: 'Emails, chats o llamadas que demuestren la autorización'
  },
  shipping_documentation: {
    label: 'Documentación de Envío',
    description: 'Comprobantes de entrega o tracking de productos físicos'
  },
  cancellation_policy: {
    label: 'Política de Cancelación',
    description: 'Términos y condiciones de cancelación mostrados al cliente'
  },
  refund_policy: {
    label: 'Política de Reembolso',
    description: 'Términos de reembolso aceptados por el cliente'
  },
  other: {
    label: 'Otra Evidencia',
    description: 'Cualquier otra documentación relevante para el caso'
  }
}

export default function DisputeChallengePage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string

  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Configurar formulario
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      evidence_type: 'transaction_receipt',
      evidence_description: '',
      additional_notes: ''
    }
  })

  const selectedEvidenceType = watch('evidence_type')

  // Fetcher para SWR
  const fetcher = async (url: string) => {
    const response = await fetch(url, {
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Error al cargar datos')
    }

    return response.json()
  }

  // Obtener información de la disputa
  const { 
    data: dispute, 
    error,
    isLoading 
  } = useSWR<DisputeResponse>(
    disputeId ? `/api/disputes/${disputeId}` : null,
    fetcher
  )

  // Verificar si la disputa puede ser disputada
  const canChallenge = dispute && 
    dispute.dispute_status === 'dispute_opened' && 
    dispute.challenge_required_by && 
    new Date(dispute.challenge_required_by) > new Date()

  // Manejar subida de archivos
  const handleFileUpload = async (files: FileList) => {
    const maxFiles = 10
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain']

    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast.error(`${file.name} es muy grande. Máximo 10MB por archivo.`)
        continue
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} no es un tipo de archivo permitido.`)
        continue
      }

      // Simular subida - en producción iría a un endpoint real
      const newFile: EvidenceFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString(),
      }

      setUploadedFiles(prev => [...prev, newFile])
      toast.success(`${file.name} subido exitosamente`)
    }
  }

  // Manejar drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  // Eliminar archivo
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('Archivo eliminado')
  }

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Enviar disputa
  const onSubmit = async (data: ChallengeFormData) => {
    if (uploadedFiles.length === 0) {
      toast.error('Debe subir al menos un archivo de evidencia')
      return
    }

    setIsSubmitting(true)

    try {
      const challengeData = {
        ...data,
        dispute_id: disputeId,
        evidence_files: uploadedFiles.map(f => f.id),
        submitted_at: new Date().toISOString()
      }

      const response = await fetch(`/api/disputes/${disputeId}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(challengeData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar la disputa')
      }

      const result = await response.json()
      
      toast.success('Disputa enviada exitosamente')
      
      // Redirigir de vuelta a la página de la disputa
      setTimeout(() => {
        router.push(`/disputes/${disputeId}`)
      }, 1500)

    } catch (error) {
      console.error('Error enviando disputa:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar la disputa')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="space-y-4">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !dispute) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Error al cargar la disputa
              </h3>
              <p className="text-red-600 mt-1">
                {error?.message || 'No se pudo cargar la información de la disputa'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!canChallenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                No se puede disputar este cargo
              </h3>
              <p className="text-yellow-700 mt-1">
                Esta disputa no está en un estado que permita ser disputada o el tiempo límite ha expirado.
              </p>
              <div className="mt-4">
                <Link
                  href={`/disputes/${disputeId}`}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a la disputa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const timeLeft = dispute.challenge_required_by ? 
    Math.max(0, Math.floor((new Date(dispute.challenge_required_by).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-4">
          <Link
            href={`/disputes/${disputeId}`}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Disputar Cargo
            </h1>
            <p className="text-slate-600 mt-1">
              Disputa {dispute.dispute_id}
            </p>
          </div>
        </div>

        {/* Contador de tiempo */}
        {timeLeft > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center text-red-700">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {timeLeft} día{timeLeft !== 1 ? 's' : ''} restante{timeLeft !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Información de la disputa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Información de la Disputa
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Payment ID:</span>
              <p className="font-mono">{dispute.payment_id}</p>
            </div>
            <div>
              <span className="text-slate-500">Monto:</span>
              <p className="font-semibold">
                {(parseFloat(dispute.amount) / 100).toLocaleString('es-HN', {
                  style: 'currency',
                  currency: dispute.currency || 'HNL'
                })}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Límite:</span>
              <p className="text-red-600">
                {dispute.challenge_required_by ? 
                  format(new Date(dispute.challenge_required_by), 'PPp', { locale: es }) : 
                  'N/A'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tipo de evidencia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Tipo de Evidencia
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(evidenceTypes).map(([key, type]) => (
              <label
                key={key}
                className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedEvidenceType === key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  value={key}
                  {...register('evidence_type')}
                  className="sr-only"
                />
                <div className="flex items-start">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 mr-3 ${
                    selectedEvidenceType === key 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-slate-300'
                  }`}>
                    {selectedEvidenceType === key && (
                      <div className="w-2 h-2 bg-white rounded-full mt-0.5 ml-0.5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{type.label}</h3>
                    <p className="text-sm text-slate-600 mt-1">{type.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Descripción de la evidencia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Descripción de la Evidencia
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción detallada *
              </label>
              <textarea
                {...register('evidence_description')}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explique detalladamente por qué esta disputa no es válida..."
              />
              {errors.evidence_description && (
                <p className="text-red-600 text-sm mt-1">{errors.evidence_description.message}</p>
              )}
            </div>

            {/* Campos adicionales según el tipo de evidencia */}
            {selectedEvidenceType === 'customer_communication' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email del cliente
                </label>
                <input
                  type="email"
                  {...register('customer_email')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="cliente@example.com"
                />
              </div>
            )}

            {selectedEvidenceType === 'shipping_documentation' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Número de tracking
                </label>
                <input
                  type="text"
                  {...register('shipping_tracking_number')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 1Z999AA1234567890"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notas adicionales
              </label>
              <textarea
                {...register('additional_notes')}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Cualquier información adicional relevante..."
              />
              {errors.additional_notes && (
                <p className="text-red-600 text-sm mt-1">{errors.additional_notes.message}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Subida de archivos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Archivos de Evidencia
          </h2>

          {/* Zona de drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Soportamos JPG, PNG, PDF y TXT hasta 10MB cada uno
            </p>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.txt"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar Archivos
            </label>
          </div>

          {/* Lista de archivos subidos */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-slate-900 mb-3">
                Archivos subidos ({uploadedFiles.length})
              </h3>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">
                          {formatFileSize(file.size)} • {format(new Date(file.uploaded_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Botones de acción */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between pt-6"
        >
          <Link
            href={`/disputes/${disputeId}`}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || uploadedFiles.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                <span>Enviar Disputa</span>
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  )
}