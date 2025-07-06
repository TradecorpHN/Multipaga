'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { usePayments, usePaymentStats } from '@/presentation/hooks/usePayments'
import { PaymentEntity, PaymentStatus } from '@/domain/entities/Payment'
import { Card, CardHeader, CardBody } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import Link from 'next/link'
import {
  CreditCard,
  Search,
  RefreshCw,
  Plus,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  MoreVertical,
} from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// Status badge component
const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const color = PaymentEntity.getStatusColor(status)
  const icons = {
    green: CheckCircle,
    yellow: Clock,
    red: XCircle,
    gray: AlertTriangle,
  }
  const Icon = icons[color]

  return (
    <div className={clsx(
      'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
      color === 'green' && 'bg-green-500/10 text-green-400 border border-green-500/30',
      color === 'yellow' && 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
      color === 'red' && 'bg-red-500/10 text-red-400 border border-red-500/30',
      color === 'gray' && 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
    )}>
      <Icon className="w-3 h-3" />
      <span>{status.replace(/_/g, ' ')}</span>
    </div>
  )
}

export default function PaymentsPage() {
  const { 
    payments, 
    isLoading, 
    error, 
    totalCount, 
    listPayments, 
    refreshPayments 
  } = usePayments()
  
  const stats = usePaymentStats(payments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Load payments on mount
  useEffect(() => {
    listPayments({
      limit: pageSize,
      offset: 0,
    })
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshPayments()
      toast.success('Payments refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh payments')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    listPayments({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
  }

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Stats cards
  const statsCards = [
    {
      title: 'Total Volume',
      value: PaymentEntity.formatAmount(stats.totalVolume, 'USD'),
      icon: DollarSign,
      color: 'purple',
      trend: '+12.5%',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'green',
      trend: '+2.3%',
    },
    {
      title: 'Total Payments',
      value: stats.total.toString(),
      icon: CreditCard,
      color: 'blue',
    },
    {
      title: 'Avg. Transaction',
      value: PaymentEntity.formatAmount(stats.averageAmount, 'USD'),
      icon: DollarSign,
      color: 'yellow',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Payments</h2>
          <p className="text-dark-text-secondary">
            Manage and track all your payment transactions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            leftIcon={<RefreshCw className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Link href="/payments/create">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
            >
              Create Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card variant="default" size="sm">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-dark-text-secondary text-sm mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    {stat.trend && (
                      <div className="flex items-center space-x-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">{stat.trend}</span>
                      </div>
                    )}
                  </div>
                  <div className={clsx(
                    'p-3 rounded-lg',
                    stat.color === 'purple' && 'bg-purple-500/10',
                    stat.color === 'green' && 'bg-green-500/10',
                    stat.color === 'blue' && 'bg-blue-500/10',
                    stat.color === 'yellow' && 'bg-yellow-500/10'
                  )}>
                    <stat.icon className={clsx(
                      'w-6 h-6',
                      stat.color === 'purple' && 'text-purple-400',
                      stat.color === 'green' && 'text-green-400',
                      stat.color === 'blue' && 'text-blue-400',
                      stat.color === 'yellow' && 'text-yellow-400'
                    )} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card variant="default" size="sm">
        <CardBody>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by payment ID, customer ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
                className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                {Object.values(PaymentStatus).map(status => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                leftIcon={<Download className="w-5 h-5" />}
              >
                Export
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="default" size="sm" className="border-red-500/30">
          <CardBody>
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Payments Table */}
      <Card variant="default">
        <CardBody>
          {isLoading && !isRefreshing ? (
            // Loading state
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-dark-bg rounded w-32" />
                      <div className="h-3 bg-dark-bg rounded w-48" />
                    </div>
                    <div className="h-8 bg-dark-bg rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPayments.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 border-b border-dark-border text-sm text-dark-text-secondary">
                <div className="col-span-3">Payment ID</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Customer</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-dark-border">
                {filteredPayments.map((payment, index) => (
                  <motion.div
                    key={payment.payment_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 py-4 hover:bg-dark-bg/50 transition-colors"
                  >
                    {/* Payment ID */}
                    <div className="lg:col-span-3">
                      <Link
                        href={`/payments/${payment.payment_id}`}
                        className="font-mono text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {payment.payment_id}
                      </Link>
                      {payment.description && (
                        <p className="text-xs text-dark-text-muted mt-1 truncate">
                          {payment.description}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="lg:col-span-2">
                      <p className="font-semibold">
                        {PaymentEntity.formatAmount(payment.amount, payment.currency)}
                      </p>
                      {payment.amount_captured && payment.amount_captured < payment.amount && (
                        <p className="text-xs text-dark-text-muted">
                          Captured: {PaymentEntity.formatAmount(payment.amount_captured, payment.currency)}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-2">
                      <StatusBadge status={payment.status} />
                    </div>

                    {/* Customer */}
                    <div className="lg:col-span-2">
                      {payment.email ? (
                        <p className="text-sm truncate">{payment.email}</p>
                      ) : payment.customer_id ? (
                        <p className="text-sm font-mono truncate">{payment.customer_id}</p>
                      ) : (
                        <p className="text-sm text-dark-text-muted">Guest</p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="lg:col-span-2">
                      <p className="text-sm text-dark-text-secondary">
                        {payment.created_at
                          ? format(new Date(payment.created_at), 'MMM dd, yyyy')
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-dark-text-muted">
                        {payment.created_at
                          ? format(new Date(payment.created_at), 'HH:mm')
                          : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1 flex items-center justify-end space-x-2">
                      <Link href={`/payments/${payment.payment_id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-dark-border">
                  <p className="text-sm text-dark-text-secondary">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} payments
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage * pageSize >= totalCount}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Empty state
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-dark-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-dark-text-secondary mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first payment to get started'}
              </p>
              <Link href="/payments/create">
                <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
                  Create Payment
                </Button>
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}