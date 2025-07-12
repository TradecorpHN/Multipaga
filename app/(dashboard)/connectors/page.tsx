'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useConnectors } from '@/presentation/contexts/ConnectorContext'
import { ConnectorEntity, ConnectorType } from '@/domain/entities/Connector'
import { Card, CardHeader, CardBody } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
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
} from 'lucide-react'
import Image from 'next/image'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// ============= Utilidad para logo path (robusta, con fallback) ==============
function getLogoPath(connectorName: string): string {
  if (!connectorName) return '/resources/connectors/PLACEHOLDER.svg'
  const normalized = connectorName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return `/resources/connectors/${normalized}.svg`
}

// ============= Icons por tipo ==================
const typeIcons: Record<ConnectorType, any> = {
  [ConnectorType.PAYMENT_PROCESSOR]: CreditCard,
  [ConnectorType.PAYMENT_VAS]: Zap,
  [ConnectorType.PAYMENT_METHOD_AUTH]: Shield,
  [ConnectorType.AUTHENTICATION_PROCESSOR]: Shield,
  [ConnectorType.PAYOUT_PROCESSOR]: DollarSign,
  [ConnectorType.FRAUD_CHECK]: AlertTriangle,
}

export default function ConnectorsPage() {
  const { connectors, isLoading, error, refreshConnectors } = useConnectors()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ConnectorType | 'all'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ===== Filtrado =====
  const filteredConnectors = connectors.filter(connector => {
    const matchesSearch = searchTerm === '' ||
      connector.connector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      connector.connector_label?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || connector.connector_type === selectedType

    return matchesSearch && matchesType
  })

  // ===== Agrupar por tipo =====
  const groupedConnectors = ConnectorEntity.groupConnectorsByType(filteredConnectors)

  // ===== Refresh =====
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshConnectors()
      toast.success('Connectors refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh connectors')
    } finally {
      setIsRefreshing(false)
    }
  }

  // ===== Tarjeta del conector =====
  const ConnectorCard = ({ connector }: { connector: any }) => {
    const isActive = ConnectorEntity.isActive(connector)
    const TypeIcon = typeIcons[connector.connector_type as ConnectorType] || Cable
    const paymentMethods = ConnectorEntity.getSupportedPaymentMethods(connector)

    return (
      <Card
        variant="default"
        size="sm"
        hoverable
        glowOnHover={isActive}
        className={clsx(
          'relative',
          !isActive && 'opacity-60'
        )}
      >
        <CardBody>
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isActive ? (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
                <XCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-400">Inactive</span>
              </div>
            )}
          </div>

          {/* Logo and Name */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 bg-dark-bg rounded-lg p-2 flex items-center justify-center">
              <Image
                src={getLogoPath(connector.connector_name)}
                alt={connector.connector_name}
                width={48}
                height={48}
                className="object-contain"
                onError={(e) => {
                  // fallback logo
                  (e.currentTarget as HTMLImageElement).src = '/resources/connectors/PLACEHOLDER.svg'
                }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {ConnectorEntity.getDisplayName(connector.connector_name)}
              </h3>
              {connector.connector_label && (
                <p className="text-sm text-dark-text-secondary">
                  {connector.connector_label}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <TypeIcon className="w-4 h-4 text-dark-text-muted" />
                <span className="text-xs text-dark-text-muted">
                  {ConnectorEntity.getConnectorTypeLabel(connector.connector_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          {paymentMethods.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-dark-text-secondary mb-2">Payment Methods</p>
              <div className="flex flex-wrap gap-1">
                {paymentMethods.slice(0, 5).map(method => (
                  <span
                    key={method}
                    className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded"
                  >
                    {method}
                  </span>
                ))}
                {paymentMethods.length > 5 && (
                  <span className="px-2 py-1 text-xs text-dark-text-muted">
                    +{paymentMethods.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Test Mode Indicator */}
          {connector.test_mode && (
            <div className="flex items-center space-x-1 text-yellow-400 text-xs">
              <Zap className="w-3 h-3" />
              <span>Test Mode</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-border">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Configure
            </Button>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ExternalLink className="w-4 h-4" />}
            >
              Details
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Payment Connectors</h2>
          <p className="text-dark-text-secondary">
            Manage your payment processors and service providers
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="secondary"
          leftIcon={<RefreshCw className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />}
          disabled={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card variant="default" size="sm">
        <CardBody>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search connectors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-dark-text-muted" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ConnectorType | 'all')}
                className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                {Object.values(ConnectorType).map(type => (
                  <option key={type} value={type}>
                    {ConnectorEntity.getConnectorTypeLabel(type)}
                  </option>
                ))}
              </select>
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

      {/* Loading State */}
      {isLoading && !isRefreshing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} variant="default" size="sm">
              <CardBody>
                <div className="animate-pulse">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-16 h-16 bg-dark-bg rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-dark-bg rounded w-3/4" />
                      <div className="h-3 bg-dark-bg rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-dark-bg rounded" />
                    <div className="h-3 bg-dark-bg rounded w-5/6" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Connectors Grid */}
      {!isLoading && filteredConnectors.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedConnectors).map(([type, connectors]) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                {React.createElement(typeIcons[type as ConnectorType] || Cable, {
                  className: 'w-5 h-5 text-purple-400',
                })}
                <span>{ConnectorEntity.getConnectorTypeLabel(type as ConnectorType)}</span>
                <span className="text-sm text-dark-text-muted">({connectors.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map((connector, index) => (
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
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredConnectors.length === 0 && (
        <Card variant="default" size="lg">
          <CardBody>
            <div className="text-center py-12">
              <Cable className="w-12 h-12 text-dark-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connectors found</h3>
              <p className="text-dark-text-secondary mb-4">
                {searchTerm || selectedType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Configure your first payment connector to start processing payments'}
              </p>
              <Button variant="default">
                Add Connector
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
