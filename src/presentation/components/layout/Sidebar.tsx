'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  Zap,
  GitBranch,
  Receipt,
  Shield,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Wallet,
  Globe,
  Activity,
  Clock,
  FileText,
  Target,
} from 'lucide-react'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { ScrollArea } from '@/presentation/components/ui/ScrollArea'
import { cn } from '@/presentation/lib/utils'
import { useAuth } from '@/presentation/hooks/useAuth'
import { useSidebarStats } from '@/presentation/hooks/useSidebarStats'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  current?: boolean
  badge?: string | number
  children?: NavItem[]
  disabled?: boolean
  new?: boolean
}

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  className?: string
}

export default function Sidebar({ 
  collapsed = false, 
  onToggle, 
  className = '' 
}: SidebarProps) {
  const pathname = usePathname()
const { merchant } = useAuth()
  const { stats, isLoading } = useSidebarStats()
  const [expandedSections, setExpandedSections] = useState<string[]>(['payments'])

  // Main navigation items
  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard',
    },
    {
      name: 'Pagos',
      href: '/dashboard/payments',
      icon: CreditCard,
      current: pathname.startsWith('/dashboard/payments'),
      badge: stats?.pendingPayments,
      children: [
        {
          name: 'Todos los pagos',
          href: '/dashboard/payments',
          icon: CreditCard,
          current: pathname === '/dashboard/payments',
        },
        {
          name: 'Crear pago',
          href: '/dashboard/payments/new',
          icon: Plus,
          current: pathname === '/dashboard/payments/new',
          new: true,
        },
        {
          name: 'Pendientes',
          href: '/dashboard/payments?status=pending',
          icon: Clock,
          current: pathname.includes('status=pending'),
          badge: stats?.pendingPayments,
        },
        {
          name: 'Exitosos',
          href: '/dashboard/payments?status=succeeded',
          icon: Target,
          current: pathname.includes('status=succeeded'),
        },
      ],
    },
    {
      name: 'Reembolsos',
      href: '/dashboard/refunds',
      icon: RefreshCw,
      current: pathname.startsWith('/dashboard/refunds'),
      badge: stats?.pendingRefunds,
      children: [
        {
          name: 'Todos los reembolsos',
          href: '/dashboard/refunds',
          icon: RefreshCw,
          current: pathname === '/dashboard/refunds',
        },
        {
          name: 'Crear reembolso',
          href: '/dashboard/refunds/new',
          icon: Plus,
          current: pathname === '/dashboard/refunds/new',
        },
        {
          name: 'Procesando',
          href: '/dashboard/refunds?status=processing',
          icon: Activity,
          current: pathname.includes('status=processing'),
          badge: stats?.pendingRefunds,
        },
      ],
    },
    {
      name: 'Disputas',
      href: '/dashboard/disputes',
      icon: AlertTriangle,
      current: pathname.startsWith('/dashboard/disputes'),
      badge: stats?.activeDisputes,
      children: [
        {
          name: 'Todas las disputas',
          href: '/dashboard/disputes',
          icon: AlertTriangle,
          current: pathname === '/dashboard/disputes',
        },
        {
          name: 'Activas',
          href: '/dashboard/disputes?status=active',
          icon: AlertTriangle,
          current: pathname.includes('status=active'),
          badge: stats?.activeDisputes,
        },
        {
          name: 'Resueltas',
          href: '/dashboard/disputes?status=resolved',
          icon: Target,
          current: pathname.includes('status=resolved'),
        },
      ],
    },
    {
      name: 'Clientes',
      href: '/dashboard/customers',
      icon: Users,
      current: pathname.startsWith('/dashboard/customers'),
      children: [
        {
          name: 'Todos los clientes',
          href: '/dashboard/customers',
          icon: Users,
          current: pathname === '/dashboard/customers',
        },
        {
          name: 'Agregar cliente',
          href: '/dashboard/customers/new',
          icon: Plus,
          current: pathname === '/dashboard/customers/new',
        },
      ],
    },
  ]

  // Secondary navigation
  const secondaryNavigation: NavItem[] = [
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      current: pathname.startsWith('/dashboard/analytics'),
      children: [
        {
          name: 'Resumen',
          href: '/dashboard/analytics',
          icon: TrendingUp,
          current: pathname === '/dashboard/analytics',
        },
        {
          name: 'Ingresos',
          href: '/dashboard/analytics/revenue',
          icon: Wallet,
          current: pathname === '/dashboard/analytics/revenue',
        },
        {
          name: 'Conversiones',
          href: '/dashboard/analytics/conversions',
          icon: Target,
          current: pathname === '/dashboard/analytics/conversions',
        },
      ],
    },
    {
      name: 'Conectores',
      href: '/dashboard/connectors',
      icon: Zap,
      current: pathname.startsWith('/dashboard/connectors'),
      children: [
        {
          name: 'Configurados',
          href: '/dashboard/connectors',
          icon: Zap,
          current: pathname === '/dashboard/connectors',
        },
        {
          name: 'Agregar conector',
          href: '/dashboard/connectors/new',
          icon: Plus,
          current: pathname === '/dashboard/connectors/new',
        },
        {
          name: 'Enrutamiento',
          href: '/dashboard/connectors/routing',
          icon: GitBranch,
          current: pathname === '/dashboard/connectors/routing',
        },
      ],
    },
    {
      name: 'Reconciliación',
      href: '/dashboard/reconciliation',
      icon: Receipt,
      current: pathname.startsWith('/dashboard/reconciliation'),
      badge: stats?.pendingReconciliation,
    },
    {
      name: 'Webhooks',
      href: '/dashboard/webhooks',
      icon: Globe,
      current: pathname.startsWith('/dashboard/webhooks'),
      children: [
        {
          name: 'Endpoints',
          href: '/dashboard/webhooks',
          icon: Globe,
          current: pathname === '/dashboard/webhooks',
        },
        {
          name: 'Logs',
          href: '/dashboard/webhooks/logs',
          icon: FileText,
          current: pathname === '/dashboard/webhooks/logs',
        },
      ],
    },
  ]

  // Settings navigation
  const settingsNavigation: NavItem[] = [
    {
      name: 'Configuración',
      href: '/dashboard/settings',
      icon: Settings,
      current: pathname.startsWith('/dashboard/settings'),
    },
    {
      name: 'Seguridad',
      href: '/dashboard/security',
      icon: Shield,
      current: pathname.startsWith('/dashboard/security'),
    },
    {
      name: 'Soporte',
      href: '/support',
      icon: HelpCircle,
      current: pathname.startsWith('/support'),
    },
  ]

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = hasChildren && expandedSections.includes(item.name.toLowerCase())
    const itemClasses = cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
      item.current && 'bg-accent text-accent-foreground',
      item.disabled && 'opacity-50 cursor-not-allowed',
      level > 0 && 'ml-4 text-xs',
      collapsed && level === 0 && 'justify-center px-2'
    )

    const content = (
      <>
        <item.icon className={cn(
          'flex-shrink-0 transition-colors',
          collapsed && level === 0 ? 'h-5 w-5' : 'h-4 w-4',
          item.current && 'text-accent-foreground'
        )} />
        
        {(!collapsed || level > 0) && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            
            {item.new && (
              <Badge variant="secondary" className="text-xs">
                Nuevo
              </Badge>
            )}
            
            {item.badge && (
              <Badge 
                variant={item.current ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {item.badge}
              </Badge>
            )}
            
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.preventDefault()
                  toggleSection(item.name.toLowerCase())
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </>
        )}
      </>
    )

    const itemElement = (
      <div className={itemClasses}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(item.name.toLowerCase())}
            className="flex items-center gap-3 w-full text-left"
            disabled={item.disabled}
          >
            {content}
          </button>
        ) : (
          <Link 
            href={item.href} 
            className="flex items-center gap-3 w-full"
            aria-disabled={item.disabled}
          >
            {content}
          </Link>
        )}
      </div>
    )

    if (collapsed && level === 0) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            {itemElement}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.name}</p>
            {item.badge && (
              <p className="text-xs text-muted-foreground">
                {item.badge} pendientes
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div key={item.name}>
        {itemElement}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex h-full flex-col border-r bg-background',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      {!collapsed && (
        <div className="flex h-16 items-center border-b px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Multipaga</h2>
<p className="text-xs text-muted-foreground">
  {merchant?.business_profile?.profile_name || 'Panel de control'}
</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 p-4">
          {/* Primary Navigation */}
          <div className="space-y-1">
            {navigation.map(item => renderNavItem(item))}
          </div>

          <Separator className="my-4" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Herramientas
              </h3>
            )}
            {secondaryNavigation.map(item => renderNavItem(item))}
          </div>

          <Separator className="my-4" />

          {/* Settings Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sistema
              </h3>
            )}
            {settingsNavigation.map(item => renderNavItem(item))}
          </div>
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
<p className="text-sm font-medium">
  {merchant?.business_profile?.profile_name || merchant?.merchant_id || 'Merchant'}
</p>
              <p className="text-xs text-muted-foreground">
                Activo ahora
              </p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        </div>
      )}

      {/* Collapse Button */}
      {onToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md',
            collapsed && 'rotate-180'
          )}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}