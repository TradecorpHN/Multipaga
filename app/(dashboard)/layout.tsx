'use client'

import { useState, ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/presentation/contexts/AuthContext'
import {
  LayoutDashboard,
  CreditCard,
  RefreshCcw,
  FileText,
  AlertTriangle,
  CheckSquare,
  Zap,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Loader2,
  Search,
  Users,
  Receipt,
  Settings,
  Key,
  Send,
  Banknote,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronUp,
  Bell,
  HelpCircle,
  Activity
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import Image from 'next/image'

// Paleta de colores sincronizada con el dashboard premium
const MULTIPAGA_COLORS = {
  primary: '#1e40af', // Blue-700 (coherente con dashboard)
  primaryDark: '#1e3a8a', // Blue-800
  secondary: '#3b82f6', // Blue-500
  accent: '#60a5fa', // Blue-400
  success: '#10b981', // Emerald-500
  warning: '#f59e0b', // Amber-500
  error: '#ef4444', // Red-500
  background: 'from-blue-900 via-blue-800 to-blue-900', // Coherente con dashboard
  gradient: {
    primary: 'from-blue-600 to-blue-700',
    secondary: 'from-blue-500 to-blue-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-yellow-600',
    error: 'from-red-500 to-red-600',
    header: 'from-blue-900/95 via-blue-800/90 to-blue-900/95',
    sidebar: 'from-blue-900/95 via-blue-800/90 to-blue-900/95',
  },
}

// Layout props
interface DashboardLayoutProps {
  children: ReactNode
}

// Categorías de navegación (sincronizadas con el dashboard)
interface NavigationCategory {
  id: string
  name: string
  items: NavigationItem[]
  icon: React.ComponentType<any>
  gradient: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  badge?: string
  requiresConnector?: boolean
}

// Elementos de navegación organizados por categorías (todos los 13 módulos)
const navigationCategories: NavigationCategory[] = [
  {
    id: 'core',
    name: 'Principal',
    icon: LayoutDashboard,
    gradient: MULTIPAGA_COLORS.gradient.primary,
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Pagos', href: '/payments', icon: CreditCard },
      { name: 'Transacciones', href: '/transactions', icon: Receipt },
      { name: 'Conectores', href: '/connectors', icon: Zap },
    ]
  },
  {
    id: 'financial',
    name: 'Financiero',
    icon: BarChart3,
    gradient: MULTIPAGA_COLORS.gradient.success,
    items: [
      { name: 'Reembolsos', href: '/refunds', icon: RefreshCcw, requiresConnector: true },
      { name: 'Disputas', href: '/disputes', icon: AlertTriangle, requiresConnector: true },
      { name: 'Pagos Salientes', href: '/payouts', icon: Send, requiresConnector: true },
      { name: 'Conciliación', href: '/reconciliation', icon: CheckSquare, requiresConnector: true },
      { name: 'Remesas', href: '/remittances', icon: Banknote, requiresConnector: true },
    ]
  },
  {
    id: 'management',
    name: 'Gestión',
    icon: Users,
    gradient: 'from-purple-600 to-purple-700',
    items: [
      { name: 'Clientes', href: '/customers', icon: Users },
      { name: 'Facturas', href: '/invoices', icon: FileText },
      { name: 'Mandatos', href: '/mandates', icon: Shield, requiresConnector: true },
    ]
  },
  {
    id: 'security',
    name: 'Seguridad',
    icon: Settings,
    gradient: MULTIPAGA_COLORS.gradient.error,
    items: [
      { name: 'Vault', href: '/vault', icon: Key },
      { name: 'Configuración', href: '/settings', icon: Settings },
    ]
  }
]

// Hook to handle client-side rendering
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}

// Logo de Multipaga optimizado (coherente con dashboard)
interface MultipagaLogoProps {
  size?: 'small' | 'default' | 'large'
  className?: string
}

