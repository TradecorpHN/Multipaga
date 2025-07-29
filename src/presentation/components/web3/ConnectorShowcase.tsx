// src/presentation/components/web3/ConnectorShowcase.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { 
  Search, 
  Filter, 
  Globe, 
  Zap, 
  Shield, 
  Cpu, 
  TrendingUp,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Settings
} from 'lucide-react'
import { Card, CardContent } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { 
  SUPPORTED_CONNECTORS, 
  ConnectorTier,
  SupportedConnectorInfo 
} from '@/presentation/hooks/useConnectors'
import type { Connector } from '@/presentation/hooks/useConnectors'

interface ConnectorShowcaseProps {
  connectors: Connector[]
  loading?: boolean
  onConnectorSelect?: (connector: Connector) => void
  onConnectorConfigure?: (connector: Connector) => void
}

// FIX: Tipado estricto para las opciones de filtro
interface FilterOption {
  value: string | number
  label: string
  icon: React.ComponentType
}

// Filtros disponibles
const FILTER_OPTIONS = {
  tier: [
    { value: 'all', label: 'Todos los Tiers', icon: Globe },
    { value: 1, label: 'Tier 1 - Enterprise', icon: Star },
    { value: 2, label: 'Tier 2 - Regional', icon: TrendingUp },
    { value: 3, label: 'Tier 3 - Specialized', icon: Cpu },
  ] as FilterOption[],
  region: [
    { value: 'all', label: 'Todas las Regiones', icon: Globe },
    { value: 'Global', label: 'Global', icon: Globe },
    { value: 'US', label: 'Estados Unidos', icon: Zap },
    { value: 'Europe', label: 'Europa', icon: Shield },
    { value: 'Latin America', label: 'Latinoamérica', icon: TrendingUp },
  ] as FilterOption[],
  status: [
    { value: 'all', label: 'Todos los Estados', icon: Eye },
    { value: 'active', label: 'Activos', icon: CheckCircle },
    { value: 'inactive', label: 'Inactivos', icon: AlertCircle },
    { value: 'pending', label: 'Pendientes', icon: Clock },
  ] as FilterOption[]
}

// FIX: Tipado estricto para los colores de tier
const tierColors: Record<ConnectorTier, string> = {
  1: 'from-yellow-400 via-orange-500 to-red-500',
  2: 'from-blue-400 via-purple-500 to-pink-500', 
  3: 'from-green-400 via-teal-500 to-blue-500'
}

const statusColors = {
  active: 'from-emerald-400 to-green-500',
  inactive: 'from-gray-400 to-gray-600',
  pending: 'from-yellow-400 to-orange-500'
} as const

