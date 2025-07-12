// /home/kali/multipaga/src/presentation/hooks/use-debounce.ts
// ──────────────────────────────────────────────────────────────────────────────
// useDebounce Hook - Hook utilitario para debounce y throttle optimizado para Multipaga
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

  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
      setIsPending(false)
    }
  }, [])

  const flush = useCallback(() => {
    if (timeoutRef.current && argsRef.current) {
      cancel()
      callbackRef.current(...argsRef.current)
    }
  }, [cancel])

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
      callbackRef.current(...args)
      lastExecRef.current = now
    } else {
      cancel()
      timeoutRef.current = setTimeout(() => {
        if (argsRef.current) {
          callbackRef.current(...argsRef.current)
          lastExecRef.current = Date.now()
        }
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
 * Hook para búsquedas debounced con estado de loading
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

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults(null)
      setError(null)
      return
    }
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

  const { debouncedCallback: debouncedSearch } = useDebouncedCallback(
    performSearch,
    delay,
    [performSearch]
  )

  useEffect(() => {
    if (query.trim() === '') {
      setResults(null)
      setError(null)
      return
    }
    debouncedSearch(query.trim())
  }, [query, debouncedSearch])

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
    setQuery('')
  }, [])

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

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
      setValidationError(error instanceof Error ? error.message : 'Validation error')
    } finally {
      setIsValidating(false)
    }
  }, [validator])

  const { debouncedCallback: debouncedValidation } = useDebouncedCallback(
    validateValue,
    delay,
    [validateValue]
  )

  useEffect(() => {
    debouncedValidation(value)
  }, [value, debouncedValidation])

  const isValid = !isValidating && validationError === null

  return {
    isValidating,
    validationError,
    isValid
  }
}

/**
 * Hook especializado para filtros de listas en Multipaga
 */
export function useDebouncedFilters<T extends Record<string, any>>(
  initialFilters: T,
  delay: number = 300
): {
  filters: T
  debouncedFilters: T
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void
  clearFilters: () => void
  clearFilter: <K extends keyof T>(key: K) => void
  hasActiveFilters: boolean
} {
  const [filters, setFilters] = useState<T>(initialFilters)
  const debouncedFilters = useDebounce(filters, delay)

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const clearFilter = useCallback(<K extends keyof T>(key: K) => {
    setFilters(prev => ({
      ...prev,
      [key]: initialFilters[key]
    }))
  }, [initialFilters])

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some((key: string) => {
      const current = filters[key as keyof T]
      const initial = initialFilters[key as keyof T]

      // Tipado explícito para item e index
      if (Array.isArray(current) && Array.isArray(initial)) {
        return current.length !== initial.length ||
          !current.every((item: unknown, index: number) => item === initial[index])
      }

      // Validación de instancias Date solo si ambos son tipo objeto y Date
      if (
        typeof current === 'object' &&
        typeof initial === 'object' &&
        current !== null &&
        initial !== null &&
        (current as Date).getTime !== undefined &&
        (initial as Date).getTime !== undefined
      ) {
        return (current as Date).getTime() !== (initial as Date).getTime()
      }

      return current !== initial
    })
  }, [filters, initialFilters])

  return {
    filters,
    debouncedFilters,
    updateFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters
  }
}

// Exportación por default para máxima compatibilidad
export default useDebounce
