// src/presentation/hooks/useInfiniteScroll.ts
// ──────────────────────────────────────────────────────────────────────────────
// useInfiniteScroll Hook - Gestión de scroll infinito para listas paginadas
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from 'react'
import { useDebounce } from './useDebounce'

/**
 * Opciones para el hook useInfiniteScroll
 */
interface UseInfiniteScrollOptions {
  /**
   * Función callback que se ejecuta cuando se alcanza el final del scroll
   */
  onLoadMore: () => void | Promise<void>
  
  /**
   * Indica si hay más datos disponibles para cargar
   */
  hasMore: boolean
  
  /**
   * Indica si actualmente se están cargando datos
   */
  isLoading?: boolean
  
  /**
   * Umbral en píxeles desde el final del scroll para activar la carga
   * @default 100
   */
  threshold?: number
  
  /**
   * Elemento contenedor para el scroll (por defecto window)
   */
  scrollContainer?: HTMLElement | null
  
  /**
   * Tiempo de debounce en ms para evitar múltiples llamadas
   * @default 200
   */
  debounceDelay?: number
  
  /**
   * Si está habilitado el scroll infinito
   * @default true
   */
  enabled?: boolean
}

/**
 * Estado del hook useInfiniteScroll
 */
interface UseInfiniteScrollState {
  /**
   * Indica si se está cerca del final del scroll
   */
  isNearBottom: boolean
  
  /**
   * Progreso del scroll (0-100)
   */
  scrollProgress: number
  
  /**
   * Si el scroll está en la parte superior
   */
  isAtTop: boolean
  
  /**
   * Si el scroll está en la parte inferior
   */
  isAtBottom: boolean
}

/**
 * Acciones del hook useInfiniteScroll
 */
interface UseInfiniteScrollActions {
  /**
   * Fuerza una verificación del scroll
   */
  checkScroll: () => void
  
  /**
   * Resetea el estado del scroll
   */
  reset: () => void
  
  /**
   * Scroll a la parte superior
   */
  scrollToTop: () => void
  
  /**
   * Scroll a la parte inferior
   */
  scrollToBottom: () => void
}

/**
 * Hook para implementar scroll infinito en listas
 */
