// src/presentation/components/ui/ToastProvider.tsx

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number // ms
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextProps {
  toasts: ToastData[]
  showToast: (toast: Omit<ToastData, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined)

export const useToastContext = (): ToastContextProps => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToastContext must be used within ToastProvider")
  return ctx
}

let idCounter = 0
function genId() {
  idCounter += 1
  return `toast-${idCounter}-${Date.now()}`
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = genId()
      setToasts(prev => [...prev, { ...toast, id }])
      const duration = toast.duration ?? 4000
      setTimeout(() => removeToast(id), duration)
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// ----------------------------
// COMPONENTE ToastContainer
// ----------------------------
interface ToastContainerProps {
  toasts: ToastData[]
  removeToast: (id: string) => void
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 border-green-500",
  error: "bg-red-600 border-red-500",
  info: "bg-blue-600 border-blue-500",
  warning: "bg-yellow-500 border-yellow-400 text-black",
}

const iconMap: Record<ToastType, JSX.Element> = {
  success: (
    <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 mr-2 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 19a7 7 0 110-14 7 7 0 010 14z" />
    </svg>
  ),
}

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  // Animación avanzada de entrada/salida
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start px-5 py-4 min-w-[260px] max-w-xs rounded-xl shadow-lg border-l-4 transition-all duration-300 animate-toast-in
            ${typeStyles[toast.type]}
          `}
          style={{ animation: "toast-in 0.25s cubic-bezier(.3,2,.7,.4)" }}
        >
          <div className="flex-shrink-0">{iconMap[toast.type]}</div>
          <div className="flex-1">
            <div className="text-sm font-semibold mb-1">{toast.message}</div>
            {toast.actionLabel && (
              <button
                onClick={toast.onAction}
                className="mt-1 px-3 py-1 text-xs font-medium rounded bg-white/20 hover:bg-white/30 transition"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <button
            aria-label="Cerrar notificación"
            className="ml-2 text-white/70 hover:text-white transition-colors text-lg"
            onClick={() => removeToast(toast.id)}
            tabIndex={0}
          >
            ×
          </button>
        </div>
      ))}
      {/* Animación de entrada usando Tailwind animate-toast-in (custom abajo) */}
      <style>{`
        @keyframes toast-in {
          from { transform: translateY(-40px) scale(0.95); opacity:0; }
          to   { transform: translateY(0) scale(1); opacity:1; }
        }
        .animate-toast-in {
          animation: toast-in 0.25s cubic-bezier(.3,2,.7,.4);
        }
      `}</style>
    </div>
  )
}
