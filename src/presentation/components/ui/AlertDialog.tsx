// /home/kali/multipaga/src/presentation/components/ui/AlertDialog.tsx
// ──────────────────────────────────────────────────────────────────────────────
// AlertDialog - Componente de diálogo de alerta modal accesible
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  X, 
  Trash2, 
  LogOut, 
  RefreshCw,
  AlertOctagon,
  HelpCircle
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
        destructive: 'bg-destructive/10',
        warning: 'bg-warning/10',
        success: 'bg-success/10',
        info: 'bg-info/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// Variantes del contenido
const contentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-xl',
        xl: 'max-w-2xl',
        full: 'max-w-[90vw]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

// Props del componente raíz
interface AlertDialogProps extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Componente raíz
const AlertDialog = AlertDialogPrimitive.Root

// Trigger
const AlertDialogTrigger = AlertDialogPrimitive.Trigger

// Portal
const AlertDialogPortal = AlertDialogPrimitive.Portal

// Overlay
interface AlertDialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>,
    VariantProps<typeof overlayVariants> {}

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  AlertDialogOverlayProps
>(({ className, variant, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(overlayVariants({ variant }), className)}
    {...props}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

// Content
interface AlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  showCloseButton?: boolean
  overlayVariant?: VariantProps<typeof overlayVariants>['variant']
}

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, size, showCloseButton = false, overlayVariant, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay variant={overlayVariant} />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(contentVariants({ size }), className)}
      {...props}
    >
      {props.children}
      {showCloseButton && (
        <AlertDialogPrimitive.Cancel className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </AlertDialogPrimitive.Cancel>
      )}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

// Header
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

// Footer
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

// Title
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

// Description
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

// Action
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(Button({ variant: 'default' }), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

// Cancel
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(Button({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

// Componente de alerta preconfigurado
interface AlertDialogPresetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  variant?: 'destructive' | 'warning' | 'success' | 'info' | 'default'
  icon?: React.ReactNode
  cancelText?: string
  actionText?: string
  onAction?: () => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
  size?: VariantProps<typeof contentVariants>['size']
}

const AlertDialogPreset = React.forwardRef<HTMLDivElement, AlertDialogPresetProps>(({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  icon,
  cancelText = 'Cancelar',
  actionText = 'Aceptar',
  onAction,
  onCancel,
  loading = false,
  size = 'default',
}, ref) => {
  // Configuración de variantes
  const variantConfig = {
    destructive: {
      icon: <XCircle className="h-6 w-6 text-destructive" />,
      overlayVariant: 'destructive' as const,
      actionVariant: 'destructive' as const,
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-warning" />,
      overlayVariant: 'warning' as const,
      actionVariant: 'default' as const,
    },
    success: {
      icon: <CheckCircle className="h-6 w-6 text-success" />,
      overlayVariant: 'success' as const,
      actionVariant: 'default' as const,
    },
    info: {
      icon: <Info className="h-6 w-6 text-info" />,
      overlayVariant: 'info' as const,
      actionVariant: 'default' as const,
    },
    default: {
      icon: <HelpCircle className="h-6 w-6 text-muted-foreground" />,
      overlayVariant: 'default' as const,
      actionVariant: 'default' as const,
    },
  }

  const config = variantConfig[variant]
  const displayIcon = icon || config.icon

  const handleAction = async () => {
    if (onAction) {
      await onAction()
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        size={size}
        overlayVariant={config.overlayVariant}
        ref={ref}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {displayIcon}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={loading}
            className={cn(Button({ variant: config.actionVariant }))}
          >
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})

AlertDialogPreset.displayName = 'AlertDialogPreset'

// Componente de confirmación de eliminación
interface DeleteAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  itemName?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

const DeleteAlertDialog = React.forwardRef<HTMLDivElement, DeleteAlertDialogProps>(({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  loading = false,
}, ref) => {
  const defaultTitle = itemName ? `¿Eliminar ${itemName}?` : '¿Confirmar eliminación?'
  const defaultDescription = itemName 
    ? `Esta acción eliminará permanentemente "${itemName}". Esta acción no se puede deshacer.`
    : 'Esta acción no se puede deshacer.'

  return (
    <AlertDialogPreset
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      title={title || defaultTitle}
      description={description || defaultDescription}
      variant="destructive"
      icon={<Trash2 className="h-6 w-6 text-destructive" />}
      actionText="Eliminar"
      cancelText="Cancelar"
      onAction={onConfirm}
      loading={loading}
    />
  )
})

DeleteAlertDialog.displayName = 'DeleteAlertDialog'

// Componente de confirmación de cierre de sesión
interface LogoutAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

const LogoutAlertDialog = React.forwardRef<HTMLDivElement, LogoutAlertDialogProps>(({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}, ref) => {
  return (
    <AlertDialogPreset
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      title="¿Cerrar sesión?"
      description="¿Estás seguro de que quieres cerrar sesión? Tendrás que iniciar sesión nuevamente."
      variant="warning"
      icon={<LogOut className="h-6 w-6 text-warning" />}
      actionText="Cerrar sesión"
      cancelText="Cancelar"
      onAction={onConfirm}
      loading={loading}
    />
  )
})

LogoutAlertDialog.displayName = 'LogoutAlertDialog'

// Hook para manejar alertas
interface UseAlertDialogReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  openWithData: (data: any) => void
  data: any
}

export const useAlertDialog = (initialState = false): UseAlertDialogReturn => {
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

// Exports
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogPreset,
  DeleteAlertDialog,
  LogoutAlertDialog,
  useAlertDialog,
}

export type {
  AlertDialogProps,
  AlertDialogContentProps,
  AlertDialogPresetProps,
  DeleteAlertDialogProps,
  LogoutAlertDialogProps,
}