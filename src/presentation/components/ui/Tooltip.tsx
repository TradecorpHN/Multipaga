// /home/kali/multipaga/src/presentation/components/ui/Tooltip.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Tooltip - Componente de tooltip accesible con múltiples variantes
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  Info, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle, 
  X,
  ExternalLink,
  Copy,
  Share,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
} from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del contenido
const contentVariants = cva(
  'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      variant: {
        default: 'bg-popover text-popover-foreground border',
        info: 'bg-blue-500 text-white border-blue-500',
        success: 'bg-green-500 text-white border-green-500',
        warning: 'bg-yellow-500 text-white border-yellow-500',
        destructive: 'bg-red-500 text-white border-red-500',
        inverse: 'bg-foreground text-background border-foreground',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        default: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// Componente Provider
const TooltipProvider = TooltipPrimitive.Provider

// Componente raíz
const Tooltip = TooltipPrimitive.Root

// Trigger
const TooltipTrigger = TooltipPrimitive.Trigger

// Portal
const TooltipPortal = TooltipPrimitive.Portal

// Content
interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  title?: string
  description?: string
  icon?: React.ReactNode
  showArrow?: boolean
  interactive?: boolean
  maxWidth?: string
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ 
  className, 
  sideOffset = 4, 
  variant,
  size,
  title,
  description,
  icon,
  showArrow = true,
  interactive = false,
  maxWidth = '300px',
  children,
  ...props 
}, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      contentVariants({ variant, size }),
      interactive && 'cursor-pointer',
      className
    )}
    style={{ maxWidth }}
    {...props}
  >
    {(title || description || icon) ? (
      <div className="flex items-start gap-2">
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-medium leading-none mb-1">
              {title}
            </div>
          )}
          {description && (
            <div className="text-xs opacity-80 leading-relaxed">
              {description}
            </div>
          )}
          {children && (
            <div className="mt-1">
              {children}
            </div>
          )}
        </div>
      </div>
    ) : (
      children
    )}
    {showArrow && <TooltipPrimitive.Arrow className="fill-current" />}
  </TooltipPrimitive.Content>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Componente de tooltip simple
interface SimpleTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  variant?: VariantProps<typeof contentVariants>['variant']
  size?: VariantProps<typeof contentVariants>['size']
  delayDuration?: number
  disableHoverableContent?: boolean
  disabled?: boolean
}

const SimpleTooltip = React.forwardRef<HTMLButtonElement, SimpleTooltipProps>(({
  children,
  content,
  side = 'top',
  align = 'center',
  variant = 'default',
  size = 'default',
  delayDuration = 700,
  disableHoverableContent = false,
  disabled = false,
}, ref) => {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration} disableHoverableContent={disableHoverableContent}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          variant={variant}
          size={size}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
SimpleTooltip.displayName = 'SimpleTooltip'

// Componente de tooltip de ayuda
interface HelpTooltipProps {
  content: React.ReactNode
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  size?: 'sm' | 'default' | 'lg'
  triggerClassName?: string
  iconSize?: 'sm' | 'default' | 'lg'
}

const HelpTooltip = React.forwardRef<HTMLButtonElement, HelpTooltipProps>(({
  content,
  title,
  side = 'top',
  size = 'default',
  triggerClassName,
  iconSize = 'default',
}, ref) => {
  const iconSizeMap = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <SimpleTooltip
      content={content}
      side={side}
      variant="info"
      size={size}
    >
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors',
          triggerClassName
        )}
      >
        <HelpCircle className={iconSizeMap[iconSize]} />
        <span className="sr-only">Help</span>
      </button>
    </SimpleTooltip>
  )
})
HelpTooltip.displayName = 'HelpTooltip'

// Componente de tooltip de información
interface InfoTooltipProps {
  content: React.ReactNode
  title?: string
  variant?: 'info' | 'success' | 'warning' | 'destructive'
  side?: 'top' | 'right' | 'bottom' | 'left'
  size?: 'sm' | 'default' | 'lg'
  triggerClassName?: string
  iconSize?: 'sm' | 'default' | 'lg'
}

const InfoTooltip = React.forwardRef<HTMLButtonElement, InfoTooltipProps>(({
  content,
  title,
  variant = 'info',
  side = 'top',
  size = 'default',
  triggerClassName,
  iconSize = 'default',
}, ref) => {
  const iconSizeMap = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const iconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    destructive: AlertCircle,
  }

  const Icon = iconMap[variant]

  return (
    <SimpleTooltip
      content={content}
      side={side}
      variant={variant}
      size={size}
    >
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors',
          variant === 'info' && 'text-blue-500 hover:text-blue-600',
          variant === 'success' && 'text-green-500 hover:text-green-600',
          variant === 'warning' && 'text-yellow-500 hover:text-yellow-600',
          variant === 'destructive' && 'text-red-500 hover:text-red-600',
          triggerClassName
        )}
      >
        <Icon className={iconSizeMap[iconSize]} />
        <span className="sr-only">Information</span>
      </button>
    </SimpleTooltip>
  )
})
InfoTooltip.displayName = 'InfoTooltip'

