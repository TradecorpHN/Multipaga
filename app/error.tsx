'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/presentation/components/ui/Button'
import { Card } from '@/presentation/components/ui/Card'
import { useRouter } from 'next/navigation'

// Extender la interfaz Window para incluir Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error) => void
    }
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error)
    
    // Send to Sentry if configured
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error)
    }
  }, [error])

  const getErrorMessage = () => {
    // Handle specific error types
    if (error.message.includes('UNAUTHORIZED')) {
      return 'Your session has expired. Please log in again.'
    }
    if (error.message.includes('NETWORK_ERROR')) {
      return 'Unable to connect to our servers. Please check your internet connection.'
    }
    if (error.message.includes('RATE_LIMIT')) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    
    // Default message for production
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred. Our team has been notified.'
    }
    
    // Show actual error in development
    return error.message || 'An unexpected error occurred'
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
      
      <Card className="max-w-md w-full relative z-10">
        <div className="p-8 text-center space-y-6">
          {/* Error Icon */}
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          {/* Error Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-dark-text-primary">
              Something went wrong
            </h1>
            <p className="text-dark-text-secondary">
              {getErrorMessage()}
            </p>
          </div>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-dark-text-muted hover:text-dark-text-secondary transition-colors">
                Show error details
              </summary>
              <pre className="mt-4 p-4 bg-dark-surface rounded-lg text-xs overflow-auto max-h-48 text-dark-text-muted">
                {error.stack}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              variant="default"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
            
            <Button
              onClick={() => router.back()}
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
            
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Dashboard
            </Button>
          </div>

          {/* Support Link */}
          <p className="text-sm text-dark-text-muted">
            If this problem persists, please{' '}
            <a 
              href="mailto:support@multipaga.com" 
              className="text-purple-400 hover:text-purple-300 underline transition-colors"
            >
              contact support
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}