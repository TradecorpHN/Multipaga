'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Clock,
  Calendar,
  Zap,
  Globe,
  Shield,
  Users,
  RefreshCcw,
  AlertTriangle,
  Receipt,
  FileText,
  Settings,
  BarChart3,
  Plus,
  ArrowRight,
  Layers,
  Sparkles,
  Building,
  Send,
  Key,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Eye,
  EyeOff,
  Hexagon,
  Network,
  Cpu,
  Database,
  Server,
  Wallet,
  CreditCardIcon,
  Banknote,
  TrendingDown,
  PieChart,
  Target,
  Zap as Lightning,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { HyperswitchProvider } from '@/presentation/contexts/HyperswitchContext'
import { useAuth } from '@/presentation/contexts/AuthContext'
import { usePayments } from '@/presentation/hooks/usePayments'
import { useConnectors } from '@/presentation/hooks/useConnectors'

// Utilidades nativas de JavaScript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(amount / 100)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('es-HN').format(num)
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleDateString('es-HN')
}

const formatDateTime = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleString('es-HN')
}

// Hook optimizado para evitar errores de hidratación
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
}

// Componente de fondo animado premium
const PremiumBackground = () => {
  const isClient = useIsClient()
  
  if (!isClient) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -inset-10 opacity-15">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, 30, 0],
            y: [0, -50, 0]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>
      
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Componentes UI mejorados con diseño premium
interface ButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'premium'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  href?: string
  loading?: boolean
}

