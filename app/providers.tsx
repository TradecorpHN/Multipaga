'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/presentation/contexts/AuthContext'
import { ConnectorProvider } from '@/presentation/contexts/ConnectorContext'
import { Toaster } from 'react-hot-toast'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ConnectorProvider>
        {children}
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgb(26 26 46)',
            color: '#fff',
            border: '1px solid rgb(42 42 62)',
            borderRadius: '0.75rem',
            boxShadow: '10px 10px 30px rgba(13, 13, 31, 0.7), -10px -10px 30px rgba(33, 33, 55, 0.7)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  )
}