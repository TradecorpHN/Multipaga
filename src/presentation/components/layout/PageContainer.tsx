// ==============================================================================
// PageContainer.tsx - Contenedor de página con navegación y layout
// ==============================================================================

// /home/kali/multipaga/src/presentation/components/layout/PageContainer.tsx
'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '/home/kali/multipaga/src/presentation/components/ui/Button'
import { Badge } from '/home/kali/multipaga/src/presentation/components/ui/Badge'
import { Separator } from '/home/kali/multipaga/src/presentation/components/ui/Separator'
import { 
  ChevronRight,
  ArrowLeft,
  Home,
  RefreshCw,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Settings,
  Bell,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '/home/kali/multipaga/src/presentation/components/ui/DropdownMenu'
import { Input } from '/home/kali/multipaga/src/presentation/components/ui/Input'

// Tipos para breadcrumbs
interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

// Tipos para acciones de página
interface PageAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  loading?: boolean
}

// Props del contenedor
interface PageContainerProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: PageAction[]
  backButton?: {
    label?: string
    onClick?: () => void
    href?: string
  }
  searchable?: boolean
  filterable?: boolean
  refreshable?: boolean
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  onSearch?: (query: string) => void
  onFilter?: () => void
  onRefresh?: () => void
  isLoading?: boolean
  className?: string
  children: React.ReactNode
}

export function PageContainer({
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  backButton,
  searchable = false,
  filterable = false,
  refreshable = false,
  badge,
  onSearch,
  onFilter,
  onRefresh,
  isLoading = false,
  className,
  children
}: PageContainerProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  const renderBreadcrumbs = () => {
    if (!breadcrumbs.length) return null

    return (
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-gray-500">
        <Home className="w-4 h-4" />
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4" />
            {item.href && !item.current ? (
              <a
                href={item.href}
                className="hover:text-gray-700 transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span className={cn(
                item.current ? 'text-gray-900 font-medium' : 'text-gray-500'
              )}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }

  const renderActions = () => {
    if (!actions.length) return null

    // Mostrar las primeras 2 acciones como botones, el resto en dropdown
    const primaryActions = actions.slice(0, 2)
    const secondaryActions = actions.slice(2)

    return (
      <div className="flex items-center space-x-2">
        {primaryActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || isLoading}
              className="flex items-center space-x-2"
            >
              {action.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                Icon && <Icon className="w-4 h-4" />
              )}
              <span>{action.label}</span>
            </Button>
          )
        })}

        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {secondaryActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    disabled={action.disabled || isLoading}
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen bg-gray-50/30', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="py-3 border-b border-gray-100">
              {renderBreadcrumbs()}
            </div>
          )}

          {/* Page Header */}
          <div className="py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Left side - Title and subtitle */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  {backButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={backButton.onClick}
                      className="p-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                      {title}
                    </h1>
                    {badge && (
                      <Badge variant={badge.variant || 'default'}>
                        {badge.label}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Right side - Search, filters, and actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                {/* Search */}
                {searchable && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                )}

                {/* Utility buttons */}
                <div className="flex items-center space-x-2">
                  {filterable && (
                    <Button variant="outline" size="sm" onClick={onFilter}>
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  )}
                  
                  {refreshable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn(
                        'w-4 h-4 mr-2',
                        isLoading && 'animate-spin'
                      )} />
                      Refresh
                    </Button>
                  )}
                </div>

                {/* Actions */}
                {renderActions()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

// Componente auxiliar para páginas simples
interface SimplePageProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function SimplePage({ title, subtitle, children }: SimplePageProps) {
  return (
    <PageContainer title={title} subtitle={subtitle}>
      {children}
    </PageContainer>
  )
}

// Hook para manejar acciones de página
export function usePageActions() {
  const [isLoading, setIsLoading] = React.useState(false)

  const executeAction = React.useCallback(async (action: () => Promise<void>) => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, executeAction }
}