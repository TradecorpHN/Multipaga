'use client'

import { useMemo } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  Loader2,
  Pause,
  Play,
  Ban
} from 'lucide-react'
import { Badge } from '@/presentation/components/ui/Badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { cn } from '@/presentation/lib/utils'
import type { PaymentStatus as PaymentStatusType } from '@/infrastructure/repositories/HttpPaymentRepository'

interface PaymentStatusConfig {
  label: string
  description: string
  icon: React.ComponentType<any>
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'
  color: string
  bgColor: string
  borderColor: string
  animated?: boolean
  pulse?: boolean
}

// Configuración completa de estados de pago
const STATUS_CONFIG: Record<PaymentStatusType, PaymentStatusConfig> = {
  succeeded: {
    label: 'Exitoso',
    description: 'El pago se completó exitosamente',
    icon: CheckCircle,
    variant: 'success',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  
  failed: {
    label: 'Fallido', 
    description: 'El pago no pudo ser procesado',
    icon: XCircle,
    variant: 'destructive',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  
  requires_payment_method: {
    label: 'Requiere método de pago',
    description: 'Se necesita agregar un método de pago válido',
    icon: CreditCard,
    variant: 'warning',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  
  requires_confirmation: {
    label: 'Pendiente confirmación',
    description: 'El pago está pendiente de confirmación',
    icon: AlertCircle,
    variant: 'warning',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    pulse: true,
  },
  
  requires_action: {
    label: 'Requiere acción',
    description: 'Se necesita acción adicional del cliente (ej: 3D Secure)',
    icon: AlertCircle,
    variant: 'warning',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    pulse: true,
  },
  
  processing: {
    label: 'Procesando',
    description: 'El pago está siendo procesado por el proveedor',
    icon: Loader2,
    variant: 'secondary',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    animated: true,
  },
  
  requires_capture: {
    label: 'Autorizado',
    description: 'El pago está autorizado y listo para capturar',
    icon: Play,
    variant: 'warning',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  
  cancelled: {
    label: 'Cancelado',
    description: 'El pago fue cancelado',
    icon: Ban,
    variant: 'secondary',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  
  partially_captured: {
    label: 'Parcialmente capturado',
    description: 'Solo una parte del monto autorizado fue capturada',
    icon: Pause,
    variant: 'warning',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  
  partially_captured_and_capturable: {
    label: 'Parcial + Capturable',
    description: 'Parcialmente capturado con monto restante disponible para captura',
    icon: Clock,
    variant: 'warning',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
}

interface PaymentStatusProps {
  status: PaymentStatusType
  variant?: 'badge' | 'card' | 'inline' | 'detailed'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showDescription?: boolean
  className?: string
  clickable?: boolean
  onClick?: () => void
}

export default function PaymentStatus({
  status,
  variant = 'badge',
  size = 'md',
  showIcon = true,
  showDescription = false,
  className = '',
  clickable = false,
  onClick,
}: PaymentStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  // Badge variant (default)
  if (variant === 'badge') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'inline-flex items-center gap-1.5',
              sizeClasses[size],
              config.pulse && 'animate-pulse',
              clickable && 'cursor-pointer hover:opacity-80',
              className
            )}
            onClick={clickable ? onClick : undefined}
          >
            {showIcon && (
              <Icon 
                className={cn(
                  iconSizes[size],
                  config.animated && 'animate-spin'
                )} 
              />
            )}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div 
        className={cn(
          'rounded-lg border p-3',
          config.bgColor,
          config.borderColor,
          clickable && 'cursor-pointer hover:shadow-sm transition-shadow',
          className
        )}
        onClick={clickable ? onClick : undefined}
      >
        <div className="flex items-center gap-2">
          {showIcon && (
            <Icon 
              className={cn(
                iconSizes[size],
                config.color,
                config.animated && 'animate-spin',
                config.pulse && 'animate-pulse'
              )} 
            />
          )}
          <div>
            <p className={cn('font-medium', config.color, sizeClasses[size])}>
              {config.label}
            </p>
            {showDescription && (
              <p className={cn('text-muted-foreground', 
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}>
                {config.description}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1.5',
          config.color,
          sizeClasses[size],
          clickable && 'cursor-pointer hover:opacity-80',
          className
        )}
        onClick={clickable ? onClick : undefined}
      >
        {showIcon && (
          <Icon 
            className={cn(
              iconSizes[size],
              config.animated && 'animate-spin',
              config.pulse && 'animate-pulse'
            )} 
          />
        )}
        {config.label}
      </span>
    )
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div 
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border',
          config.bgColor,
          config.borderColor,
          clickable && 'cursor-pointer hover:shadow-sm transition-shadow',
          className
        )}
        onClick={clickable ? onClick : undefined}
      >
        {showIcon && (
          <div className={cn(
            'flex-shrink-0 rounded-full p-2',
            config.bgColor,
            config.pulse && 'animate-pulse'
          )}>
            <Icon 
              className={cn(
                iconSizes[size],
                config.color,
                config.animated && 'animate-spin'
              )} 
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', config.color, sizeClasses[size])}>
            {config.label}
          </p>
          <p className={cn(
            'text-muted-foreground mt-1',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {config.description}
          </p>
        </div>
      </div>
    )
  }

  return null
}

// Helper component for status transitions
export function PaymentStatusTransition({ 
  fromStatus, 
  toStatus, 
  className = '' 
}: {
  fromStatus: PaymentStatusType
  toStatus: PaymentStatusType
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PaymentStatus status={fromStatus} variant="badge" size="sm" />
      <div className="flex-1 h-px bg-border relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <PaymentStatus status={toStatus} variant="badge" size="sm" />
    </div>
  )
}

// Helper function to get status priority for sorting
export function getStatusPriority(status: PaymentStatusType): number {
  const priorities: Record<PaymentStatusType, number> = {
    failed: 1,
    requires_action: 2,
    requires_confirmation: 3,
    requires_payment_method: 4,
    processing: 5,
    requires_capture: 6,
    partially_captured: 7,
    partially_captured_and_capturable: 8,
    cancelled: 9,
    succeeded: 10,
  }
  
  return priorities[status] || 0
}

// Helper function to check if status is actionable
export function isActionableStatus(status: PaymentStatusType): boolean {
  return [
    'requires_payment_method',
    'requires_confirmation', 
    'requires_action',
    'requires_capture',
    'partially_captured_and_capturable'
  ].includes(status)
}

// Helper function to check if status is final
export function isFinalStatus(status: PaymentStatusType): boolean {
  return ['succeeded', 'failed', 'cancelled'].includes(status)
}