// app/(dashboard)/transactions/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Clock,
  AlertCircle,
  Database,
  Cpu,
  Server,
  Network
} from 'lucide-react'
import toast from 'react-hot-toast'

// Importar contexto y hooks corregidos
import { useAuth } from '@/presentation/contexts/AuthContext'
import { usePayments } from '@/presentation/hooks/usePayments'
import { useRefunds } from '@/presentation/hooks/useRefunds'

// Transaction Type Configuration
const TransactionTypes = {
  payment: {
    label: 'Pago',
    icon: CreditCard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    direction: 'in'
  },
  refund: {
    label: 'Reembolso',
    icon: Receipt,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    direction: 'out'
  },
  capture: {
    label: 'Captura',
    icon: ArrowDownLeft,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
    direction: 'in'
  },
  void: {
    label: 'Anulación',
    icon: ArrowUpRight,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    direction: 'out'
  }
} as const

// Transaction interface corregida
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

interface TransactionFilters {
  type?: string[]
  status?: string[]
  connector?: string
  amount_gte?: number
  amount_lte?: number
  customer_id?: string
}

// Componentes UI consistentes con el dashboard
interface CardProps {
  children: React.ReactNode
  className?: string
}

const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ${className}`}>
    {children}
  </div>
)

const CardContent = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
}

const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  disabled = false, 
  loading = false 
}: ButtonProps) => {
  const variants = {
    default: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    ghost: 'bg-transparent hover:bg-white/10 text-white',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
  }
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-xl font-medium 
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-105 active:scale-95
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}

// Helper Functions
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency || 'HNL',
  }).format(amount / 100)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  toast.success(`${label} copiado al portapapeles`)
}

// Función para determinar el rango de fechas
const getDateRange = (range: string) => {
  const now = new Date()
  let from: Date

  switch (range) {
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { from, to: now }
}

export default function TransactionsPage() {
  const router = useRouter()
  const { authState } = useAuth()
  
  // ✅ CORREGIDO: Usar hooks corregidos del proyecto
  const { 
    payments, 
    isLoading: paymentsLoading, 
    error: paymentsError,
    refreshPayments 
  } = usePayments()

  // ✅ CORREGIDO: usar las propiedades correctas del hook useRefunds
  const { 
    refunds, 
    isLoading: refundsLoading, // ✅ Corregido: era 'loading'
    error: refundsError,
    refreshRefunds // ✅ Corregido: era 'refresh'
  } = useRefunds() // ✅ Corregido: no acepta argumentos

  // Estados locales
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [dateRange, setDateRange] = useState(() => getDateRange('7d'))

  // ✅ CORREGIDO: Transform data to transactions con propiedades correctas
  const allTransactions = useMemo((): Transaction[] => {
    const transactions: Transaction[] = []

    // Add payments
    if (payments) {
      payments.forEach(payment => {
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
          customer: payment.customer_id ? {
            id: payment.customer_id,
            email: payment.customer_id,
            name: undefined
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
            created_at: payment.created,
            description: `Captura del pago ${payment.payment_id}`,
            customer: payment.customer_id ? {
              id: payment.customer_id,
              email: payment.customer_id,
              name: undefined
            } : undefined,
          })
        }
      })
    }

    // ✅ CORREGIDO: Add refunds con propiedades correctas
    if (refunds) {
      refunds.forEach(refund => {
        transactions.push({
          id: `refund-${refund.refund_id}`,
          type: 'refund',
          amount: refund.amount,        // ✅ Corregido: era refund_amount
          currency: refund.currency,
          status: refund.status,        // ✅ Corregido: era refund_status
          reference_id: refund.refund_id,
          connector: refund.connector || 'unknown',
          created_at: refund.created,   // ✅ Corregido: era created_at
          description: refund.reason || 'Reembolso procesado', // ✅ Corregido: era refund_reason
          metadata: refund.metadata
        })
      })
    }

    return transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [payments, refunds])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(transaction => {
      // Date filter
      const transactionDate = new Date(transaction.created_at)
      if (transactionDate < dateRange.from || transactionDate > dateRange.to) {
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
    setDateRange(getDateRange(range))
  }

  // ✅ CORREGIDO: Actions con refreshRefunds correcto
  const handleRefresh = async () => {
    try {
      await Promise.all([refreshPayments(), refreshRefunds()]) // ✅ Corregido
      toast.success('Transacciones actualizadas')
    } catch (error) {
      toast.error('Error al actualizar transacciones')
    }
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
        formatDate(transaction.created_at),
        transaction.description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 text-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Error al cargar transacciones</h2>
              <p className="text-gray-300 mb-4">No se pudieron cargar las transacciones</p>
              <Button onClick={handleRefresh}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl shadow-lg"
              >
                <FileText className="w-6 h-6 text-white" />
              </motion.div>
              Transacciones
            </h1>
            <p className="text-cyan-200">
              Historial completo de todas las transacciones procesadas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="secondary"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button
              onClick={handleExport}
              variant="default"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </motion.div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/40">
                    <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-gray-300">Entradas</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(metrics.inflow, 'HNL')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/40">
                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-sm text-gray-300">Salidas</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(metrics.outflow, 'HNL')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  </div>
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-sm text-gray-300">Flujo Neto</p>
                <p className={`text-2xl font-bold ${metrics.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(Math.abs(metrics.netFlow), 'HNL')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/40">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-2xl font-bold text-white">{metrics.volume}</span>
                </div>
                <p className="text-sm text-gray-300">Transacciones</p>
                <p className="text-xs text-blue-400 mt-1">
                  {metrics.successRate.toFixed(1)}% exitosas
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent>
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
                      px-3 py-1.5 rounded-lg text-sm transition-colors font-medium
                      ${selectedTimeRange === range.value
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }
                    `}
                  >
                    {range.label}
                  </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {dateRange.from.toLocaleDateString('es-HN')} - {dateRange.to.toLocaleDateString('es-HN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por ID, cliente, descripción..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`
                      px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium
                      ${showFilters ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-white/10 hover:bg-white/20'}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-white/20">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Tipo</label>
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
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      size={4}
                    >
                      {Object.entries(TransactionTypes).map(([key, config]) => (
                        <option key={key} value={key} className="bg-slate-800">
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Estado</label>
                    <select
                      value={filters.status?.[0] || 'all'}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        status: e.target.value === 'all' ? undefined : [e.target.value]
                      }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="all" className="bg-slate-800">Todos los estados</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status} className="bg-slate-800">
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Conector</label>
                    <select
                      value={filters.connector || 'all'}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        connector: e.target.value === 'all' ? undefined : e.target.value
                      }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="all" className="bg-slate-800">Todos los conectores</option>
                      {uniqueConnectors.map(connector => (
                        <option key={connector} value={connector} className="bg-slate-800 capitalize">
                          {connector}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Rango de Montos</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.amount_gte || ''}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          amount_gte: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="flex-1 px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className="text-xs text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.amount_lte || ''}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          amount_lte: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="flex-1 px-2 py-1.5 bg-white/10 border border-white/20 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setFilters({})
                        setSearchQuery('')
                      }}
                      variant="ghost"
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/20">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-white">Tipo</th>
                    <th className="p-4 text-left text-sm font-medium text-white">ID de Referencia</th>
                    <th className="p-4 text-right text-sm font-medium text-white">Monto</th>
                    <th className="p-4 text-left text-sm font-medium text-white">Estado</th>
                    <th className="p-4 text-left text-sm font-medium text-white">Cliente</th>
                    <th className="p-4 text-left text-sm font-medium text-white">Conector</th>
                    <th className="p-4 text-left text-sm font-medium text-white">Fecha</th>
                    <th className="p-4 text-center text-sm font-medium text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg animate-pulse" />
                            <div className="h-4 w-20 bg-white/20 rounded animate-pulse" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
                        </td>
                        <td className="p-4 text-right">
                          <div className="h-4 w-24 bg-white/20 rounded animate-pulse ml-auto" />
                        </td>
                        <td className="p-4">
                          <div className="h-6 w-20 bg-white/20 rounded-full animate-pulse" />
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-36 bg-white/20 rounded animate-pulse" />
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
                        </td>
                        <td className="p-4">
                          <div className="h-8 w-8 bg-white/20 rounded animate-pulse mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-300">
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
                          className="border-b border-white/10 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${type.bgColor} border ${type.borderColor}`}>
                                <TypeIcon className={`w-4 h-4 ${type.color}`} />
                              </div>
                              <span className="text-sm font-medium text-white">{type.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-white/10 px-2 py-1 rounded text-cyan-300">
                                {transaction.reference_id}
                              </code>
                              <button
                                onClick={() => copyToClipboard(transaction.reference_id, 'ID de referencia')}
                                className="p-1 hover:bg-white/10 rounded opacity-0 hover:opacity-100 transition-opacity"
                              >
                                <Copy className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {type.direction === 'out' && <span className="text-red-400">-</span>}
                              {type.direction === 'in' && <span className="text-green-400">+</span>}
                              <span className="font-medium text-white">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`
                              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                              ${['succeeded', 'success', 'completed'].includes(transaction.status)
                                ? 'bg-green-500/20 text-green-300 border-green-500/40'
                                : ['failed', 'failure'].includes(transaction.status)
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : ['pending', 'processing'].includes(transaction.status)
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                              }
                            `}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {transaction.customer ? (
                              <div className="text-sm">
                                <p className="font-medium text-white">{transaction.customer.name || 'Sin nombre'}</p>
                                <p className="text-gray-300">{transaction.customer.email}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No especificado</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-sm capitalize text-gray-300">{transaction.connector}</span>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(transaction.created_at)}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="relative group">
                              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                              </button>
                              <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                  onClick={() => handleViewDetails(transaction)}
                                  className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2 text-white"
                                >
                                  <Eye className="w-4 h-4" />
                                  Ver Detalles
                                </button>
                                <button
                                  onClick={() => copyToClipboard(transaction.id, 'ID de transacción')}
                                  className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2 text-white"
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
              <div className="flex items-center justify-between p-4 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={10} className="bg-slate-800">10</option>
                    <option value={25} className="bg-slate-800">25</option>
                    <option value={50} className="bg-slate-800">50</option>
                    <option value={100} className="bg-slate-800">100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            px-3 py-1 rounded-lg transition-colors text-sm
                            ${currentPage === pageNumber
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                              : 'hover:bg-white/10 text-gray-300'
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
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}