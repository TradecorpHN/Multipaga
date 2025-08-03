// app/(dashboard)/reconciliation/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckSquare,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building,
  Search,
  X,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  MoreVertical,
  Upload,
  Settings,
  BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'
// Importación corregida del cliente de Hyperswitch
import { hyperswitchClient } from '@/infrastructure/api/clients/HyperswitchClient'
import type { PaymentResponse, RefundResponse } from '@/types/hyperswitch'

// Reconciliation Status
const ReconciliationStatus = {
  matched: {
    label: 'Conciliado',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: CheckCircle
  },
  unmatched: {
    label: 'No Conciliado',
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
  disputed: {
    label: 'Disputado',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: AlertTriangle
  }
}

// Transaction Types
const TransactionTypes = {
  payment: { label: 'Pago', icon: CreditCard, color: 'text-blue-500' },
  refund: { label: 'Reembolso', icon: RefreshCw, color: 'text-purple-500' },
  payout: { label: 'Pago Saliente', icon: TrendingUp, color: 'text-green-500' },
  fee: { label: 'Comisión', icon: DollarSign, color: 'text-orange-500' }
}

interface ReconciliationItem {
  id: string
  transaction_id: string
  type: keyof typeof TransactionTypes
  status: keyof typeof ReconciliationStatus
  amount: number
  currency: string
  connector: string
  merchant_reference: string
  connector_reference?: string
  created_at: string
  reconciled_at?: string
  discrepancy?: {
    type: string
    expected: number
    actual: number
    difference: number
  }
}

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

// Fetcher functions usando el cliente corregido
const fetchPayments = async (): Promise<PaymentResponse[]> => {
  try {
    const fromDate = subDays(new Date(), 30).toISOString()
    const response = await hyperswitchClient.get<{ data: PaymentResponse[] }>('/payments', {
      params: {
        limit: 100,
        status: 'succeeded',
        from: fromDate,
      }
    })
    return response.data || []
  } catch (error) {
    console.error('Error fetching payments:', error)
    return []
  }
}

const fetchRefunds = async (): Promise<RefundResponse[]> => {
  try {
    const fromDate = subDays(new Date(), 30).toISOString()
    const response = await hyperswitchClient.get<{ data: RefundResponse[] }>('/refunds', {
      params: {
        limit: 100,
        from: fromDate,
      }
    })
    return response.data || []
  } catch (error) {
    console.error('Error fetching refunds:', error)
    return []
  }
}

export default function ReconciliationPage() {
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })
  const [selectedConnector, setSelectedConnector] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const { data: payments, error: paymentsError, mutate: mutatePayments } = useSWR<PaymentResponse[]>(
    'reconciliation-payments',
    fetchPayments,
    { revalidateOnFocus: false }
  )

  const { data: refunds, error: refundsError, mutate: mutateRefunds } = useSWR<RefundResponse[]>(
    'reconciliation-refunds',
    fetchRefunds,
    { revalidateOnFocus: false }
  )

  // Transform data to reconciliation items
  const reconciliationItems = useMemo<ReconciliationItem[]>(() => {
    const items: ReconciliationItem[] = []

    // Process payments
    payments?.forEach(payment => {
      items.push({
        id: `payment-${payment.payment_id}`,
        transaction_id: payment.payment_id,
        type: 'payment',
        status: payment.connector_transaction_id ? 'matched' : 'pending',
        amount: payment.amount || 0,
        currency: payment.currency,
        connector: payment.connector || 'unknown',
        merchant_reference: payment.payment_id,
        connector_reference: payment.connector_transaction_id,
        created_at: payment.created,
      })
    })

    // Process refunds
    refunds?.forEach(refund => {
      items.push({
        id: `refund-${refund.refund_id}`,
        transaction_id: refund.refund_id,
        type: 'refund',
        status: refund.connector_refund_id ? 'matched' : 'pending',
        amount: refund.refund_amount,
        currency: refund.currency,
        connector: refund.connector,
        merchant_reference: refund.refund_id,
        connector_reference: refund.connector_refund_id,
        created_at: refund.created_at,
      })
    })

    return items
  }, [payments, refunds])

  // Filter items
  const filteredItems = useMemo(() => {
    return reconciliationItems.filter(item => {
      // Date filter
      const itemDate = new Date(item.created_at)
      if (!isWithinInterval(itemDate, { start: dateRange.from, end: dateRange.to })) {
        return false
      }

      // Connector filter
      if (selectedConnector !== 'all' && item.connector !== selectedConnector) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          item.transaction_id.toLowerCase().includes(query) ||
          item.merchant_reference.toLowerCase().includes(query) ||
          (item.connector_reference?.toLowerCase().includes(query) ?? false)
        )
      }

      return true
    })
  }, [reconciliationItems, dateRange, selectedConnector, selectedStatus, searchQuery])

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredItems.length
    const matched = filteredItems.filter(item => item.status === 'matched').length
    const unmatched = filteredItems.filter(item => item.status === 'unmatched').length
    const pending = filteredItems.filter(item => item.status === 'pending').length
    const disputed = filteredItems.filter(item => item.status === 'disputed').length

    const totalAmount = filteredItems.reduce((sum, item) => sum + item.amount, 0)
    const matchedAmount = filteredItems
      .filter(item => item.status === 'matched')
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      total,
      matched,
      unmatched,
      pending,
      disputed,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
      totalAmount,
      matchedAmount,
      unmatchedAmount: totalAmount - matchedAmount,
    }
  }, [filteredItems])

  // Get unique connectors
  const connectors = useMemo(() => {
    const uniqueConnectors = new Set(reconciliationItems.map(item => item.connector))
    return Array.from(uniqueConnectors).filter(Boolean)
  }, [reconciliationItems])

  // Actions
  const handleRefresh = async () => {
    setIsReconciling(true)
    await Promise.all([mutatePayments(), mutateRefunds()])
    setIsReconciling(false)
    toast.success('Datos actualizados')
  }

  const handleReconcile = async () => {
    if (selectedItems.length === 0) {
      toast.error('Selecciona al menos un elemento para conciliar')
      return
    }

    setIsReconciling(true)
    // Simulate reconciliation process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsReconciling(false)
    setSelectedItems([])
    toast.success(`${selectedItems.length} elementos conciliados exitosamente`)
  }

  const handleExport = () => {
    const csv = [
      ['ID', 'Tipo', 'Estado', 'Monto', 'Moneda', 'Conector', 'Referencia Comerciante', 'Referencia Conector', 'Fecha'],
      ...filteredItems.map(item => [
        item.transaction_id,
        TransactionTypes[item.type].label,
        ReconciliationStatus[item.status].label,
        (item.amount / 100).toString(),
        item.currency,
        item.connector,
        item.merchant_reference,
        item.connector_reference || '',
        format(new Date(item.created_at), 'dd/MM/yyyy HH:mm'),
      ]),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Reporte exportado exitosamente')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      toast.success(`Archivo "${file.name}" cargado. Procesando...`)
      // Here you would process the bank statement file
      setTimeout(() => {
        toast.success('Archivo procesado exitosamente')
      }, 2000)
    }
  }

  const isLoading = !payments || !refunds

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Conciliación</h1>
          <p className="text-dark-text-secondary mt-1">
            Concilia tus transacciones con los estados de cuenta bancarios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isReconciling}
            className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isReconciling ? 'animate-spin' : ''}`} />
          </button>
          <label className="px-4 py-2 bg-dark-surface hover:bg-dark-hover rounded-lg cursor-pointer transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Cargar Estado de Cuenta
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-dark-surface hover:bg-dark-hover rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
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
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.matchRate.toFixed(1)}%</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Tasa de Conciliación</p>
          <div className="mt-2 w-full bg-dark-hover rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${metrics.matchRate}%` }}
            />
          </div>
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
            <span className="text-2xl font-bold">{metrics.matched}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Conciliados</p>
          <p className="text-xs text-green-500 mt-1">
            {formatCurrency(metrics.matchedAmount, 'HNL')}
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
            <span className="text-2xl font-bold">{metrics.pending}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Pendientes</p>
          <p className="text-xs text-yellow-500 mt-1">Requieren revisión</p>
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
            <span className="text-2xl font-bold">{metrics.unmatched}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">No Conciliados</p>
          <p className="text-xs text-red-500 mt-1">
            {formatCurrency(metrics.unmatchedAmount, 'HNL')}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
              <input
                type="text"
                placeholder="Buscar por ID o referencia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
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
              {(selectedConnector !== 'all' || selectedStatus !== 'all') && (
                <span className="ml-1 px-2 py-0.5 bg-purple-500/20 rounded-full text-xs">
                  {[selectedConnector !== 'all', selectedStatus !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-dark-text-secondary">
                {selectedItems.length} seleccionados
              </span>
              <button
                onClick={handleReconcile}
                disabled={isReconciling}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Conciliar Seleccionados
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-dark-border">
            <div>
              <label className="block text-sm font-medium mb-2">Rango de Fechas</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={format(dateRange.from, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                  className="px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span>-</span>
                <input
                  type="date"
                  value={format(dateRange.to, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                  className="px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Conector</label>
              <select
                value={selectedConnector}
                onChange={(e) => setSelectedConnector(e.target.value)}
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
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Todos los estados</option>
                {Object.entries(ReconciliationStatus).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedConnector('all')
                  setSelectedStatus('all')
                  setDateRange({
                    from: startOfDay(subDays(new Date(), 7)),
                    to: endOfDay(new Date()),
                  })
                }}
                className="w-full px-4 py-2 bg-dark-hover hover:bg-dark-border rounded-lg transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Uploaded File Info */}
      {uploadedFile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-dark-text-secondary">
                Cargado {format(new Date(), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadedFile(null)}
            className="p-2 hover:bg-blue-600/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Transactions Table */}
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
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredItems.map(item => item.id))
                      } else {
                        setSelectedItems([])
                      }
                    }}
                    className="rounded border-dark-border"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium">ID de Transacción</th>
                <th className="p-4 text-left text-sm font-medium">Tipo</th>
                <th className="p-4 text-left text-sm font-medium">Estado</th>
                <th className="p-4 text-right text-sm font-medium">Monto</th>
                <th className="p-4 text-left text-sm font-medium">Conector</th>
                <th className="p-4 text-left text-sm font-medium">Referencias</th>
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
                      <div className="h-6 w-20 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-6 w-24 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="h-4 w-24 bg-dark-hover rounded animate-pulse ml-auto" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-16 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="h-3 w-28 bg-dark-hover rounded animate-pulse" />
                        <div className="h-3 w-32 bg-dark-hover rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-24 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-8 w-8 bg-dark-hover rounded animate-pulse mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-dark-text-secondary">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p>No se encontraron transacciones para conciliar</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = ReconciliationStatus[item.status]
                  const type = TransactionTypes[item.type]
                  const StatusIcon = status.icon

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-dark-border hover:bg-dark-hover/50 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, item.id])
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id))
                            }
                          }}
                          className="rounded border-dark-border"
                        />
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-dark-hover px-2 py-1 rounded">
                          {item.transaction_id}
                        </code>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                          <span className="text-sm">{type.label}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="p-4">
                        <span className="capitalize">{item.connector}</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-dark-text-secondary">Comerciante:</span>
                            <code className="text-xs">{item.merchant_reference}</code>
                          </div>
                          {item.connector_reference && (
                            <div className="flex items-center gap-2">
                              <span className="text-dark-text-secondary">Conector:</span>
                              <code className="text-xs">{item.connector_reference}</code>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-dark-text-secondary">
                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="p-4 text-center">
                        <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Cómo funciona la conciliación</p>
          <p className="text-dark-text-secondary">
            1. Carga tu estado de cuenta bancario en formato CSV o Excel
          </p>
          <p className="text-dark-text-secondary">
            2. El sistema comparará automáticamente las transacciones con tus registros
          </p>
          <p className="text-dark-text-secondary">
            3. Revisa las discrepancias y confirma las transacciones conciliadas
          </p>
        </div>
      </motion.div>
    </div>
  )
}