'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Settings,
  TestTube,
  Play,
  Pause,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  CreditCard,
  Wallet,
  Globe,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/presentation/components/ui/Card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Progress } from '@/presentation/components/ui/Progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { formatCurrency, formatPercentage } from '@/presentation/lib/formatters'
import { cn } from '@/presentation/lib/utils'

// Connector status configuration
const ConnectorStatusConfig = {
  active: {
    label: 'Activo',
    color: 'success' as const,
    icon: CheckCircle,
    description: 'Conector funcionando correctamente',
  },
  inactive: {
    label: 'Inactivo',
    color: 'secondary' as const,
    icon: Pause,
    description: 'Conector deshabilitado',
  },
  testing: {
    label: 'Pruebas',
    color: 'warning' as const,
    icon: TestTube,
    description: 'Conector en modo de pruebas',
  },
  error: {
    label: 'Error',
    color: 'destructive' as const,
    icon: XCircle,
    description: 'Conector con errores de configuración',
  },
  pending: {
    label: 'Pendiente',
    color: 'warning' as const,
    icon: Clock,
    description: 'Configuración pendiente',
  },
} as const

// Connector types
const ConnectorTypeConfig = {
  payment_processor: {
    label: 'Procesador de pagos',
    icon: CreditCard,
    color: 'text-blue-600',
  },
  wallet: {
    label: 'Billetera digital',
    icon: Wallet,
    color: 'text-purple-600',
  },
  bank: {
    label: 'Transferencia bancaria',
    icon: Globe,
    color: 'text-green-600',
  },
  bnpl: {
    label: 'Compra ahora, paga después',
    icon: DollarSign,
    color: 'text-orange-600',
  },
} as const

interface ConnectorStats {
  volume_24h: number
  volume_7d: number
  volume_30d: number
  success_rate: number
  avg_processing_time: number
  total_transactions: number
  failed_transactions: number
  currency: string
}

interface ConnectorInfo {
  connector_id: string
  connector_name: string
  merchant_connector_id: string
  connector_type: keyof typeof ConnectorTypeConfig
  status: keyof typeof ConnectorStatusConfig
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
  stats?: ConnectorStats
}

interface ConnectorCardProps {
  connector: ConnectorInfo
  onEnable?: (connectorId: string) => void
  onDisable?: (connectorId: string) => void
  onDelete?: (connectorId: string) => void
  onTest?: (connectorId: string) => void
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  className?: string
}

