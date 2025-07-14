'use client'

import React, { forwardRef, useId } from 'react'
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form'
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Search,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
  Lock,
  Globe,
  CreditCard,
  Hash,
  FileText,
  X, // CORRECCIÓN: Importar el ícono X
} from 'lucide-react'
import { Label } from '@/presentation/components/ui/Label'
import { Input } from '@/presentation/components/ui/Input'
import { Textarea } from '@/presentation/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/Select'
// CORRECCIÓN: Crear archivos Switch.tsx y RadioGroup.tsx en el directorio UI
import { Switch } from '@/presentation/components/ui/Switch'
import { Checkbox } from '@/presentation/components/ui/Checkbox'
import { RadioGroup, RadioGroupItem } from '@/presentation/components/ui/RadioGroup'
import { Button } from '@/presentation/components/ui/Button'
import { Badge } from '@/presentation/components/ui/Badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { cn } from '@/presentation/lib/utils'

// Types for different field configurations
type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'url' 
  | 'search'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime-local'

interface SelectOption {
  label: string
  value: string
  disabled?: boolean
  description?: string
}

interface RadioOption {
  label: string
  value: string
  disabled?: boolean
  description?: string
}

interface FormFieldProps {
  // Basic props
  name: string
  label?: string
  placeholder?: string
  description?: string
  type?: FieldType
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  className?: string

  // Field-specific props
  options?: SelectOption[] | RadioOption[]
  currency?: string
  min?: number
  max?: number
  step?: number
  rows?: number
  maxLength?: number
  pattern?: string

  // Validation and state
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>
  success?: boolean
  loading?: boolean

  // Icons and visual enhancements
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
  showClearButton?: boolean

  // Help and additional info
  tooltip?: string
  badge?: string
  footnote?: string

  // Callbacks
  onChange?: (value: any) => void
  onBlur?: () => void
  onFocus?: () => void
  onClear?: () => void

  // Form integration
  value?: any
  defaultValue?: any

  // Additional HTML attributes
  [key: string]: any
}

