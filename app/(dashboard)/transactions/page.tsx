// app/(dashboard)/transactions/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  TrendingUp,
  TrendingDown,
  Activity,
  MoreHorizontal,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
// Importación corregida del cliente de Hyperswitch
import { hyperswitchClient } from '/home/kali/multipaga/src/infrastructure/api/clients/HyperswitchClient'
import type { PaymentResponse, RefundResponse } from '@/types/hyperswitch'

// Transaction Type Configuration
const TransactionTypes = {
  payment: {
    label: 'Pago',
    icon: CreditCard,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    direction: 'in'
  },
  refund: {
    label: 'Reembolso',
    icon: Receipt,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    direction: 'out'
  },
  capture: {
    label: 'Captura',
    icon: ArrowDownLeft,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    direction: 'in'
  },
  void: {
    label: 'Anulación',
    icon: ArrowUpRight,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    direction: 'out'
  }
}

// Transaction interface extendida para incluir propiedades necesarias
interface ExtendedPaymentResponse extends PaymentResponse {
  customer?: {
    id?: string
    email?: string
    name?: string
  }
  updated_at?: string
}

// Transaction interface
interface Transaction {
  id: string
  type: keyof typeof TransactionTypes
  amount: number
  currency: string
  status: string
  reference_id: string
  connector: string
  created_at: string
  description?: string
  customer?: {
    id: string
    email?: string
    name?: string
  }
  metadata?: Record<string, any>
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

// Fetcher functions usando el cliente corregido
const fetchPayments = async (): Promise<ExtendedPaymentResponse[]> => {
  try {
    const fromDate = subDays(new Date(), 30).toISOString()
    const response = await hyperswitchClient.get<{ data: ExtendedPaymentResponse[] }>('/payments', {
      params: {
        limit: 100,
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

interface TransactionFilters {
  type?: string[]
  status?: string[]
  connector?: string
  amount_gte?: number
  amount_lte?: number
  customer_id?: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  })
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  // Fetch data
  const { data: payments, error: paymentsError, isLoading: paymentsLoading, mutate: mutatePayments } = useSWR<ExtendedPaymentResponse[]>(
    'transactions-payments',
    fetchPayments,
    { revalidateOnFocus: false }
  )

  const { data: refunds, error: refundsError, isLoading: refundsLoading, mutate: mutateRefunds } = useSWR<RefundResponse[]>(
    'transactions-refunds',
    fetchRefunds,
    { revalidateOnFocus: false }
  )

  // Transform data to transactions
  const allTransactions = useMemo((): Transaction[] => {
    const transactions: Transaction[] = []

    // Add payments
    payments?.forEach(payment => {
      transactions.push({
        id: `payment-${payment.payment_id}`,
        type: 'payment',
        amount: payment.amount || 0,
        currency: payment.currency,
        status: payment.status,
        reference_id: payment.payment_id,
        connector: payment.connector || 'unknown',
        created_at: payment.created,
        description: payment.description,
        customer: payment.customer ? {
          id: payment.customer.id || payment.customer_id || '',
          email: payment.customer.email,
          name: payment.customer.name
        } : undefined,
        metadata: payment.metadata
      })

      // Add capture as separate transaction if applicable
      if (payment.status === 'succeeded' && payment.capture_method === 'manual') {
        transactions.push({
          id: `capture-${payment.payment_id}`,
          type: 'capture',
          amount: payment.amount || 0,
          currency: payment.currency,
          status: 'completed',
          reference_id: payment.payment_id,
          connector: payment.connector || 'unknown',
          created_at: payment.updated_at || payment.created,
          description: `Captura del pago ${payment.payment_id}`,
          customer: payment.customer ? {
            id: payment.customer.id || payment.customer_id || '',
            email: payment.customer.email,
            name: payment.customer.name
          } : undefined,
        })
      }
    })

    // Add refunds
    refunds?.forEach(refund => {
      transactions.push({
        id: `refund-${refund.refund_id}`,
        type: 'refund',
        amount: refund.refund_amount,
        currency: refund.currency,
        status: refund.refund_status,
        reference_id: refund.refund_id,
        connector: refund.connector,
        created_at: refund.created_at,
        description: refund.description || refund.refund_reason,
        metadata: refund.metadata
      })
    })

    return transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [payments, refunds])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(transaction => {
      // Date filter
      const transactionDate = new Date(transaction.created_at)
      if (!isWithinInterval(transactionDate, { start: dateRange.from, end: dateRange.to })) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !transaction.reference_id.toLowerCase().includes(query) &&
          !transaction.connector.toLowerCase().includes(query) &&
          !(transaction.customer?.email?.toLowerCase().includes(query)) &&
          !(transaction.description?.toLowerCase().includes(query))
        ) {
          return false
        }
      }

      // Type filter
      if (filters.type?.length && !filters.type.includes(transaction.type)) {
        return false
      }

      // Status filter
      if (filters.status?.length && !filters.status.includes(transaction.status)) {
        return false
      }

      // Connector filter
      if (filters.connector && transaction.connector !== filters.connector) {
        return false
      }

      // Amount filters
      if (filters.amount_gte && transaction.amount < filters.amount_gte * 100) {
        return false
      }
      if (filters.amount_lte && transaction.amount > filters.amount_lte * 100) {
        return false
      }

      // Customer filter
      if (filters.customer_id && transaction.customer?.id !== filters.customer_id) {
        return false
      }

      return true
    })
  }, [allTransactions, searchQuery, filters, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate metrics
  const metrics = useMemo(() => {
    const inflow = filteredTransactions
      .filter(t => TransactionTypes[t.type].direction === 'in')
      .reduce((sum, t) => sum + t.amount, 0)

    const outflow = filteredTransactions
      .filter(t => TransactionTypes[t.type].direction === 'out')
      .reduce((sum, t) => sum + t.amount, 0)

    const netFlow = inflow - outflow

    const volume = filteredTransactions.length

    const successRate = volume > 0
      ? (filteredTransactions.filter(t => 
          ['succeeded', 'success', 'completed'].includes(t.status)
        ).length / volume) * 100
      : 0

    return {
      inflow,
      outflow,
      netFlow,
      volume,
      successRate
    }
  }, [filteredTransactions])

  // Get unique values for filters
  const uniqueConnectors = useMemo(() => {
    const connectors = new Set(allTransactions.map(t => t.connector))
    return Array.from(connectors).filter(Boolean).sort()
  }, [allTransactions])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(allTransactions.map(t => t.status))
    return Array.from(statuses).filter(Boolean).sort()
  }, [allTransactions])

  // Time range shortcuts
  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range)
    const now = new Date()
    let from: Date

