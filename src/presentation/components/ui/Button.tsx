import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow hover:shadow-glow-lg active:shadow-neumorphic-inset',
      secondary: 'bg-dark-surface text-white border border-dark-border shadow-neumorphic hover:shadow-neumorphic-sm active:shadow-neumorphic-inset',
      outline: 'bg-transparent border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:shadow-glow',
      ghost: 'bg-transparent text-dark-text-secondary hover:bg-dark-surface hover:text-white',
      danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-glow hover:shadow-glow-lg active:shadow-neumorphic-inset',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-xl',
    }

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    }

    const isDisabled = disabled || isLoading

    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={clsx('animate-spin', iconSizes[size], children && 'mr-2')} />
            {children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={clsx(iconSizes[size], children && 'mr-2')}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className={clsx(iconSizes[size], children && 'ml-2')}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }