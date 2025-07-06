'use client'

import { useState, ReactNode } from 'react'
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
  Activity,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

interface DashboardLayoutProps {
  children: ReactNode
}

// Navigation items
const navigationItems = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
    description: 'Dashboard overview',
  },
  {
    name: 'Connectors',
    href: '/connectors',
    icon: Cable,
    description: 'Payment connectors',
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCard,
    description: 'Manage payments',
  },
  {
    name: 'Refunds',
    href: '/refunds',
    icon: RefreshCw,
    description: 'Process refunds',
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: FileText,
    description: 'Transaction history',
  },
  {
    name: 'Disputes',
    href: '/disputes',
    icon: AlertTriangle,
    description: 'Handle disputes',
  },
  {
    name: 'Reconciliation',
    href: '/reconciliation',
    icon: CheckSquare,
    description: 'Reconcile accounts',
  },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { authState, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : '-100%',
        }}
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-72 bg-dark-surface border-r border-dark-border',
          'lg:translate-x-0 lg:static lg:z-auto',
          'transition-transform duration-300 ease-in-out'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-dark-border">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-glow">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Multipaga</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-dark-bg lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-dark-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {authState?.merchantId}
                </p>
                <p className="text-xs text-dark-text-secondary truncate">
                  {authState?.profileName || authState?.profileId}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'group flex items-center px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30'
                      : 'text-dark-text-secondary hover:bg-dark-bg hover:text-white'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 transition-colors',
                      isActive ? 'text-purple-400' : 'text-dark-text-muted group-hover:text-purple-400'
                    )}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-purple-400" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-dark-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-dark-text-secondary hover:bg-dark-bg hover:text-white rounded-lg transition-all duration-200"
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-dark-surface/80 backdrop-blur-xl border-b border-dark-border">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-dark-bg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title */}
            <h1 className="text-2xl font-bold">
              {navigationItems.find((item) => item.href === pathname)?.name || 'Dashboard'}
            </h1>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Live Status Indicator */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}