    switch (range) {
      case '24h':
        from = subDays(now, 1)
        break
      case '7d':
        from = subDays(now, 7)
        break
      case '30d':
        from = subDays(now, 30)
        break
      case '90d':
        from = subDays(now, 90)
        break
      default:
        from = subDays(now, 7)
    }

    setDateRange({
      from: startOfDay(from),
      to: endOfDay(now)
    })
  }

  // Actions
  const handleRefresh = async () => {
    await Promise.all([mutatePayments(), mutateRefunds()])
    toast.success('Transacciones actualizadas')
  }

  const handleExport = () => {
    const csv = [
      ['ID', 'Tipo', 'Monto', 'Moneda', 'Estado', 'Referencia', 'Conector', 'Cliente', 'Fecha', 'Descripción'],
      ...filteredTransactions.map(transaction => [
        transaction.id,
        TransactionTypes[transaction.type].label,
        (transaction.amount / 100).toFixed(2),
        transaction.currency,
        transaction.status,
        transaction.reference_id,
        transaction.connector,
        transaction.customer?.email || '',
        format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm'),
        transaction.description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Transacciones exportadas exitosamente')
  }

  const handleViewDetails = (transaction: Transaction) => {
    if (transaction.type === 'payment' || transaction.type === 'capture') {
      router.push(`/payments/${transaction.reference_id}`)
    } else if (transaction.type === 'refund') {
      router.push(`/refunds/${transaction.reference_id}`)
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, searchQuery, dateRange])

  const isLoading = paymentsLoading || refundsLoading
  const hasError = paymentsError || refundsError

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar transacciones</h2>
          <p className="text-dark-text-secondary mb-4">No se pudieron cargar las transacciones</p>
          <button
            onClick={handleRefresh}
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
          <h1 className="text-3xl font-bold">Transacciones</h1>
          <p className="text-dark-text-secondary mt-1">
            Historial completo de todas las transacciones procesadas
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
            <div className="p-2 bg-green-600/20 rounded-lg">
              <ArrowDownLeft className="w-5 h-5 text-green-500" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-dark-text-secondary">Entradas</p>
          <p className="text-2xl font-bold text-green-500">
            {formatCurrency(metrics.inflow, 'HNL')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-dark-text-secondary">Salidas</p>
          <p className="text-2xl font-bold text-red-500">
            {formatCurrency(metrics.outflow, 'HNL')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm text-dark-text-secondary">Flujo Neto</p>
          <p className={`text-2xl font-bold ${metrics.netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(Math.abs(metrics.netFlow), 'HNL')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-surface border border-dark-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-2xl font-bold">{metrics.volume}</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Transacciones</p>
          <p className="text-xs text-blue-500 mt-1">
            {metrics.successRate.toFixed(1)}% exitosas
          </p>
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
          {/* Time Range Pills */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { value: '24h', label: '24h' },
              { value: '7d', label: '7 días' },
              { value: '30d', label: '30 días' },
              { value: '90d', label: '90 días' },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${selectedTimeRange === range.value
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-dark-hover hover:bg-dark-border'
                  }
                `}
              >
                {range.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-dark-text-secondary" />
              <span className="text-dark-text-secondary">
                {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM yyyy', { locale: es })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar por ID, cliente, descripción..."
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
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-dark-border">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  multiple
                  value={filters.type || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setFilters(prev => ({
                      ...prev,
                      type: selected.length > 0 ? selected : undefined
                    }))
                  }}
                  className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  size={4}
                >
                  {Object.entries(TransactionTypes).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={filters.status?.[0] || 'all'}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    status: e.target.value === 'all' ? undefined : [e.target.value]
                  }))}
                  className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los estados</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
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
                  {uniqueConnectors.map(connector => (
                    <option key={connector} value={connector} className="capitalize">
                      {connector}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rango de Montos</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.amount_gte || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      amount_gte: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="flex-1 px-2 py-1.5 bg-dark-hover border border-dark-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.amount_lte || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      amount_lte: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="flex-1 px-2 py-1.5 bg-dark-hover border border-dark-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({})
                    setSearchQuery('')
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
                <th className="p-4 text-left text-sm font-medium">Tipo</th>
                <th className="p-4 text-left text-sm font-medium">ID de Referencia</th>
                <th className="p-4 text-right text-sm font-medium">Monto</th>
                <th className="p-4 text-left text-sm font-medium">Estado</th>
                <th className="p-4 text-left text-sm font-medium">Cliente</th>
                <th className="p-4 text-left text-sm font-medium">Conector</th>
                <th className="p-4 text-left text-sm font-medium">Fecha</th>
                <th className="p-4 text-center text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-dark-hover rounded-lg animate-pulse" />
                        <div className="h-4 w-20 bg-dark-hover rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-32 bg-dark-hover rounded animate-pulse" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="h-4 w-24 bg-dark-hover rounded animate-pulse ml-auto" />
                    </td>
                    <td className="p-4">
                      <div className="h-6 w-20 bg-dark-hover rounded-full animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-36 bg-dark-hover rounded animate-pulse" />
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
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-dark-text-secondary">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p>No se encontraron transacciones</p>
                      <p className="text-sm mt-1">Ajusta los filtros o el rango de fechas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction) => {
                  const type = TransactionTypes[transaction.type]
                  const TypeIcon = type.icon

                  return (
                    <tr
                      key={transaction.id}
                      className="border-b border-dark-border hover:bg-dark-hover/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${type.bgColor}`}>
                            <TypeIcon className={`w-4 h-4 ${type.color}`} />
                          </div>
                          <span className="text-sm font-medium">{type.label}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-dark-hover px-2 py-1 rounded">
                            {transaction.reference_id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(transaction.reference_id, 'ID de referencia')}
                            className="p-1 hover:bg-dark-hover rounded opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {type.direction === 'out' && <span className="text-red-500">-</span>}
                          {type.direction === 'in' && <span className="text-green-500">+</span>}
                          <span className="font-medium">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                          ${['succeeded', 'success', 'completed'].includes(transaction.status)
                            ? 'bg-green-500/10 text-green-500'
                            : ['failed', 'failure'].includes(transaction.status)
                            ? 'bg-red-500/10 text-red-500'
                            : ['pending', 'processing'].includes(transaction.status)
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-gray-500/10 text-gray-500'
                          }
                        `}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {transaction.customer ? (
                          <div className="text-sm">
                            <p className="font-medium">{transaction.customer.name || 'Sin nombre'}</p>
                            <p className="text-dark-text-secondary">{transaction.customer.email}</p>
                          </div>
                        ) : (
                          <span className="text-dark-text-secondary text-sm">No especificado</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm capitalize">{transaction.connector}</span>
                      </td>
                      <td className="p-4 text-sm text-dark-text-secondary">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="relative group">
                          <button className="p-2 hover:bg-dark-hover rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => handleViewDetails(transaction)}
                              className="w-full text-left px-4 py-2 hover:bg-dark-hover text-sm flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Detalles
                            </button>
                            <button
                              onClick={() => copyToClipboard(transaction.id, 'ID de transacción')}
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
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
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