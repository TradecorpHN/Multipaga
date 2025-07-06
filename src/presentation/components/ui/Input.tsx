import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isPassword?: boolean
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      isPassword = false,
      fullWidth = true,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    const baseStyles = `
      w-full px-4 py-3 
      bg-dark-bg/50 
      border border-dark-border 
      rounded-lg 
      text-white 
      placeholder-dark-text-muted 
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : ''

    const iconPadding = {
      left: leftIcon ? 'pl-11' : '',
      right: rightIcon || isPassword ? 'pr-11' : '',
    }

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            className={clsx(
              baseStyles,
              errorStyles,
              iconPadding.left,
              iconPadding.right,
              'neumorphic-input',
              className
            )}
            disabled={disabled}
            {...props}
          />

          {(rightIcon || isPassword || error) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {error && <AlertCircle className="h-5 w-5 text-red-500" />}
              
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-dark-text-muted hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              )}
              
              {rightIcon && !isPassword && !error && rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="mt-2 text-sm text-dark-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      hint,
      fullWidth = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      w-full px-4 py-3 
      bg-dark-bg/50 
      border border-dark-border 
      rounded-lg 
      text-white 
      placeholder-dark-text-muted 
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      resize-none
    `

    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : ''

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={clsx(
            baseStyles,
            errorStyles,
            'neumorphic-input',
            className
          )}
          disabled={disabled}
          {...props}
        />

        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="mt-2 text-sm text-dark-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input }