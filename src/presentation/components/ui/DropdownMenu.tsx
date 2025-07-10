// /home/kali/multipaga/src/presentation/components/ui/DropdownMenu.tsx
// ──────────────────────────────────────────────────────────────────────────────
// DropdownMenu - Componente de menú desplegable accesible
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  Check, 
  ChevronRight, 
  Circle, 
  MoreHorizontal, 
  MoreVertical,
  Settings,
  User,
  LogOut,
  Trash2,
  Edit,
  Eye,
  Copy,
  Download,
  Share,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del contenido
const contentVariants = cva(
  'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      size: {
        sm: 'min-w-[6rem] text-xs',
        default: 'min-w-[8rem] text-sm',
        lg: 'min-w-[12rem] text-sm',
        xl: 'min-w-[16rem] text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

// Variantes de los items
const itemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'text-destructive focus:bg-destructive focus:text-destructive-foreground hover:bg-destructive/10',
        success: 'text-success focus:bg-success focus:text-success-foreground hover:bg-success/10',
        warning: 'text-warning focus:bg-warning focus:text-warning-foreground hover:bg-warning/10',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        default: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// Componente raíz
const DropdownMenu = DropdownMenuPrimitive.Root

// Trigger
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

// Group
const DropdownMenuGroup = DropdownMenuPrimitive.Group

// Portal
const DropdownMenuPortal = DropdownMenuPrimitive.Portal

// Sub
const DropdownMenuSub = DropdownMenuPrimitive.Sub

// Radio Group
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

// Sub Trigger
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

// Sub Content
interface DropdownMenuSubContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>,
    VariantProps<typeof contentVariants> {}

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  DropdownMenuSubContentProps
>(({ className, size, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(contentVariants({ size }), className)}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

// Content
interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>,
    VariantProps<typeof contentVariants> {}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, size, ...props }, ref) => (
  <DropdownMenuPortal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(contentVariants({ size }), className)}
      {...props}
    />
  </DropdownMenuPortal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

// Item
interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof itemVariants> {
  inset?: boolean
  icon?: React.ReactNode
  shortcut?: string
  description?: string
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, inset, icon, shortcut, description, children, variant, size, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      itemVariants({ variant, size }),
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2 flex-1">
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span>{children}</span>
          {shortcut && (
            <span className="ml-auto text-xs tracking-widest opacity-60">
              {shortcut}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  </DropdownMenuPrimitive.Item>
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

// Checkbox Item
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

// Radio Item
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

// Label
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

// Separator
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

// Shortcut
const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

// Componente de trigger con tres puntos
interface DropdownMenuTriggerDotsProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {
  variant?: 'horizontal' | 'vertical'
  size?: 'sm' | 'default' | 'lg'
}

const DropdownMenuTriggerDots = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  DropdownMenuTriggerDotsProps
>(({ className, variant = 'horizontal', size = 'default', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-7 w-7',
    default: 'h-8 w-8',
    lg: 'h-9 w-9',
  }

  const Icon = variant === 'horizontal' ? MoreHorizontal : MoreVertical

  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Open menu</span>
    </DropdownMenuPrimitive.Trigger>
  )
})
DropdownMenuTriggerDots.displayName = 'DropdownMenuTriggerDots'

// Componente de menú de acciones rápidas
interface QuickActionsMenuProps {
  children?: React.ReactNode
  onEdit?: () => void
  onView?: () => void
  onCopy?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onShare?: () => void
  editLabel?: string
  viewLabel?: string
  copyLabel?: string
  deleteLabel?: string
  downloadLabel?: string
  shareLabel?: string
  disabled?: {
    edit?: boolean
    view?: boolean
    copy?: boolean
    delete?: boolean
    download?: boolean
    share?: boolean
  }
}

const QuickActionsMenu = React.forwardRef<HTMLButtonElement, QuickActionsMenuProps>(({
  children,
  onEdit,
  onView,
  onCopy,
  onDelete,
  onDownload,
  onShare,
  editLabel = 'Editar',
  viewLabel = 'Ver',
  copyLabel = 'Copiar',
  deleteLabel = 'Eliminar',
  downloadLabel = 'Descargar',
  shareLabel = 'Compartir',
  disabled = {},
}, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTriggerDots ref={ref} />
      <DropdownMenuContent align="end" size="default">
        {children}
        
        {onView && (
          <DropdownMenuItem 
            onClick={onView}
            disabled={disabled.view}
            icon={<Eye className="h-4 w-4" />}
          >
            {viewLabel}
          </DropdownMenuItem>
        )}
        
        {onEdit && (
          <DropdownMenuItem 
            onClick={onEdit}
            disabled={disabled.edit}
            icon={<Edit className="h-4 w-4" />}
          >
            {editLabel}
          </DropdownMenuItem>
        )}
        
        {onCopy && (
          <DropdownMenuItem 
            onClick={onCopy}
            disabled={disabled.copy}
            icon={<Copy className="h-4 w-4" />}
          >
            {copyLabel}
          </DropdownMenuItem>
        )}
        
        {onDownload && (
          <DropdownMenuItem 
            onClick={onDownload}
            disabled={disabled.download}
            icon={<Download className="h-4 w-4" />}
          >
            {downloadLabel}
          </DropdownMenuItem>
        )}
        
        {onShare && (
          <DropdownMenuItem 
            onClick={onShare}
            disabled={disabled.share}
            icon={<Share className="h-4 w-4" />}
          >
            {shareLabel}
          </DropdownMenuItem>
        )}
        
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              disabled={disabled.delete}
              variant="destructive"
              icon={<Trash2 className="h-4 w-4" />}
            >
              {deleteLabel}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
QuickActionsMenu.displayName = 'QuickActionsMenu'

// Componente de menú de filtros
interface FilterMenuProps {
  children?: React.ReactNode
  filters?: Array<{
    key: string
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
  }>
  onClearAll?: () => void
  onSelectAll?: () => void
  clearLabel?: string
  selectAllLabel?: string
}

const FilterMenu = React.forwardRef<HTMLButtonElement, FilterMenuProps>(({
  children,
  filters = [],
  onClearAll,
  onSelectAll,
  clearLabel = 'Limpiar filtros',
  selectAllLabel = 'Seleccionar todo',
}, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={ref}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <Filter className="h-4 w-4" />
        Filtros
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" size="lg">
        {children}
        
        {filters.length > 0 && (
          <>
            <DropdownMenuLabel>Filtros</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {filters.map((filter) => (
              <DropdownMenuCheckboxItem
                key={filter.key}
                checked={filter.checked}
                onCheckedChange={filter.onChange}
              >
                {filter.label}
              </DropdownMenuCheckboxItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <div className="flex gap-1 p-1">
              {onSelectAll && (
                <button
                  onClick={onSelectAll}
                  className="flex-1 rounded px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {selectAllLabel}
                </button>
              )}
              {onClearAll && (
                <button
                  onClick={onClearAll}
                  className="flex-1 rounded px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {clearLabel}
                </button>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
FilterMenu.displayName = 'FilterMenu'

// Componente de menú de ordenamiento
interface SortMenuProps {
  options: Array<{
    key: string
    label: string
  }>
  value?: string
  direction?: 'asc' | 'desc'
  onSort: (key: string, direction: 'asc' | 'desc') => void
}

const SortMenu = React.forwardRef<HTMLButtonElement, SortMenuProps>(({
  options,
  value,
  direction = 'asc',
  onSort,
}, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={ref}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {direction === 'asc' ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
        Ordenar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" size="lg">
        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuRadioGroup value={value}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.key}
              value={option.key}
              onClick={() => onSort(option.key, direction)}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuRadioGroup value={direction}>
          <DropdownMenuRadioItem
            value="asc"
            onClick={() => value && onSort(value, 'asc')}
          >
            <SortAsc className="h-4 w-4 mr-2" />
            Ascendente
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="desc"
            onClick={() => value && onSort(value, 'desc')}
          >
            <SortDesc className="h-4 w-4 mr-2" />
            Descendente
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
SortMenu.displayName = 'SortMenu'

// Exports
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuTriggerDots,
  QuickActionsMenu,
  FilterMenu,
  SortMenu,
}

export type {
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuTriggerDotsProps,
  QuickActionsMenuProps,
  FilterMenuProps,
  SortMenuProps,
}