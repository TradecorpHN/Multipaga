'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Plus,
  ChevronDown,
  Shield,
  CreditCard,
  BarChart3,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'react-hot-toast'
import { Button } from '@/presentation/components/ui/Button'
import { Input } from '@/presentation/components/ui/Input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/DropdownMenu'
import { Badge } from '@/presentation/components/ui/Badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/Avatar'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/presentation/components/ui/Sheet'
import { Separator } from '@/presentation/components/ui/Separator'
import { useAuth } from '@/presentation/hooks/useAuth'
import { useNotifications } from '@/presentation/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  onMenuClick?: () => void
  showMobileMenu?: boolean
  className?: string
}

// Quick actions for the create button - SOLO REDIRECCIONES
const QuickActions = [
  {
    label: 'Crear pago',
    description: 'Ir al formulario de nuevo pago',
    href: '/dashboard/payments/new',
    icon: CreditCard,
    color: 'text-blue-600',
  },
  {
    label: 'Crear reembolso',
    description: 'Ir al formulario de reembolso',
    href: '/dashboard/refunds/new',
    icon: Zap,
    color: 'text-orange-600',
  },
  {
    label: 'Nueva remesa',
    description: 'Ir al formulario de remesas',
    href: '/dashboard/remittances/new',
    icon: BarChart3,
    color: 'text-green-600',
  },
]

export default function Header({ 
  onMenuClick, 
  showMobileMenu = false,
  className = '' 
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { merchant, logout, isLoading } = useAuth()
  const { notifications, unreadCount, markAsRead } = useNotifications()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setShowSearch(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
      toast.success('Sesión cerrada exitosamente')
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId)
    // Navigate to relevant page based on notification type
  }

  const getPageTitle = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.length === 1) return 'Dashboard'
    
    const titleMap: Record<string, string> = {
      payments: 'Pagos',
      refunds: 'Reembolsos',
      disputes: 'Disputas',
      customers: 'Clientes',
      analytics: 'Analytics',
      settings: 'Configuración',
      connectors: 'Conectores',
      reconciliation: 'Reconciliación',
      remittances: 'Remesas',
      vault: 'Vault',
      mandates: 'Mandatos',
      payouts: 'Pagos Salientes',
      invoices: 'Facturas',
    }
    
    return titleMap[pathSegments[1]] || 'Dashboard'
  }

  if (!isMounted) {
    return <div className="h-16 border-b bg-background" />
  }

  return (
    <>
      {/* ESTILOS CRÍTICOS PARA ELIMINAR TODAS LAS LIMITACIONES */}
      <style jsx global>{`
        /* RESET COMPLETO PARA EL HEADER */
        .header-full-width {
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          min-width: 100vw !important;
          left: 0 !important;
          right: 0 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 50 !important;
          box-sizing: border-box !important;
        }

        .header-content-full {
          margin: 0 !important;
          padding: 0 1rem !important;
          width: 100vw !important;
          max-width: 100vw !important;
          min-width: 100vw !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          height: 4rem !important;
        }

        /* Asegurar que el contenedor padre no limite */
        .header-full-width * {
          box-sizing: border-box !important;
        }

        /* Evitar overflow horizontal */
        .header-full-width {
          overflow-x: hidden !important;
        }

        /* Responsive sin límites */
        @media (max-width: 768px) {
          .header-content-full {
            padding: 0 0.75rem !important;
          }
        }

        @media (max-width: 480px) {
          .header-content-full {
            padding: 0 0.5rem !important;
          }
        }
      `}</style>

      <header className={`header-full-width border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
        <div className="header-content-full">
          {/* Left Section */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={onMenuClick}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col space-y-4 mt-6">
                  <div className="px-2">
                    <h2 className="text-lg font-semibold">Navegación</h2>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="hidden md:block font-bold text-xl whitespace-nowrap">Multipaga</span>
            </Link>

            {/* Page Title */}
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <h1 className="hidden md:block text-lg font-semibold text-muted-foreground whitespace-nowrap">
              {getPageTitle()}
            </h1>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-4 hidden lg:block">
            {showSearch ? (
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Buscar pagos, clientes, transacciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  rightIcon={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSearch(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  }
                  autoFocus
                  className="w-full"
                />
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowSearch(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Buscar...</span>
                <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Quick Create */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Crear</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {QuickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <DropdownMenuItem key={action.href} asChild>
                      <Link href={action.href}>
                        <Icon className={`w-4 h-4 mr-3 ${action.color}`} />
                        <div>
                          <div className="font-medium">{action.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notificaciones
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} nuevas
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className="flex items-start space-x-3 p-3"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.read ? 'bg-muted' : 'bg-blue-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { 
                              addSuffix: true 
                            })}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                
                {notifications.length > 5 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/notifications" className="text-center">
                        Ver todas las notificaciones
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {merchant?.business_profile?.profile_name 
                        ? merchant.business_profile.profile_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                        : merchant?.merchant_id?.[0]?.toUpperCase() || 'M'
                      }
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {merchant?.business_profile?.profile_name || merchant?.merchant_id || 'Merchant'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {merchant?.merchant_id}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/security">
                    <Shield className="w-4 h-4 mr-2" />
                    Seguridad
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/support">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Soporte
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}