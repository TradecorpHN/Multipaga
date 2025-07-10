'use client'

import * as React from 'react'
import { cn } from '@/presentation/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  fallback?: string
  alt?: string
  size?: number
  className?: string
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, fallback, alt, size = 40, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 select-none overflow-hidden',
          className
        )}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="object-cover w-full h-full rounded-full"
            draggable={false}
          />
        ) : children ? (
          children
        ) : (
          <span className="font-bold text-xs">{fallback}</span>
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export const AvatarImage = ({
  src,
  alt = '',
  className = '',
}: {
  src?: string
  alt?: string
  className?: string
}) => {
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover w-full h-full rounded-full', className)}
      draggable={false}
    />
  )
}

export const AvatarFallback = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span
    className={cn(
      'absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-500',
      className
    )}
  >
    {children}
  </span>
)
