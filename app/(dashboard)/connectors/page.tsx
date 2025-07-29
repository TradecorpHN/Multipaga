'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cable,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  CreditCard,
  Shield,
  Zap,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  Filter,
  Plus,
  Building,
  Globe,
  Lock,
  Cpu,
  Server,
  Database,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Importar hooks reales del proyecto
import { useAuth } from '@/presentation/contexts/AuthContext'
import { useConnectors, SUPPORTED_CONNECTORS, type SupportedConnector } from '@/presentation/hooks/useConnectors'
import type { Connector } from '@/presentation/hooks/useConnectors'

// Mapeo de iconos por tipo de conector
const typeIcons = {
  'payment_processor': CreditCard,
  'authentication_processor': Shield,
  'fraud_check': AlertTriangle,
  'acquirer': Building,
  'accounting': DollarSign,
} as const

// Mapeo de colores por tier
const tierColors = {
  1: 'from-emerald-500 to-green-600',
  2: 'from-blue-500 to-indigo-600',  
  3: 'from-purple-500 to-violet-600'
} as const

// Interfaces para componentes UI
interface CardProps {
  children: React.ReactNode
  className?: string
}

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'tier1' | 'tier2' | 'tier3'
  size?: 'sm' | 'default'
}

// Componentes UI reutilizables con tipos corregidos
const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  disabled = false, 
  loading = false, 
  leftIcon, 
  rightIcon 
}: ButtonProps) => {
  const variants = {
    default: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    ghost: 'bg-transparent hover:bg-white/10 text-white border border-transparent',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
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
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  )
}

