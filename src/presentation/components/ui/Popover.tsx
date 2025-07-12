'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, Info, HelpCircle, Calendar } from 'lucide-react'
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

// Componentes base Radix
const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverPortal = PopoverPrimitive.Portal
const PopoverClose = PopoverPrimitive.Close

// Props extendidas para PopoverContent
export interface PopoverContentProps
  extends React.ComponentPropsWithRef<typeof PopoverPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  showCloseButton?: boolean
  title?: string
  description?: string
  icon?: React.ReactNode
  children?: React.ReactNode
}

// PopoverContent avanzado
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({
  className,
  align = 'center',
  side = 'bottom',
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
      side={side}
      sideOffset={sideOffset}
      className={cn(contentVariants({ size, variant }), className)}
      {...props}
    >
      {(title || description || icon || showCloseButton) && (
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <div className="flex-shrink-0 text-current">{icon}</div>}
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
      {children}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'

// ----------- ÚNICOS hooks: usePopover y usePopoverPosition -----------
interface UsePopoverReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}
const usePopover = (initialState = false): UsePopoverReturn => {
  const [isOpen, setIsOpen] = React.useState(initialState)
  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])
  return { isOpen, open, close, toggle, setOpen: setIsOpen }
}

interface UsePopoverPositionReturn extends UsePopoverReturn {
  position: { x: number; y: number }
  setPosition: (position: { x: number; y: number }) => void
  openAt: (event: React.MouseEvent) => void
}
const usePopoverPosition = (initialState = false): UsePopoverPositionReturn => {
  const popover = usePopover(initialState)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const openAt = React.useCallback((event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY })
    popover.open()
  }, [popover])
  return { ...popover, position, setPosition, openAt }
}

// ---------------------- EXPORTS -----------------------
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverAnchor,
  PopoverPortal,
  usePopover,
  usePopoverPosition,
}
