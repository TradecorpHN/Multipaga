import React from 'react'
import { clsx } from 'clsx'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'outline' | 'ghost' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  glowOnHover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      hoverable = false,
      clickable = false,
      glowOnHover = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'relative overflow-hidden transition-all duration-300'

    const variants = {
      default: 'bg-dark-surface border border-dark-border shadow-neumorphic',
      outline: 'bg-transparent border-2 border-dark-border',
      ghost: 'bg-dark-surface/50 backdrop-blur-sm border border-dark-border/50',
      gradient: 'bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30',
    }

    const sizes = {
      sm: 'p-4 rounded-lg',
      md: 'p-6 rounded-xl',
      lg: 'p-8 rounded-2xl',
    }

    const hoverStyles = hoverable || clickable ? {
      hover: 'hover:shadow-neumorphic-sm hover:border-purple-500/30',
      glow: glowOnHover ? 'hover:shadow-glow' : '',
      cursor: clickable ? 'cursor-pointer' : '',
    } : {}

    return (
      <motion.div
        ref={ref}
        whileHover={hoverable || clickable ? { y: -2 } : {}}
        whileTap={clickable ? { scale: 0.98 } : {}}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          hoverStyles.hover,
          hoverStyles.glow,
          hoverStyles.cursor,
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

// Card Header Component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('flex items-start justify-between mb-4', className)} {...props}>
      {children || (
        <>
          <div>
            {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-dark-text-secondary mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </>
      )}
    </div>
  )
}

// Card Body Component
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({ className, ...props }) => {
  return <div className={clsx('', className)} {...props} />
}

// Card Footer Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean
}

export const CardFooter: React.FC<CardFooterProps> = ({ 
  divider = true, 
  className, 
  ...props 
}) => {
  return (
    <div 
      className={clsx(
        'mt-4', 
        divider && 'pt-4 border-t border-dark-border',
        className
      )} 
      {...props} 
    />
  )
}

export { Card }