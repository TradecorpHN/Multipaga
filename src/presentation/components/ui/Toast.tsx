'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

// Configuración de iconos y colores por tipo
const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
    messageColor: 'text-green-700',
    progressColor: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    messageColor: 'text-red-700',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 border-yellow-200',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
    messageColor: 'text-yellow-700',
    progressColor: 'bg-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-700',
    progressColor: 'bg-blue-500',
  },
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const duration = toast.duration || 5000

  useEffect(() => {
    if (isPaused || duration === 0) return

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100))
        if (newProgress <= 0) {
          onDismiss(toast.id)
          return 0
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, duration, toast.id, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        relative max-w-sm w-full border rounded-lg shadow-lg overflow-hidden
        ${config.bgColor}
      `}
    >
      {/* Barra de progreso */}
      {duration > 0 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
          <motion.div
            className={`h-full ${config.progressColor}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          {/* Icono */}
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>

          {/* Contenido */}
          <div className="ml-3 flex-1">
            <h4 className={`text-sm font-medium ${config.titleColor}`}>
              {toast.title}
            </h4>
            
            {toast.message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>
                {toast.message}
              </p>
            )}

            {/* Acción */}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={`
                    text-sm font-medium underline hover:no-underline
                    ${config.titleColor}
                  `}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => onDismiss(toast.id)}
              className={`
                inline-flex rounded-md p-1.5 hover:bg-gray-100 
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${config.iconColor}
              `}
            >
              <span className="sr-only">Cerrar</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Container para los toasts
interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export function ToastContainer({ 
  toasts, 
  onDismiss, 
  position = 'top-right' 
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  }

  return (
    <div 
      className={`
        fixed z-50 pointer-events-none
        ${positionClasses[position]}
      `}
    >
      <div className="space-y-2 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Hook para manejar toasts
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = (
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
    }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newToast: ToastData = {
      id,
      type,
      title,
      message,
      duration: options?.duration,
      action: options?.action,
    }

    setToasts(prev => [...prev, newToast])
    return id
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const dismissAll = () => {
    setToasts([])
  }

  // Métodos de conveniencia
  const success = (title: string, message?: string, options?: any) => 
    addToast('success', title, message, options)

  const error = (title: string, message?: string, options?: any) => 
    addToast('error', title, message, options)

  const warning = (title: string, message?: string, options?: any) => 
    addToast('warning', title, message, options)

  const info = (title: string, message?: string, options?: any) => 
    addToast('info', title, message, options)

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
  }
}

// Contexto global para toasts (opcional)
import { createContext, useContext } from 'react'

const ToastContext = createContext<ReturnType<typeof useToasts> | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastMethods = useToasts()

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer
        toasts={toastMethods.toasts}
        onDismiss={toastMethods.dismissToast}
      />
    </ToastContext.Provider>
  )
}

export function useGlobalToasts() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useGlobalToasts debe ser usado dentro de ToastProvider')
  }
  return context
}