// src/presentation/components/common/HydrationSafeWrapper.tsx
'use client'

import { useState, useEffect, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface HydrationSafeWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  delay?: number
}

/**
 * Wrapper que previene errores de hidratación mostrando un fallback
 * hasta que el componente esté completamente hidratado en el cliente
 */
export const HydrationSafeWrapper = ({ 
  children, 
  fallback, 
  className = '',
  delay = 0
}: HydrationSafeWrapperProps) => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!isHydrated) {
    return (
      <div className={`hydration-fallback ${className}`}>
        {fallback || <div className="animate-pulse bg-white/10 rounded-lg h-full w-full" />}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Hook personalizado para detectar hidratación de manera segura
 */
export const useHydrationSafe = (delay: number = 0): boolean => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return isHydrated
}

/**
 * Componente de loading específico para el dashboard
 */
export const DashboardLoadingSkeleton = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-8 bg-white/10 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-white/15 rounded animate-pulse" />
            <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Modules skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white/10 rounded-xl p-6 space-y-4 h-48">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/10 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-12 w-full bg-white/5 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-6 bg-white/5 rounded animate-pulse" />
                  <div className="h-6 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de loading para el layout principal
 */
export const LayoutLoadingSkeleton = () => {
  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-purple-900">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-gray-800/95 border-r border-cyan-400/30 p-4 space-y-4">
        <div className="h-16 bg-white/10 rounded-lg animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-800/95 border-b border-cyan-400/30 flex items-center justify-between px-4">
          <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <DashboardLoadingSkeleton />
        </div>
      </div>
    </div>
  )
}

/**
 * Provider para manejar el estado de hidratación globalmente
 */
export const HydrationProvider = ({ children }: { children: ReactNode }) => {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Pequeño delay para asegurar que todos los componentes estén listos
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  if (!isHydrated) {
    return <LayoutLoadingSkeleton />
  }

  return <>{children}</>
}

export default HydrationSafeWrapper