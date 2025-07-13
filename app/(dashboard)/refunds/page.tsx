// app/(dashboard)/refunds/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  DollarSign,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react'
import { toast } from 'react-hot-toast'
// ✅ CORRECCIÓN: Usar el patrón de proxy API
import type { RefundResponse } from '@/types/hyperswitch'

// Refund Status Configuration
const RefundStatus = {
  success: { 
    label: 'Exitoso', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    icon: CheckCircle 
  },
  failure: { 
    label: 'Fallido', 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10',
    icon: XCircle 
  },
  pending: { 
    label: 'Pendiente', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/10',
    icon: Clock 
  },
  manual_review: { 
    label: 'Revisión Manual', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    icon: AlertCircle 
  },
}

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  toast.success(`${label} copiado al portapapeles`)
}

interface RefundFilters {
  refund_status?: string[]
  refund_type?: string[]
  from?: string
  to?: string
  connector?: string
  payment_id?: string
  amount_gte?: number
  amount_lte?: number
}

// ✅ CORRECCIÓN: Fetcher function usando el proxy API
const fetcher = async () => {
  try {
    const params = new URLSearchParams({
      limit: '100',
      from: subDays(new Date(), 30).toISOString(),
    })
    
    const response = await fetch(`/api/hyperswitch/refunds?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching refunds:', error)
    throw error
  }
}

export default function RefundsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<RefundFilters>({})
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })

  const { data: refunds, error, isLoading, mutate } = useSWR<RefundResponse[]>(
    'refunds-list',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  // Filter and search refunds
  const filteredRefunds = useMemo(() => {
    if (!refunds) return []

    return refunds.filter(refund => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !refund.refund_id.toLowerCase().includes(query) &&
          !refund.payment_id.toLowerCase().includes(query) &&
          !refund.connector.toLowerCase().includes(query) &&
          !(refund.refund_reason?.toLowerCase().includes(query))
        ) {
          return false
        }
      }

      // Status filter
      if (filters.refund_status?.length && !filters.refund_status.includes(refund.refund_status)) {
        return false
      }

      // Type filter
      if (filters.refund_type?.length && !filters.refund_type.includes(refund.refund_type)) {
        return false
      }

      // Connector filter
      if (filters.connector && refund.connector !== filters.connector) {
        return false
      }

      // Payment ID filter
      if (filters.payment_id && refund.payment_id !== filters.payment_id) {
        return false
      }

      // Amount filters
      if (filters.amount_gte && refund.refund_amount < filters.amount_gte * 100) {
        return false
      }
      if (filters.amount_lte && refund.refund_amount > filters.amount_lte * 100) {
        return false
      }

      // Date range filter
      const refundDate = new Date(refund.created_at)
      if (refundDate < dateRange.from || refundDate > dateRange.to) {
        return false
      }

      return true
    })
  }, [refunds, searchQuery, filters, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage)
  const paginatedRefunds = filteredRefunds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!refunds) return {
      total: 0,
      totalAmount: 0,
      successCount: 0,
      failureCount: 0,
      pendingCount: 0,
      successRate: 0
    }

    const total = refunds.length
    const totalAmount = refunds.reduce((sum, r) => sum + r.refund_amount, 0)
    const successCount = refunds.filter(r => r.refund_status === 'success').length
    const failureCount = refunds.filter(r => r.refund_status === 'failure').length
    const pendingCount = refunds.filter(r => r.refund_status === 'pending').length
    const successRate = total > 0 ? (successCount / total) * 100 : 0

    return {
      total,
      totalAmount,
      successCount,
      failureCount,
      pendingCount,
      successRate
    }
  }, [refunds])

  // Get unique connectors
  const connectors = useMemo(() => {
    if (!refunds) return []
    const unique = new Set(refunds.map(r => r.connector))
    return Array.from(unique).filter(Boolean).sort()
  }, [refunds])

  // Actions
  const handleRefresh = async () => {
    await mutate()
    toast.success('Lista actualizada')
  }

  const handleExport = () => {
    const csv = [
      ['ID Reembolso', 'ID Pago', 'Monto', 'Moneda', 'Estado', 'Tipo', 'Conector', 'Razón', 'Fecha Creación'],
      ...filteredRefunds.map(refund => [
        refund.refund_id,
        refund.payment_id,
        (refund.refund_amount / 100).toFixed(2),
        refund.currency,
        refund.refund_status,
        refund.refund_type,
        refund.connector,
        refund.refund_reason || '',
        format(new Date(refund.created_at), 'dd/MM/yyyy HH:mm')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `refunds-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Reembolsos exportados exitosamente')
  }

  const handleSelectAll = () => {
    if (selectedRefunds.length === paginatedRefunds.length) {
      setSelectedRefunds([])
    } else {
      setSelectedRefunds(paginatedRefunds.map(r => r.refund_id))
    }
  }

  const handleSelectRefund = (refundId: string) => {
    setSelectedRefunds(prev => 
      prev.includes(refundId)
        ? prev.filter(id => id !== refundId)
        : [...prev, refundId]
    )
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, searchQuery, dateRange])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar reembolsos</h2>
          <p className="text-dark-text-secondary mb-4">No se pudieron cargar los reembolsos</p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Reembolsos</h1>
          <p className="text-dark-text-secondary mt-1">
            Gestiona y monitorea todos los reembolsos procesados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push('/refunds/create')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Reembolso
          </button>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Receipt className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.total}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Total de Reembolsos</p>
          <p className="text-xs text-purple-500 mt-1">
            {formatCurrency(metrics.totalAmount, 'HNL')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.successCount}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Exitosos</p>
          <p className="text-xs text-green-500 mt-1">
            {metrics.successRate.toFixed(1)}% tasa de éxito
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.pendingCount}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Pendientes</p>
          <p className="text-xs text-yellow-500 mt-1">En procesamiento</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.failureCount}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Fallidos</p>
          <p className="text-xs text-red-500 mt-1">Requieren atención</p>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-dark-surface border border-dark-border rounded-xl"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar por ID de reembolso, ID de pago..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                  ${showFilters ? 'bg-purple-600 hover:bg-purple-700' : 'bg-dark-hover hover:bg-dark-border'}
                `}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {Object.keys(filters).length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-purple-500/20 rounded-full text-xs">
                    {Object.keys(filters).length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedRefunds.length > 0 && (
                <span className="text-sm text-dark-text-secondary">
                  {selectedRefunds.length} seleccionados
                </span>
              )}
              <button
                onClick={handleExport}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-dark-border">
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={filters.refund_status?.[0] || 'all'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    refund_status: e.target.value === 'all' ? undefined : [e.target.value]
                  }))}
                  className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los estados</option>
                  {Object.entries(RefundStatus).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={filters.refund_type?.[0] || 'all'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    refund_type: e.target.value === 'all' ? undefined : [e.target.value]
                  }))}
                  className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="instant">Instantáneo</option>
                  <option value="regular">Regular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Conector</label>
                <select
                  value={filters.connector || 'all'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    connector: e.target.value === 'all' ? undefined : e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los conectores</option>
                  {connectors.map(connector => (
                    <option key={connector} value={connector} className="capitalize">
                      {connector}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rango de Fechas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={format(dateRange.from, 'yyyy-MM-dd')}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                    className="flex-1 px-2 py-1.5 bg-dark-hover border border-dark-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs">-</span>
                  <input
                    type="date"
                    value={format(dateRange.to, 'yyyy-MM-dd')}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                    className="flex-1 px-2 py-1.5 bg-dark-hover border border-dark-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({})
                    setDateRange({
                      from: startOfDay(subDays(new Date(), 7)),
                      to: endOfDay(new Date()),
                    })
                  }}
                  className="px-4 py-2 bg-dark-hover hover:bg-dark-border rounded-lg transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Refunds Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-hover border-b border-dark-border">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRefunds.length === paginatedRefunds.length && paginatedRefunds.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-dark-border"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium">ID de Reembolso</th>
                <th className="p-4 text-left text-sm font-medium">ID de Pago</th>
                <th className="p-4 text-left text-sm font-medium">Monto</th>
                <th className="p-4 text-left text-sm font-medium">Estado</th>
                <th className="p-4 text-left text-sm font-medium">Tipo</th>
                <th className="p-4 text-left text-sm font-medium">Conector</th>
                <th className="p-4 text-left text-sm font-medium">Fecha</th>
                <th className="p-4 text-center text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="p-4">
                      <div className="w-4 h-4 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-32 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-32 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-24 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-6 w-20 bg-dark-hover rounded-full animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-16 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-16 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-24 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-8 w-8 bg-dark-hover rounded animate-pulse mx-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-dark-text-secondary">
                    <div className="flex flex-col items-center">
                      <Receipt className="w-12 h-12 mb-4 opacity-50" />
                      <p>No se encontraron reembolsos</p>
                      <button
                        onClick={() => router.push('/refunds/create')}
                        className="mt-4 text-purple-500 hover:text-purple-400"
                      >
                        Crear primer reembolso
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRefunds.map((refund) => {
                  const status = RefundStatus[refund.refund_status as keyof typeof RefundStatus]
                  const StatusIcon = status?.icon || AlertCircle

                  return (
                    <tr
                      key={refund.refund_id}
                      className="border-b border-dark-border hover:bg-dark-hover/50 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedRefunds.includes(refund.refund_id)}
                          onChange={() => handleSelectRefund(refund.refund_id)}
                          className="rounded border-dark-border"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-dark-hover px-2 py-1 rounded">
                            {refund.refund_id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(refund.refund_id, 'ID del reembolso')}
                            className="p-1 hover:bg-dark-hover rounded opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => router.push(`/payments/${refund.payment_id}`)}
                          className="text-purple-500 hover:text-purple-400 flex items-center gap-1"
                        >
                          <CreditCard className="w-4 h-4" />
                          <code className="text-sm">{refund.payment_id.slice(0, 8)}...</code>
                        </button>
                      </td>
                      <td className="p-4 font-medium">
                        {formatCurrency(refund.refund_amount, refund.currency)}
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm capitalize">
                          {refund.refund_type === 'instant' ? 'Instantáneo' : 'Regular'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm capitalize">{refund.connector}</span>
                      </td>
                      <td className="p-4 text-sm text-dark-text-secondary">
                        {format(new Date(refund.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="p-4 text-center">
                        <div className="relative group">
                          <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => router.push(`/refunds/${refund.refund_id}`)}
                              className="w-full text-left px-4 py-2 hover:bg-dark-hover text-sm flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalles
                            </button>
                            <button
                              onClick={() => copyToClipboard(refund.refund_id, 'ID del reembolso')}
                              className="w-full text-left px-4 py-2 hover:bg-dark-hover text-sm flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copiar ID
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-text-secondary">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRefunds.length)} de {filteredRefunds.length}
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 bg-dark-hover border border-dark-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`
                        px-3 py-1 rounded-lg transition-colors
                        ${currentPage === pageNumber
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-dark-hover'
                        }
                      `}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}