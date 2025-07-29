'use client'

import { useState, ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/presentation/contexts/AuthContext'
import {
  LayoutDashboard,
  CreditCard,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckSquare,
  Cable,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import Image from 'next/image'

// Web3-inspired color palette
const MULTIPAGA_COLORS = {
  primary: '#00BFFF', // Neon Cyan
  primaryDark: '#0066CC',
  secondary: '#00FFFF',
  accent: '#9333EA', // Neon Purple
  success: '#00FF7F',
  warning: '#FFD700',
  error: '#FF1493', // Neon Pink
  background: '#0A1122', // Deep Space Blue
  gradient: {
    primary: 'from-cyan-500 via-blue-600 to-purple-600',
    tech: 'from-cyan-400 via-blue-500 to-purple-500',
    success: 'from-emerald-400 via-green-500 to-teal-600',
    header: 'from-slate-900/95 via-cyan-900/90 to-purple-900/90',
  },
}

// Layout props
interface DashboardLayoutProps {
  children: ReactNode
}

// Navigation items
const navigationItems = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard },
  { name: 'Conectores', href: '/connectors', icon: Cable },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Reembolsos', href: '/refunds', icon: RefreshCw },
  { name: 'Transacciones', href: '/transactions', icon: FileText },
  { name: 'Disputas', href: '/disputes', icon: AlertTriangle },
  { name: 'Reconciliación', href: '/reconciliation', icon: CheckSquare },
]

// Hook to handle client-side rendering
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}

// Optimized Multipaga Logo
interface MultipagaLogoProps {
  size?: 'small' | 'default' | 'large'
  className?: string
}

