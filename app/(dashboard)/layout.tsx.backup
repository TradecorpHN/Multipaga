'use client'

import { useRequireAuth } from '@/presentation/contexts/AuthContext'
import DashboardLayout from '@/presentation/components/layout/DashboardLayout'
import { Loader2 } from 'lucide-react'

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirect is handled by useRequireAuth
  }

  return <DashboardLayout>{children}</DashboardLayout>
}