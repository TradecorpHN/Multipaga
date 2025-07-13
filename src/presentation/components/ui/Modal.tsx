// /home/kali/multipaga/src/presentation/components/ui/Modal.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Modal - Componente de modal accesible con múltiples variantes
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  X, 
  Maximize2, 
  Minimize2,
  ArrowLeft,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  Download,
  Upload,
  Edit,
  Trash2,
  Save,
} from 'lucide-react'
import { Button } from '@/presentation/components/ui/Button'
import { cn } from '@/presentation/lib/utils'

// Variantes del overlay
const overlayVariants = cva(
  'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      variant: {
        default: 'bg-background/80',
        dark: 'bg-black/50',
        light: 'bg-white/80',
        blur: 'bg-background/60 backdrop-blur-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// Variantes del contenido
const contentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg',
  {
    variants: {
      size: {
        xs: 'max-w-xs w-full',
        sm: 'max-w-sm w-full',
        default: 'max-w-lg w-full',
        lg: 'max-w-xl w-full',
        xl: 'max-w-2xl w-full',
        '2xl': 'max-w-4xl w-full',
        '3xl': 'max-w-6xl w-full',
        full: 'max-w-[95vw] w-[95vw] max-h-[95vh]',
        fullscreen: 'w-screen h-screen max-w-none max-h-none rounded-none',
      },
      position: {
        center: 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
        top: 'left-[50%] top-4 translate-x-[-50%] translate-y-0',
        bottom: 'left-[50%] bottom-4 translate-x-[-50%] translate-y-0',
      },
    },
    defaultVariants: {
      size: 'default',
      position: 'center',
    },
  }
)

// Props del componente raíz
interface ModalProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Componente raíz
const Modal = DialogPrimitive.Root

// Trigger
const ModalTrigger = DialogPrimitive.Trigger

// Portal
const ModalPortal = DialogPrimitive.Portal

// Close
const ModalClose = DialogPrimitive.Close

// Overlay
interface ModalOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
    VariantProps<typeof overlayVariants> {}

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  ModalOverlayProps
>(({ className, variant, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(overlayVariants({ variant }), className)}
    {...props}
  />
))
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName

// Content
interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  showCloseButton?: boolean
  showHeader?: boolean
  title?: string
  description?: string
  icon?: React.ReactNode
  overlayVariant?: VariantProps<typeof overlayVariants>['variant']
  resizable?: boolean
  draggable?: boolean
  className?: string
}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ 
  className,
  size,
  position,
  showCloseButton = true,
  showHeader = true,
  title,
  description,
  icon,
  overlayVariant,
  resizable = false,
  draggable = false,
  children,
  ...props 
}, ref) => {
  const [isMaximized, setIsMaximized] = React.useState(false)

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  return (
    <ModalPortal>
      <ModalOverlay variant={overlayVariant} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          contentVariants({ 
            size: isMaximized ? 'fullscreen' : size, 
            position: isMaximized ? 'center' : position 
          }),
          resizable && 'resize overflow-auto',
          className
        )}
        {...props}
      >
        {/* Header */}
        {showHeader && (title || description || icon || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {resizable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMaximize}
                  className="h-6 w-6 p-0"
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {showCloseButton && (
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogPrimitive.Close>
              )}
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </DialogPrimitive.Content>
    </ModalPortal>
  )
})
ModalContent.displayName = DialogPrimitive.Content.displayName

// Header
const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
ModalHeader.displayName = 'ModalHeader'

// Body
const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6', className)} {...props} />
)
ModalBody.displayName = 'ModalBody'

// Footer
const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 border-t', className)} {...props} />
)
ModalFooter.displayName = 'ModalFooter'

// Title
const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
ModalTitle.displayName = DialogPrimitive.Title.displayName

// Description
const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
ModalDescription.displayName = DialogPrimitive.Description.displayName

// Componente de modal simple
interface SimpleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: VariantProps<typeof contentVariants>['size']
  showCloseButton?: boolean
  className?: string
}

const SimpleModal = React.forwardRef<HTMLDivElement, SimpleModalProps>(({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'default',
  showCloseButton = true,
  className,
}, ref) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        ref={ref}
        size={size}
        title={title}
        description={description}
        showCloseButton={showCloseButton}
        className={className}
      >
        <ModalBody>
          {children}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
})
SimpleModal.displayName = 'SimpleModal'

// Componente de modal de confirmación - ARREGLADO EL TIPO DE onConfirm
interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onConfirm: () => void | Promise<void> // CAMBIADO: removido el opcional
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  loading?: boolean
  icon?: React.ReactNode
}

