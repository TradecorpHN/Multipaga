// /home/kali/multipaga/src/presentation/components/ui/Select.tsx
'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes
const triggerVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
  {
    variants: {
      variant: {
        default: 'border-input',
        destructive: 'border-destructive text-destructive focus:ring-destructive',
        success: 'border-success text-success focus:ring-success',
        warning: 'border-warning text-warning focus:ring-warning',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const contentVariants = cva(
  'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      size: {
        sm: 'min-w-[6rem] text-xs',
        default: 'min-w-[8rem] text-sm',
        lg: 'min-w-[12rem] text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

// Root
const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

// SelectTrigger
type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof triggerVariants> & {
    icon?: React.ReactNode
    loading?: boolean
    clearable?: boolean
    onClear?: () => void
    children?: React.ReactNode // <-- Acepta children correctamente
  }

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, variant, size, icon, loading, clearable, onClear, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(triggerVariants({ variant, size }), className)}
    {...props}
  >
    <div className="flex items-center gap-2 flex-1">
      {icon && !loading && (
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      )}
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 text-left truncate">{children}</span>
    </div>
    <div className="flex items-center gap-1">
      {clearable && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </div>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

// SelectContent
type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> &
  VariantProps<typeof contentVariants> & {
    searchable?: boolean
    searchPlaceholder?: string
    emptyText?: string
    onSearchChange?: (search: string) => void
    createable?: boolean
    onCreateOption?: (value: string) => void
    createText?: string
    children?: React.ReactNode // <-- Acepta children correctamente
    position?: string
  }

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = 'popper',
      size,
      searchable = false,
      searchPlaceholder = 'Buscar...',
      emptyText = 'No hay resultados',
      onSearchChange,
      createable = false,
      onCreateOption,
      createText = 'Crear',
      ...props
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = React.useState('')

    const handleSearchChange = (value: string) => {
      setSearchValue(value)
      onSearchChange?.(value)
    }

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(contentVariants({ size }), className)}
          position={position as any}
          {...props}
        >
          {searchable && (
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          )}
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
          {createable && searchValue && onCreateOption && (
            <div className="px-2 py-1.5 text-sm border-t">
              <button
                onClick={() => onCreateOption(searchValue)}
                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                {createText} "{searchValue}"
              </button>
            </div>
          )}
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }
)
SelectContent.displayName = 'SelectContent'

// Scroll Up Button
const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

// Scroll Down Button
const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

// Label
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

// Item
type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
  icon?: React.ReactNode
  description?: string
  badge?: string
  hideCheckIcon?: boolean
  children?: React.ReactNode
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, icon, description, badge, hideCheckIcon = false, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    {!hideCheckIcon && (
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    )}
    <div className="flex items-center gap-2 flex-1">
      {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <SelectPrimitive.ItemText className="truncate">{children}</SelectPrimitive.ItemText>
          {badge && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-secondary rounded-full">{badge}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
    </div>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

// Separator
const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
SelectSeparator.displayName = 'SelectSeparator'

// Export
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
export type {
  SelectTriggerProps,
  SelectContentProps,
  SelectItemProps,
}

// Hook multi select
export const useMultiSelect = (initialValues: string[] = []) => {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(initialValues)
  const toggle = React.useCallback((value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }, [])
  const isSelected = React.useCallback(
    (value: string) => selectedValues.includes(value),
    [selectedValues]
  )
  const clear = React.useCallback(() => setSelectedValues([]), [])
  const selectAll = React.useCallback((values: string[]) => setSelectedValues(values), [])
  return { selectedValues, setSelectedValues, toggle, isSelected, clear, selectAll }
}
export const SelectWithState = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger> & {
    value?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
  }
>(({ value, onValueChange, children, ...props }, ref) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger ref={ref} {...props}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {children}
    </SelectContent>
  </Select>
))

SelectWithState.displayName = 'SelectWithState'