// Icon mapping for common field types
const getFieldIcon = (type?: FieldType) => {
  switch (type) {
    case 'email':
      return <Mail className="w-4 h-4" />
    case 'password':
      return <Lock className="w-4 h-4" />
    case 'tel':
      return <Phone className="w-4 h-4" />
    case 'url':
      return <Globe className="w-4 h-4" />
    case 'search':
      return <Search className="w-4 h-4" />
    case 'currency':
      return <DollarSign className="w-4 h-4" />
    case 'date':
    case 'time':
    case 'datetime-local':
      return <Calendar className="w-4 h-4" />
    case 'number':
      return <Hash className="w-4 h-4" />
    case 'textarea':
      return <FileText className="w-4 h-4" />
    default:
      return <User className="w-4 h-4" />
  }
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({
  name,
  label,
  placeholder,
  description,
  type = 'text',
  required = false,
  disabled = false,
  readOnly = false,
  className = '',
  options = [],
  currency = 'USD',
  min,
  max,
  step,
  rows = 3,
  maxLength,
  pattern,
  error,
  success = false,
  loading = false,
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  showClearButton = false,
  tooltip,
  badge,
  footnote,
  onChange,
  onBlur,
  onFocus,
  onClear,
  value,
  defaultValue,
  ...props
}, ref) => {
  const fieldId = useId()
  const [showPassword, setShowPassword] = React.useState(false)
  const [focused, setFocused] = React.useState(false)

  // Error handling
  const hasError = !!error
  const errorMessage = error?.message || (typeof error === 'string' ? error : undefined)

  // Status classes
  const statusClasses = cn(
    hasError && 'border-destructive focus-visible:ring-destructive',
    success && !hasError && 'border-green-500 focus-visible:ring-green-500',
    focused && !hasError && !success && 'border-primary focus-visible:ring-primary'
  )

  // Common field props
  const commonProps = {
    id: fieldId,
    name,
    disabled: disabled || loading,
    readOnly,
    required,
    value,
    defaultValue,
    onChange: (e: any) => {
      const newValue = type === 'checkbox' || type === 'switch' 
        ? e.target?.checked || e 
        : e.target?.value || e
      onChange?.(newValue)
    },
    onBlur: () => {
      setFocused(false)
      onBlur?.()
    },
    onFocus: () => {
      setFocused(true)
      onFocus?.()
    },
    className: cn(statusClasses, className),
    ...props,
  }

  // Get appropriate input icon
  const inputIcon = leftIcon || (type !== 'select' && type !== 'textarea' && type !== 'checkbox' && type !== 'radio' && type !== 'switch' ? getFieldIcon(type) : null)

  // Render different field types
  const renderField = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            ref={ref as any}
          />
        )

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled || loading}
            required={required}
          >
            <SelectTrigger className={cn(statusClasses, className)}>
              <SelectValue placeholder={placeholder || 'Seleccionar...'} />
            </SelectTrigger>
            <SelectContent>
              {(options as SelectOption[]).map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value}
              onCheckedChange={onChange}
              disabled={disabled || loading}
              className={statusClasses}
            />
            {label && (
              <Label 
                htmlFor={fieldId}
                className={cn(
                  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  hasError && 'text-destructive'
                )}
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
          </div>
        )

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={disabled || loading}
            className="space-y-2"
          >
            {(options as RadioOption[]).map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem 
                  value={option.value} 
                  id={`${fieldId}-${option.value}`}
                  disabled={option.disabled}
                />
                <Label 
                  htmlFor={`${fieldId}-${option.value}`}
                  className={cn(
                    'text-sm font-medium leading-none',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div>
                    <div>{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground font-normal">
                        {option.description}
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={fieldId}
              checked={value}
              onCheckedChange={onChange}
              disabled={disabled || loading}
            />
            {label && (
              <Label 
                htmlFor={fieldId}
                className={cn(
                  'text-sm font-medium leading-none',
                  hasError && 'text-destructive'
                )}
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
          </div>
        )

      case 'currency':
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type="number"
              placeholder={placeholder || '0.00'}
              min={min}
              max={max}
              step={step || 0.01}
              leftIcon={<DollarSign className="w-4 h-4" />}
              rightIcon={
                <Badge variant="secondary" className="text-xs">
                  {currency}
                </Badge>
              }
              ref={ref}
            />
          </div>
        )

      case 'password':
        return (
          <Input
            {...commonProps}
            type={showPasswordToggle && showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            leftIcon={inputIcon}
            rightIcon={
              showPasswordToggle ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              ) : rightIcon
            }
            maxLength={maxLength}
            ref={ref}
          />
        )

      default:
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type={type}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              pattern={pattern}
              maxLength={maxLength}
              leftIcon={inputIcon}
              rightIcon={
                <>
                  {showClearButton && value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 mr-1"
                      onClick={() => {
                        onChange?.('')
                        onClear?.()
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {rightIcon}
                </>
              }
              ref={ref}
            />
          </div>
        )
    }
  }

  // Don't wrap checkbox and switch in label container
  if (type === 'checkbox' || type === 'switch') {
    return (
      <div className="space-y-2">
        {renderField()}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {hasError && (
          <p className="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span>{errorMessage}</span>
          </p>
        )}
        {footnote && (
          <p className="text-xs text-muted-foreground">{footnote}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Label Row */}
      {(label || badge || tooltip) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {label && (
              <Label 
                htmlFor={fieldId}
                className={cn(
                  'text-sm font-medium leading-none',
                  hasError && 'text-destructive'
                )}
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      )}

      {/* Field */}
      <div className="relative">
        {renderField()}
        
        {/* Success/Error indicators */}
        {(success || hasError) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {success && !hasError && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Error Message */}
      {hasError && (
        <p className="flex items-center space-x-1 text-sm text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Success Message */}
      {success && !hasError && (
        <p className="flex items-center space-x-1 text-sm text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>Campo válido</span>
        </p>
      )}

      {/* Footnote */}
      {footnote && (
        <p className="text-xs text-muted-foreground">{footnote}</p>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

export default FormField

// Export preset configurations for common use cases
export const FormFieldPresets = {
  email: {
    type: 'email' as const,
    placeholder: 'ejemplo@correo.com',
    tooltip: 'Introduce una dirección de email válida',
  },
  
  password: {
    type: 'password' as const,
    showPasswordToggle: true,
    tooltip: 'Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números',
  },
  
  phone: {
    type: 'tel' as const,
    placeholder: '+504 9999-9999',
    pattern: '[+]?[0-9\\s\\-\\(\\)]+',
  },
  
  currency: {
    type: 'currency' as const,
    min: 0,
    step: 0.01,
    tooltip: 'Monto en formato decimal (ej: 100.50)',
  },
  
  search: {
    type: 'search' as const,
    showClearButton: true,
    placeholder: 'Buscar...',
  },
  
  url: {
    type: 'url' as const,
    placeholder: 'https://ejemplo.com',
    pattern: 'https?://.+',
  },
}