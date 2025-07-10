'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Info, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip'
import { cn } from '@/presentation/lib/utils'

// Variantes del componente
const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        destructive: 'text-destructive',
        success: 'text-success',
        warning: 'text-warning',
        muted: 'text-muted-foreground',
        accent: 'text-accent-foreground',
      },
      size: {
        default: 'text-sm',
        sm: 'text-xs',
        lg: 'text-base',
        xl: 'text-lg',
      },
      weight: {
        default: 'font-medium',
        normal: 'font-normal',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      weight: 'default',
    },
  }
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  description?: string
  tooltip?: string
  badge?: string
  icon?: React.ReactNode
  required?: boolean
  optional?: boolean
  disabled?: boolean
  invalid?: boolean
  showAsterisk?: boolean
  showOptionalText?: boolean
  showHelpIcon?: boolean
  className?: string
  descriptionClassName?: string
  iconClassName?: string
  badgeClassName?: string
  onIconClick?: () => void
  onBadgeClick?: () => void
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  (
    {
      children,
      className,
      variant,
      size,
      weight,
      description,
      tooltip,
      badge,
      icon,
      required,
      optional,
      disabled,
      invalid,
      showAsterisk = true,
      showOptionalText = true,
      showHelpIcon = false,
      descriptionClassName,
      iconClassName,
      badgeClassName,
      onIconClick,
      onBadgeClick,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = invalid ? 'destructive' : variant
    const shouldShowAsterisk = required && showAsterisk
    const shouldShowOptional = optional && showOptionalText && !required

    return (
      <div className="space-y-1">
        <label
          ref={ref}
          className={cn(
            labelVariants({ variant: resolvedVariant, size, weight }),
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          aria-invalid={invalid}
          {...props}
        >
          <div className="flex items-center gap-2">
            {/* Icon */}
            {icon && (
              <span
                className={cn(
                  'flex items-center justify-center',
                  onIconClick && 'cursor-pointer hover:opacity-80',
                  iconClassName
                )}
                onClick={onIconClick}
              >
                {icon}
              </span>
            )}

            {/* Main Text */}
            <span className="flex items-center gap-1">
              {children}

              {shouldShowAsterisk && (
                <span className="text-destructive ml-1" aria-label="required">
                  *
                </span>
              )}
              {shouldShowOptional && (
                <span className="text-muted-foreground text-xs ml-1">
                  (opcional)
                </span>
              )}
              {(showHelpIcon || tooltip) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="More information"
                      tabIndex={-1}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tooltip || 'Más información'}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>

            {/* Badge */}
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  'bg-accent text-accent-foreground',
                  onBadgeClick && 'cursor-pointer hover:bg-accent/80',
                  badgeClassName
                )}
                onClick={onBadgeClick}
              >
                {badge}
              </span>
            )}
          </div>
        </label>
        {/* Descripción */}
        {description && (
          <p
            className={cn(
              'text-xs text-muted-foreground leading-relaxed',
              invalid && 'text-destructive',
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}
      </div>
    )
  }
)

Label.displayName = 'Label'