const Badge = ({ children, variant = 'default', size = 'default' }: BadgeProps) => {
  const variants = {
    default: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    success: 'bg-green-500/20 text-green-300 border-green-500/40',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    danger: 'bg-red-500/20 text-red-300 border-red-500/40',
    tier1: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    tier2: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    tier3: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-xs'
  }
  
  return (
    <span className={`inline-flex items-center rounded-lg border font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

// Función utilitaria para obtener el logo del conector
function getConnectorLogo(connectorName: string): string {
  const supportedConnector = SUPPORTED_CONNECTORS[connectorName.toLowerCase()]
  return supportedConnector?.logo || '/resources/connectors/PLACEHOLDER.svg'
}

// Función para obtener la información de soporte del conector
function getConnectorSupportInfo(connectorName: string) {
  return SUPPORTED_CONNECTORS[connectorName.toLowerCase()] || {
    name: connectorName.charAt(0).toUpperCase() + connectorName.slice(1),
    tier: 3 as const,
    regions: ['Global'],
    methods: ['card'],
    logo: '/resources/connectors/PLACEHOLDER.svg'
  }
}

// Función para formatear el tipo de conector
function formatConnectorType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Función para obtener el icono por tipo
function getTypeIcon(type: string) {
  const normalizedType = type as keyof typeof typeIcons
  return typeIcons[normalizedType] || Cable
}

// Función para obtener color de tier
function getTierColor(tier: 1 | 2 | 3) {
  return tierColors[tier] || tierColors[3]
}

// Componente para la tarjeta de conector
const ConnectorCard = ({ connector }: { connector: Connector }) => {
  const [imageError, setImageError] = useState(false)
  const isActive = !connector.disabled
  const supportInfo = getConnectorSupportInfo(connector.connector_name)
  const TypeIcon = getTypeIcon(connector.connector_type)
  const tierGradient = getTierColor(supportInfo.tier)

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Card className={`
        relative group cursor-pointer overflow-hidden h-full
        ${isActive 
          ? 'border-cyan-400/50 shadow-xl shadow-cyan-500/20' 
          : 'border-gray-600/50 opacity-70'
        }
      `}>
        {/* Efecto de brillo */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        {/* Status indicator */}
        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
          isActive ? 'bg-green-400 shadow-green-400/50' : 'bg-red-400 shadow-red-400/50'
        } shadow-lg`} />

        <CardContent className="relative p-6">
          {/* Header con logo y nombre */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-xl p-2 flex items-center justify-center border border-white/20">
              {!imageError ? (
                <img
                  src={getConnectorLogo(connector.connector_name)}
                  alt={connector.connector_name}
                  className="w-12 h-12 object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {connector.connector_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg truncate">
                {supportInfo.name}
              </h3>
              {connector.connector_label && connector.connector_label !== connector.connector_name && (
                <p className="text-sm text-cyan-200 truncate">
                  {connector.connector_label}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <TypeIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-300">
                  {formatConnectorType(connector.connector_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Badges de información */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={`tier${supportInfo.tier}` as 'tier1' | 'tier2' | 'tier3'}>
              Tier {supportInfo.tier}
            </Badge>
            {connector.test_mode && (
              <Badge variant="warning">
                <Zap className="w-3 h-3 mr-1" />
                Test Mode
              </Badge>
            )}
            <Badge variant="default">
              {supportInfo.regions[0]}
            </Badge>
          </div>

          {/* Métodos de pago soportados */}
          {supportInfo.methods.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Payment Methods</p>
              <div className="flex flex-wrap gap-1">
                {supportInfo.methods.slice(0, 4).map(method => (
                  <span
                    key={method}
                    className="px-2 py-1 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded"
                  >
                    {method}
                  </span>
                ))}
                {supportInfo.methods.length > 4 && (
                  <span className="px-2 py-1 text-xs text-gray-400">
                    +{supportInfo.methods.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Status del conector */}
          <div className="mb-4">
            {isActive ? (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Inactive</span>
              </div>
            )}
          </div>

          {/* Información adicional */}
          {connector.merchant_connector_id && (
            <div className="text-xs text-gray-400 mb-4">
              ID: {connector.merchant_connector_id.slice(-8)}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => {}} // Función placeholder
            >
              View
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Settings className="w-4 h-4" />}
                onClick={() => {}} // Función placeholder
              >
                Configure
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ExternalLink className="w-4 h-4" />}
                onClick={() => {}} // Función placeholder
              >
                Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ConnectorsPage() {
  const { authState } = useAuth()
  const { 
    connectors, 
    isLoading, 
    error, 
    totalCount,
    getActiveConnectors,
    getConnectorsByType,
    refreshConnectors,
    clearError 
  } = useConnectors()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filtrado de conectores
  const filteredConnectors = useMemo(() => {
    return connectors.filter(connector => {
      const matchesSearch = searchTerm === '' ||
        connector.connector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        connector.connector_label?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = selectedType === 'all' || connector.connector_type === selectedType

      return matchesSearch && matchesType
    })
  }, [connectors, searchTerm, selectedType])

  // Agrupar conectores por tipo
  const groupedConnectors = useMemo(() => {
    const grouped: Record<string, Connector[]> = {}
    filteredConnectors.forEach(connector => {
      const type = connector.connector_type
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(connector)
    })
    return grouped
  }, [filteredConnectors])

  // Función para refrescar
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshConnectors()
      toast.success('Conectores actualizados exitosamente')
    } catch (error) {
      toast.error('Error al actualizar conectores')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Obtener tipos únicos de conectores
  const connectorTypes = useMemo(() => {
    const types = new Set(connectors.map(c => c.connector_type))
    return Array.from(types)
  }, [connectors])

  const activeConnectors = getActiveConnectors()

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
                <Server className="w-6 h-6 text-white" />
              </motion.div>
              Payment Connectors
            </h1>
            <p className="text-cyan-200">
              Manage your payment processors and service providers
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-300">{activeConnectors.length} Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-gray-300">{totalCount - activeConnectors.length} Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300">{totalCount} Total</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleRefresh}
              variant="secondary"
              loading={isRefreshing}
              leftIcon={<RefreshCw className="w-5 h-5" />}
            >
              Refresh
            </Button>
            <Button
              variant="default"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => {}} // Función placeholder
            >
              Add Connector
            </Button>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search connectors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">All Types</option>
                    {connectorTypes.map(type => (
                      <option key={type} value={type}>
                        {formatConnectorType(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-red-500/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <p>{error}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearError}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && !isRefreshing && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/20 rounded w-3/4" />
                        <div className="h-3 bg-white/20 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/20 rounded" />
                      <div className="h-3 bg-white/20 rounded w-5/6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Conectores agrupados por tipo */}
        {!isLoading && Object.keys(groupedConnectors).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedConnectors).map(([type, typeConnectors]) => {
              const TypeIcon = getTypeIcon(type)
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <TypeIcon className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">
                      {formatConnectorType(type)}
                    </h2>
                    <Badge variant="default">
                      {typeConnectors.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {typeConnectors.map((connector, index) => (
                      <motion.div
                        key={connector.merchant_connector_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <ConnectorCard connector={connector} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && Object.keys(groupedConnectors).length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {searchTerm || selectedType !== 'all' ? 'No connectors found' : 'No connectors configured'}
                </h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  {searchTerm || selectedType !== 'all'
                    ? 'Try adjusting your search terms or filters'
                    : 'Configure your first payment connector to start processing payments with Multipaga'}
                </p>
                <div className="flex justify-center gap-4">
                  {(searchTerm || selectedType !== 'all') ? (
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedType('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      leftIcon={<Plus className="w-5 h-5" />}
                      onClick={() => {}} // Función placeholder
                    >
                      Add Your First Connector
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}