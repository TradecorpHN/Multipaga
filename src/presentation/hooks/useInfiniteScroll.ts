// src/presentation/hooks/useInfiniteScroll.ts
// ──────────────────────────────────────────────────────────────────────────────
// useInfiniteScroll Hook - Hook para implementar scroll infinito
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useDebouncedCallback } from './useDebounce'

/**
 * Opciones de configuración para el infinite scroll
 */
interface UseInfiniteScrollOptions {
  threshold?: number // Distancia en px desde el final para activar la carga
  rootMargin?: string // Margen para el intersection observer
  enabled?: boolean // Si el infinite scroll está habilitado
  hasMore?: boolean // Si hay más elementos para cargar
  loading?: boolean // Si actualmente se está cargando
  debounceMs?: number // Tiempo de debounce para evitar llamadas múltiples
  direction?: 'vertical' | 'horizontal' // Dirección del scroll
  reverse?: boolean // Si el scroll es en dirección inversa (hacia arriba)
}

/**
 * Resultado del hook useInfiniteScroll
 */
interface UseInfiniteScrollResult {
  // Ref para el elemento sentinela que detecta cuando cargar más
  sentinelRef: React.RefObject<HTMLDivElement>
  // Ref para el contenedor de scroll (opcional)
  containerRef: React.RefObject<HTMLDivElement>
  // Estado del scroll
  isNearEnd: boolean
  // Función para resetear el estado
  reset: () => void
  // Función para scrollear hasta un elemento específico
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollToElement: (element: HTMLElement) => void
}

/**
 * Hook principal para infinite scroll
 */
