'use client'

import * as React from 'react'
import { cn } from '@/presentation/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
  hideScrollbar?: boolean
  maxHeight?: string | number
  maxWidth?: string | number
  className?: string
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      children,
      orientation = 'vertical',
      hideScrollbar = false,
      maxHeight,
      maxWidth,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-auto',
          orientation === 'vertical' && 'overflow-y-auto',
          orientation === 'horizontal' && 'overflow-x-auto',
          orientation === 'both' && 'overflow-x-auto overflow-y-auto',
          hideScrollbar && 'scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-transparent',
          className
        )}
        style={{
          maxHeight: maxHeight || undefined,
          maxWidth: maxWidth || undefined,
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'