// Componente individual de conector con efectos Web3
const ConnectorCard3D = ({ 
  connector, 
  connectorInfo, 
  onSelect, 
  onConfigure 
}: {
  connector: Connector
  connectorInfo: SupportedConnectorInfo | undefined
  onSelect?: () => void
  onConfigure?: () => void
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const isActive = !connector.disabled && connector.status !== 'inactive'

  // FIX: Función helper para obtener el color del tier de manera segura
  const getTierColor = (tier?: ConnectorTier): string => {
    if (!tier || !(tier in tierColors)) {
      return tierColors[3] // fallback to tier 3
    }
    return tierColors[tier]
  }

  // FIX: Función helper para obtener el color del status de manera segura
  const getStatusColor = (status?: string): string => {
    if (!status || !(status in statusColors)) {
      return statusColors.active
    }
    return statusColors[status as keyof typeof statusColors]
  }

  return (
    <motion.div
      className="relative group cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ 
        scale: 1.05,
        rotateY: 5,
        rotateX: 5,
        z: 50
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        transformPerspective: 1000
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Glow effect de fondo */}
      <motion.div
        className={`absolute inset-0 rounded-2xl blur-xl opacity-0 bg-gradient-to-r ${
          getTierColor(connectorInfo?.tier)
        }`}
        animate={{ 
          opacity: isHovered ? 0.3 : 0,
          scale: isHovered ? 1.1 : 1
        }}
        transition={{ duration: 0.3 }}
      />

      <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border-white/20 hover:border-white/40">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-500/20" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            animate={{
              x: isHovered ? ['0%', '100%'] : '0%'
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </div>

        <CardContent className="relative p-6">
          {/* Header con logo y status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Logo container con efecto 3D */}
              <motion.div
                className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${
                  getTierColor(connectorInfo?.tier)
                } p-1 shadow-2xl`}
                whileHover={{ 
                  rotateY: 15,
                  rotateX: 15,
                  scale: 1.1
                }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="w-full h-full bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center">
                  <Image
                    src={`/resources/connectors/${connector.connector_name.toUpperCase()}.svg`}
                    alt={connectorInfo?.name || connector.connector_name}
                    width={32}
                    height={32}
                    className="filter brightness-0 invert drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      // Mostrar fallback text
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `<span class="text-white font-bold text-lg">${
                          (connectorInfo?.name || connector.connector_name).charAt(0).toUpperCase()
                        }</span>`
                      }
                    }}
                  />
                </div>
                
                {/* Tier indicator */}
                {connectorInfo && (
                  <motion.div
                    className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r ${
                      getTierColor(connectorInfo.tier)
                    } flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                    animate={{ rotate: isHovered ? 360 : 0 }}
                    transition={{ duration: 1 }}
                  >
                    {connectorInfo.tier}
                  </motion.div>
                )}
              </motion.div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {connector.connector_label || connectorInfo?.name || connector.connector_name}
                </h3>
                <p className="text-sm text-white/60 capitalize">
                  {connector.connector_type.replace('_', ' ')}
                </p>
                
                {/* Regions and methods */}
                {connectorInfo && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {connectorInfo.regions.slice(0, 2).map((region: string) => (
                      <Badge key={region} size="sm" variant="outline">
                        {region}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status indicator */}
            <motion.div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r ${
                getStatusColor(connector.status)
              }`}
              animate={{ scale: isActive ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className={`w-2 h-2 rounded-full bg-white ${isActive ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium text-white">
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </motion.div>
          </div>

          {/* Payment methods */}
          {connectorInfo && (
            <div className="mb-4">
              <p className="text-xs text-white/60 mb-2">Métodos Soportados:</p>
              <div className="flex flex-wrap gap-1">
                {connectorInfo.methods.slice(0, 3).map((method: string) => (
                  <Badge key={method} size="sm" variant="secondary">
                    {method.replace('_', ' ')}
                  </Badge>
                ))}
                {connectorInfo.methods.length > 3 && (
                  <Badge size="sm" variant="glow">
                    +{connectorInfo.methods.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Test mode indicator */}
          {connector.test_mode && (
            <div className="mb-4">
              <Badge variant="warning" size="sm">
                <AlertCircle className="w-3 h-3 mr-1" />
                Modo Test
              </Badge>
            </div>
          )}

          {/* Action buttons */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                className="flex space-x-2"
              >
                <Button
                  size="sm"
                  variant="glow"
                  onClick={onSelect}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onConfigure}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Componente principal del showcase
export const ConnectorShowcase: React.FC<ConnectorShowcaseProps> = ({
  connectors,
  loading = false,
  onConnectorSelect,
  onConnectorConfigure
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState<string | number>('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // FIX: Filtrar conectores con tipado correcto
  const filteredConnectors = useMemo(() => {
    return connectors.filter(connector => {
      const connectorInfo = SUPPORTED_CONNECTORS[connector.connector_name]
      
      // Filtro por búsqueda
      const matchesSearch = !searchTerm || 
        connector.connector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        connector.connector_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        connectorInfo?.name.toLowerCase().includes(searchTerm.toLowerCase())

      // FIX: Filtro por tier con comparación correcta de tipos
      const matchesTier = selectedTier === 'all' || 
        (connectorInfo && connectorInfo.tier === Number(selectedTier))

      // Filtro por región
      const matchesRegion = selectedRegion === 'all' ||
        (connectorInfo && connectorInfo.regions.includes(selectedRegion))

      // Filtro por status
      const matchesStatus = selectedStatus === 'all' ||
        connector.status === selectedStatus ||
        (selectedStatus === 'active' && !connector.disabled && connector.status !== 'inactive')

      return matchesSearch && matchesTier && matchesRegion && matchesStatus
    })
  }, [connectors, searchTerm, selectedTier, selectedRegion, selectedStatus])

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conectores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-white/40"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex bg-white/10 backdrop-blur-xl rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Tier filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {FILTER_OPTIONS.tier.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>

          {/* Region filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {FILTER_OPTIONS.region.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {FILTER_OPTIONS.status.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Conectores', value: connectors.length, icon: Globe },
          { label: 'Activos', value: connectors.filter(c => !c.disabled).length, icon: CheckCircle },
          { label: 'Tier 1', value: connectors.filter(c => SUPPORTED_CONNECTORS[c.connector_name]?.tier === 1).length, icon: Star },
          { label: 'Filtrados', value: filteredConnectors.length, icon: Filter },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Connectors grid/list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white/10 backdrop-blur-xl rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredConnectors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Filter className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay conectores</h3>
          <p className="text-white/60">No se encontraron conectores que coincidan con los filtros.</p>
        </motion.div>
      ) : (
        <motion.div
          className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}
          layout
        >
          <AnimatePresence>
            {filteredConnectors.map((connector, index) => {
              const connectorInfo = SUPPORTED_CONNECTORS[connector.connector_name]
              
              return (
                <motion.div
                  key={connector.merchant_connector_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <ConnectorCard3D
                    connector={connector}
                    connectorInfo={connectorInfo}
                    onSelect={() => onConnectorSelect?.(connector)}
                    onConfigure={() => onConnectorConfigure?.(connector)}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}