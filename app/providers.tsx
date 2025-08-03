'use client'

import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

// Error boundary para manejar errores de SWR y otros providers
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

