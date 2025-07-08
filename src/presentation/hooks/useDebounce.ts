// src/presentation/hooks/useDebounce.ts
// ──────────────────────────────────────────────────────────────────────────────
// useDebounce Hook - Hook utilitario para debounce y throttle
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * Hook básico de debounce para valores
 * Retrasa la actualización de un valor hasta que hayan pasado X milisegundos sin cambios
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook de debounce para funciones de callback
 * Útil para búsquedas, validaciones, y otras operaciones que no queremos ejecutar en cada cambio
 */
export function useDebouncedCallback<TArgs extends any[]>(
  callback: (...args: TArgs) => void | Promise<void>,
  delay: number,
  dependencies: React.DependencyList = []
): {
  debouncedCallback: (...args: TArgs) => void
  cancel: () => void
  flush: () => void
  isPending: boolean
} {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)
  const argsRef = useRef<TArgs>()
  const [isPending, setIsPending] = useState(false)

  // Actualizar callback ref cuando cambien las dependencias
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  // Función para cancelar el timeout
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
      setIsPending(false)
    }
  }, [])

  // Función para ejecutar inmediatamente (flush)
  const flush = useCallback(() => {
    if (timeoutRef.current && argsRef.current) {
      cancel()
      callbackRef.current(...argsRef.current)
    }
  }, [cancel])

  // Función debounced
  const debouncedCallback = useCallback((...args: TArgs) => {
    argsRef.current = args
    cancel()
    setIsPending(true)

    timeoutRef.current = setTimeout(() => {
      setIsPending(false)
      callbackRef.current(...args)
      timeoutRef.current = undefined
    }, delay)
  }, [delay, cancel])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return cancel
  }, [cancel])

  return {
    debouncedCallback,
    cancel,
    flush,
    isPending
  }
}

/**
 * Hook de throttle para funciones
 * Ejecuta la función como máximo una vez cada X milisegundos
 */
export function useThrottledCallback<TArgs extends any[]>(
  callback: (...args: TArgs) => void | Promise<void>,
  delay: number,
  dependencies: React.DependencyList = []
): {
  throttledCallback: (...args: TArgs) => void
  cancel: () => void
  flush: () => void
} {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)
  const lastExecRef = useRef<number>(0)
  const argsRef = useRef<TArgs>()

  // Actualizar callback ref cuando cambien las dependencias
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  const flush = useCallback(() => {
    if (argsRef.current) {
      cancel()
      callbackRef.current(...argsRef.current)
      lastExecRef.current = Date.now()
    }
  }, [cancel])

  const throttledCallback = useCallback((...args: TArgs) => {
    argsRef.current = args
    const now = Date.now()
    const timeSinceLastExec = now - lastExecRef.current

    if (timeSinceLastExec >= delay) {
      // Ejecutar inmediatamente si ha pasado suficiente tiempo
      callbackRef.current(...args)
      lastExecRef.current = now
    } else {
      // Programar ejecución para el tiempo restante
      cancel()
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...argsRef.current!)
        lastExecRef.current = Date.now()
        timeoutRef.current = undefined
      }, delay - timeSinceLastExec)
    }
  }, [delay, cancel])

  useEffect(() => {
    return cancel
  }, [cancel])

  return {
    throttledCallback,
    cancel,
    flush
  }
}

/**
 * Hook para búsquedas debounced
 * Especializado para casos de uso de búsqueda con estado de loading
 */
export function useDebouncedSearch<T>(
  searchFunction: (query: string) => Promise<T>,
  delay: number = 300,
  minQueryLength: number = 2
): {
  query: string
  setQuery: (query: string) => void
  results: T | null
  isSearching: boolean
  error: Error | null
  clearResults: () => void
  search: (query: string) => void
} {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController>()

  // Función de búsqueda con manejo de errores
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults(null)
      setError(null)
      return
    }

    // Cancelar búsqueda anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsSearching(true)
    setError(null)

    try {
      const searchResults = await searchFunction(searchQuery)
      setResults(searchResults)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err)
        setResults(null)
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchFunction, minQueryLength])

  // Debounced search
  const { debouncedCallback: debouncedSearch } = useDebouncedCallback(
    performSearch,
    delay,
    [performSearch]
  )

  // Efecto para ejecutar búsqueda cuando cambia el query
  useEffect(() => {
    if (query.trim() === '') {
      setResults(null)
      setError(null)
      return
    }

    debouncedSearch(query.trim())
  }, [query, debouncedSearch])

  // Función para limpiar resultados
  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
    setQuery('')
  }, [])

  // Función para búsqueda manual
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    clearResults,
    search
  }
}

/**
 * Hook para validación debounced
 * Útil para validaciones en tiempo real de formularios
 */
export function useDebouncedValidation<T>(
  value: T,
  validator: (value: T) => Promise<string | null> | string | null,
  delay: number = 500
): {
  isValidating: boolean
  validationError: string | null
  isValid: boolean
} {
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateValue = useCallback(async (valueToValidate: T) => {
    setIsValidating(true)
    setValidationError(null)

    try {
      const result = await validator(valueToValidate)
      setValidationError(result)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Error de validación')
    } finally {
      setIsValidating(false)
    }
  }, [validator])

  const { debouncedCallback: debouncedValidate } = useDebouncedCallback(
    validateValue,
    delay,
    [validateValue]
  )

  useEffect(() => {
    if (value !== null && value !== undefined && value !== '') {
      debouncedValidate(value)
    } else {
      setValidationError(null)
      setIsValidating(false)
    }
  }, [value, debouncedValidate])

  const isValid = useMemo(() => {
    return !isValidating && validationError === null && value !== null && value !== undefined && value !== ''
  }, [isValidating, validationError, value])

  return {
    isValidating,
    validationError,
    isValid
  }
}

/**
 * Hook para efectos debounced
 * Permite ejecutar efectos secundarios después de un delay
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  dependencies: React.DependencyList,
  delay: number
): void {
  useEffect(() => {
    const handler = setTimeout(() => {
      return effect()
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [...dependencies, delay])
}

/**
 * Hook para estado debounced
 * Combina useState con debounce automático
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number
): [T, T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue)
  const debouncedValue = useDebounce(immediateValue, delay)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setIsPending(immediateValue !== debouncedValue)
  }, [immediateValue, debouncedValue])

  return [immediateValue, debouncedValue, setImmediateValue, isPending]
}

/**
 * Hook para scroll debounced
 * Útil para optimizar eventos de scroll
 */
export function useDebouncedScroll(
  onScroll: (event: Event) => void,
  delay: number = 100,
  target?: HTMLElement | null
): void {
  const { debouncedCallback } = useDebouncedCallback(onScroll, delay, [onScroll])

  useEffect(() => {
    const element = target || window
    
    const handleScroll = (event: Event) => {
      debouncedCallback(event)
    }

    element.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [debouncedCallback, target])
}

/**
 * Hook para resize debounced
 * Optimiza eventos de resize de ventana
 */
export function useDebouncedResize(
  onResize: (event: UIEvent) => void,
  delay: number = 250
): void {
  const { debouncedCallback } = useDebouncedCallback(onResize, delay, [onResize])

  useEffect(() => {
    const handleResize = (event: UIEvent) => {
      debouncedCallback(event)
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [debouncedCallback])
}

export default useDebounce