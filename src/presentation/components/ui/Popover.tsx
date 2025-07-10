// /home/kali/multipaga/src/presentation/components/ui/Popover.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Popover - Componente de popover accesible con múltiples variantes
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, Info, HelpCircle, Settings, User, Calendar, Clock } from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del contenido
const contentVariants = cva(
  'z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      size: {
        sm: 'w-64 p-3 text-sm',
        default: 'w-72 p-4 text-sm',
        lg: 'w-80 p-5 text-sm',
        xl: 'w-96 p-6 text-base',
        auto: 'min-w-[200px] max-w-[400px] p-4 text-sm',
      },
      variant: {
        default: 'border bg-popover text-popover-foreground',
        info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100',
        success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-900/20 dark:text-green-100',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-100',
        destructive: 'border-red-200 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-900/20 dark:text-red-100',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

// Componente raíz
const Popover = PopoverPrimitive.Root

// Trigger
const PopoverTrigger = PopoverPrimitive.Trigger

// Anchor
const PopoverAnchor = PopoverPrimitive.Anchor

// Portal
const PopoverPortal = PopoverPrimitive.Portal

// Content
interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  showCloseButton?: boolean
  title?: string
  description?: string
  icon?: React.ReactNode
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ 
  className, 
  align = 'center', 
  sideOffset = 4,
  size,
  variant,
  showCloseButton = false,
  title,
  description,
  icon,
  children,
  ...props 
}, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(contentVariants({ size, variant }), className)}
      {...props}
    >
      {/* Header */}
      {(title || description || icon || showCloseButton) && (
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="flex-shrink-0 text-current">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h4 className="font-semibold text-sm leading-none mb-1">
                  {title}
                </h4>
              )}
              {description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {showCloseButton && (
            <PopoverPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </PopoverPrimitive.Close>
          )}
        </div>
      )}
      
      {/* Content */}
      {children}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

// Close
const PopoverClose = PopoverPrimitive.Close

// Componente de popover de información
interface InfoPopoverProps {
  children: React.ReactNode
  title?: string
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  size?: VariantProps<typeof contentVariants>['size']
  icon?: React.ReactNode
  trigger?: React.ReactNode
}

const InfoPopover = React.forwardRef<HTMLButtonElement, InfoPopoverProps>(({
  children,
  title,
  content,
  side = 'top',
  align = 'center',
  size = 'default',
  icon,
  trigger,
}, ref) => {
  const defaultTrigger = trigger || (
    <button
      ref={ref}
      className="inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
    >
      <HelpCircle className="w-3 h-3" />
    </button>
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        {defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        size={size}
        variant="info"
        title={title}
        icon={icon || <Info className="w-4 h-4" />}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
})
InfoPopover.displayName = 'InfoPopover'

// Componente de popover de confirmación
interface ConfirmPopoverProps {
  children: React.ReactNode
  title?: string
  description?: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  loading?: boolean
}

const ConfirmPopover = React.forwardRef<HTMLButtonElement, ConfirmPopoverProps>(({
  children,
  title = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false,
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  const handleCancel = () => {
    onCancel?.()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        variant={variant}
        title={title}
        description={description}
        size="sm"
      >
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'flex-1 px-3 py-2 text-xs rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none',
              variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              variant === 'warning' && 'bg-warning text-warning-foreground hover:bg-warning/90',
              variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {loading ? 'Cargando...' : confirmText}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
})
ConfirmPopover.displayName = 'ConfirmPopover'

// Componente de popover de opciones
interface OptionsPopoverProps {
  children: React.ReactNode
  options: Array<{
    label: string
    value: string
    icon?: React.ReactNode
    disabled?: boolean
    variant?: 'default' | 'destructive'
    onClick: () => void
  }>
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

const OptionsPopover = React.forwardRef<HTMLButtonElement, OptionsPopoverProps>(({
  children,
  options,
  title,
  side = 'bottom',
  align = 'start',
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleOptionClick = (option: OptionsPopoverProps['options'][0]) => {
    option.onClick()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        title={title}
        size="sm"
        className="p-1"
      >
        <div className="space-y-1">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={option.disabled}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left disabled:opacity-50 disabled:pointer-events-none',
                option.variant === 'destructive'
                  ? 'hover:bg-destructive/10 hover:text-destructive'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {option.icon && (
                <span className="flex-shrink-0">
                  {option.icon}
                </span>
              )}
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
})
OptionsPopover.displayName = 'OptionsPopover'

// Componente de popover de formulario
interface FormPopoverProps {
  children: React.ReactNode
  title?: string
  description?: string
  onSubmit: (data: any) => void
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  size?: VariantProps<typeof contentVariants>['size']
}

const FormPopover = React.forwardRef<HTMLButtonElement, FormPopoverProps>(({
  children,
  title,
  description,
  onSubmit,
  onCancel,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  loading = false,
  size = 'default',
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleSubmit = (data: any) => {
    onSubmit(data)
    setOpen(false)
  }

  const handleCancel = () => {
    onCancel?.()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        title={title}
        description={description}
        size={size}
        showCloseButton
      >
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const data = Object.fromEntries(formData)
          handleSubmit(data)
        }}>
          <div className="space-y-4">
            {/* Form content would go here */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {cancelText}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Guardando...' : submitText}
              </button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
})
FormPopover.displayName = 'FormPopover'

// Componente de popover de fecha
interface DatePopoverProps {
  children: React.ReactNode
  value?: Date
  onChange: (date: Date) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

const DatePopover = React.forwardRef<HTMLButtonElement, DatePopoverProps>(({
  children,
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  minDate,
  maxDate,
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (date: Date) => {
    onChange(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Seleccionar fecha</span>
          </div>
          
          {/* Calendar component would go here */}
          <div className="text-sm text-muted-foreground">
            Componente de calendario aquí
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
DatePopover.displayName = 'DatePopover'

// Hook para manejar popover
interface UsePopoverReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}

export const usePopover = (initialState = false): UsePopoverReturn => {
  const [isOpen, setIsOpen] = React.useState(initialState)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen: setIsOpen,
  }
}

// Hook para popover con posición
interface UsePopoverPositionReturn extends UsePopoverReturn {
  position: { x: number; y: number }
  setPosition: (position: { x: number; y: number }) => void
  openAt: (event: React.MouseEvent) => void
}

export const usePopoverPosition = (initialState = false): UsePopoverPositionReturn => {
  const popover = usePopover(initialState)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const openAt = React.useCallback((event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY })
    popover.open()
  }, [popover])

  return {
    ...popover,
    position,
    setPosition,
    openAt,
  }
}

// Exports
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverAnchor,
  PopoverPortal,
  InfoPopover,
  ConfirmPopover,
  OptionsPopover,
  FormPopover,
  DatePopover,
  usePopover,
  usePopoverPosition,
}

export type {
  PopoverContentProps,
  InfoPopoverProps,
  ConfirmPopoverProps,
  OptionsPopoverProps,
  FormPopoverProps,
  DatePopoverProps,
}