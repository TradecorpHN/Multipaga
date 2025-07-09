'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  CreditCard,
  RefreshCw,
  Users,
  FileText,
  BarChart3,
  Settings,
  Zap,
  Search,
  Download,
  Upload,
  TestTube,
  Globe,
  ArrowRight,
  ChevronRight,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Separator } from '@/presentation/components/ui/Separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/ui/Dialog'
import { Input } from '@/presentation/components/ui/Input'
import { Label } from '@/presentation/components/ui/Label'
import { cn } from '@/presentation/lib/utils'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  href?: string
  action?: () => void | Promise<void>
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive'
  badge?: string | number
  disabled?: boolean
  new?: boolean
  beta?: boolean
  keyboard_shortcut?: string
}

interface QuickActionsProps {
  className?: string
  showTitle?: boolean
  layout?: 'grid' | 'list'
  maxActions?: number
}

// Quick action search modal
function QuickSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`)
      onClose()
      setSearchQuery('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Búsqueda rápida</DialogTitle>
          <DialogDescription>
            Busca pagos, clientes, transacciones y más
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">¿Qué estás buscando?</Label>
            <Input
              id="search"
              type="text"
              placeholder="ID de pago, email de cliente, etc."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={!searchQuery.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function QuickActions({
  className = '',
  showTitle = true,
  layout = 'grid',
  maxActions,
}: QuickActionsProps) {
  const [showSearchModal, setShowSearchModal] = useState(false)
  const router = useRouter()

  // Primary actions - most common tasks
  const primaryActions: QuickAction[] = [
    {
      id: 'create-payment',
      title: 'Crear pago',
      description: 'Generar un nuevo pago manual',
      icon: CreditCard,
      href: '/dashboard/payments/new',
      variant: 'primary',
      keyboard_shortcut: 'Ctrl+P',
      new: true,
    },
    {
      id: 'create-refund',
      title: 'Procesar reembolso',
      description: 'Reembolsar un pago existente',
      icon: RefreshCw,
      href: '/dashboard/refunds/new',
      variant: 'warning',
    },
    {
      id: 'search',
      title: 'Búsqueda global',
      description: 'Buscar transacciones, clientes, etc.',
      icon: Search,
      action: () => setShowSearchModal(true),
      variant: 'secondary',
      keyboard_shortcut: 'Ctrl+K',
    },
    {
      id: 'add-customer',
      title: 'Agregar cliente',
      description: 'Registrar un nuevo cliente',
      icon: Users,
      href: '/dashboard/customers/new',
      variant: 'success',
    },
  ]

  // Secondary actions - less frequent but important
  const secondaryActions: QuickAction[] = [
    {
      id: 'view-analytics',
      title: 'Ver analytics',
      description: 'Revisar métricas y reportes',
      icon: BarChart3,
      href: '/dashboard/analytics',
      variant: 'secondary',
    },
    {
      id: 'configure-connector',
      title: 'Configurar conector',
      description: 'Agregar o modificar conectores',
      icon: Zap,
      href: '/dashboard/connectors/new',
      variant: 'secondary',
    },
    {
      id: 'download-report',
      title: 'Descargar reporte',
      description: 'Exportar datos de transacciones',
      icon: Download,
      action: async () => {
        toast.success('Generando reporte...')
        // Simulate report generation
        setTimeout(() => {
          toast.success('Reporte descargado')
        }, 2000)
      },
      variant: 'secondary',
    },
    {
      id: 'webhook-logs',
      title: 'Logs de webhooks',
      description: 'Revisar eventos de webhooks',
      icon: Globe,
      href: '/dashboard/webhooks/logs',
      variant: 'secondary',
      badge: '3',
    },
    {
      id: 'test-api',
      title: 'Probar API',
      description: 'Realizar pruebas de integración',
      icon: TestTube,
      href: '/dashboard/api-testing',
      variant: 'secondary',
      beta: true,
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Ajustar configuraciones de cuenta',
      icon: Settings,
      href: '/dashboard/settings',
      variant: 'secondary',
    },
  ]

  // Combine actions and apply limit
  const allActions = [...primaryActions, ...secondaryActions]
  const displayActions = maxActions ? allActions.slice(0, maxActions) : allActions

  const handleActionClick = async (action: QuickAction) => {
    if (action.disabled) return

    if (action.action) {
      try {
        await action.action()
      } catch (error) {
        toast.error('Error al ejecutar la acción')
      }
    } else if (action.href) {
      router.push(action.href)
    }
  }

  const getVariantClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-900'
      case 'success':
        return 'hover:bg-green-50 hover:border-green-200 hover:text-green-900'
      case 'warning':
        return 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-900'
      case 'destructive':
        return 'hover:bg-red-50 hover:border-red-200 hover:text-red-900'
      default:
        return 'hover:bg-gray-50 hover:border-gray-200'
    }
  }

  const getIconClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-orange-600'
      case 'destructive':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (layout === 'list') {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Acciones rápidas
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-2">
          {displayActions.map((action, index) => {
            const Icon = action.icon
            
            return (
              <div key={action.id}>
                {index === 4 && <Separator className="my-2" />}
                <div
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                    getVariantClasses(action.variant),
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('w-5 h-5', getIconClasses(action.variant))} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{action.title}</span>
                        {action.new && (
                          <Badge variant="secondary" size="sm">Nuevo</Badge>
                        )}
                        {action.beta && (
                          <Badge variant="outline" size="sm">Beta</Badge>
                        )}
                        {action.badge && (
                          <Badge variant="destructive" size="sm">{action.badge}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {action.keyboard_shortcut && (
                      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        {action.keyboard_shortcut}
                      </kbd>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
        
        <QuickSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      </Card>
    )
  }

  // Grid layout
  return (
    <div className={className}>
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Acciones rápidas</h2>
          <p className="text-sm text-muted-foreground">
            Accede rápidamente a las funciones más utilizadas
          </p>
        </div>
      )}

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {primaryActions.map((action) => {
          const Icon = action.icon
          
          return (
            <Card 
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                getVariantClasses(action.variant),
                action.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Icon className={cn('w-6 h-6', getIconClasses(action.variant))} />
                    <div className="flex items-center space-x-1">
                      {action.new && (
                        <Badge variant="secondary" size="sm">Nuevo</Badge>
                      )}
                      {action.badge && (
                        <Badge variant="destructive" size="sm">{action.badge}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  </div>
                  
                  {action.keyboard_shortcut && (
                    <div className="flex justify-end">
                      <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        {action.keyboard_shortcut}
                      </kbd>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Secondary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Más acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondaryActions.slice(0, maxActions ? maxActions - 4 : undefined).map((action) => {
              const Icon = action.icon
              
              return (
                <div
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    'flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors',
                    getVariantClasses(action.variant),
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className={cn('w-5 h-5', getIconClasses(action.variant))} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{action.title}</span>
                      {action.beta && (
                        <Badge variant="outline" size="sm">Beta</Badge>
                      )}
                      {action.badge && (
                        <Badge variant="destructive" size="sm">{action.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <QuickSearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </div>
  )
}

// Compact version for smaller spaces
export function QuickActionsCompact({ className = '' }: { className?: string }) {
  return (
    <QuickActions 
      className={className}
      showTitle={false}
      layout="list"
      maxActions={6}
    />
  )
}

// Widget version for dashboard
export function QuickActionsWidget({ className = '' }: { className?: string }) {
  const router = useRouter()
  
  const quickActions = [
    {
      icon: CreditCard,
      label: 'Nuevo pago',
      href: '/dashboard/payments/new',
      color: 'text-blue-600',
    },
    {
      icon: RefreshCw,
      label: 'Reembolso',
      href: '/dashboard/refunds/new',
      color: 'text-orange-600',
    },
    {
      icon: Users,
      label: 'Cliente',
      href: '/dashboard/customers/new',
      color: 'text-green-600',
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      href: '/dashboard/analytics',
      color: 'text-purple-600',
    },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Button
                key={action.href}
                variant="outline"
                onClick={() => router.push(action.href)}
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                <Icon className={cn('w-5 h-5', action.color)} />
                <span className="text-xs">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}