'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Globe,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import { Badge } from '@/presentation/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Skeleton } from '@/presentation/components/ui/Skeleton'
import ConnectorCard from './ConnectorCard'
import ConnectorLogo from './ConnectorLogo'
import { cn } from '@/presentation/lib/utils'
import { formatCurrency, formatPercentage } from '@/presentation/components/ui/formatters'

interface ConnectorInfo {
  connector_id: string
  connector_name: string
  merchant_connector_id: string
  connector_type: 'payment_processor' | 'wallet' | 'bank' | 'bnpl'
  status: 'active' | 'inactive' | 'testing' | 'error' | 'pending'
  test_mode: boolean
  created_at: string
  updated_at: string
  business_country: string
  business_label: string
  business_sub_label?: string
  payment_methods_enabled: string[]
  currencies_supported: string[]
  webhook_details?: {
    webhook_url: string
    webhook_version: string
  }
  metadata?: Record<string, any>
  stats?: {
    volume_24h: number
    volume_7d: number
    volume_30d: number
    success_rate: number
    avg_processing_time: number
    total_transactions: number
    failed_transactions: number
    currency: string
  }
}

interface ConnectorFilters {
  status?: string[]
  connector_type?: string[]
  payment_methods?: string[]
  currencies?: string[]
  search?: string
}

interface ConnectorGridProps {
  connectors: ConnectorInfo[]
  isLoading?: boolean
  onConnectorAction?: (action: string, connectorId: string) => void
  onRefresh?: () => void
  className?: string
}

const CONNECTOR_TYPES = [
  { value: 'payment_processor', label: 'Procesadores de pago', icon: Zap },
  { value: 'wallet', label: 'Billeteras digitales', icon: Globe },
  { value: 'bank', label: 'Transferencias bancarias', icon: BarChart3 },
  { value: 'bnpl', label: 'Compra ahora, paga después', icon: TrendingUp },
] as const

const CONNECTOR_STATUSES = [
  { value: 'active', label: 'Activo', color: 'success', icon: CheckCircle },
  { value: 'inactive', label: 'Inactivo', color: 'secondary', icon: XCircle },
  { value: 'testing', label: 'Pruebas', color: 'warning', icon: Clock },
  { value: 'error', label: 'Error', color: 'destructive', icon: AlertTriangle },
  { value: 'pending', label: 'Pendiente', color: 'warning', icon: Clock },
] as const

const AVAILABLE_CONNECTORS = [
  {
    name: 'Stripe',
    description: 'Procesador de pagos global con soporte completo para tarjetas',
    supported_methods: ['card', 'wallet', 'bank_transfer'],
    supported_currencies: ['USD', 'EUR', 'GBP', 'CAD'],
    setup_complexity: 'easy',
    fees: 'from 2.9% + $0.30',
    popular: true,
  },
  {
    name: 'Adyen',
    description: 'Plataforma de pagos empresarial con cobertura global',
    supported_methods: ['card', 'wallet', 'bank_transfer', 'cash'],
    supported_currencies: ['USD', 'EUR', 'GBP', 'JPY'],
    setup_complexity: 'medium',
    fees: 'from 2.95% + interchange',
    popular: true,
  },
  {
    name: 'PayPal',
    description: 'Billetera digital conocida mundialmente',
    supported_methods: ['wallet', 'card'],
    supported_currencies: ['USD', 'EUR', 'GBP'],
    setup_complexity: 'easy',
    fees: 'from 3.49% + $0.49',
    popular: true,
  },
  {
    name: 'Square',
    description: 'Solución completa para negocios físicos y en línea',
    supported_methods: ['card', 'wallet'],
    supported_currencies: ['USD', 'CAD', 'GBP'],
    setup_complexity: 'easy',
    fees: 'from 2.6% + $0.10',
    popular: false,
  },
  {
    name: 'Checkout.com',
    description: 'Plataforma de pagos para empresas de alto volumen',
    supported_methods: ['card', 'wallet', 'bank_transfer'],
    supported_currencies: ['USD', 'EUR', 'GBP'],
    setup_complexity: 'hard',
    fees: 'Pricing personalizado',
    popular: false,
  },
] as const

