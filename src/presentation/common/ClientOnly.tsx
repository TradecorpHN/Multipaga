'use client'

import { useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

/**
 * ClientOnly Component
 * 
 * Este componente evita problemas de hidratación renderizando
 * sus children solo en el cliente, nunca en el servidor.
 * 
 * Útil para componentes que:
 * - Dependen de APIs del navegador (localStorage, window, etc.)
 * - Tienen estado que difiere entre servidor y cliente
 * - Usan librerías que solo funcionan en el cliente
 * 
 * @param children - Componentes a renderizar solo en cliente
 * @param fallback - Componente a mostrar durante SSR y carga inicial
 * @param className - Clases CSS para el contenedor
 */
export function ClientOnly({ 
  children, 
  fallback = null, 
  className 
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return fallback ? (
      <div className={className}>{fallback}</div>
    ) : null
  }

  return (
    <div className={className}>
      {children}
    </div>
  )
}

/**
 * Hook personalizado para detectar si el componente está montado en el cliente
 * 
 * @returns boolean - true si está montado en el cliente, false en SSR
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * HOC (Higher Order Component) para envolver automáticamente
 * componentes que necesitan ser solo de cliente
 * 
 * @param Component - Componente a envolver
 * @param fallback - Fallback opcional para mostrar durante SSR
 * @returns Componente envuelto que solo se renderiza en cliente
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const ClientOnlyComponent = (props: P) => {
    return (
      <ClientOnly fallback={fallback}>
        <Component {...props} />
      </ClientOnly>
    )
  }

  ClientOnlyComponent.displayName = `ClientOnly(${Component.displayName || Component.name})`
  
  return ClientOnlyComponent
}

/**
 * Componente para mostrar diferentes contenidos en servidor vs cliente
 * Útil para optimizaciones de rendimiento o contenido específico
 * 
 * @param serverContent - Contenido a mostrar en el servidor
 * @param clientContent - Contenido a mostrar en el cliente
 */
export function ServerClientRender({
  serverContent,
  clientContent,
  className
}: {
  serverContent: React.ReactNode
  clientContent: React.ReactNode
  className?: string
}) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <div className={className}>
      {hasMounted ? clientContent : serverContent}
    </div>
  )
}

export default ClientOnly