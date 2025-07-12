import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextProps {
  toasts: ToastData[]
  showToast: (toast: Omit<ToastData, "id">) => void
  removeToast: (id: string) => void
  toast: (toast: Omit<ToastData, "id">) => void
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined)

let idCounter = 0
function genId() {
  idCounter += 1
  return `toast-${idCounter}-${Date.now()}`
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = genId()
      setToasts(prev => [...prev, { ...toast, id }])
      const duration = toast.duration ?? 4000
      setTimeout(() => removeToast(id), duration)
    },
    [removeToast]
  )

  // El valor incluye el alias `toast` para uso universal
  const value: ToastContextProps = {
    toasts,
    showToast,
    removeToast,
    toast: showToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// --- Hook universal ---
// Puedes importar este hook en cualquier componente y usarlo directamente.
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx.toast
}

// --- ToastContainer ---
// Igual que antes, puedes mejorar el diseño/animaciones como prefieras.
interface ToastContainerProps {
  toasts: ToastData[]
  removeToast: (id: string) => void
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 border-green-500 text-white",
  error: "bg-red-600 border-red-500 text-white",
  info: "bg-blue-600 border-blue-500 text-white",
  warning: "bg-yellow-400 border-yellow-300 text-black",
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