export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollState & UseInfiniteScrollActions {
  const {
    onLoadMore,
    hasMore,
    isLoading = false,
    threshold = 100,
    scrollContainer = null,
    debounceDelay = 200,
    enabled = true
  } = options

  // Referencias
  const loadingRef = useRef(false)
  const containerRef = useRef<HTMLElement | Window | null>(null)

  // Estado
  const [isNearBottom, setIsNearBottom] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)
  const [shouldCheck, setShouldCheck] = useState(0)

  // Debounce para evitar múltiples llamadas
  const debouncedCheck = useDebounce(shouldCheck, debounceDelay)

  // Función para obtener el elemento scrolleable
  const getScrollElement = useCallback((): HTMLElement | Window => {
    if (scrollContainer) {
      return scrollContainer
    }
    return window
  }, [scrollContainer])

  // Función para obtener las dimensiones del scroll
  const getScrollDimensions = useCallback(() => {
    const element = getScrollElement()
    
    if (element instanceof Window) {
      return {
        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight
      }
    } else {
      return {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight
      }
    }
  }, [getScrollElement])

  // Función para verificar la posición del scroll
  const checkScrollPosition = useCallback(() => {
    if (!enabled || !hasMore || isLoading || loadingRef.current) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = getScrollDimensions()
    
    // Calcular progreso
    const totalScrollable = scrollHeight - clientHeight
    const progress = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0
    setScrollProgress(Math.min(100, Math.max(0, progress)))
    
    // Verificar si está arriba
    setIsAtTop(scrollTop <= 10)
    
    // Verificar si está abajo
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const nearBottom = distanceFromBottom <= threshold
    setIsNearBottom(nearBottom)
    setIsAtBottom(distanceFromBottom <= 10)
    
    // Cargar más si es necesario
    if (nearBottom && hasMore && !isLoading && !loadingRef.current) {
      loadingRef.current = true
      
      Promise.resolve(onLoadMore()).finally(() => {
        loadingRef.current = false
      })
    }
  }, [enabled, hasMore, isLoading, threshold, getScrollDimensions, onLoadMore])

  // Función pública para verificar scroll
  const checkScroll = useCallback(() => {
    setShouldCheck(prev => prev + 1)
  }, [])

  // Función para resetear estado
  const reset = useCallback(() => {
    setIsNearBottom(false)
    setScrollProgress(0)
    setIsAtTop(true)
    setIsAtBottom(false)
    loadingRef.current = false
  }, [])

  // Función para scroll al inicio
  const scrollToTop = useCallback(() => {
    const element = getScrollElement()
    
    if (element instanceof Window) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      element.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [getScrollElement])

  // Función para scroll al final
  const scrollToBottom = useCallback(() => {
    const element = getScrollElement()
    
    if (element instanceof Window) {
      window.scrollTo({ 
        top: document.documentElement.scrollHeight, 
        behavior: 'smooth' 
      })
    } else {
      element.scrollTo({ 
        top: element.scrollHeight, 
        behavior: 'smooth' 
      })
    }
  }, [getScrollElement])

  // Efecto para configurar el contenedor
  useEffect(() => {
    containerRef.current = getScrollElement()
  }, [getScrollElement])

  // Efecto para verificar cuando cambia el debounce
  useEffect(() => {
    if (debouncedCheck > 0) {
      checkScrollPosition()
    }
  }, [debouncedCheck, checkScrollPosition])

  // Efecto principal para el listener del scroll
  useEffect(() => {
    if (!enabled) return

    const element = containerRef.current
    if (!element) return

    // Handler del scroll
    const handleScroll = () => {
      checkScroll()
    }

    // Añadir listener
    element.addEventListener('scroll', handleScroll, { passive: true })

    // Verificar posición inicial
    checkScrollPosition()

    // Cleanup
    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, checkScroll, checkScrollPosition])

  // Re-verificar cuando cambian las props importantes
  useEffect(() => {
    checkScrollPosition()
  }, [hasMore, isLoading, checkScrollPosition])

  return {
    // Estado
    isNearBottom,
    scrollProgress,
    isAtTop,
    isAtBottom,
    
    // Acciones
    checkScroll,
    reset,
    scrollToTop,
    scrollToBottom
  }
}

/**
 * Hook para usar con componentes virtualizados
 */
export function useVirtualInfiniteScroll<T>(
  items: T[],
  options: {
    itemHeight: number
    containerHeight: number
    overscan?: number
    onLoadMore: () => void | Promise<void>
    hasMore: boolean
    isLoading?: boolean
  }
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    onLoadMore,
    hasMore,
    isLoading = false
  } = options

  const [scrollTop, setScrollTop] = useState(0)

  // Calcular índices visibles
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight

  // Verificar si necesita cargar más
  useEffect(() => {
    const lastVisibleIndex = Math.floor((scrollTop + containerHeight) / itemHeight)
    const nearEnd = lastVisibleIndex >= items.length - 10

    if (nearEnd && hasMore && !isLoading) {
      onLoadMore()
    }
  }, [scrollTop, containerHeight, itemHeight, items.length, hasMore, isLoading, onLoadMore])

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    setScrollTop(target.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    startIndex,
    handleScroll,
    offsetY: startIndex * itemHeight
  }
}

/**
 * Hook para detectar dirección del scroll
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [lastScrollTop, setLastScrollTop] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      if (scrollTop > lastScrollTop && scrollTop > 100) {
        setScrollDirection('down')
      } else if (scrollTop < lastScrollTop) {
        setScrollDirection('up')
      }

      setLastScrollTop(scrollTop <= 0 ? 0 : scrollTop)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollTop])

  return scrollDirection
}