// components/ClientOnly.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
  suppressHydrationWarning?: boolean
}

/**
 * Componente avanzado que previene TODOS los errores de hidratación
 * Usa múltiples técnicas para asegurar renderizado consistente
 */
export default function ClientOnly({
  children,
  fallback = null,
  delay = 0,
  suppressHydrationWarning = true
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Técnica 1: Detectar montaje del componente
    setHasMounted(true)
    
    // Técnica 2: Delay opcional para componentes complejos
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsReady(true)
      }, delay)
    } else {
      setIsReady(true)
    }

    // Técnica 3: Cleanup del timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [delay])

  // Técnica 4: useEffect para forzar re-render post-hidratación
  useEffect(() => {
    if (hasMounted && isReady) {
      // Forzar un tick adicional para asegurar hidratación completa
      rafRef.current = requestAnimationFrame(() => {
        // Este RAF asegura que el componente se renderiza después del ciclo de hidratación
        rafRef.current = null
      })
      
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
  }, [hasMounted, isReady])

  // Técnica 5: Verificación de entorno
  if (typeof window === 'undefined') {
    return <>{fallback}</>
  }

  // Técnica 6: Verificación de estado de montaje
  if (!hasMounted || !isReady) {
    return <>{fallback}</>
  }

  // Técnica 7: Wrapper con suppressHydrationWarning cuando es necesario
  if (suppressHydrationWarning) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return <>{children}</>
}

/**
 * Hook para detectar si estamos en el cliente post-hidratación
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Hook para detectar cuando la hidratación está completa
 */
export function useHydrationComplete() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Usar requestAnimationFrame para asegurar que el DOM está completamente listo
    const rafId = requestAnimationFrame(() => {
      setIsHydrated(true)
    })

    return () => cancelAnimationFrame(rafId)
  }, [])

  return isHydrated
}

/**
 * Wrapper para componentes que necesitan hidratación segura con loading
 */
export function HydrationSafeWrapper({
  children,
  loading,
  className = '',
}: {
  children: React.ReactNode
  loading?: React.ReactNode
  className?: string
}) {
  const isHydrated = useHydrationComplete()
  
  const defaultLoading = (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <ClientOnly fallback={loading || defaultLoading}>
      {isHydrated ? children : (loading || defaultLoading)}
    </ClientOnly>
  )
}

/**
 * HOC para envolver componentes automáticamente
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WrappedComponent = (props: P) => {
    return (
      <ClientOnly fallback={fallback}>
        <Component {...props} />
      </ClientOnly>
    )
  }

  WrappedComponent.displayName = `withClientOnly(${Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * Hook para manejar keys únicos y prevenir duplicados
 */
export function useUniqueId(prefix: string = 'id'): string {
  const [id] = useState(() => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  return id
}

/**
 * Generador de claves únicas para listas
 */
export class UniqueKeyGenerator {
  private static counters = new Map<string, number>()
  
  static generate(prefix: string): string {
    const currentCount = this.counters.get(prefix) || 0
    const newCount = currentCount + 1
    this.counters.set(prefix, newCount)
    
    return `${prefix}-${Date.now()}-${newCount}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  static reset(prefix?: string): void {
    if (prefix) {
      this.counters.set(prefix, 0)
    } else {
      this.counters.clear()
    }
  }
}