export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult {
  const {
    threshold = 200,
    rootMargin = '0px',
    enabled = true,
    hasMore = true,
    loading = false,
    debounceMs = 100,
    direction = 'vertical',
    reverse = false
  } = options

  const [isNearEnd, setIsNearEnd] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Debounced load more function
  const { debouncedCallback: debouncedLoadMore } = useDebouncedCallback(
    onLoadMore,
    debounceMs,
    [onLoadMore]
  )

  // Callback para el intersection observer
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting && enabled && hasMore && !loading) {
      setIsNearEnd(true)
      debouncedLoadMore()
    } else {
      setIsNearEnd(false)
    }
  }, [enabled, hasMore, loading, debouncedLoadMore])

  // Configurar el intersection observer
  useEffect(() => {
    if (!sentinelRef.current || !enabled) return

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      rootMargin,
      threshold: 0.1
    })

    observerRef.current.observe(sentinelRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersection, rootMargin, enabled])

  // Función para resetear el estado
  const reset = useCallback(() => {
    setIsNearEnd(false)
  }, [])

  // Funciones de scroll
  const scrollToTop = useCallback(() => {
    const container = containerRef.current || window
    if (container === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current || window
    if (container === window) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  const scrollToElement = useCallback((element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return {
    sentinelRef,
    containerRef,
    isNearEnd,
    reset,
    scrollToTop,
    scrollToBottom,
    scrollToElement
  }
}

/**
 * Hook para infinite scroll basado en posición de scroll
 * Útil cuando no se puede usar intersection observer
 */
export function useScrollPosition(
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions & {
    container?: HTMLElement | null
  } = {}
): UseInfiniteScrollResult {
  const {
    threshold = 200,
    enabled = true,
    hasMore = true,
    loading = false,
    debounceMs = 100,
    direction = 'vertical',
    container
  } = options

  const [isNearEnd, setIsNearEnd] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced load more function
  const { debouncedCallback: debouncedLoadMore } = useDebouncedCallback(
    onLoadMore,
    debounceMs,
    [onLoadMore]
  )

  // Función para verificar si estamos cerca del final
  const checkScrollPosition = useCallback(() => {
    if (!enabled || !hasMore || loading) {
      setIsNearEnd(false)
      return
    }

    const element = container || containerRef.current || window
    let scrollTop: number
    let scrollHeight: number
    let clientHeight: number

    if (element === window) {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop
      scrollHeight = document.documentElement.scrollHeight
      clientHeight = window.innerHeight
    } else {
      const el = element as HTMLElement
      scrollTop = el.scrollTop
      scrollHeight = el.scrollHeight
      clientHeight = el.clientHeight
    }

    const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
    const nearEnd = distanceToBottom <= threshold

    setIsNearEnd(nearEnd)

    if (nearEnd) {
      debouncedLoadMore()
    }
  }, [enabled, hasMore, loading, threshold, container, debouncedLoadMore])

  // Agregar event listener para scroll
  useEffect(() => {
    if (!enabled) return

    const element = container || containerRef.current || window
    
    element.addEventListener('scroll', checkScrollPosition, { passive: true })
    
    // Verificar posición inicial
    checkScrollPosition()

    return () => {
      element.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition, enabled, container])

  const reset = useCallback(() => {
    setIsNearEnd(false)
  }, [])

  const scrollToTop = useCallback(() => {
    const element = container || containerRef.current || window
    if (element === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      (element as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [container])

  const scrollToBottom = useCallback(() => {
    const element = container || containerRef.current || window
    if (element === window) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    } else {
      const el = element as HTMLElement
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [container])

  const scrollToElement = useCallback((element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return {
    sentinelRef,
    containerRef,
    isNearEnd,
    reset,
    scrollToTop,
    scrollToBottom,
    scrollToElement
  }
}

/**
 * Hook para infinite scroll bidireccional
 * Permite cargar contenido tanto al llegar al final como al principio
 */
export function useBidirectionalInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  onLoadPrevious: () => void | Promise<void>,
  options: UseInfiniteScrollOptions & {
    hasMorePrevious?: boolean
    loadingPrevious?: boolean
  } = {}
): UseInfiniteScrollResult & {
  topSentinelRef: React.RefObject<HTMLDivElement>
  isNearTop: boolean
} {
  const {
    threshold = 200,
    enabled = true,
    hasMore = true,
    hasMorePrevious = true,
    loading = false,
    loadingPrevious = false,
    debounceMs = 100
  } = options

  const [isNearEnd, setIsNearEnd] = useState(false)
  const [isNearTop, setIsNearTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced functions
  const { debouncedCallback: debouncedLoadMore } = useDebouncedCallback(
    onLoadMore,
    debounceMs,
    [onLoadMore]
  )

  const { debouncedCallback: debouncedLoadPrevious } = useDebouncedCallback(
    onLoadPrevious,
    debounceMs,
    [onLoadPrevious]
  )

  // Bottom intersection observer
  const handleBottomIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting && enabled && hasMore && !loading) {
      setIsNearEnd(true)
      debouncedLoadMore()
    } else {
      setIsNearEnd(false)
    }
  }, [enabled, hasMore, loading, debouncedLoadMore])

  // Top intersection observer
  const handleTopIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting && enabled && hasMorePrevious && !loadingPrevious) {
      setIsNearTop(true)
      debouncedLoadPrevious()
    } else {
      setIsNearTop(false)
    }
  }, [enabled, hasMorePrevious, loadingPrevious, debouncedLoadPrevious])

  // Setup intersection observers
  useEffect(() => {
    if (!enabled) return

    const observers: IntersectionObserver[] = []

    // Bottom observer
    if (sentinelRef.current) {
      const bottomObserver = new IntersectionObserver(handleBottomIntersection, {
        root: containerRef.current,
        rootMargin: '0px',
        threshold: 0.1
      })
      bottomObserver.observe(sentinelRef.current)
      observers.push(bottomObserver)
    }

    // Top observer
    if (topSentinelRef.current) {
      const topObserver = new IntersectionObserver(handleTopIntersection, {
        root: containerRef.current,
        rootMargin: '0px',
        threshold: 0.1
      })
      topObserver.observe(topSentinelRef.current)
      observers.push(topObserver)
    }

    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [handleBottomIntersection, handleTopIntersection, enabled])

  const reset = useCallback(() => {
    setIsNearEnd(false)
    setIsNearTop(false)
  }, [])

  const scrollToTop = useCallback(() => {
    const container = containerRef.current || window
    if (container === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current || window
    if (container === window) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  const scrollToElement = useCallback((element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return {
    sentinelRef,
    topSentinelRef,
    containerRef,
    isNearEnd,
    isNearTop,
    reset,
    scrollToTop,
    scrollToBottom,
    scrollToElement
  }
}

/**
 * Hook para manejar scroll virtual (virtualized list)
 * Útil para listas muy grandes donde se necesita renderizado virtual
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  options: {
    overscan?: number // Número de elementos extra a renderizar fuera del viewport
    onLoadMore?: () => void
    hasMore?: boolean
    loading?: boolean
  } = {}
) {
  const {
    overscan = 5,
    onLoadMore,
    hasMore = false,
    loading = false
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calcular qué elementos son visibles
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Elementos visibles
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }))
  }, [items, visibleRange, itemHeight])

  // Manejar scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop
    setScrollTop(newScrollTop)

    // Verificar si necesitamos cargar más elementos
    if (onLoadMore && hasMore && !loading) {
      const scrollBottom = newScrollTop + containerHeight
      const totalHeight = items.length * itemHeight
      
      if (scrollBottom >= totalHeight - itemHeight * 5) { // Cargar cuando quedan 5 elementos
        onLoadMore()
      }
    }
  }, [onLoadMore, hasMore, loading, containerHeight, itemHeight, items.length])

  // Función para scrollear a un índice específico
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight
      containerRef.current.scrollTop = targetScrollTop
      setScrollTop(targetScrollTop)
    }
  }, [itemHeight])

  return {
    containerRef,
    visibleItems,
    totalHeight: items.length * itemHeight,
    handleScroll,
    scrollToIndex,
    visibleRange
  }
}

/**
 * Hook para detectar dirección del scroll
 */
export function useScrollDirection(threshold: number = 0) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const lastScrollTop = useRef(0)
  const scrollTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
      
      setIsScrolling(true)
      
      if (Math.abs(currentScrollTop - lastScrollTop.current) > threshold) {
        if (currentScrollTop > lastScrollTop.current) {
          setScrollDirection('down')
        } else {
          setScrollDirection('up')
        }
        lastScrollTop.current = currentScrollTop
      }

      // Resetear isScrolling después de un tiempo sin scroll
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
      
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [threshold])

  return {
    scrollDirection,
    isScrolling
  }
}

export default useInfiniteScroll