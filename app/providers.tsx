'use client'

import { SWRConfig } from 'swr'
import { AuthProvider } from '@/presentation/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

// Error boundary para manejar errores de SWR y otros providers
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SWRConfig
          value={{
            // Configuración global para SWR
            fetcher: async (url: string) => {
              const response = await fetch(url, {
                credentials: 'include', // Para incluir cookies de autenticación
                headers: {
                  'Content-Type': 'application/json',
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
            },
            // Handler de éxito global
            onSuccess: (data, key) => {
              console.log('SWR Success:', { key, data })
            },
          }}
        >
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #334155',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f1f5f9',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </SWRConfig>
      </AuthProvider>
    </ErrorBoundary>
  )
}