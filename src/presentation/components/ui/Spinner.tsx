// /home/kali/multipaga/src/presentation/components/ui/Spinner.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Spinner - Componente de carga animado con múltiples variantes
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del componente
const spinnerVariants = cva(
  'animate-spin flex-shrink-0',
  {
    variants: {
      variant: {
        default: 'text-primary',
        destructive: 'text-destructive',
        success: 'text-success',
        warning: 'text-warning',
        muted: 'text-muted-foreground',
        accent: 'text-accent-foreground',
        white: 'text-white',
      },
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        default: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
        '2xl': 'w-16 h-16',
      },
      speed: {
        slow: 'animate-spin-slow',
        default: 'animate-spin',
        fast: 'animate-spin-fast',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      speed: 'default',
    },
  }
)

// Props del componente
interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  // Contenido y estado
  label?: string
  description?: string
  icon?: 'loader' | 'refresh' | 'rotate' | React.ReactNode
  
  // Comportamiento
  overlay?: boolean
  blur?: boolean
  
  // Estilos personalizados
  className?: string
  iconClassName?: string
  labelClassName?: string
  descriptionClassName?: string
  
  // Accesibilidad
  'aria-label'?: string
  'aria-describedby'?: string
}

// Componente principal
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(({
  variant,
  size,
  speed,
  label,
  description,
  icon = 'loader',
  overlay = false,
  blur = false,
  className,
  iconClassName,
  labelClassName,
  descriptionClassName,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  // Determinar el icono a usar
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, {
        className: cn(
          spinnerVariants({ variant, size, speed }),
          iconClassName
        ),
      })
    }
    
    const IconComponent = {
      loader: Loader2,
      refresh: RefreshCw,
      rotate: RotateCcw,
    }[icon as string] || Loader2
    
    return (
      <IconComponent
        className={cn(
          spinnerVariants({ variant, size, speed }),
          iconClassName
        )}
      />
    )
  }

  // Contenido del spinner
  const content = (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center',
        overlay && 'absolute inset-0 z-50',
        blur && 'backdrop-blur-sm',
        className
      )}
      role="status"
      aria-label={ariaLabel || label || 'Loading'}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        {renderIcon()}
        
        {/* Label */}
        {label && (
          <span
            className={cn(
              'text-sm font-medium text-foreground',
              labelClassName
            )}
          >
            {label}
          </span>
        )}
        
        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-xs text-muted-foreground text-center max-w-sm',
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )

  // Si es overlay, envolver en un contenedor con fondo
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
})

Spinner.displayName = 'Spinner'

// Componente de spinner inline
interface InlineSpinnerProps extends Omit<SpinnerProps, 'label' | 'description'> {
  text?: string
  position?: 'left' | 'right'
}

const InlineSpinner = React.forwardRef<HTMLDivElement, InlineSpinnerProps>(({
  text,
  position = 'left',
  size = 'sm',
  className,
  ...props
}, ref) => {
  const spinner = <Spinner ref={ref} size={size} {...props} />
  
  if (!text) {
    return spinner
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {position === 'left' && spinner}
      <span className="text-sm">{text}</span>
      {position === 'right' && spinner}
    </div>
  )
})

InlineSpinner.displayName = 'InlineSpinner'

// Componente de spinner de botón
interface ButtonSpinnerProps extends Omit<SpinnerProps, 'size' | 'label' | 'description'> {
  size?: 'sm' | 'default' | 'lg'
}

const ButtonSpinner = React.forwardRef<HTMLDivElement, ButtonSpinnerProps>(({
  size = 'default',
  variant = 'white',
  className,
  ...props
}, ref) => {
  const sizeMap = {
    sm: 'xs' as const,
    default: 'sm' as const,
    lg: 'default' as const,
  }

  return (
    <Spinner
      ref={ref}
      size={sizeMap[size]}
      variant={variant}
      className={cn('mr-2', className)}
      {...props}
    />
  )
})

ButtonSpinner.displayName = 'ButtonSpinner'

// Componente de spinner de página
interface PageSpinnerProps extends SpinnerProps {
  fullScreen?: boolean
  minHeight?: string
}

const PageSpinner = React.forwardRef<HTMLDivElement, PageSpinnerProps>(({
  fullScreen = false,
  minHeight = '400px',
  size = 'xl',
  label = 'Cargando...',
  className,
  ...props
}, ref) => {
  const containerClass = fullScreen 
    ? 'min-h-screen' 
    : `min-h-[${minHeight}]`

  return (
    <div className={cn(
      'flex items-center justify-center',
      containerClass,
      className
    )}>
      <Spinner
        ref={ref}
        size={size}
        label={label}
        {...props}
      />
    </div>
  )
})

PageSpinner.displayName = 'PageSpinner'

// Componente de spinner de tarjeta
interface CardSpinnerProps extends SpinnerProps {
  height?: string
}

const CardSpinner = React.forwardRef<HTMLDivElement, CardSpinnerProps>(({
  height = '200px',
  size = 'lg',
  className,
  ...props
}, ref) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-card',
        className
      )}
      style={{ height }}
    >
      <Spinner
        ref={ref}
        size={size}
        {...props}
      />
    </div>
  )
})

CardSpinner.displayName = 'CardSpinner'

// Componente de spinner de datos
interface DataSpinnerProps extends SpinnerProps {
  rows?: number
  columns?: number
}

const DataSpinner = React.forwardRef<HTMLDivElement, DataSpinnerProps>(({
  rows = 5,
  columns = 4,
  label = 'Cargando datos...',
  className,
  ...props
}, ref) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
      
      {/* Spinner overlay */}
      <div className="flex items-center justify-center py-8">
        <Spinner
          ref={ref}
          label={label}
          {...props}
        />
      </div>
    </div>
  )
})

DataSpinner.displayName = 'DataSpinner'

// Hook para controlar estados de carga
interface UseSpinnerReturn {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
  setLoading: (loading: boolean) => void
}

export const useSpinner = (initialState = false): UseSpinnerReturn => {
  const [isLoading, setIsLoading] = React.useState(initialState)

  const startLoading = React.useCallback(() => {
    setIsLoading(true)
  }, [])

  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
  }, [])

  const setLoading = React.useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  return {
    isLoading,
    startLoading,
    stopLoading,
    setLoading,
  }
}

// Agregar estilos de animación personalizados
const spinnerStyles = `
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes spin-fast {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin-slow {
    animation: spin-slow 3s linear infinite;
  }
  
  .animate-spin-fast {
    animation: spin-fast 0.5s linear infinite;
  }
`

// Inyectar estilos si no existen
if (typeof window !== 'undefined' && !document.querySelector('#spinner-styles')) {
  const style = document.createElement('style')
  style.id = 'spinner-styles'
  style.textContent = spinnerStyles
  document.head.appendChild(style)
}

// Exports
export { 
  Spinner, 
  InlineSpinner, 
  ButtonSpinner, 
  PageSpinner, 
  CardSpinner, 
  DataSpinner,
  useSpinner 
}

export type { 
  SpinnerProps, 
  InlineSpinnerProps, 
  ButtonSpinnerProps, 
  PageSpinnerProps, 
  CardSpinnerProps, 
  DataSpinnerProps 
}