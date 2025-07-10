'use client'

import * as React from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  className?: string
  children: React.ReactNode
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-xl duration-200 rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out",
        className
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition">
        <X className="w-5 h-5" />
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
))
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ children, className }: { children?: React.ReactNode, className?: string }) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>{children}</div>
)
export const DialogTitle = ({ children, className }: { children?: React.ReactNode, className?: string }) => (
  <RadixDialog.Title className={cn('text-lg font-semibold', className)}>{children}</RadixDialog.Title>
)
export const DialogDescription = ({ children, className }: { children?: React.ReactNode, className?: string }) => (
  <RadixDialog.Description className={cn('text-sm text-muted-foreground', className)}>{children}</RadixDialog.Description>
)