// Componente de tooltip con acciones
interface ActionTooltipProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'destructive'
  }>
  side?: 'top' | 'right' | 'bottom' | 'left'
  size?: 'sm' | 'default' | 'lg'
}

const ActionTooltip = React.forwardRef<HTMLButtonElement, ActionTooltipProps>(({
  children,
  title,
  description,
  actions = [],
  side = 'top',
  size = 'default',
}, ref) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300} disableHoverableContent={false}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          size={size}
          interactive={true}
          title={title}
          description={description}
        >
          {actions.length > 0 && (
            <div className="flex gap-1 mt-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                    action.variant === 'destructive'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {action.icon && (
                    <span className="w-3 h-3">
                      {action.icon}
                    </span>
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
ActionTooltip.displayName = 'ActionTooltip'

// Componente de tooltip de perfil
interface ProfileTooltipProps {
  children: React.ReactNode
  user: {
    name: string
    email?: string
    avatar?: string
    role?: string
    status?: 'online' | 'offline' | 'away' | 'busy'
  }
  side?: 'top' | 'right' | 'bottom' | 'left'
  showActions?: boolean
  onViewProfile?: () => void
  onSendMessage?: () => void
}

const ProfileTooltip = React.forwardRef<HTMLButtonElement, ProfileTooltipProps>(({
  children,
  user,
  side = 'top',
  showActions = true,
  onViewProfile,
  onSendMessage,
}, ref) => {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500} disableHoverableContent={false}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          size="lg"
          interactive={true}
          maxWidth="280px"
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
              {user.status && (
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                  statusColors[user.status]
                )} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {user.name}
              </div>
              {user.email && (
                <div className="text-xs opacity-80 truncate">
                  {user.email}
                </div>
              )}
              {user.role && (
                <div className="text-xs opacity-60 mt-1">
                  {user.role}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-1 mt-3">
              {onViewProfile && (
                <button
                  onClick={onViewProfile}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <User className="w-3 h-3" />
                  Ver perfil
                </button>
              )}
              {onSendMessage && (
                <button
                  onClick={onSendMessage}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  Mensaje
                </button>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
ProfileTooltip.displayName = 'ProfileTooltip'

// Componente de tooltip de fecha
interface DateTooltipProps {
  children: React.ReactNode
  date: Date | string
  format?: 'full' | 'date' | 'time' | 'relative'
  side?: 'top' | 'right' | 'bottom' | 'left'
  showRelative?: boolean
}

const DateTooltip = React.forwardRef<HTMLButtonElement, DateTooltipProps>(({
  children,
  date,
  format = 'full',
  side = 'top',
  showRelative = true,
}, ref) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const formatDate = (date: Date, format: string) => {
    const options: Intl.DateTimeFormatOptions = {
      full: { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
      date: { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      },
      time: { 
        hour: '2-digit', 
        minute: '2-digit'
      },
      relative: { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      }
    }[format] || {}

    return new Intl.DateTimeFormat('es-HN', options).format(date)
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`
    return 'hace un momento'
  }

  return (
    <SimpleTooltip
      content={
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <div>
            <div className="font-medium">
              {formatDate(dateObj, format)}
            </div>
            {showRelative && format !== 'relative' && (
              <div className="text-xs opacity-80">
                {getRelativeTime(dateObj)}
              </div>
            )}
          </div>
        </div>
      }
      side={side}
    >
      {children}
    </SimpleTooltip>
  )
})
DateTooltip.displayName = 'DateTooltip'

// Hook para tooltip controlado
export const useTooltip = (initialOpen = false) => {
  const [open, setOpen] = React.useState(initialOpen)

  const show = React.useCallback(() => setOpen(true), [])
  const hide = React.useCallback(() => setOpen(false), [])
  const toggle = React.useCallback(() => setOpen(prev => !prev), [])

  return {
    open,
    setOpen,
    show,
    hide,
    toggle,
  }
}

// Exports
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
  SimpleTooltip,
  HelpTooltip,
  InfoTooltip,
  ActionTooltip,
  ProfileTooltip,
  DateTooltip,
  useTooltip,
}

export type {
  TooltipContentProps,
  SimpleTooltipProps,
  HelpTooltipProps,
  InfoTooltipProps,
  ActionTooltipProps,
  ProfileTooltipProps,
  DateTooltipProps,
}