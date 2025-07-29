// =============================================================================
// app/(auth)/components/AuthPageWrapper.tsx - WRAPPER ANTI-HIDRATACIÓN
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

interface AuthPageWrapperProps {
  children: React.ReactNode
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Mostrar loading hasta que esté montado
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-white/80 text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}