const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(({
  open,
  onOpenChange,
  title = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false,
  icon,
}, ref) => {
  const variantConfig = {
    default: {
      icon: icon || <HelpCircle className="h-6 w-6 text-blue-500" />,
      confirmVariant: 'default' as const,
    },
    destructive: {
      icon: icon || <AlertTriangle className="h-6 w-6 text-destructive" />,
      confirmVariant: 'destructive' as const,
    },
    warning: {
      icon: icon || <AlertTriangle className="h-6 w-6 text-warning" />,
      confirmVariant: 'default' as const,
    },
  }

  const config = variantConfig[variant]

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        ref={ref}
        size="sm"
        title={title}
        description={description}
        icon={config.icon}
      >
        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
})
ConfirmModal.displayName = 'ConfirmModal'

// Componente de modal de formulario
interface FormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  onSubmit?: () => void | Promise<void>
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  size?: VariantProps<typeof contentVariants>['size']
  icon?: React.ReactNode
  showFooter?: boolean
}

const FormModal = React.forwardRef<HTMLDivElement, FormModalProps>(({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  loading = false,
  size = 'default',
  icon,
  showFooter = true,
}, ref) => {
  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit()
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        ref={ref}
        size={size}
        title={title}
        description={description}
        icon={icon}
      >
        <ModalBody>
          {children}
        </ModalBody>
        
        {showFooter && (
          <ModalFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            {onSubmit && (
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitText}
              </Button>
            )}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
})
FormModal.displayName = 'FormModal'

// Componente de modal de loading
interface LoadingModalProps {
  open: boolean
  title?: string
  description?: string
  progress?: number
  showProgress?: boolean
}

const LoadingModal = React.forwardRef<HTMLDivElement, LoadingModalProps>(({
  open,
  title = 'Cargando...',
  description = 'Por favor espera mientras procesamos tu solicitud.',
  progress,
  showProgress = false,
}, ref) => {
  return (
    <Modal open={open} onOpenChange={() => {}}>
      <ModalContent
        ref={ref}
        size="sm"
        showCloseButton={false}
        title={title}
        description={description}
        icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
      >
        <ModalBody>
          {showProgress && typeof progress === 'number' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
})
LoadingModal.displayName = 'LoadingModal'

// Componente de modal de imagen
interface ImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt?: string
  title?: string
  description?: string
  downloadable?: boolean
  onDownload?: () => void
}

const ImageModal = React.forwardRef<HTMLDivElement, ImageModalProps>(({
  open,
  onOpenChange,
  src,
  alt = 'Imagen',
  title,
  description,
  downloadable = false,
  onDownload,
}, ref) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        ref={ref}
        size="2xl"
        title={title}
        description={description}
        className="overflow-hidden"
      >
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
          
          {downloadable && (
            <div className="absolute top-4 right-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={onDownload}
                className="bg-background/80 backdrop-blur-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
})
ImageModal.displayName = 'ImageModal'

// Hook para manejar modales - REMOVIDA LA REDECLARACIÓN
interface UseModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  openWithData: (data: any) => void
  data: any
}

const useModal = (initialState = false): UseModalReturn => {
  const [isOpen, setIsOpen] = React.useState(initialState)
  const [data, setData] = React.useState<any>(null)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])
  const openWithData = React.useCallback((newData: any) => {
    setData(newData)
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    openWithData,
    data,
  }
}

// Hook para modales de confirmación - REMOVIDA LA REDECLARACIÓN
const useConfirmModal = () => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Partial<ConfirmModalProps>>({})

  const confirm = React.useCallback((options: Partial<ConfirmModalProps>) => {
    setConfig(options)
    setIsOpen(true)
    
    return new Promise<boolean>((resolve) => {
      const originalOnConfirm = options.onConfirm
      const originalOnCancel = options.onCancel

      setConfig(prev => ({
        ...prev,
        onConfirm: () => {
          if (originalOnConfirm) {
            originalOnConfirm()
          }
          resolve(true)
          setIsOpen(false)
        },
        onCancel: () => {
          originalOnCancel?.()
          resolve(false)
          setIsOpen(false)
        },
      }))
    })
  }, [])

  const ConfirmModalComponent = React.useCallback(() => (
    <ConfirmModal
      open={isOpen}
      onOpenChange={setIsOpen}
      onConfirm={() => {}} // Se sobreescribe en el confirm callback
      {...config}
    />
  ), [isOpen, config])

  return { confirm, ConfirmModal: ConfirmModalComponent }
}

// Exports
export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
  ModalOverlay,
  ModalPortal,
  SimpleModal,
  ConfirmModal,
  FormModal,
  LoadingModal,
  ImageModal,
  useModal,
  useConfirmModal,
}

export type {
  ModalProps,
  ModalContentProps,
  SimpleModalProps,
  ConfirmModalProps,
  FormModalProps,
  LoadingModalProps,
  ImageModalProps,
}