const MultipagaLogo = ({ size = 'default', className = '' }: MultipagaLogoProps) => {
  const [imageError, setImageError] = useState(false)
  const isClient = useIsClient()
  
  const sizeConfig = {
    small: { width: 120, height: 40 },
    default: { width: 160, height: 50 },
    large: { width: 200, height: 60 },
  }
  const config = sizeConfig[size]

  const fallbackLogo = (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-r ${MULTIPAGA_COLORS.gradient.primary} rounded-xl shadow-lg mx-auto`}
      style={{ width: config.width, height: config.height }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">M</span>
        </div>
        <span className="text-white font-bold text-lg">Multipaga</span>
      </div>
    </div>
  )

  if (!isClient || imageError) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={clsx('flex items-center justify-center', className)}
      >
        {fallbackLogo}
      </motion.div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={clsx('flex items-center justify-center mx-auto', className)}
      style={{ width: config.width, height: config.height }}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
        <Image
          src="/logotext.png"
          alt="Multipaga Logo"
          fill
          sizes={`${config.width}px`}
          className="object-contain transition-all duration-300 hover:brightness-110"
          priority
          onError={() => setImageError(true)}
        />
      </div>
    </motion.div>
  )
}

// Fondo premium sincronizado con el dashboard
const PremiumBackground = () => {
  const isClient = useIsClient()
  
  if (!isClient) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Elementos de fondo sutiles con animaciones mejoradas (coherente con dashboard) */}
      <div className="absolute -inset-10 opacity-15">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, 30, 0],
            y: [0, -50, 0]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>
      
      {/* Partículas flotantes (coherente con dashboard) */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Componente de categoría de navegación
const NavigationCategory = ({ 
  category, 
  isExpanded, 
  onToggle, 
  currentPath,
  hasConnectors = false 
}: { 
  category: NavigationCategory
  isExpanded: boolean
  onToggle: () => void
  currentPath: string
  hasConnectors?: boolean
}) => {
  const isClient = useIsClient()
  const hasActiveItem = category.items.some(item => currentPath === item.href)

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={clsx(
          'group flex items-center justify-between w-full p-3 text-sm font-semibold rounded-xl border transition-all duration-200',
          hasActiveItem || isExpanded
            ? `bg-gradient-to-r ${category.gradient} text-white border-blue-400/30 shadow-lg`
            : 'text-blue-200/80 hover:bg-white/10 hover:text-white border-transparent hover:border-blue-400/20'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              hasActiveItem || isExpanded
                ? 'bg-white/20 shadow-lg'
                : 'bg-white/10 group-hover:bg-white/15'
            )}
          >
            <category.icon className="w-4 h-4" />
          </div>
          <span>{category.name}</span>
        </div>
        {isClient && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 space-y-1 overflow-hidden"
          >
            {category.items.map((item) => {
              const isActive = currentPath === item.href
              const isDisabled = item.requiresConnector && !hasConnectors

              return (
                <Link
                  key={item.name}
                  href={isDisabled ? '#' : item.href}
                  className={clsx(
                    'group flex items-center gap-3 p-2.5 text-sm font-medium rounded-lg border transition-all duration-200',
                    isActive
                      ? `bg-gradient-to-r ${MULTIPAGA_COLORS.gradient.primary} text-white border-blue-400/30 shadow-sm`
                      : isDisabled
                      ? 'text-blue-200/40 cursor-not-allowed border-transparent'
                      : 'text-blue-200/70 hover:bg-white/10 hover:text-white border-transparent hover:border-blue-400/20'
                  )}
                  onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                >
                  <div
                    className={clsx(
                      'p-1.5 rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-white/20 shadow-sm'
                        : isDisabled
                        ? 'bg-white/5'
                        : 'bg-white/10 group-hover:bg-white/15'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isDisabled && (
                    <span className="text-xs text-blue-200/40">Requiere conector</span>
                  )}
                  {isActive && isClient && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronRight className="text-blue-300 w-3.5 h-3.5" />
                    </motion.div>
                  )}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { authState, logout, isLoading } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    core: true, // Principal expandido por defecto
  })
  const isClient = useIsClient()

  // Determinar si hay conectores disponibles (simulado)
  const hasConnectors = true // En producción, esto vendría del contexto o hook

  useEffect(() => {
    if (!isLoading && !authState?.isAuthenticated) {
      window.location.href = '/login'
    }
  }, [authState, isLoading])

  // Auto-expandir categoría activa
  useEffect(() => {
    navigationCategories.forEach(category => {
      const hasActiveItem = category.items.some(item => pathname === item.href)
      if (hasActiveItem && !expandedCategories[category.id]) {
        setExpandedCategories(prev => ({ ...prev, [category.id]: true }))
      }
    })
  }, [pathname, expandedCategories])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Sesión cerrada correctamente')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error al cerrar sesión. Por favor, intenta de nuevo.')
    }
  }

  if (isLoading || !authState?.isAuthenticated) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-gradient-to-br ${MULTIPAGA_COLORS.background}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-3"
        >
          <Loader2 className="w-8 h-8 text-blue-400" />
          <span className="text-white text-base font-medium">Cargando sistema...</span>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #__next {
          height: 100vh;
          width: 100vw;
          overflow-x: hidden;
          background: linear-gradient(to bottom right, #1e3a8a, #1e40af, #1e3a8a);
        }

        .dashboard-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          position: relative;
        }

        .dashboard-sidebar {
          width: 280px;
          background: linear-gradient(to bottom, rgba(30, 58, 138, 0.95), rgba(30, 64, 175, 0.90));
          border-right: 1px solid rgba(96, 165, 250, 0.20);
          backdrop-filter: blur(20px);
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 50;
          transition: transform 0.3s ease-in-out;
        }

        .dashboard-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, #3b82f6, transparent);
          animation: glowWave 3.5s infinite ease-in-out;
        }

        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: calc(100% - 280px);
          margin-left: 280px;
        }

        .dashboard-header {
          position: sticky;
          top: 0;
          height: 70px;
          background: linear-gradient(to right, rgba(30, 58, 138, 0.95), rgba(30, 64, 175, 0.90));
          border-bottom: 1px solid rgba(96, 165, 250, 0.20);
          backdrop-filter: blur(20px);
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1.5rem;
        }

        .dashboard-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 1400px;
          gap: 1rem;
        }

        .dashboard-content {
          flex: 1;
          padding: 0;
          overflow-y: auto;
          background: transparent;
        }

        @keyframes glowWave {
          0% { transform: translateX(-100%); opacity: 0.4; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0.4; }
        }

        @media (max-width: 1024px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
            width: 280px;
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .dashboard-main {
            width: 100%;
            margin-left: 0;
          }
          .dashboard-header {
            height: 64px;
          }
          .dashboard-header-content {
            padding: 0 1rem;
            gap: 0.75rem;
          }
        }

        @media (max-width: 640px) {
          .dashboard-header-content {
            gap: 0.5rem;
          }
          .search-container {
            max-width: 10rem;
          }
          .status-container {
            display: none;
          }
        }

        @supports not (backdrop-filter: blur(20px)) {
          .dashboard-sidebar, .dashboard-header {
            background: linear-gradient(to right, rgba(30, 58, 138, 0.98), rgba(30, 64, 175, 0.95));
          }
        }
      `}</style>

      <div className="dashboard-container">
        <PremiumBackground />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
          )}
        </AnimatePresence>

        <motion.aside
          initial={false}
          animate={{ x: isSidebarOpen ? 0 : '-100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={clsx('dashboard-sidebar', { open: isSidebarOpen })}
        >
          <div className="flex h-full flex-col">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-blue-400/20 bg-gradient-to-r from-blue-900/95 to-blue-800/90">
              <Link href="/" className="flex items-center justify-center w-full">
                <MultipagaLogo size="small" className="mx-auto" />
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-blue-700/30 rounded-lg transition-colors lg:hidden"
                aria-label="Cerrar menú lateral"
              >
                <X className="w-5 h-5 text-blue-300" />
              </button>
            </div>

            {/* Información del usuario */}
            <div className="border-b border-blue-400/20 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`bg-gradient-to-br ${MULTIPAGA_COLORS.gradient.primary} rounded-full p-2 shadow-lg`}
                >
                  <User className="text-white w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {authState?.merchantId}
                  </p>
                  <p className="truncate text-xs text-blue-300/80">
                    {authState?.customerName || authState?.profileId}
                  </p>
                </div>
                {isClient && (
                  <motion.div
                    className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-lg shadow-green-400/30"
                    animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            </div>

            {/* Navegación por categorías */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-2">
              {navigationCategories.map((category) => (
                <NavigationCategory
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategories[category.id] || false}
                  onToggle={() => toggleCategory(category.id)}
                  currentPath={pathname}
                  hasConnectors={hasConnectors}
                />
              ))}
            </nav>

            {/* Footer del sidebar */}
            <div className="border-t border-blue-400/20 p-3 space-y-2">
              <button
                className="flex w-full items-center gap-3 p-3 text-sm font-medium text-blue-200/80 hover:bg-blue-600/20 hover:text-white rounded-lg border border-transparent hover:border-blue-400/30 transition-all duration-200"
                aria-label="Ayuda y soporte"
              >
                <div className="p-1.5 rounded-md bg-white/10 hover:bg-white/15 transition-all duration-200">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span>Ayuda</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 p-3 text-sm font-medium text-blue-200/80 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-white rounded-lg border border-transparent hover:border-red-500/30 transition-all duration-200"
                aria-label="Cerrar sesión"
              >
                <div className="p-1.5 rounded-md bg-white/10 hover:bg-gradient-to-r hover:from-red-500/40 hover:to-pink-500/40 transition-all duration-200">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </motion.aside>

        <div className="dashboard-main">
          {/* Header principal */}
          <header className="dashboard-header">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-600/15 to-blue-500/10 pointer-events-none"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="dashboard-header-content">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-blue-700/30 rounded-lg transition-colors"
                aria-label="Abrir menú lateral"
              >
                <Menu className="w-5 h-5 text-blue-300" />
              </button>

              <div className="flex items-center justify-center flex-1 min-w-0">
                <MultipagaLogo size="default" className="mx-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative max-w-[14rem] w-full search-container">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300/70" />
                  <input
                    type="text"
                    placeholder="Buscar módulos..."
                    className="w-full pl-9 pr-3 py-2 bg-white/10 border border-blue-400/20 rounded-xl text-white text-sm placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    aria-label="Buscar en el dashboard"
                  />
                </div>

                <button
                  className="p-2 hover:bg-blue-700/30 rounded-lg transition-colors relative"
                  aria-label="Notificaciones"
                >
                  <Bell className="w-5 h-5 text-blue-300" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/15 border border-green-500/25 rounded-full backdrop-blur-sm status-container">
                  {isClient && (
                    <motion.div
                      className="w-2 h-2 bg-green-400 rounded-full shadow-sm shadow-green-400/30"
                      animate={{ opacity: [1, 0.5, 1], scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <span className="text-green-400 text-xs font-medium">Sistema Activo</span>
                </div>
              </div>
            </div>
          </header>

          {/* Contenido principal */}
          <main className="dashboard-content">
            {isClient ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full"
              >
                {children}
              </motion.div>
            ) : (
              <div className="h-full">{children}</div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}