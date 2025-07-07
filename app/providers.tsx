'use client'

import { SWRConfig } from 'swr'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Error boundary para manejar errores de SWR y otros providers
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children
}

// Loading component
function GlobalLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-900/80"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 dark:text-slate-300">Cargando Multipaga...</p>
      </div>
    </motion.div>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carga inicial de la aplicación
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <ErrorBoundary>
      <SWRConfig
        value={{
          // Configuración global para SWR
          fetcher: async (url: string) => {
            const baseURL = process.env.NEXT_PUBLIC_HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io'
            const response = await fetch(`${baseURL}${url}`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HYPERSWITCH_API_KEY || ''}`,
              },
            })

            if (!response.ok) {
              const error = new Error('Error al cargar los datos')
              error.cause = {
                status: response.status,
                statusText: response.statusText,
              }
              throw error
            }

            return response.json()
          },
          // Configuración de revalidación
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          refreshInterval: 30000, // 30 segundos
          // Configuración de errores
          errorRetryCount: 3,
          errorRetryInterval: 1000,
          // Configuración de caché
          dedupingInterval: 2000,
          // Handler global de errores
          onError: (error) => {
            console.error('SWR Error:', error)
            // Aquí podrías enviar el error a un servicio de logging como Sentry
          },
          // Handler de éxito global
          onSuccess: (data, key) => {
            console.log('SWR Success:', { key, data })
          },
        }}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <GlobalLoading key="loading" />
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </SWRConfig>
    </ErrorBoundary>
  )
}