export default function ConnectorCard({
  connector,
  onEnable,
  onDisable,
  onDelete,
  onTest,
  variant = 'default',
  showActions = true,
  className = '',
}: ConnectorCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const statusConfig = ConnectorStatusConfig[connector.status]
  const typeConfig = ConnectorTypeConfig[connector.connector_type]
  const StatusIcon = statusConfig.icon
  const TypeIcon = typeConfig.icon

  const handleCopyId = () => {
    navigator.clipboard.writeText(connector.merchant_connector_id)
    toast.success('ID de conector copiado')
  }

  const handleAction = async (action: () => void) => {
    setIsLoading(true)
    try {
      await action()
      toast.success('Acción completada')
    } catch (error) {
      toast.error('Error al ejecutar la acción')
    } finally {
      setIsLoading(false)
    }
  }

  const getVolumeChange = () => {
    if (!connector.stats) return null
    const { volume_24h, volume_7d } = connector.stats
    const avg7d = volume_7d / 7
    if (avg7d === 0) return null
    return ((volume_24h - avg7d) / avg7d) * 100
  }

  const volumeChange = getVolumeChange()

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <TypeIcon className={cn('w-8 h-8', typeConfig.color)} />
                <StatusIcon className={cn(
                  'w-4 h-4 absolute -bottom-1 -right-1 bg-background rounded-full',
                  connector.status === 'active' ? 'text-green-600' :
                  connector.status === 'error' ? 'text-red-600' :
                  'text-gray-600'
                )} />
              </div>
              <div>
                <p className="font-medium text-sm">{connector.connector_name}</p>
                <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={statusConfig.color} size="sm">
                {statusConfig.label}
              </Badge>
              {connector.test_mode && (
                <Badge variant="outline" size="sm">
                  Test
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-lg transition-all duration-200',
      connector.status === 'error' && 'border-red-200',
      connector.status === 'active' && 'border-green-200',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <TypeIcon className={cn('w-10 h-10', typeConfig.color)} />
              <StatusIcon className={cn(
                'w-5 h-5 absolute -bottom-1 -right-1 bg-background rounded-full p-0.5',
                connector.status === 'active' ? 'text-green-600' :
                connector.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              )} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">{connector.connector_name}</h3>
                {connector.test_mode && (
                  <Badge variant="outline" size="sm">
                    Modo prueba
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">{typeConfig.label}</p>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {connector.merchant_connector_id.slice(-8)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-4 w-4 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/connectors/${connector.merchant_connector_id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/connectors/${connector.merchant_connector_id}/analytics`}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Ver métricas
                    </Link>
                  </DropdownMenuItem>
                  
                  {onTest && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onTest(connector.merchant_connector_id))}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Probar conexión
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {connector.status === 'active' && onDisable ? (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onDisable(connector.merchant_connector_id))}
                      className="text-orange-600"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Desactivar
                    </DropdownMenuItem>
                  ) : connector.status === 'inactive' && onEnable ? (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onEnable(connector.merchant_connector_id))}
                      className="text-green-600"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Activar
                    </DropdownMenuItem>
                  ) : null}
                  
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onDelete(connector.merchant_connector_id))}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver en Hyperswitch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Business Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">País:</span>
            <div className="font-medium">{connector.business_country}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Etiqueta:</span>
            <div className="font-medium">{connector.business_label}</div>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h4 className="text-sm font-medium mb-2">Métodos de pago soportados:</h4>
          <div className="flex flex-wrap gap-1">
            {connector.payment_methods_enabled.slice(0, 4).map(method => (
              <Badge key={method} variant="secondary" size="sm">
                {method}
              </Badge>
            ))}
            {connector.payment_methods_enabled.length > 4 && (
              <Badge variant="outline" size="sm">
                +{connector.payment_methods_enabled.length - 4} más
              </Badge>
            )}
          </div>
        </div>

        {/* Statistics */}
        {connector.stats && variant === 'detailed' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Estadísticas (últimos 30 días):</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Volumen total:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(connector.stats.volume_30d, connector.stats.currency)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transacciones:</span>
                  <span className="text-sm font-medium">
                    {connector.stats.total_transactions.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasa de éxito:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium">
                      {formatPercentage(connector.stats.success_rate)}
                    </span>
                    {connector.stats.success_rate >= 95 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : connector.stats.success_rate >= 90 ? (
                      <TrendingUp className="w-3 h-3 text-yellow-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tiempo promedio:</span>
                  <span className="text-sm font-medium">
                    {connector.stats.avg_processing_time}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Success Rate Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rendimiento</span>
                <span className="text-muted-foreground">
                  {formatPercentage(connector.stats.success_rate)}
                </span>
              </div>
              <Progress 
                value={connector.stats.success_rate} 
                className={cn(
                  'h-2',
                  connector.stats.success_rate >= 95 ? 'text-green-600' :
                  connector.stats.success_rate >= 90 ? 'text-yellow-600' :
                  'text-red-600'
                )}
              />
            </div>

            {/* Volume Change */}
            {volumeChange !== null && (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Cambio últimas 24h:</span>
                <div className="flex items-center space-x-1">
                  {volumeChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    volumeChange > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {volumeChange > 0 ? '+' : ''}{formatPercentage(Math.abs(volumeChange))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Currencies */}
        <div>
          <h4 className="text-sm font-medium mb-2">Monedas soportadas:</h4>
          <div className="flex flex-wrap gap-1">
            {connector.currencies_supported.slice(0, 6).map(currency => (
              <Badge key={currency} variant="outline" size="sm">
                {currency}
              </Badge>
            ))}
            {connector.currencies_supported.length > 6 && (
              <Badge variant="outline" size="sm">
                +{connector.currencies_supported.length - 6} más
              </Badge>
            )}
          </div>
        </div>

        {/* Status Description */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-start space-x-2">
            <StatusIcon className={cn(
              'w-4 h-4 mt-0.5',
              connector.status === 'active' ? 'text-green-600' :
              connector.status === 'error' ? 'text-red-600' :
              'text-gray-600'
            )} />
            <div className="text-sm text-muted-foreground">
              {statusConfig.description}
            </div>
          </div>
        </div>

        {/* Webhook Status */}
        {connector.webhook_details && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Webhook configurado:</span>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Sí</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground pt-3">
        <Tooltip>
          <TooltipTrigger>
            <span>
              Configurado {new Date(connector.created_at).toLocaleDateString('es-ES')}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{new Date(connector.created_at).toLocaleString('es-ES')}</p>
          </TooltipContent>
        </Tooltip>

        {connector.updated_at !== connector.created_at && (
          <Tooltip>
            <TooltipTrigger>
              <span>
                Actualizado {new Date(connector.updated_at).toLocaleDateString('es-ES')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(connector.updated_at).toLocaleString('es-ES')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardFooter>
    </Card>
  )
}