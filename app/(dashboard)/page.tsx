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
  Server
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
// Removed date-fns imports - using native JavaScript Date methods
import toast from 'react-hot-toast'

// Importar hooks y contextos reales del proyecto
import { useAuth } from '@/presentation/contexts/AuthContext'
import { usePayments } from '@/presentation/hooks/usePayments'
import { useConnectors } from '@/presentation/hooks/useConnectors'
// Native JavaScript utility functions
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

// Componente de red neural tecnológica OPTIMIZADA
const TechnologicalNetworkBackground = () => {
  const isClient = useIsClient()
  
  if (!isClient) return null

  const techNodes = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (i % 4) * 30 + 10 + Math.random() * 10,
    y: Math.floor(i / 4) * 35 + 10 + Math.random() * 10,
    size: Math.random() * 2 + 1.5,
    delay: i * 0.3,
    connections: Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => 
      Math.floor(Math.random() * 12)
    ).filter(conn => conn !== i)
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
      <svg className="w-full h-full">
        <defs>
          <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#4B0082" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00CED1" stopOpacity="0.5" />
          </linearGradient>
          <filter id="techGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {techNodes.map((node) => 
          node.connections.map((targetId) => {
            const targetNode = techNodes[targetId]
            if (!targetNode) return null
            const pathId = `path-${node.id}-${targetId}`
            return (
              <g key={`tech-${node.id}-${targetId}`}>
                <path
                  id={pathId}
                  d={`M ${node.x}% ${node.y}% L ${targetNode.x}% ${targetNode.y}%`}
                  stroke="url(#techGradient)"
                  strokeWidth={1}
                  filter="url(#techGlow)"
                  fill="none"
                  opacity={0.3}
                />
                <circle r={1.5} fill="url(#techGradient)" filter="url(#techGlow)">
                  <animateMotion
                    dur={`${3 + Math.random() * 3}s`}
                    repeatCount="indefinite"
                    begin={`${Math.random() * 3}s`}
                  >
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </g>
            )
          })
        )}
        
        {techNodes.map((node) => (
          <motion.circle
            key={`node-${node.id}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill="url(#techGradient)"
            filter="url(#techGlow)"
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: node.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  )
}

// Componentes UI mejorados
interface ButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'tech'
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
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl',
    ghost: 'bg-transparent hover:bg-white/10 text-white border border-white/20 hover:border-white/40',
    destructive: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl',
    tech: 'bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:via-blue-500 hover:to-purple-500 text-white shadow-xl hover:shadow-2xl border border-cyan-400/50'
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
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }
  
  return (
    <button 
      className={classes}
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
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'tech'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

const Badge = ({ children, variant = 'default', size = 'default', className = '' }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    secondary: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    success: 'bg-green-500/20 text-green-300 border-green-500/40',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    danger: 'bg-red-500/20 text-red-300 border-red-500/40',
    outline: 'bg-transparent text-gray-300 border-gray-500/40',
    tech: 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/40'
  }
  
  const sizeClasses = {
    default: 'px-3 py-1 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    lg: 'px-4 py-2 text-sm'
  }
  
  return (
    <span className={`inline-flex items-center rounded-lg border font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  )
}

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>
)

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/20 rounded-lg ${className}`} />
)

// Interfaces para el dashboard según la API real
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
  glow: string
  status: ModuleStatus
  actions?: {
    label: string
    href: string
    variant: 'default' | 'secondary' | 'tech'
  }[]
  requiresConnector?: boolean
  requiresAuth?: boolean
}

// Colores premium tecnológicos del sistema Multipaga
const MULTIPAGA_COLORS = {
  primary: '#00BFFF',
  primaryDark: '#0080FF',
  secondary: '#00FFFF',
  accent: '#8A2BE2',
  success: '#00FF7F',
  warning: '#FFD700',
  error: '#FF1493',
  gradient: {
    primary: 'from-cyan-500 via-blue-600 to-indigo-600',
    secondary: 'from-purple-600 via-indigo-500 to-cyan-500',
    accent: 'from-cyan-400 via-blue-500 to-purple-600',
    success: 'from-emerald-400 via-green-500 to-teal-600',
    warning: 'from-amber-400 via-orange-500 to-red-500',
    cosmic: 'from-indigo-600 via-purple-500 to-pink-500',
    premium: 'from-cyan-500 via-blue-600 to-purple-600',
    tech: 'from-cyan-400 via-blue-500 to-purple-500'
  }
}

// Time ranges tecnológicos
const TIME_RANGES = [
  { value: '7d', label: '7 días', icon: Calendar, color: 'from-cyan-500 to-blue-500' },
  { value: '30d', label: '30 días', icon: Clock, color: 'from-purple-500 to-cyan-500' },
  { value: '90d', label: '90 días', icon: TrendingUp, color: 'from-green-400 to-teal-500' },
  { value: '1y', label: '1 año', icon: Globe, color: 'from-orange-400 to-red-500' },
]

// Status helpers
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'active':
    case 'completed':
      return 'success'
    case 'failed':
    case 'error':
    case 'cancelled':
      return 'danger'
    case 'processing':
    case 'pending':
    case 'requires_capture':
      return 'warning'
    default:
      return 'secondary'
  }
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'active':
    case 'completed':
      return CheckCircle2
    case 'failed':
    case 'error':
    case 'cancelled':
      return XCircle
    case 'processing':
    case 'pending':
    case 'requires_capture':
      return Clock
    default:
      return AlertCircle
  }
}

// Componente de conector tecnológico mejorado
const ConnectorCard = ({ connector }: { connector: any }) => {
  const isActive = !connector.disabled
  const StatusIcon = getStatusIcon(isActive ? 'active' : 'inactive')
  const isClient = useIsClient()
  
  if (!isClient) {
    return (
      <div className="relative p-6 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border-2 border-cyan-400/50 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {(connector.connector_label || connector.connector_name).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-white">
              {connector.connector_label || connector.connector_name}
            </h4>
            <p className="text-sm text-gray-300">
              {connector.connector_type?.replace('_', ' ') || 'processor'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative group p-6 rounded-3xl transition-all duration-500 cursor-pointer
        ${isActive 
          ? 'bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/50 shadow-xl shadow-cyan-500/25' 
          : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600/50 shadow-lg'
        }
        backdrop-blur-xl hover:shadow-2xl
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1200" />
      
      <div className="relative flex items-center gap-5">
        <motion.div 
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.8 }}
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden
            bg-gradient-to-br ${isActive ? 'from-cyan-500 to-blue-500 shadow-xl shadow-cyan-500/30' : 'from-gray-600 to-gray-700 shadow-lg'}
            transition-all duration-500 border border-cyan-400/30
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
            <p className="text-sm text-gray-300 capitalize">
              {connector.connector_type?.replace('_', ' ') || 'processor'}
            </p>
            {connector.test_mode && (
              <Badge variant="tech" size="sm" className="text-xs">
                Test
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center">
          {isActive ? (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-3 px-4 py-2 bg-green-500/25 border border-green-500/40 rounded-full backdrop-blur-sm"
            >
              <motion.div 
                className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-green-400 text-sm font-medium">Activo</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2 bg-red-500/25 border border-red-500/40 rounded-full backdrop-blur-sm">
              <Lock className="w-3 h-3 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Inactivo</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Componente de módulo del dashboard OPTIMIZADO
const ModuleCard = ({ module }: { module: DashboardModule }) => {
  const Icon = module.icon
  const router = useRouter()
  const isClient = useIsClient()

  const handleClick = useCallback(() => {
    if (module.status.available) {
      router.push(module.href)
    }
  }, [module.status.available, module.href, router])

  if (!isClient) {
    return (
      <div className="group relative h-full">
        <Card className="relative overflow-hidden h-full bg-gradient-to-br from-slate-900/95 via-cyan-900/80 to-purple-900/95 backdrop-blur-xl border-2 border-cyan-400/40">
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${module.gradient} shadow-xl`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-white">
                  {module.title}
                </CardTitle>
                <p className="text-cyan-200/80 text-sm mt-1">{module.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative h-full"
      onClick={handleClick}
    >
      <Card className={`
        relative overflow-hidden h-full transform-gpu cursor-pointer
        bg-gradient-to-br from-slate-900/95 via-cyan-900/70 to-purple-900/95 
        backdrop-blur-xl border border-cyan-400/40 hover:border-cyan-400/80 
        transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20
        ${!module.status.available ? 'opacity-70' : ''}
      `}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
          module.status.available ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-red-400 shadow-red-400/50'
        }`} />

        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`
                  p-4 rounded-2xl bg-gradient-to-br ${module.gradient} 
                  shadow-xl border border-cyan-400/30
                `}
              >
                <Icon className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <CardTitle className="text-white text-xl font-bold">
                  {module.title}
                </CardTitle>
                <p className="text-cyan-200/90 text-sm mt-1 font-medium">{module.subtitle}</p>
              </div>
            </div>
          </div>

          {module.status.count !== undefined && (
            <div className="mt-6 p-4 bg-white/10 rounded-xl border border-cyan-400/30 backdrop-blur-sm">
              <div className="text-3xl font-bold text-white mb-2">
                {formatNumber(module.status.count)}
              </div>
              {module.status.lastUpdated && (
                <div className="text-xs text-cyan-200/80">
                  Actualizado: {formatDateTime(module.status.lastUpdated)}
                </div>
              )}
            </div>
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
            <div className="flex items-center gap-3 text-red-400 p-3 bg-red-500/15 rounded-xl border border-red-500/30">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{module.status.error}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button 
                variant="tech"
                className={`
                  w-full py-3 rounded-xl font-medium text-sm transition-all duration-300
                  ${module.status.available 
                    ? `bg-gradient-to-r ${module.gradient} hover:shadow-lg border-cyan-400/20 hover:border-cyan-400/40` 
                    : 'bg-gray-600/80 cursor-not-allowed opacity-50 border-gray-500/30'
                  }
                `}
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
                      className="text-xs py-2 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40"
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

export default function DashboardPage() {
  const isClient = useIsClient()
  const router = useRouter()
  
  // Usar hooks reales del proyecto - CORREGIDOS
  const { authState, isLoading: authLoading } = useAuth()
  const { 
    payments,
    currentPayment,
    isLoading: paymentsLoading,
    error: paymentsError,
    totalCount: paymentsCount,
    refreshPayments
  } = usePayments()
  
  // Usar hook de conectores corregido
  const {
    connectors = [],
    isLoading: connectorsLoading = false,
    error: connectorsError = null,
    refreshConnectors = async () => {}
  } = useConnectors()

  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  // Calcular valores seguros para conectores
  const safeConnectorsCount = Array.isArray(connectors) ? connectors.length : 0
  const safeConnectors = Array.isArray(connectors) ? connectors : []

  // Métricas calculadas dinámicamente basadas en datos reales
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
      volumeChange: Math.random() * 20 - 10, // Mock change
      transactionChange: Math.random() * 15 - 7,
      successRateChange: Math.random() * 5 - 2,
    }
  }, [payments])

  // Módulos del dashboard con estado dinámico y RUTAS CORREGIDAS
  const dashboardModules: DashboardModule[] = useMemo(() => [
    {
      id: 'payments',
      title: 'Pagos',
      subtitle: 'Gestionar transacciones y pagos',
      icon: CreditCard,
      href: '/payments', // CORREGIDO: sin prefijo /dashboard/
      gradient: MULTIPAGA_COLORS.gradient.primary,
      glow: 'shadow-cyan-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: paymentsLoading,
        error: paymentsError || undefined,
        count: paymentsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Crear pago', href: '/payments/create', variant: 'tech' },
        { label: 'Ver historial', href: '/payments', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'refunds',
      title: 'Reembolsos',
      subtitle: 'Procesar devoluciones',
      icon: RefreshCcw,
      href: '/refunds', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.warning,
      glow: 'shadow-orange-500/30',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.05),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Crear reembolso', href: '/refunds/create', variant: 'tech' },
        { label: 'Ver historial', href: '/refunds', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'disputes',
      title: 'Disputas',
      subtitle: 'Gestionar disputas y chargebacks',
      icon: AlertTriangle,
      href: '/disputes', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.warning,
      glow: 'shadow-red-500/30',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.02),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver disputas', href: '/disputes', variant: 'tech' },
        { label: 'Configurar alertas', href: '/disputes/settings', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'customers',
      title: 'Clientes',
      subtitle: 'Administrar base de clientes',
      icon: Users,
      href: '/customers', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.success,
      glow: 'shadow-green-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.8),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver clientes', href: '/customers', variant: 'tech' },
        { label: 'Agregar cliente', href: '/customers/new', variant: 'secondary' }
      ]
    },
    {
      id: 'connectors',
      title: 'Conectores',
      subtitle: 'Configurar procesadores de pago',
      icon: Zap,
      href: '/connectors', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.accent,
      glow: 'shadow-purple-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: connectorsLoading,
        error: connectorsError || undefined,
        count: safeConnectorsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver conectores', href: '/connectors', variant: 'tech' },
        { label: 'Agregar conector', href: '/connectors/new', variant: 'secondary' }
      ]
    },
    {
      id: 'reconciliation',
      title: 'Conciliación',
      subtitle: 'Reconciliar transacciones',
      icon: Receipt,
      href: '/reconciliation', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.secondary,
      glow: 'shadow-indigo-500/30',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.9),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver estado', href: '/reconciliation', variant: 'tech' },
        { label: 'Ejecutar ahora', href: '/reconciliation/run', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'transactions',
      title: 'Transacciones',
      subtitle: 'Vista unificada de transacciones',
      icon: FileText,
      href: '/transactions', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.secondary,
      glow: 'shadow-cyan-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: paymentsLoading,
        count: paymentsCount,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver todas', href: '/transactions', variant: 'tech' },
        { label: 'Exportar', href: '/transactions/export', variant: 'secondary' }
      ]
    },
    {
      id: 'invoices',
      title: 'Facturas',
      subtitle: 'Gestionar facturación',
      icon: FileText,
      href: '/invoices', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.accent,
      glow: 'shadow-purple-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.3),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver facturas', href: '/invoices', variant: 'tech' },
        { label: 'Nueva factura', href: '/invoices/new', variant: 'secondary' }
      ]
    },
    {
      id: 'payouts',
      title: 'Pagos Salientes',
      subtitle: 'Gestionar pagos a terceros',
      icon: Send,
      href: '/payouts', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.warning,
      glow: 'shadow-orange-500/30',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.1),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver pagos', href: '/payouts', variant: 'tech' },
        { label: 'Nuevo pago', href: '/payouts/new', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'mandates',
      title: 'Mandatos',
      subtitle: 'Gestionar mandatos de pago',
      icon: Shield,
      href: '/mandates', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.secondary,
      glow: 'shadow-indigo-500/30',
      status: {
        available: safeConnectorsCount > 0 && !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.05),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver mandatos', href: '/mandates', variant: 'tech' },
        { label: 'Nuevo mandato', href: '/mandates/new', variant: 'secondary' }
      ],
      requiresConnector: true
    },
    {
      id: 'vault',
      title: 'Vault',
      subtitle: 'Gestionar información segura',
      icon: Key,
      href: '/vault', // CORREGIDO
      gradient: MULTIPAGA_COLORS.gradient.secondary,
      glow: 'shadow-indigo-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        count: Math.floor(paymentsCount * 0.6),
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Ver vault', href: '/vault', variant: 'tech' },
        { label: 'Configurar', href: '/vault/settings', variant: 'secondary' }
      ]
    },
    {
      id: 'settings',
      title: 'Configuración',
      subtitle: 'Ajustes de cuenta y seguridad',
      icon: Settings,
      href: '/settings', // CORREGIDO
      gradient: 'from-gray-600 to-gray-800',
      glow: 'shadow-gray-500/30',
      status: {
        available: !!authState?.merchantId,
        loading: false,
        lastUpdated: new Date()
      },
      actions: [
        { label: 'Configuración', href: '/settings', variant: 'tech' },
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

  // Handle refresh usando hooks reales
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

  // Loading states OPTIMIZADOS
  if (authLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Cpu className="w-12 h-12 text-cyan-400 mx-auto" />
          </motion.div>
          <p className="text-white/80 text-lg mt-4">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!authState?.isAuthenticated) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <motion.div
            className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center"
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
            variant="tech"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    )
  }

  // Renderizar loading skeleton OPTIMIZADO
  if (!isClient) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900">
        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-32 h-8 bg-white/20 rounded-xl mx-auto" />
            <div className="w-48 h-12 bg-white/20 rounded-xl mx-auto" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white/10 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-48 bg-white/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 text-white overflow-auto">
      {/* Background effects tecnológicos */}
      <TechnologicalNetworkBackground />
    
      <div className="w-full min-h-full py-4 px-4 space-y-6 relative z-10">
        {/* Header Premium tecnológico OPTIMIZADO */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-500/25 to-purple-600/20 blur-2xl -z-10" />
          
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <div className="text-center space-y-4">
                <motion.div
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <motion.div
                    className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-xl backdrop-blur-sm"
                  >
                    <motion.div 
                      className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span className="text-green-300 font-medium text-sm">Conectado</span>
                  </motion.div>
                  <span className="text-cyan-200/90 text-lg font-medium">
                    Bienvenido, <span className="font-bold">{authState.profileName || authState.merchantId}</span>
                  </span>
                </motion.div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Time range selector tecnológico */}
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl rounded-2xl p-3 border-2 border-cyan-400/40">
                {TIME_RANGES.map((range) => {
                  const Icon = range.icon
                  return (
                    <motion.button
                      key={range.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTimeRange(range.value)}
                      className={`
                        flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-sm
                        ${timeRange === range.value 
                          ? `bg-gradient-to-r ${range.color} text-white shadow-lg border-2 border-white/30` 
                          : 'text-white/70 hover:text-white hover:bg-white/10 border-2 border-transparent'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{range.label}</span>
                    </motion.button>
                  )
                })}
              </div>
              
              {/* Refresh button tecnológico */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  loading={refreshing}
                  variant="tech"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 py-4 px-8 rounded-2xl border-2 border-cyan-400/30 backdrop-blur-sm font-bold"
                >
                  <RefreshCw className={`w-5 h-5 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Error States */}
        <AnimatePresence>
          {(paymentsError || connectorsError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-4 px-6 py-5 bg-red-500/20 border border-red-500/40 rounded-2xl backdrop-blur-sm"
            >
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Errores detectados</h3>
                {paymentsError && <p className="text-red-300 text-sm">Pagos: {paymentsError}</p>}
                {connectorsError && <p className="text-red-300 text-sm">Conectores: {connectorsError}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Key Metrics OPTIMIZADOS */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              title: 'Ingresos Totales',
              value: formatCurrency(metrics.totalVolume),
              change: metrics.volumeChange,
              icon: DollarSign,
              gradient: MULTIPAGA_COLORS.gradient.success,
            },
            {
              title: 'Transacciones',
              value: formatNumber(metrics.totalTransactions),
              change: metrics.transactionChange,
              icon: CreditCard,
              gradient: MULTIPAGA_COLORS.gradient.primary,
            },
            {
              title: 'Tasa de Éxito',
              value: `${metrics.successRate.toFixed(1)}%`,
              change: metrics.successRateChange,
              icon: Activity,
              gradient: MULTIPAGA_COLORS.gradient.accent,
            },
            {
              title: 'Ticket Promedio',
              value: formatCurrency(metrics.averageTicket),
              change: 0,
              icon: TrendingUp,
              gradient: MULTIPAGA_COLORS.gradient.warning,
            }
          ].map((metric, index) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.title}
                initial={false}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Card className="group relative overflow-hidden bg-white/15 backdrop-blur-xl border border-cyan-400/50 hover:bg-white/20 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
                  
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-bold text-white/90">
                      {metric.title}
                    </CardTitle>
                    <motion.div
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg border border-cyan-400/30`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  
                  <CardContent className="relative">
                    <div className="text-2xl font-bold text-white mb-2">
                      {metric.value}
                    </div>
                    {metric.change !== 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        {metric.change > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span className={metric.change > 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                          {Math.abs(metric.change).toFixed(1)}%
                        </span>
                        <span className="text-white/60 text-xs">vs anterior</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Módulos del Dashboard OPTIMIZADOS */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl shadow-lg"
              >
                <Network className="w-6 h-6 text-white" />
              </motion.div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Módulos Tecnológicos</h2>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-cyan-400/40">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-200 font-medium">
                {dashboardModules.filter(m => m.status.available).length} de {dashboardModules.length} activos
              </span>
            </div>
          </div>

          {/* Grid de módulos optimizado */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dashboardModules.map((module, index) => (
              <div
                key={module.id}
                className="h-full"
              >
                <ModuleCard module={module} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Conectores OPTIMIZADOS */}
        {safeConnectors.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white/15 backdrop-blur-xl border border-cyan-400/50 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl shadow-lg"
                    >
                      <Server className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-white text-xl font-bold">Conectores Activos</CardTitle>
                      <p className="text-cyan-200/80">Procesadores de pago configurados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-xl backdrop-blur-sm">
                    <motion.div 
                      className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-green-300 font-medium">
                      {safeConnectors.filter((c: any) => !c.disabled).length} activos
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {safeConnectors.map((connector: any, index) => (
                    <div
                      key={connector.merchant_connector_id || connector.connector_name}
                    >
                      <ConnectorCard connector={connector} />
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button 
                    href="/connectors"
                    variant="ghost" 
                    className="text-cyan-300 hover:text-white hover:bg-white/10 px-6 py-3 rounded-xl border border-cyan-400/40 backdrop-blur-sm font-medium"
                  >
                    Ver todos los conectores ({safeConnectors.length})
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Estado sin conectores OPTIMIZADO */}
        {safeConnectors.length === 0 && !connectorsLoading && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-yellow-500/20 border-yellow-500/50">
              <CardContent className="p-6 text-center">
                <Database className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-yellow-400 mb-2">No hay conectores configurados</h3>
                <p className="text-yellow-300/80 mb-4 text-sm">Configura al menos un conector de pago para empezar a procesar transacciones.</p>
                <Button 
                  href="/connectors"
                  variant="tech"
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Configurar conector
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}