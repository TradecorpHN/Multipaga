'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del componente
const checkboxVariants = cva(
  'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        destructive: 'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground',
        success: 'border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground',
        warning: 'border-warning data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground',
        outline: 'border-input data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground',
      },
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
        xl: 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  label?: string
  description?: string
  error?: string
  indeterminate?: boolean
  className?: string
  labelClassName?: string
  descriptionClassName?: string
  errorClassName?: string
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  id?: string
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({
  className,
  variant,
  size,
  label,
  description,
  error,
  indeterminate,
  onCheckedChange,
  labelClassName,
  descriptionClassName,
  errorClassName,
  ...props
}, ref) => {
  // Determinar el estado del checkbox
  const checked = indeterminate ? 'indeterminate' : props.checked

  // Manejar cambios de estado
  const handleCheckedChange = React.useCallback((checkedState: boolean | 'indeterminate') => {
    onCheckedChange?.(checkedState)
  }, [onCheckedChange])

  // Determinar el icono a mostrar
  const renderIcon = () => {
    if (checked === 'indeterminate') {
      return <Minus className="h-4 w-4" />
    }
    return <Check className="h-4 w-4" />
  }

  // Si no hay label, renderizar solo el checkbox
  if (!label && !description) {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(checkboxVariants({ variant, size }), className)}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {renderIcon()}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )
  }

  // Renderizar con label y descripción
  return (
    <div className="flex items-start space-x-3">
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(checkboxVariants({ variant, size }), className)}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {renderIcon()}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      
      <div className="grid gap-1.5 leading-none">
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer',
              error && 'text-destructive',
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        
        {description && (
          <p
            className={cn(
              'text-xs text-muted-foreground leading-relaxed',
              error && 'text-destructive/80',
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}
        
        {error && (
          <p
            className={cn(
              'text-xs text-destructive leading-relaxed',
              errorClassName
            )}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
})

Checkbox.displayName = CheckboxPrimitive.Root.displayName

// Componente de checkbox de tarjeta
interface CheckboxCardProps extends CheckboxProps {
  title?: string
  icon?: React.ReactNode
  badge?: string
  selected?: boolean
  hover?: boolean
}

const CheckboxCard = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxCardProps
>(({
  title,
  label,
  description,
  icon,
  badge,
  selected,
  hover = true,
  className,
  ...props
}, ref) => {
  return (
    <div
      className={cn(
        'relative flex items-start space-x-3 rounded-lg border p-4 transition-all duration-200',
        hover && 'hover:bg-accent/50',
        selected && 'border-primary bg-primary/5',
        className
      )}
    >
      <Checkbox
        ref={ref}
        {...props}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <h3 className="text-sm font-medium">{title || label}</h3>
            {badge && (
              <span className="px-2 py-1 text-xs bg-secondary rounded-full">
                {badge}
              </span>
            )}
          </div>
        </div>
        
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
})

CheckboxCard.displayName = 'CheckboxCard'

// Componente de grupo de checkboxes
interface CheckboxGroupProps {
  children: React.ReactNode
  value?: string[]
  onValueChange?: (value: string[]) => void
  className?: string
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'sm' | 'md' | 'lg'
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(({
  children,
  value = [],
  onValueChange,
  className,
  orientation = 'vertical',
  spacing = 'md',
  ...props
}, ref) => {
  const spacingMap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }

  const orientationMap = {
    horizontal: 'flex-row flex-wrap',
    vertical: 'flex-col',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        orientationMap[orientation],
        spacingMap[spacing],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

CheckboxGroup.displayName = 'CheckboxGroup'

// Componente de checkbox con estado controlado
interface ControlledCheckboxProps extends Omit<CheckboxProps, 'checked' | 'onCheckedChange'> {
  value: string
  checked: boolean
  onValueChange: (value: string, checked: boolean) => void
}

const ControlledCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  ControlledCheckboxProps
>(({
  value,
  checked,
  onValueChange,
  ...props
}, ref) => {
  const handleChange = (checkedState: boolean | 'indeterminate') => {
    const isChecked = checkedState === true
    onValueChange(value, isChecked)
  }

  return (
    <Checkbox
      ref={ref}
      checked={checked}
      onCheckedChange={handleChange}
      {...props}
    />
  )
})

ControlledCheckbox.displayName = 'ControlledCheckbox'

// Hook para manejar grupos de checkboxes (solo una vez)
interface UseCheckboxGroupReturn {
  value: string[]
  setValue: (value: string[]) => void
  toggle: (item: string) => void
  isChecked: (item: string) => boolean
  checkAll: (items: string[]) => void
  uncheckAll: () => void
  isIndeterminate: (items: string[]) => boolean
}

export const useCheckboxGroup = (initialValue: string[] = []): UseCheckboxGroupReturn => {
  const [value, setValue] = React.useState<string[]>(initialValue)

  const toggle = React.useCallback((item: string) => {
    setValue(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    )
  }, [])

  const isChecked = React.useCallback((item: string) => {
    return value.includes(item)
  }, [value])

  const checkAll = React.useCallback((items: string[]) => {
    setValue(items)
  }, [])

  const uncheckAll = React.useCallback(() => {
    setValue([])
  }, [])

  const isIndeterminate = React.useCallback((items: string[]) => {
    return value.length > 0 && value.length < items.length
  }, [value])

  return {
    value,
    setValue,
    toggle,
    isChecked,
    checkAll,
    uncheckAll,
    isIndeterminate,
  }
}

// Exports
export { 
  Checkbox, 
  CheckboxCard, 
  CheckboxGroup, 
  ControlledCheckbox
}

export type { 
  CheckboxCardProps, 
  CheckboxGroupProps, 
  ControlledCheckboxProps 
}
