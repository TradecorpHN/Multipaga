'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { 
  ArrowLeft, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  DollarSign,
  FileText,
  ExternalLink,
  Shield,
  Building,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Interfaces según Hyperswitch API
interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'
  connector: string
  connector_status: string
  connector_dispute_id: string
  connector_reason?: string
  connector_reason_code?: string
  challenge_required_by?: string
  connector_created_at?: string
  connector_updated_at?: string
  created_at: string
  profile_id?: string
  merchant_connector_id?: string
}

// Mapeo de estados para UI
const statusConfig = {
  dispute_opened: {
    label: 'Disputa Abierta',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: AlertTriangle
  },
  dispute_expired: {
    label: 'Disputa Expirada',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: Clock
  },
  dispute_accepted: {
    label: 'Disputa Aceptada',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: CheckCircle
  },
  dispute_cancelled: {
    label: 'Disputa Cancelada',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: XCircle
  },
  dispute_challenged: {
    label: 'Disputa Disputada',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: Shield
  },
  dispute_won: {
    label: 'Disputa Ganada',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle
  },
  dispute_lost: {
    label: 'Disputa Perdida',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: XCircle
  }
}

const stageConfig = {
  pre_dispute: {
    label: 'Pre-Disputa',
    description: 'Notificación inicial antes de la disputa formal'
  },
  dispute: {
    label: 'Disputa',
    description: 'Disputa formal iniciada por el portador de la tarjeta'
  },
  pre_arbitration: {
    label: 'Pre-Arbitraje',
    description: 'Escalamiento antes del arbitraje final'
  }
}

export default function DisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string

  // Fetcher para SWR que incluye autenticación
  const fetcher = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Incluir cookies de sesión
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.error || 'Error al cargar la disputa')
      error.cause = { status: response.status, data: errorData }
      throw error
    }

    return response.json()
  }

  // SWR para obtener detalles de la disputa
  const { 
    data: dispute, 
    error, 
    isLoading,
    mutate 
  } = useSWR<DisputeResponse>(
    disputeId ? `/api/disputes/${disputeId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  )

  // Función para obtener configuración de estado
  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: AlertCircle
    }
  }

  // Función para obtener configuración de etapa
  const getStageConfig = (stage: string) => {
    return stageConfig[stage as keyof typeof stageConfig] || {
      label: stage,
      description: 'Etapa desconocida'
    }
  }

  // Función para formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'PPp', { locale: es })
    } catch {
      return dateString
    }
  }

  // Función para formatear monto
  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount) / 100 // Asumiendo que viene en centavos
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency || 'HNL',
    }).format(numAmount)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="space-y-4">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Error al cargar la disputa
              </h3>
              <p className="text-red-600 mt-1">
                {error.message || 'No se pudo cargar la información de la disputa'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-600">
            Disputa no encontrada
          </h3>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusConfig(dispute.dispute_status)
  const stageInfo = getStageConfig(dispute.dispute_stage)
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header con navegación */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Disputa {dispute.dispute_id}
            </h1>
            <p className="text-slate-600 mt-1">
              Detalles y gestión de la disputa
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex space-x-3">
          {dispute.dispute_status === 'dispute_opened' && dispute.challenge_required_by && (
            <Link
              href={`/disputes/${disputeId}/challenge`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Disputar</span>
            </Link>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado y etapa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Estado de la Disputa
              </h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4 mr-2" />
                {statusInfo.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Etapa</h3>
                <p className="text-slate-600">{stageInfo.label}</p>
                <p className="text-sm text-slate-500 mt-1">{stageInfo.description}</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Conector</h3>
                <p className="text-slate-600 capitalize">{dispute.connector}</p>
                <p className="text-sm text-slate-500 mt-1">Estado: {dispute.connector_status}</p>
              </div>
            </div>
          </motion.div>

          {/* Detalles de la transacción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Detalles de la Transacción
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h3 className="font-medium text-slate-900">Monto</h3>
                  <p className="text-lg font-semibold text-green-600">
                    {formatAmount(dispute.amount, dispute.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-medium text-slate-900">Payment ID</h3>
                  <p className="text-slate-600 font-mono text-sm">{dispute.payment_id}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Attempt: {dispute.attempt_id}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <ExternalLink className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-medium text-slate-900">ID del Conector</h3>
                  <p className="text-slate-600 font-mono text-sm">{dispute.connector_dispute_id}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Building className="h-5 w-5 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-medium text-slate-900">Merchant Connector</h3>
                  <p className="text-slate-600 text-sm">
                    {dispute.merchant_connector_id || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Razón de la disputa */}
          {(dispute.connector_reason || dispute.connector_reason_code) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
            >
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Razón de la Disputa
              </h2>
              
              <div className="space-y-4">
                {dispute.connector_reason && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Descripción</h3>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {dispute.connector_reason}
                    </p>
                  </div>
                )}
                
                {dispute.connector_reason_code && (
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">Código de Razón</h3>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-mono">
                      {dispute.connector_reason_code}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Fechas importantes */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Fechas Importantes
            </h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-slate-900">Creada</h4>
                  <p className="text-sm text-slate-600">
                    {formatDate(dispute.created_at)}
                  </p>
                </div>
              </div>

              {dispute.connector_created_at && (
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Iniciada en Conector</h4>
                    <p className="text-sm text-slate-600">
                      {formatDate(dispute.connector_created_at)}
                    </p>
                  </div>
                </div>
              )}

              {dispute.challenge_required_by && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Límite para Disputar</h4>
                    <p className="text-sm text-slate-600">
                      {formatDate(dispute.challenge_required_by)}
                    </p>
                    {new Date(dispute.challenge_required_by) > new Date() && (
                      <p className="text-xs text-red-600 mt-1">
                        ¡Acción requerida pronto!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {dispute.connector_updated_at && (
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Última Actualización</h4>
                    <p className="text-sm text-slate-600">
                      {formatDate(dispute.connector_updated_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Acciones disponibles */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Acciones Disponibles
            </h3>

            <div className="space-y-3">
              {dispute.dispute_status === 'dispute_opened' && dispute.challenge_required_by && (
                <Link
                  href={`/disputes/${disputeId}/challenge`}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span>Disputar Cargo</span>
                </Link>
              )}

              <Link
                href={`/payments/${dispute.payment_id}`}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Ver Pago Original</span>
              </Link>

              <button
                onClick={() => mutate()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}