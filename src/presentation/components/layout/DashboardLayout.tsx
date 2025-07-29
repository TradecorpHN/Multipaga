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
  Network,
  Cpu,
  Server,
  Database,
  Hexagon
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: ReactNode
}

const navigationItems = [
  {
    name: 'Inicio',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Conectores',
    href: '/connectors',
    icon: Cable,
  },
  {
    name: 'Pagos',
    href: '/payments',
    icon: CreditCard,
  },
  {
    name: 'Reembolsos',
    href: '/refunds',
    icon: RefreshCw,
  },
  {
    name: 'Transacciones',
    href: '/transactions',
    icon: FileText,
  },
  {
    name: 'Disputas',
    href: '/disputes',
    icon: AlertTriangle,
  },
  {
    name: 'Reconciliación',
    href: '/reconciliation',
    icon: CheckSquare,
  },
]

// Logo Multipaga TECNOLÓGICO AVANZADO - Perfectamente sincronizado
const MultipagaLogo = ({ size = 'default', className = '' }: { size?: 'small' | 'default' | 'large', className?: string }) => {
  const sizeConfig = {
    small: { width: 120, height: 40 },
    default: { width: 180, height: 60 },
    large: { width: 240, height: 80 }
  }
  
  const config = sizeConfig[size]
  
  return (
    <motion.div
      whileHover={{ 
        scale: 1.05,
        filter: 'brightness(1.2)'
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative group ${className}`}
      style={{ width: config.width, height: config.height }}
    >
      {/* Efectos tecnológicos avanzados multicapa */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-500"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0, 0.6, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Glow adicional para más profundidad */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-cyan-400/20 to-purple-400/10 rounded-lg blur-md"
        animate={{
          scale: [0.95, 1.1, 0.95],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      
      {/* Logo container avanzado */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
        {/* Shimmer effect tecnológico mejorado */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent -skew-x-12"
          animate={{
            translateX: ['-100%', '100%']
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        />
        
        {/* Grid tecnológico de fondo */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="logoTechGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="0.5" fill="#00FFFF" opacity="0.6"/>
                <line x1="5" y1="10" x2="15" y2="10" stroke="#00FFFF" strokeWidth="0.3" opacity="0.4"/>
                <line x1="10" y1="5" x2="10" y2="15" stroke="#00FFFF" strokeWidth="0.3" opacity="0.4"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#logoTechGrid)" />
          </svg>
        </div>
        
        {/* Logo usando imagen real con efectos avanzados */}
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.div
            className="relative w-full h-full"
            animate={{
              filter: [
                'brightness(1) saturate(1) hue-rotate(0deg)', 
                'brightness(1.15) saturate(1.3) hue-rotate(2deg)', 
                'brightness(1) saturate(1) hue-rotate(0deg)'
              ],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Image 
              src="/logotext.png" 
              alt="Multipaga Logo"
              fill
              className="object-contain filter brightness-110 group-hover:brightness-130 transition-all duration-300 drop-shadow-lg"
              priority
              style={{ objectFit: 'contain' }}
            />
          </motion.div>
          
          {/* Efectos tecnológicos flotantes avanzados */}
          <motion.div
            animate={{ 
              scale: [0.8, 1.4, 0.8],
              rotate: [0, 360],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-400/60"
          />
          <motion.div
            animate={{ 
              scale: [1, 0.6, 1],
              rotate: [360, 0],
              opacity: [0.8, 0.3, 0.8]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
            className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full shadow-lg shadow-purple-400/60"
          />
          <motion.div
            animate={{ 
              scale: [0.5, 1.3, 0.5],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.8
            }}
            className="absolute top-1/2 -right-0.5 w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg shadow-blue-400/60"
          />
          
          {/* Hexágonos tecnológicos flotantes mejorados */}
          <motion.div
            animate={{ 
              y: [-3, 3, -3],
              rotate: [0, 180, 360],
              opacity: [0.3, 0.9, 0.3]
            }}
            transition={{ 
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 left-1/4 w-1.5 h-1.5"
          >
            <Hexagon className="w-full h-full text-cyan-400 drop-shadow-sm" />
          </motion.div>
          <motion.div
            animate={{ 
              y: [3, -3, 3],
              rotate: [360, 180, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-0 right-1/4 w-1 h-1"
          >
            <Hexagon className="w-full h-full text-purple-400 drop-shadow-sm" />
          </motion.div>
          
          {/* Líneas de conexión tecnológicas pulsantes */}
          <motion.div
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute inset-0 border border-cyan-400/30 rounded-lg"
          />
          
          {/* Anillo exterior tecnológico */}
          <motion.div
            animate={{
              rotate: [0, 360],
              opacity: [0.2, 0.6, 0.2]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 border-2 border-dashed border-blue-400/20 rounded-lg"
          />
          
          {/* Partículas flotantes */}
          <motion.div
            animate={{
              x: [0, 10, 0],
              y: [0, -5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 left-0 w-0.5 h-0.5 bg-cyan-300 rounded-full"
          />
          <motion.div
            animate={{
              x: [0, -8, 0],
              y: [0, 8, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-1/4 right-0 w-0.5 h-0.5 bg-purple-300 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}
// Componente de red tecnológica para el fondo
const TechBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="w-full h-full">
        <defs>
          <linearGradient id="techBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#0080FF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.3" />
          </linearGradient>
          <filter id="techBgGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Grid tecnológico */}
        <defs>
          <pattern id="techGridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
            <circle cx="25" cy="25" r="1" fill="#00FFFF" opacity="0.4"/>
            <line x1="12.5" y1="25" x2="37.5" y2="25" stroke="#00FFFF" strokeWidth="0.5" opacity="0.2"/>
            <line x1="25" y1="12.5" x2="25" y2="37.5" stroke="#00FFFF" strokeWidth="0.5" opacity="0.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#techGridPattern)" />
        
        {/* Líneas de conexión animadas */}
        {Array.from({ length: 5 }, (_, i) => (
          <motion.line
            key={i}
            x1={`${i * 25}%`}
            y1="0%"
            x2={`${(i + 1) * 25}%`}
            y2="100%"
            stroke="url(#techBgGradient)"
            strokeWidth="1"
            filter="url(#techBgGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeInOut"
            }}
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

  useEffect(() => {
    if (!isLoading && !authState?.isAuthenticated) {
      window.location.href = '/login'
    }
  }, [authState, isLoading])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  if (isLoading || !authState?.isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 h-screen w-screen" style={{ margin: 0, padding: 0 }}>
        <div className="flex items-center gap-4 text-center" style={{ margin: 0, padding: 0 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Cpu className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <span className="text-white text-lg">Cargando sistema tecnológico...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 text-white overflow-hidden dashboard-container" style={{ margin: 0, padding: 0, maxWidth: '100vw', width: '100vw' }}>
      <style>
        {`
          /* Reset global completo */
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
          }
          
          html, #__next {
            height: 100%;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
          }
          
          /* Header COMPLETAMENTE SIN LÍMITES - Perfecta sincronización */
          .header-no-margin {
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            max-width: none !important;
            min-width: 100vw !important;
            box-sizing: border-box !important;
            position: sticky !important;
            left: 0 !important;
            right: 0 !important;
            /* ELIMINAR TODOS LOS LÍMITES DE ALTURA */
            height: auto !important;
            min-height: unset !important;
            max-height: unset !important;
            overflow: visible !important;
          }
          
          .header-no-margin > * {
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          
          /* Responsividad SIN LÍMITES */
          @media (max-width: 480px) {
            .header-no-margin {
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              height: auto !important;
              min-height: unset !important;
              max-height: unset !important;
            }
          }
          
          @media (max-width: 768px) {
            .header-no-margin {
              height: auto !important;
              min-height: unset !important;
              max-height: unset !important;
            }
          }
          
          @media (min-width: 1920px) {
            .header-no-margin {
              height: auto !important;
              min-height: unset !important;
              max-height: unset !important;
            }
          }
          
          /* Compatibilidad cross-browser */
          .header-no-margin {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          /* Asegurar que no haya scroll horizontal y ELIMINAR LÍMITES */
          .dashboard-container {
            overflow-x: hidden !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: auto !important;
            min-height: 100vh !important;
            max-height: unset !important;
          }
        `}
      </style>

      {/* Background tecnológico */}
      <TechBackground />

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            style={{ margin: 0, padding: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Tecnológico */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : '-100%',
        }}
        className={clsx(
          'fixed z-50 h-screen bg-gradient-to-b from-gray-800/95 via-cyan-900/90 to-purple-900/95 lg:relative lg:z-auto lg:translate-x-0 transition-transform duration-300',
          'w-1/5 md:w-1/6 lg:w-1/6 xl:w-1/6',
          'min-w-[250px] max-w-[300px] border-r border-cyan-400/30 backdrop-blur-xl'
        )}
        style={{ 
          margin: 0, 
          padding: 0,
          maxHeight: '100vh',
          overflowY: 'auto'
        }}
      >
        <div className="flex h-full flex-col relative" style={{ margin: 0, padding: 0 }}>
          {/* Efectos tecnológicos del sidebar */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-purple-500/10 pointer-events-none" />
          
          {/* Logo tecnológico AVANZADO */}
          <div className="flex items-center justify-center bg-gradient-to-r from-gray-900/95 via-cyan-900/90 to-purple-900/95 w-full h-16 border-b border-cyan-400/30 relative" style={{ margin: 0, padding: 0 }}>
            <Link href="/" className="flex justify-center w-full relative z-10" style={{ margin: 0, padding: 0 }}>
              <div className="relative h-full w-full flex items-center justify-center" style={{ margin: 0, padding: 0 }}>
                {/* Logo avanzado con efectos tecnológicos */}
                <MultipagaLogo size="small" className="mx-auto" />
              </div>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-2 top-2 hover:bg-cyan-700/50 rounded p-1 lg:hidden transition-colors duration-200"
            >
              <X className="text-cyan-400" />
            </button>
          </div>

          {/* User Info Tecnológico */}
          <div className="border-b border-cyan-400/30 p-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-400 rounded-full p-2 shadow-lg shadow-cyan-400/30">
                <User className="text-white w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="truncate text-sm font-medium text-white">
                  {authState?.merchantId}
                </p>
                <p className="truncate text-xs text-cyan-300/80">
                  {authState?.profileName || authState?.profileId}
                </p>
              </div>
              {/* Indicador de conexión */}
              <motion.div 
                className="ml-auto w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Navigation Tecnológica */}
          <nav className="flex-1 overflow-y-auto relative z-10">
            <div className="space-y-1 p-2">
              {navigationItems.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className={clsx(
                        'group flex items-center gap-3 p-3 text-sm transition-all duration-300 rounded-xl border',
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border-cyan-400/50 shadow-lg shadow-cyan-400/25'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 hover:text-white border-transparent hover:border-cyan-400/30'
                      )}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.3 }}
                        className={clsx(
                          'p-2 rounded-lg transition-all duration-300',
                          isActive 
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-400/30' 
                            : 'bg-gray-700/50 group-hover:bg-gradient-to-r group-hover:from-cyan-500/50 group-hover:to-blue-500/50'
                        )}
                      >
                        <item.icon className={clsx(
                          'w-4 h-4 transition-colors duration-300',
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-cyan-300'
                        )} />
                      </motion.div>
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="ml-auto"
                        >
                          <ChevronRight className="text-cyan-400 w-4 h-4" />
                        </motion.div>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </nav>

          {/* Logout Button Tecnológico */}
          <div className="border-t border-cyan-400/30 p-2 relative z-10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="flex w-full items-center gap-3 p-3 text-sm text-gray-300 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-white rounded-xl border border-transparent hover:border-red-400/50 transition-all duration-300"
            >
              <div className="p-2 rounded-lg bg-gray-700/50 hover:bg-gradient-to-r hover:from-red-500/50 hover:to-pink-500/50 transition-all duration-300">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-medium">Cerrar sesión</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content - SIN LÍMITES para perfecta sincronización */}
      <div 
        className="flex flex-1 flex-col overflow-hidden w-full relative" 
        style={{ 
          margin: 0, 
          padding: 0, 
          width: '100% !important',
          maxWidth: 'none !important',
          minWidth: '0',
          height: 'auto !important',
          minHeight: 'unset !important',
          maxHeight: 'unset !important',
          overflow: 'visible !important'
        }}
      >
        {/* Header - PERFECTA SINCRONIZACIÓN SIN LÍMITES */}
        <header 
          className="sticky top-0 z-30 bg-gray-800/95 backdrop-blur-lg header-no-margin border-b border-cyan-400/30" 
          style={{ 
            margin: '0 !important', 
            padding: '0 !important', 
            border: 'none',
            borderBottom: '1px solid rgba(34, 211, 238, 0.3)',
            width: '100vw !important',
            maxWidth: 'none !important',
            minWidth: '100vw !important',
            left: '0',
            right: '0',
            position: 'sticky',
            /* ELIMINAR TODOS LOS LÍMITES DE ALTURA PARA SINCRONIZACIÓN PERFECTA */
            height: 'auto !important',
            minHeight: 'unset !important',
            maxHeight: 'unset !important',
            overflow: 'visible !important'
          }}
        >
          <div 
            className="flex items-center justify-between header-no-margin relative" 
            style={{ 
              margin: '0 !important', 
              padding: 'clamp(8px, 2vw, 20px) clamp(12px, 3vw, 24px) !important', 
              /* SIN LÍMITES DE ALTURA PARA SINCRONIZACIÓN */
              height: 'auto !important',
              minHeight: 'unset !important',
              maxHeight: 'unset !important',
              width: '100% !important',
              maxWidth: 'none !important',
              boxSizing: 'border-box',
              overflow: 'visible !important'
            }}
          >
            {/* Efecto de glow tecnológico */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 pointer-events-none" />
            
            {/* Logo AVANZADO - Centrado y responsivo */}
            <div 
              className="flex justify-center items-center w-full relative z-10" 
              style={{ 
                margin: 0, 
                padding: '0 clamp(8px, 2vw, 16px)',
                height: 'auto !important',
                overflow: 'visible !important'
              }}
            >
              <div 
                className="relative flex items-center justify-center" 
                style={{ 
                  height: 'clamp(32px, 5vh, 56px)', 
                  width: 'clamp(120px, 20vw, 200px)',
                  maxWidth: '90%',
                  margin: 0, 
                  padding: 0,
                  overflow: 'visible !important'
                }}
              >
                {/* Logo tecnológico avanzado sincronizado */}
                <MultipagaLogo size="default" className="w-full h-full" />
              </div>
            </div>

            {/* Status Indicator Tecnológico - Posición absoluta derecha */}
            <div 
              className="flex items-center gap-2 border border-green-500/30 bg-green-500/10 rounded-full transition-all duration-200 absolute right-4 backdrop-blur-sm relative z-10"
              style={{ 
                padding: 'clamp(6px, 1.5vw, 12px) clamp(8px, 2vw, 16px)', 
                margin: 0,
                height: 'auto !important',
                minHeight: 'unset !important',
                fontSize: 'clamp(10px, 1.5vw, 14px)',
                overflow: 'visible !important'
              }}
            >
              <motion.div 
                className="rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                style={{ 
                  width: 'clamp(6px, 1vw, 10px)', 
                  height: 'clamp(6px, 1vw, 10px)' 
                }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span 
                className="text-green-400 whitespace-nowrap font-medium"
                style={{ fontSize: 'clamp(10px, 1.5vw, 14px)' }}
              >
                Conectado
              </span>
            </div>
          </div>
        </header>

        {/* Page Content - SIN LÍMITES para sincronización perfecta */}
        <main 
          className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900 w-full h-full relative" 
          style={{ 
            margin: 0, 
            padding: 0,
            width: '100% !important',
            maxWidth: 'none !important',
            minWidth: '0',
            height: 'auto !important',
            minHeight: 'unset !important',
            maxHeight: 'unset !important',
            overflow: 'visible !important'
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full relative z-10"
            style={{ 
              margin: 0, 
              padding: 0,
              width: '100% !important',
              maxWidth: 'none !important',
              height: 'auto !important',
              minHeight: 'unset !important',
              maxHeight: 'unset !important',
              overflow: 'visible !important'
            }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}