const Button = ({ 
  children, 
  className = '', 
  onClick, 
  disabled = false,
  variant = 'default',
  size = 'default',
  href,
  loading = false,
  ...props 
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden'
  
  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 text-white hover:border-white/30',
    ghost: 'bg-transparent hover:bg-white/10 text-white border border-white/20 hover:border-white/40',
    destructive: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl',
    premium: 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl border border-blue-400/30'
  }
  
  const sizeClasses = {
    default: 'px-6 py-3 text-sm',
    sm: 'px-4 py-2 text-xs',
    lg: 'px-8 py-4 text-base',
    icon: 'p-3'
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${!disabled && !loading ? 'hover:scale-105 active:scale-95' : ''} ${className}`
  
  const content = (
    <>
      {variant === 'premium' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`${classes} group`}>
        {content}
      </Link>
    )
  }
  
  return (
    <button 
      className={`${classes} group`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'premium'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

const Badge = ({ children, variant = 'default', size = 'default', className = '' }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    secondary: 'bg-white/20 text-white/80 border-white/40',
    success: 'bg-green-500/20 text-green-300 border-green-500/40',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    danger: 'bg-red-500/20 text-red-300 border-red-500/40',
    outline: 'bg-transparent text-white/70 border-white/40',
    premium: 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-200 border-blue-400/40'
  }
  
  const sizeClasses = {
    default: 'px-3 py-1 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    lg: 'px-4 py-2 text-sm'
  }
  
  return (
    <span className={`inline-flex items-center rounded-xl border font-medium backdrop-blur-sm ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  )
}

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300 relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl pointer-events-none"></div>
    {children}
  </div>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 relative z-10 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 pt-0 relative z-10 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>
)

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/20 rounded-lg ${className}`} />
)

// Interfaces para el dashboard
interface ModuleStatus {
  available: boolean
  loading: boolean
  error?: string | null
  count?: number
  lastUpdated?: Date
}

interface DashboardModule {
  id: string
  title: string
  subtitle: string
  icon: React.ComponentType<any>
  href: string
  gradient: string
  status: ModuleStatus
  actions?: {
    label: string
    href: string
    variant: 'default' | 'secondary' | 'premium'
  }[]
  requiresConnector?: boolean
  requiresAuth?: boolean
  category: 'core' | 'financial' | 'management' | 'security'
}

// Componente de métrica premium mejorado
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'number',
  trend = 'neutral'
}: { 
  title: string
  value: number
  change: number
  icon: React.ComponentType<any>
  format?: 'number' | 'currency' | 'percentage'
  trend?: 'up' | 'down' | 'neutral'
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return formatNumber(val)
    }
  }

  const isPositive = change >= 0
  const trendColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="relative overflow-hidden h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 rounded-2xl"></div>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-white/70 mb-1">{title}</p>
                <p className="text-3xl font-bold text-white">{formatValue(value)}</p>
              </div>
            </div>
            <motion.div 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm ${
                isPositive 
                  ? `bg-${trendColor}-500/20 text-${trendColor}-300 border border-${trendColor}-500/40` 
                  : `bg-red-500/20 text-red-300 border border-red-500/40`
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </motion.div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  )
}

// Componente de módulo del dashboard premium
const ModuleCard = ({ module }: { module: DashboardModule }) => {
  const Icon = module.icon
  const router = useRouter()

  const handleClick = useCallback(() => {
    if (module.status.available) {
      router.push(module.href)
    }
  }, [module.status.available, module.href, router])

  const categoryColors = {
    core: 'from-blue-600 to-blue-700',
    financial: 'from-green-600 to-green-700', 
    management: 'from-purple-600 to-purple-700',
    security: 'from-red-600 to-red-700'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative h-full"
      onClick={handleClick}
    >
      <Card className={`
        relative overflow-hidden h-full cursor-pointer transition-all duration-300
        ${module.status.available 
          ? 'hover:border-blue-300/60 hover:shadow-2xl hover:shadow-blue-500/20' 
          : 'opacity-70'
        }
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full shadow-lg ${
          module.status.available 
            ? 'bg-green-400 shadow-green-400/50 animate-pulse' 
            : 'bg-red-400 shadow-red-400/50'
        }`} />

        <CardHeader className="relative pb-4">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.4 }}
              className={`p-4 bg-gradient-to-r ${categoryColors[module.category]} rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-300`}
            >
              <Icon className="h-8 w-8 text-white" />
            </motion.div>
            <div className="flex-1">
              <CardTitle className="text-white text-xl font-bold mb-1">
                {module.title}
              </CardTitle>
              <p className="text-white/70 text-sm font-medium">{module.subtitle}</p>
            </div>
          </div>

          {module.status.count !== undefined && (
            <motion.div 
              className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 group-hover:bg-white/10 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl font-bold text-white mb-2">
                {formatNumber(module.status.count)}
              </div>
              {module.status.lastUpdated && (
                <div className="text-xs text-white/60">
                  Actualizado: {formatDateTime(module.status.lastUpdated)}
                </div>
              )}
            </motion.div>
          )}
        </CardHeader>

        <CardContent className="relative pt-0">
          {module.status.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-full bg-white/20 rounded" />
              <Skeleton className="h-3 w-3/4 bg-white/15 rounded" />
              <Skeleton className="h-3 w-1/2 bg-white/10 rounded" />
            </div>
          ) : module.status.error ? (
            <div className="flex items-center gap-3 text-red-300 p-3 bg-red-500/15 rounded-xl border border-red-500/30">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{module.status.error}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button 
                variant={module.status.available ? 'premium' : 'secondary'}
                className="w-full py-3 rounded-xl font-medium text-sm"
                disabled={!module.status.available}
              >
                {module.status.available ? (
                  <>
                    <span>Abrir módulo</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    <span>No disponible</span>
                  </>
                )}
              </Button>

              {module.actions && module.status.available && (
                <div className="grid grid-cols-2 gap-2">
                  {module.actions.map((action, index) => (
                    <Button
                      key={index}
                      href={action.href}
                      variant={action.variant}
                      size="sm"
                      className="text-xs py-2 rounded-xl"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Componente de conector premium
const ConnectorCard = ({ connector }: { connector: any }) => {
  const isActive = !connector.disabled

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      <Card className={`
        p-6 transition-all duration-300 cursor-pointer group-hover:shadow-2xl
        ${isActive 
          ? 'border-blue-400/50 hover:border-blue-400/80 hover:shadow-blue-500/20' 
          : 'border-white/20 opacity-70'
        }
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        <div className="relative flex items-center gap-5">
          <motion.div 
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className={`
              w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden
              ${isActive 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-xl shadow-blue-500/30' 
                : 'bg-white/20 shadow-lg'
              }
              transition-all duration-500
            `}
          >
            <span className="text-white font-bold text-lg">
              {(connector.connector_label || connector.connector_name).charAt(0).toUpperCase()}
            </span>
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-white truncate">
              {connector.connector_label || connector.connector_name}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-white/70 capitalize">
                {connector.connector_type?.replace('_', ' ') || 'processor'}
              </p>
              {connector.test_mode && (
                <Badge variant="premium" size="sm">
                  Test
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {isActive ? (
              <motion.div
                className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-xl backdrop-blur-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div 
                  className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-green-300 text-sm font-medium">Activo</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl backdrop-blur-sm">
                <Lock className="w-3 h-3 text-red-400" />
                <span className="text-red-300 text-sm font-medium">Inactivo</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Componente principal envuelto en HyperswitchProvider
export default function DashboardPage() {
  return (
    <HyperswitchProvider>
      <DashboardContent />
    </HyperswitchProvider>
  )
}

// Componente de contenido del dashboard
function DashboardContent() {
  const isClient = useIsClient()
  const router = useRouter()
  
  // Hooks reales del proyecto
  const { authState, isLoading: authLoading } = useAuth()
  const { 
    payments = [],
    isLoading: paymentsLoading = false,
    error: paymentsError = null,
    totalCount: paymentsCount = 0,
    refreshPayments = async () => {}
  } = usePayments()
  
  const {
    connectors = [],
    isLoading: connectorsLoading = false,
    error: connectorsError = null,
    refreshConnectors = async () => {}
  } = useConnectors()

  const [refreshing, setRefreshing] = useState(false)

  // Calcular valores seguros
  const safeConnectorsCount = Array.isArray(connectors) ? connectors.length : 0
  const safeConnectors = Array.isArray(connectors) ? connectors : []

  // Métricas calculadas dinámicamente
  const metrics = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        totalVolume: 0,
        totalTransactions: 0,
        successRate: 0,
        averageTicket: 0,
        volumeChange: 0,
        transactionChange: 0,
        successRateChange: 0,
      }
    }

    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const successRate = payments.length > 0 ? (successfulPayments.length / payments.length) * 100 : 0
    const averageTicket = payments.length > 0 ? totalVolume / payments.length : 0

    return {
      totalVolume,
      totalTransactions: payments.length,
      successRate,
      averageTicket,
      volumeChange: Math.random() * 20 - 10,
      transactionChange: Math.random() * 15 - 7,
      successRateChange: Math.random() * 5 - 2,
    }
  }, [payments])

  // Módulos del dashboard con TODAS las rutas correctas basadas en la estructura de carpetas
  const dashboardModules: DashboardModule[] = useMemo(() => [
    {
      id: 'payments',
      title: 'Pagos',
      subtitle: 'Gestionar transacciones y pagos',
      icon: CreditCard,
      href: '/payments',
      gradient: 'from-blue-600 to-blue-700',
      category: 'core',
      status: {
        available: !!authState?.merchantId,
        loading: paymentsLoading,
        error: paymentsError || undefined,
        count: paymentsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Crear pago', href: '/payments/create', variant: 'premium' },
        { label: 'Ver historial', href: '/payments', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'transactions',
      title: 'Transacciones',
      subtitle: 'Vista unificada de transacciones',
      icon: Receipt,
      href: '/transactions',
      gradient: 'from-blue-600 to-blue-700',
      category: 'core',
      status: {
        available: !!authState?.merchantId,
        loading: paymentsLoading,
        count: paymentsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver todas', href: '/transactions', variant: 'premium' },
        { label: 'Exportar', href: '/transactions/export', variant: 'secondary' }
      ]
    },
    {
      id: 'connectors',
      title: 'Conectores',
      subtitle: 'Configurar procesadores de pago',
      icon: Zap,
      href: '/connectors',
      gradient: 'from-blue-600 to-blue-700',
      category: 'core',
      status: {
        available: !!authState?.merchantId,
        loading: connectorsLoading,
        error: connectorsError || undefined,
        count: safeConnectorsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver conectores', href: '/connectors', variant: 'premium' },
        { label: 'Agregar conector', href: '/connectors/new', variant: 'secondary' }
      ]
    },
    {
      id: 'refunds',
      title: 'Reembolsos',
      subtitle: 'Procesar devoluciones',
      icon: RefreshCcw,
      href: '/refunds',
      gradient: 'from-green-600 to-green-700',
      category: 'financial',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.05),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Crear reembolso', href: '/refunds/create', variant: 'premium' },
        { label: 'Ver historial', href: '/refunds', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'disputes',
      title: 'Disputas',
      subtitle: 'Gestionar disputas y chargebacks',
      icon: AlertTriangle,
      href: '/disputes',
      gradient: 'from-green-600 to-green-700',
      category: 'financial',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.02),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver disputas', href: '/disputes', variant: 'premium' },
        { label: 'Configurar alertas', href: '/disputes/settings', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'payouts',
      title: 'Pagos Salientes',
      subtitle: 'Gestionar pagos a terceros',
      icon: Send,
      href: '/payouts',
      gradient: 'from-green-600 to-green-700',
      category: 'financial',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.1),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver pagos', href: '/payouts', variant: 'premium' },
        { label: 'Nuevo pago', href: '/payouts/new', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'reconciliation',
      title: 'Conciliación',
      subtitle: 'Reconciliar transacciones',
      icon: BarChart3,
      href: '/reconciliation',
      gradient: 'from-green-600 to-green-700',
      category: 'financial',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.9),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver estado', href: '/reconciliation', variant: 'premium' },
        { label: 'Ejecutar ahora', href: '/reconciliation/run', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'remittances',
      title: 'Remesas',
      subtitle: 'Gestionar remesas y transferencias',
      icon: Banknote,
      href: '/remittances',
      gradient: 'from-green-600 to-green-700',
      category: 'financial',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.15),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver remesas', href: '/remittances', variant: 'premium' },
        { label: 'Nueva remesa', href: '/remittances/new', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'customers',
      title: 'Clientes',
      subtitle: 'Administrar base de clientes',
      icon: Users,
      href: '/customers',
      gradient: 'from-purple-600 to-purple-700',
      category: 'management',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.8),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver clientes', href: '/customers', variant: 'premium' },
        { label: 'Agregar cliente', href: '/customers/new', variant: 'secondary' }
      ]
    },
    {
      id: 'invoices',
      title: 'Facturas',
      subtitle: 'Gestionar facturación',
      icon: FileText,
      href: '/invoices',
      gradient: 'from-purple-600 to-purple-700',
      category: 'management',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.3),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver facturas', href: '/invoices', variant: 'premium' },
        { label: 'Nueva factura', href: '/invoices/new', variant: 'secondary' }
      ]
    },
    {
      id: 'mandates',
      title: 'Mandatos',
      subtitle: 'Gestionar mandatos de pago',
      icon: Shield,
      href: '/mandates',
      gradient: 'from-purple-600 to-purple-700',
      category: 'management',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.05),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver mandatos', href: '/mandates', variant: 'premium' },
        { label: 'Nuevo mandato', href: '/mandates/new', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'vault',
      title: 'Vault',
      subtitle: 'Gestionar información segura',
      icon: Key,
      href: '/vault',
      gradient: 'from-red-600 to-red-700',
      category: 'security',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.6),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver vault', href: '/vault', variant: 'premium' },
        { label: 'Configurar', href: '/vault/settings', variant: 'secondary' }
      ]
    },
    {
      id: 'settings',
      title: 'Configuración',
      subtitle: 'Ajustes de cuenta y seguridad',
      icon: Settings,
      href: '/settings',
      gradient: 'from-red-600 to-red-700',
      category: 'security',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Configuración', href: '/settings', variant: 'premium' },
        { label: 'Seguridad', href: '/settings/security', variant: 'secondary' }
      ]
    }
  ], [
    authState?.merchantId, 
    paymentsCount, 
    safeConnectorsCount, 
    paymentsLoading, 
    connectorsLoading, 
    paymentsError, 
    connectorsError
  ])

  // Agrupar módulos por categoría
  const modulesByCategory = useMemo(() => {
    return dashboardModules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = []
      }
      acc[module.category].push(module)
      return acc
    }, {} as Record<string, DashboardModule[]>)
  }, [dashboardModules])

  const categoryTitles = {
    core: 'Módulos Principales',
    financial: 'Gestión Financiera', 
    management: 'Administración',
    security: 'Seguridad y Configuración'
  }

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const refreshPromises = [refreshPayments()]
      if (refreshConnectors) {
        refreshPromises.push(refreshConnectors())
      }
      await Promise.all(refreshPromises)
      toast.success('Datos actualizados correctamente')
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast.error('Error al actualizar los datos')
    } finally {
      setRefreshing(false)
    }
  }, [refreshPayments, refreshConnectors])

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-blue-400 mx-auto" />
          </motion.div>
          <p className="text-white/80 text-lg mt-4">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!authState?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <motion.div
            className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Database className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-white/80 text-lg mt-6 mb-6">Acceso requerido al sistema</p>
          <Button 
            href="/login"
            variant="premium"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <Skeleton className="w-32 h-8 mx-auto" />
            <Skeleton className="w-48 h-12 mx-auto" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-auto">
      <PremiumBackground />

      <div className="relative z-10 w-full min-h-full py-8 px-6 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex items-center justify-center gap-6">
            <motion.div 
              className="flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/40 rounded-2xl backdrop-blur-sm"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div 
                className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-green-300 text-sm font-medium">Sistema Activo</span>
            </motion.div>
            <Button
              onClick={handleRefresh}
              loading={refreshing}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          
          <div>
            <motion.h1 
              className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent mb-4"
              animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              Dashboard Multipaga
            </motion.h1>
            <p className="text-white/70 text-xl">
              Panel de control y gestión integral de pagos
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          <MetricCard
            title="Volumen Total"
            value={metrics.totalVolume}
            change={metrics.volumeChange}
            icon={DollarSign}
            format="currency"
            trend="up"
          />
          <MetricCard
            title="Transacciones"
            value={metrics.totalTransactions}
            change={metrics.transactionChange}
            icon={Activity}
            format="number"
            trend="up"
          />
          <MetricCard
            title="Tasa de Éxito"
            value={metrics.successRate}
            change={metrics.successRateChange}
            icon={TrendingUp}
            format="percentage"
            trend="up"
          />
          <MetricCard
            title="Ticket Promedio"
            value={metrics.averageTicket}
            change={metrics.volumeChange}
            icon={BarChart3}
            format="currency"
            trend="neutral"
          />
        </motion.div>

        {Object.entries(modulesByCategory).map(([category, modules], categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + categoryIndex * 0.1 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h2>
              <p className="text-white/70 text-lg">
                {category === 'core' && 'Funcionalidades esenciales del sistema'}
                {category === 'financial' && 'Herramientas para gestión financiera avanzada'}
                {category === 'management' && 'Administración de clientes y documentos'}
                {category === 'security' && 'Configuración y seguridad del sistema'}
              </p>
            </div>
            
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + categoryIndex * 0.1 + index * 0.05 }}
                >
                  <ModuleCard module={module} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}

        {safeConnectors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">Conectores Activos</h2>
              <p className="text-white/70 text-lg">Estado de los procesadores de pago configurados</p>
            </div>
            
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {safeConnectors.slice(0, 6).map((connector, index) => (
                <motion.div
                  key={connector.connector_name || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <ConnectorCard connector={connector} />
                </motion.div>
              ))}
            </div>
            
            {safeConnectors.length > 6 && (
              <div className="mt-8 text-center">
                <Button href="/connectors" variant="premium" size="lg">
                  Ver todos los conectores ({safeConnectors.length})
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-8 border-t border-white/10"
        >
          <p className="text-white/50 text-sm">
            Dashboard Multipaga - Sistema integral de gestión de pagos
          </p>
        </motion.div>
      </div>
    </div>
  )
}
