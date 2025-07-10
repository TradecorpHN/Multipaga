// /home/kali/multipaga/src/presentation/components/ui/Pagination.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Pagination - Componente de paginación accesible con múltiples variantes
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/presentation/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/Select'
import { cn } from '@/presentation/lib/utils'

// Variantes del componente
const paginationVariants = cva(
  'mx-auto flex w-full justify-center',
  {
    variants: {
      variant: {
        default: '',
        outline: '',
        ghost: '',
      },
      size: {
        sm: 'gap-1',
        default: 'gap-1',
        lg: 'gap-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const paginationContentVariants = cva(
  'flex items-center',
  {
    variants: {
      size: {
        sm: 'gap-1',
        default: 'gap-1',
        lg: 'gap-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

const paginationItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-9 w-9 text-sm',
        lg: 'h-10 w-10 text-base',
      },
      state: {
        default: '',
        active: 'bg-primary text-primary-foreground hover:bg-primary/90',
        disabled: 'opacity-50 cursor-not-allowed',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
)

// Props principales
interface PaginationProps
  extends React.ComponentProps<'nav'>,
    VariantProps<typeof paginationVariants> {
  className?: string
}

// Componente raíz
const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, variant, size, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="pagination"
      className={cn(paginationVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Pagination.displayName = 'Pagination'

// Contenido de paginación
interface PaginationContentProps extends React.ComponentProps<'ul'>, VariantProps<typeof paginationContentVariants> {}

const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, size, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn(paginationContentVariants({ size }), className)}
      {...props}
    />
  )
)
PaginationContent.displayName = 'PaginationContent'

// Item de paginación
interface PaginationItemProps extends React.ComponentProps<'li'> {}

const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('', className)} {...props} />
  )
)
PaginationItem.displayName = 'PaginationItem'

// Link de paginación
interface PaginationLinkProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean
  disabled?: boolean
}

const PaginationLink = React.forwardRef<HTMLButtonElement, PaginationLinkProps>(
  ({ className, variant, size, isActive, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        paginationItemVariants({ 
          variant, 
          size, 
          state: isActive ? 'active' : disabled ? 'disabled' : 'default' 
        }),
        className
      )}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    />
  )
)
PaginationLink.displayName = 'PaginationLink'

// Botón anterior
interface PaginationPreviousProps extends PaginationLinkProps {
  showIcon?: boolean
  showText?: boolean
  text?: string
}