const MultipagaLogo = ({ size = 'default', className = '' }: MultipagaLogoProps) => {
  const isClient = useIsClient()
  const sizeConfig = {
    small: { width: '30vw', maxWidth: 120, height: 40 },
    default: { width: '35vw', maxWidth: 160, height: 50 },
    large: { width: '40vw', maxWidth: 200, height: 60 },
  }
  const config = sizeConfig[size]

  if (!isClient) {
    return (
      <div
        className={clsx('relative flex items-center justify-center', className)}
        style={{ width: config.maxWidth, height: config.height }}
      >
        <div
          className={`w-full h-full bg-gradient-to-r ${MULTIPAGA_COLORS.gradient.primary} rounded-md flex items-center justify-center shadow-md shadow-cyan-500/20`}
        >
          <span className="text-white font-bold text-base">Multipaga</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={clsx('relative flex items-center justify-center', className)}
      style={{ width: config.maxWidth, height: config.height }}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-md">
        <Image
          src="/logotext.png"
          alt="Multipaga Logo"
          fill
          sizes="(max-width: 768px) 30vw, 160px"
          className="object-contain transition-all duration-300 hover:brightness-110"
          priority
          onError={() => {
            console.warn('Error loading Multipaga logo')
            toast.error('No se pudo cargar el logo')
          }}
        />
      </div>
    </motion.div>
  )
}

// Dynamic Web3 Wave Background
const DynamicWaveBackground = () => {
  const isClient = useIsClient()
  if (!isClient) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.08] z-[-1]">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={MULTIPAGA_COLORS.primary} stopOpacity="0.7" />
            <stop offset="50%" stopColor={MULTIPAGA_COLORS.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={MULTIPAGA_COLORS.primaryDark} stopOpacity="0.7" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <motion.path
            key={`wave-${i}`}
            d={`M0,${300 + i * 50} Q250,${250 + i * 60} 500,${300 + i * 50} T1000,${300 + i * 50}`}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="2.5"
            filter="url(#waveGlow)"
            animate={{
              d: [
                `M0,${300 + i * 50} Q250,${250 + i * 60} 500,${300 + i * 50} T1000,${300 + i * 50}`,
                `M0,${300 + i * 50} Q250,${350 + i * 60} 500,${300 + i * 50} T1000,${300 + i * 50}`,
              ],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            aria-hidden="true"
          />
        ))}
      </svg>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { authState, logout, isLoading } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isClient = useIsClient()

  useEffect(() => {
    if (!isLoading && !authState?.isAuthenticated) {
      window.location.href = '/login'
    }
  }, [authState, isLoading])

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
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-3"
        >
          <Loader2 className="w-8 h-8 text-cyan-400" />
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
          background: ${MULTIPAGA_COLORS.background};
        }

        .dashboard-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          position: relative;
        }

        .dashboard-sidebar {
          width: 260px;
          background: linear-gradient(to bottom, rgba(10, 17, 34, 0.95), rgba(6, 182, 212, 0.85));
          border-right: 1px solid rgba(34, 211, 238, 0.25);
          backdrop-filter: blur(14px);
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
          background: linear-gradient(to right, transparent, ${MULTIPAGA_COLORS.primary}, transparent);
          animation: glowWave 3.5s infinite ease-in-out;
        }

        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: calc(100% - 260px);
          margin-left: 260px;
        }

        .dashboard-header {
          position: sticky;
          top: 0;
          height: 60px;
          background: linear-gradient(to right, rgba(10, 17, 34, 0.95), rgba(6, 182, 212, 0.85));
          border-bottom: 1px solid rgba(34, 211, 238, 0.25);
          backdrop-filter: blur(14px);
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem;
        }

        .dashboard-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 1400px;
          gap: 0.75rem;
        }

        .dashboard-content {
          flex: 1;
          padding: 1.25rem;
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
            width: 240px;
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .dashboard-main {
            width: 100%;
            margin-left: 0;
          }
          .dashboard-header {
            height: 56px;
          }
          .dashboard-header-content {
            padding: 0 0.75rem;
            gap: 0.5rem;
          }
          .search-container {
            max-width: 12rem;
          }
        }

        @media (max-width: 640px) {
          .dashboard-content {
            padding: 0.75rem;
          }
          .search-container {
            max-width: 10rem;
          }
          .dashboard-header-content {
            flex-wrap: nowrap;
            gap: 0.5rem;
          }
          .status-container {
            display: none;
          }
        }

        @supports not (backdrop-filter: blur(14px)) {
          .dashboard-sidebar, .dashboard-header {
            background: linear-gradient(to right, rgba(10, 17, 34, 0.98), rgba(6, 182, 212, 0.9));
          }
        }
      `}</style>

      <div className="dashboard-container">
        <DynamicWaveBackground />

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
            <div className="flex items-center justify-between h-14 px-3 border-b border-cyan-500/25 bg-gradient-to-r from-slate-900/95 to-cyan-900/90">
              <Link href="/" className="flex items-center">
                <MultipagaLogo size="small" />
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-cyan-700/30 rounded-md transition-colors lg:hidden"
                aria-label="Cerrar menú lateral"
              >
                <X className="w-5 h-5 text-cyan-400" />
              </button>
            </div>

            <div className="border-b border-cyan-500/25 p-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`bg-gradient-to-br ${MULTIPAGA_COLORS.gradient.primary} rounded-full p-1.5 shadow-md shadow-cyan-500/20`}
                >
                  <User className="text-white w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {authState?.merchantId}
                  </p>
                  <p className="truncate text-xs text-cyan-300/80">
                    {authState?.profileName || authState?.profileId}
                  </p>
                </div>
                {isClient && (
                  <motion.div
                    className="w-2 h-2 bg-green-400 rounded-full shadow-md shadow-green-400/30"
                    animate={{ opacity: [1, 0.5, 1], scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1.5">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'group flex items-center gap-2.5 p-2.5 text-sm font-medium rounded-md border transition-all duration-200',
                        isActive
                          ? `bg-gradient-to-r ${MULTIPAGA_COLORS.gradient.primary} text-white border-cyan-500/30 shadow-sm shadow-cyan-500/15`
                          : 'text-cyan-100/80 hover:bg-gradient-to-r hover:from-cyan-500/15 hover:to-blue-600/15 hover:text-white border-transparent hover:border-cyan-500/20'
                      )}
                    >
                      <div
                        className={clsx(
                          'p-1.5 rounded-md transition-all duration-200',
                          isActive
                            ? `bg-gradient-to-r ${MULTIPAGA_COLORS.gradient.tech} shadow-sm shadow-cyan-500/20`
                            : 'bg-slate-800/40 group-hover:bg-gradient-to-r group-hover:from-cyan-500/30 group-hover:to-blue-600/30'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span>{item.name}</span>
                      {isActive && isClient && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-auto"
                        >
                          <ChevronRight className="text-cyan-400 w-4 h-4" />
                        </motion.div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>

            <div className="border-t border-cyan-500/25 p-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 p-2.5 text-sm font-medium text-cyan-100/80 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-white rounded-md border border-transparent hover:border-red-500/30 transition-all duration-200"
                aria-label="Cerrar sesión"
              >
                <div className="p-1.5 rounded-md bg-slate-800/40 hover:bg-gradient-to-r hover:from-red-500/40 hover:to-pink-500/40 transition-all duration-200">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </motion.aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-600/15 to-purple-600/10 pointer-events-none"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="dashboard-header-content">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-cyan-700/30 rounded-md transition-colors"
                aria-label="Abrir menú lateral"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
              </button>

              <div className="flex items-center justify-center flex-1 min-w-0">
                <MultipagaLogo size="default" />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative max-w-[12rem] w-full search-container">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-800/50 border border-cyan-500/25 rounded-md text-white text-sm placeholder-cyan-300/50 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    aria-label="Buscar en el dashboard"
                  />
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 border border-green-500/25 rounded-full backdrop-blur-sm status-container">
                  {isClient && (
                    <motion.div
                      className="w-2 h-2 bg-green-400 rounded-full shadow-sm shadow-green-400/30"
                      animate={{ opacity: [1, 0.5, 1], scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <span className="text-green-400 text-xs font-medium">Conectado</span>
                </div>
              </div>
            </div>
          </header>

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