import Link from 'next/link'
import { Home, Search, ArrowLeft, Navigation } from 'lucide-react'
import { Button } from '@/presentation/components/ui/Button'
import { Card } from '@/presentation/components/ui/Card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
      
      <Card className="max-w-md w-full relative z-10">
        <div className="p-8 text-center space-y-6">
          {/* 404 Icon */}
          <div className="mx-auto w-32 h-32 relative">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full bg-dark-surface rounded-full flex items-center justify-center">
              <Navigation className="w-16 h-16 text-purple-400 transform rotate-45" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-dark-text-primary">
              Page Not Found
            </h2>
            <p className="text-dark-text-secondary">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          {/* Helpful Links */}
          <div className="bg-dark-surface/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-dark-text-primary mb-3">
              You might be looking for:
            </p>
            <div className="space-y-2 text-left">
              <Link
                href="/dashboard"
                className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                → Dashboard Overview
              </Link>
              <Link
                href="/payments"
                className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                → Payment Management
              </Link>
              <Link
                href="/connectors"
                className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                → Payment Connectors
              </Link>
              <Link
                href="/settings"
                className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                → Account Settings
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard">
              <Button
                variant="primary"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            </Link>
            
            <Button
              onClick={() => window.history.back()}
              variant="secondary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
          </div>

          {/* Search Suggestion */}
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm text-dark-text-muted mb-3">
              Can&apos;t find what you&apos;re looking for?
            </p>
            <Link href="/search">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Search className="w-4 h-4" />}
              >
                Search Documentation
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}