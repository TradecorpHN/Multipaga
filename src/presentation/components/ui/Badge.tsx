// src/presentation/components/ui/Badge.tsx
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'framer-motion'
import { cn } from '@/presentation/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-white/10 text-white backdrop-blur-xl',
        secondary: 'border-transparent bg-white/5 text-white/80 backdrop-blur-xl',
        destructive: 'border-transparent bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-500/30',
        success: 'border-transparent bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'border-transparent bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30',
        outline: 'border-white/20 text-white/80 backdrop-blur-xl',
        glow: 'border-transparent bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-500/30 shadow-lg shadow-purple-500/25',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
  animate?: boolean
}

function Badge({ className, variant, size, pulse = false, animate = true, children, ...props }: BadgeProps) {
  const badge = (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {badge}
      </motion.div>
    )
  }

  return badge
}

export { Badge, badgeVariants }