export default function ConnectorGrid({
  connectors,
  isLoading = false,
  onConnectorAction,
  onRefresh,
  className = '',
}: ConnectorGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ConnectorFilters>({})
  const [activeTab, setActiveTab] = useState('active')

  const filteredConnectors = useMemo(() => {
    let filtered = connectors
    if (searchQuery) {
      filtered = filtered.filter(connector =>
        connector.connector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connector.business_label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (filters.status?.length) {
      filtered = filtered.filter(connector => filters.status!.includes(connector.status))
    }
    if (filters.connector_type?.length) {
      filtered = filtered.filter(connector => filters.connector_type!.includes(connector.connector_type))
    }
    if (filters.payment_methods?.length) {
      filtered = filtered.filter(connector =>
        filters.payment_methods!.some(method =>
          connector.payment_methods_enabled.includes(method)
        )
      )
    }
    return filtered
  }, [connectors, searchQuery, filters])

  const connectorsByStatus = useMemo(() => {
    return {
      all: filteredConnectors,
      active: filteredConnectors.filter(c => c.status === 'active'),
      inactive: filteredConnectors.filter(c => c.status === 'inactive'),
      testing: filteredConnectors.filter(c => c.status === 'testing'),
      error: filteredConnectors.filter(c => c.status === 'error'),
    }
  }, [filteredConnectors])

  const summaryStats = useMemo(() => {
    const active = connectors.filter(c => c.status === 'active')
    const totalVolume = active.reduce((sum, c) => sum + (c.stats?.volume_30d || 0), 0)
    const avgSuccessRate = active.length > 0
      ? active.reduce((sum, c) => sum + (c.stats?.success_rate || 0), 0) / active.length
      : 0
    return {
      total: connectors.length,
      active: active.length,
      totalVolume,
      avgSuccessRate,
      currency: active[0]?.stats?.currency || 'USD',
    }
  }, [connectors])

  const handleConnectorAction = async (action: string, connectorId: string) => {
    try {
      await onConnectorAction?.(action, connectorId)
      toast.success(`Acción "${action}" ejecutada exitosamente`)
      onRefresh?.()
    } catch (error: any) {
      toast.error(error.message || 'Error al ejecutar la acción')
    }
  }

  const renderConnectorGrid = (connectorList: ConnectorInfo[]) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectorList.map((connector) => (
            <ConnectorCard
              key={connector.merchant_connector_id}
              connector={connector}
              variant="default"
              onEnable={id => handleConnectorAction('enable', id)}
              onDisable={id => handleConnectorAction('disable', id)}
              onDelete={id => handleConnectorAction('delete', id)}
              onTest={id => handleConnectorAction('test', id)}
            />
          ))}
        </div>
      )
    } else {
      return (
        <div className="space-y-4">
          {connectorList.map((connector) => (
            <ConnectorCard
              key={connector.merchant_connector_id}
              connector={connector}
              variant="compact"
              onEnable={id => handleConnectorAction('enable', id)}
              onDisable={id => handleConnectorAction('disable', id)}
              onDelete={id => handleConnectorAction('delete', id)}
              onTest={id => handleConnectorAction('test', id)}
            />
          ))}
        </div>
      )
    }
  }

  const renderAvailableConnectors = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {AVAILABLE_CONNECTORS.map((connector) => (
        <Card key={connector.name} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {/* Usa el prop correcto según el tipo de tu ConnectorLogo */}
                <ConnectorLogo connectorName={connector.name} size="lg" />
                <div>
                  <h3 className="font-semibold">{connector.name}</h3>
                  {connector.popular && (
                    <Badge variant="secondary" size="sm">Popular</Badge>
                  )}
                </div>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {connector.description}
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Métodos soportados:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {connector.supported_methods.slice(0, 3).map(method => (
                    <Badge key={method} variant="outline" size="sm">
                      {method}
                    </Badge>
                  ))}
                  {connector.supported_methods.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{connector.supported_methods.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Comisiones:</p>
                <p className="text-sm">{connector.fees}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Configuración:</span>
                <Badge
                  variant={
                    connector.setup_complexity === 'easy' ? 'success' :
                      connector.setup_complexity === 'medium' ? 'warning' : 'destructive'
                  }
                  size="sm"
                >
                  {connector.setup_complexity === 'easy' ? 'Fácil' :
                    connector.setup_complexity === 'medium' ? 'Medio' : 'Difícil'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Conectores de pago ({summaryStats.total})
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>✓ {summaryStats.active} activos</span>
                <span>📊 {formatPercentage(summaryStats.avgSuccessRate)}</span>
                <span>💰 {formatCurrency(summaryStats.totalVolume, { currency: summaryStats.currency })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh} type="button">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar enrutamiento
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Ver métricas globales
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conectores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Selector Tipo de conector */}
              <Select
                value={filters.connector_type?.[0] || ''}
                onValueChange={(value: string) =>
                  setFilters(prev => ({
                    ...prev,
                    connector_type: value ? [value] : undefined
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tipo de conector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  {CONNECTOR_TYPES.map(type => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {/* Selector Estado */}
              <Select
                value={filters.status?.[0] || ''}
                onValueChange={(value: string) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value ? [value] : undefined
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {CONNECTOR_STATUSES.map(status => {
                    const Icon = status.icon
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Activos ({connectorsByStatus.active.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos ({connectorsByStatus.inactive.length})
          </TabsTrigger>
          <TabsTrigger value="testing">
            Pruebas ({connectorsByStatus.testing.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Disponibles
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos ({connectorsByStatus.all.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          {connectorsByStatus.active.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay conectores activos</h3>
                <p className="text-muted-foreground mb-4">
                  Activa algunos conectores para comenzar a procesar pagos.
                </p>
                <Button onClick={() => setActiveTab('available')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Explorar conectores
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderConnectorGrid(connectorsByStatus.active)
          )}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {connectorsByStatus.inactive.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay conectores inactivos</h3>
                <p className="text-muted-foreground">
                  Todos tus conectores están activos y funcionando.
                </p>
              </CardContent>
            </Card>
          ) : (
            renderConnectorGrid(connectorsByStatus.inactive)
          )}
        </TabsContent>
        <TabsContent value="testing" className="mt-6">
          {connectorsByStatus.testing.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay conectores en pruebas</h3>
                <p className="text-muted-foreground">
                  No tienes conectores configurados en modo de pruebas.
                </p>
              </CardContent>
            </Card>
          ) : (
            renderConnectorGrid(connectorsByStatus.testing)
          )}
        </TabsContent>
        <TabsContent value="available" className="mt-6">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Conectores disponibles</h3>
              <p className="text-muted-foreground">
                Agrega nuevos conectores para expandir tus opciones de pago
              </p>
            </div>
            {renderAvailableConnectors()}
          </div>
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          {connectorsByStatus.all.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron conectores</h3>
                <p className="text-muted-foreground mb-4">
                  No hay conectores que coincidan con los filtros aplicados.
                </p>
                <Button onClick={() => {
                  setSearchQuery('')
                  setFilters({})
                }}>
                  Limpiar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderConnectorGrid(connectorsByStatus.all)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
