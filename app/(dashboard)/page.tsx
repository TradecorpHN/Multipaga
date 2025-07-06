'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/presentation/contexts/AuthContext'
import { hyperswitchClient } from '@/infrastructure/api/HyperswitchClient'
import {
  Activity,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// Dashboard stats interface
interface DashboardStats {
  totalPayments: number
  successfulPayments: number
  pendingPayments: number
  failedPayments: number
  totalRefunds: number
  activeDisputes: number
  totalVolume: string
  successRate: number
}

// Stats card component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'purple' 
}: {
  title: string
  value: string | number
  icon: any
  trend?: string
  color?: 'purple' | 'green' | 'yellow' | 'red' | 'blue'
}) {
  const colorClasses = {
    purple: 'from-purple-600 to-pink-600 text-purple-400 border-purple-500/30',
    green: 'from-green-600 to-emerald-600 text-green-400 border-green-500/30',
    yellow: 'from-yellow-600 to-orange-600 text-yellow-400 border-yellow-500/30',
    red: 'from-red-600 to-rose-600 text-red-400 border-red-500/30',
    blue: 'from-blue-600 to-cyan-600 text-blue-400 border-blue-500/30',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="neumorphic-card p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-dark-text-secondary text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white mb-2">{value}</p>
          {trend && (
            <div className="flex items-center space-x-1">
              <TrendingUp className={`w-4 h-4 ${colorClasses[color].split(' ')[2]}`} />
              <span className={`text-sm ${colorClasses[color].split(' ')[2]}`}>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')} bg-opacity-10 border ${colorClasses[color].split(' ')[3]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { authState } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Fetch payments list to calculate stats
      const paymentsResponse = await hyperswitchClient.post('/payments/list', {
        limit: 100,
        offset: 0,
      })

      const payments = (paymentsResponse as any).data || []
      
      // Calculate stats from payments
      const totalPayments = payments.length
      const successfulPayments = payments.filter((p: any) => p.status === 'succeeded').length
      const pendingPayments = payments.filter((p: any) => ['processing', 'requires_payment_method', 'requires_confirmation'].includes(p.status)).length
      const failedPayments = payments.filter((p: any) => p.status === 'failed').length
      
      const totalVolume = payments
        .filter((p: any) => p.status === 'succeeded')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

      const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0

      // Mock data for refunds and disputes (since we don't have the endpoints yet)
      const mockStats: DashboardStats = {
        totalPayments,
        successfulPayments,
        pendingPayments,
        failedPayments,
        totalRefunds: 0,
        activeDisputes: 0,
        totalVolume: `$${(totalVolume / 100).toFixed(2)}`,
        successRate: Math.round(successRate),
      }

      setStats(mockStats)
      
      // Set recent activity (last 5 payments)
      setRecentActivity(payments.slice(0, 5))

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
      
      // Set mock data on error
      setStats({
        totalPayments: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        totalRefunds: 0,
        activeDisputes: 0,
        totalVolume: '$0.00',
        successRate: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          Welcome back, {authState?.profileName || 'Merchant'}
        </h2>
        <p className="text-dark-text-secondary">
          Here's what's happening with your payments today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Volume"
          value={stats?.totalVolume || '$0.00'}
          icon={DollarSign}
          color="purple"
        />
        <StatsCard
          title="Success Rate"
          value={`${stats?.successRate || 0}%`}
          icon={Activity}
          trend="+2.5%"
          color="green"
        />
        <StatsCard
          title="Pending Payments"
          value={stats?.pendingPayments || 0}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Active Disputes"
          value={stats?.activeDisputes || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neumorphic-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Payment Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-dark-text-secondary">Successful</span>
              </div>
              <span className="font-semibold">{stats?.successfulPayments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-dark-text-secondary">Pending</span>
              </div>
              <span className="font-semibold">{stats?.pendingPayments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-dark-text-secondary">Failed</span>
              </div>
              <span className="font-semibold">{stats?.failedPayments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <span className="text-dark-text-secondary">Refunded</span>
              </div>
              <span className="font-semibold">{stats?.totalRefunds || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="neumorphic-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((payment, index) => (
                <div key={payment.payment_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-4 h-4 text-dark-text-muted" />
                    <div>
                      <p className="text-sm font-medium">{payment.payment_id}</p>
                      <p className="text-xs text-dark-text-muted">
                        {payment.created_at ? format(new Date(payment.created_at), 'MMM dd, HH:mm') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${((payment.amount || 0) / 100).toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      payment.status === 'succeeded' ? 'text-green-400' :
                      payment.status === 'failed' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-text-secondary text-sm text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="neumorphic-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.a
            href="/payments/create"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg text-center hover:shadow-glow transition-all"
          >
            <CreditCard className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <span className="text-sm font-medium">Create Payment</span>
          </motion.a>
          
          <motion.a
            href="/refunds/create"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg text-center hover:shadow-glow transition-all"
          >
            <RefreshCw className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <span className="text-sm font-medium">Process Refund</span>
          </motion.a>
          
          <motion.a
            href="/disputes"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg text-center hover:shadow-glow transition-all"
          >
            <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <span className="text-sm font-medium">View Disputes</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  )
}