const PaginationPrevious = React.forwardRef<HTMLButtonElement, PaginationPreviousProps>(
  ({ className, showIcon = true, showText = true, text = 'Anterior', ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Ir a página anterior"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      {showIcon && <ChevronLeft className="h-4 w-4" />}
      {showText && <span>{text}</span>}
    </PaginationLink>
  )
)
PaginationPrevious.displayName = 'PaginationPrevious'

// Botón siguiente
interface PaginationNextProps extends PaginationLinkProps {
  showIcon?: boolean
  showText?: boolean
  text?: string
}

const PaginationNext = React.forwardRef<HTMLButtonElement, PaginationNextProps>(
  ({ className, showIcon = true, showText = true, text = 'Siguiente', ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Ir a página siguiente"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      {showText && <span>{text}</span>}
      {showIcon && <ChevronRight className="h-4 w-4" />}
    </PaginationLink>
  )
)
PaginationNext.displayName = 'PaginationNext'

// Botón primera página
const PaginationFirst = React.forwardRef<HTMLButtonElement, PaginationLinkProps>(
  ({ className, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Ir a primera página"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronsLeft className="h-4 w-4" />
      <span className="sr-only">Primera</span>
    </PaginationLink>
  )
)
PaginationFirst.displayName = 'PaginationFirst'

// Botón última página
const PaginationLast = React.forwardRef<HTMLButtonElement, PaginationLinkProps>(
  ({ className, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Ir a última página"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span className="sr-only">Última</span>
      <ChevronsRight className="h-4 w-4" />
    </PaginationLink>
  )
)
PaginationLast.displayName = 'PaginationLast'

// Puntos suspensivos
const PaginationEllipsis = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Más páginas</span>
    </span>
  )
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

// Componente de paginación completo
interface CompletePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  totalItems?: number
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  showFirstLast?: boolean
  showPageSize?: boolean
  showInfo?: boolean
  showQuickJumper?: boolean
  maxVisiblePages?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  disabled?: boolean
  className?: string
  labels?: {
    previous?: string
    next?: string
    first?: string
    last?: string
    pageSize?: string
    showing?: string
    of?: string
    items?: string
    jumpTo?: string
    page?: string
  }
}

const CompletePagination = React.forwardRef<HTMLElement, CompletePaginationProps>(({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  totalItems,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showFirstLast = true,
  showPageSize = true,
  showInfo = true,
  showQuickJumper = false,
  maxVisiblePages = 5,
  size = 'default',
  variant = 'default',
  disabled = false,
  className,
  labels = {},
}, ref) => {
  const {
    previous = 'Anterior',
    next = 'Siguiente',
    first = 'Primera',
    last = 'Última',
    pageSize: pageSizeLabel = 'Elementos por página',
    showing = 'Mostrando',
    of = 'de',
    items = 'elementos',
    jumpTo = 'Ir a página',
    page = 'página',
  } = labels

  // Calcular páginas visibles
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = []
    const halfVisible = Math.floor(maxVisiblePages / 2)
    
    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)
    
    // Ajustar si no hay suficientes páginas en un lado
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
    }
    
    // Agregar primera página y ellipsis si es necesario
    if (startPage > 1) {
      pages.push(1)
      if (startPage > 2) {
        pages.push('ellipsis')
      }
    }
    
    // Agregar páginas visibles
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Agregar ellipsis y última página si es necesario
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('ellipsis')
      }
      pages.push(totalPages)
    }
    
    return pages
  }

  const visiblePages = getVisiblePages()
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && !disabled) {
      onPageChange(page)
    }
  }

  const [jumpValue, setJumpValue] = React.useState('')

  const handleQuickJump = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const page = parseInt(jumpValue)
      if (page >= 1 && page <= totalPages) {
        handlePageChange(page)
        setJumpValue('')
      }
    }
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Información y controles superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-muted-foreground">
        {/* Información de elementos */}
        {showInfo && totalItems && (
          <div className="flex items-center gap-2">
            <span>
              {showing} {startItem} - {endItem} {of} {totalItems} {items}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Selector de tamaño de página */}
          {showPageSize && onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">{pageSizeLabel}:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
                disabled={disabled}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Navegación rápida */}
          {showQuickJumper && (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">{jumpTo}:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={handleQuickJump}
                className="w-16 px-2 py-1 text-sm border rounded"
                placeholder={page}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>

      {/* Paginación principal */}
      <Pagination ref={ref} variant={variant} size={size}>
        <PaginationContent size={size}>
          {/* Botón primera página */}
          {showFirstLast && (
            <PaginationItem>
              <PaginationFirst
                variant={variant}
                size={size}
                disabled={disabled || currentPage === 1}
                onClick={() => handlePageChange(1)}
              />
            </PaginationItem>
          )}

          {/* Botón anterior */}
          <PaginationItem>
            <PaginationPrevious
              variant={variant}
              size={size}
              disabled={disabled || currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              text={previous}
              showText={size !== 'sm'}
            />
          </PaginationItem>

          {/* Páginas numeradas */}
          {visiblePages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  variant={variant}
                  size={size}
                  isActive={page === currentPage}
                  disabled={disabled}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          {/* Botón siguiente */}
          <PaginationItem>
            <PaginationNext
              variant={variant}
              size={size}
              disabled={disabled || currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              text={next}
              showText={size !== 'sm'}
            />
          </PaginationItem>

          {/* Botón última página */}
          {showFirstLast && (
            <PaginationItem>
              <PaginationLast
                variant={variant}
                size={size}
                disabled={disabled || currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  )
})
CompletePagination.displayName = 'CompletePagination'

// Paginación simple (solo anterior/siguiente)
interface SimplePaginationProps {
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  currentPage?: number
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  labels?: {
    previous?: string
    next?: string
    page?: string
  }
}

const SimplePagination = React.forwardRef<HTMLElement, SimplePaginationProps>(({
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  currentPage,
  disabled = false,
  size = 'default',
  variant = 'default',
  className,
  labels = {},
}, ref) => {
  const { previous = 'Anterior', next = 'Siguiente', page = 'Página' } = labels

  return (
    <Pagination ref={ref} variant={variant} size={size} className={className}>
      <PaginationContent size={size}>
        <PaginationItem>
          <PaginationPrevious
            variant={variant}
            size={size}
            disabled={disabled || !hasPrevious}
            onClick={onPrevious}
            text={previous}
          />
        </PaginationItem>

        {currentPage && (
          <PaginationItem>
            <span className="flex h-9 w-auto px-3 items-center justify-center text-sm">
              {page} {currentPage}
            </span>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            variant={variant}
            size={size}
            disabled={disabled || !hasNext}
            onClick={onNext}
            text={next}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
})
SimplePagination.displayName = 'SimplePagination'

// Hook para manejar paginación
interface UsePaginationProps {
  totalItems: number
  itemsPerPage: number
  initialPage?: number
}

interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
  hasNext: boolean
  hasPrevious: boolean
  startIndex: number
  endIndex: number
}

export const usePagination = ({
  totalItems,
  itemsPerPage,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  const hasNext = currentPage < totalPages
  const hasPrevious = currentPage > 1
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1)
  
  const nextPage = React.useCallback(() => {
    if (hasNext) setCurrentPage(prev => prev + 1)
  }, [hasNext])
  
  const previousPage = React.useCallback(() => {
    if (hasPrevious) setCurrentPage(prev => prev - 1)
  }, [hasPrevious])
  
  const firstPage = React.useCallback(() => {
    setCurrentPage(1)
  }, [])
  
  const lastPage = React.useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages])
  
  // Asegurar que currentPage esté en rango válido
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])
  
  return {
    currentPage,
    totalPages,
    setCurrentPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    hasNext,
    hasPrevious,
    startIndex,
    endIndex,
  }
}

// Exports
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationFirst,
  PaginationLast,
  PaginationEllipsis,
  CompletePagination,
  SimplePagination,
  usePagination,
}

export type {
  PaginationProps,
  PaginationLinkProps,
  CompletePaginationProps,
  SimplePaginationProps,
  UsePaginationProps,
  UsePaginationReturn,
}