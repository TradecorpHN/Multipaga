'use client'

import * as React from 'react'
import { DayPicker, type DayPickerProps, type DateRange } from 'react-day-picker'
import { format, isValid, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from 'lucide-react'
import { cn } from '@/presentation/lib/utils'
import { Button } from './Button'

/* ---------- Localización español para DayPicker ---------- */
const esLocale: Locale = es

/* ---------- Variantes de estilos para el calendario ---------- */
const calendarVariants = cva(
  'p-3 bg-background border rounded-md shadow-sm',
  {
    variants: {
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
      variant: {
        default: 'border-border',
        outline: 'border-2 border-border',
        ghost: 'border-0 shadow-none',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

/* ---------- Estilos CSS inyectados globalmente (solo una vez) ---------- */
const calendarStyles = `

  /* ... puedes poner los estilos avanzados del calendario aquí,
       igual que en tu versión anterior ...
     Copia y pega los estilos .rdp de tu versión si ya lo tienes bien
  */

  .rdp { --rdp-cell-size: 40px; }
  /* ... resto de estilos igual que antes ... */

`

/* ---------- Tipos para los diferentes modos ---------- */
export type CalendarMode = 'single' | 'multiple' | 'range'
interface SingleCalendarProps { mode: 'single'; selected?: Date; onSelect?: (date?: Date) => void; defaultSelected?: Date }
interface MultipleCalendarProps { mode: 'multiple'; selected?: Date[]; onSelect?: (dates?: Date[]) => void; defaultSelected?: Date[]; max?: number }
interface RangeCalendarProps { mode: 'range'; selected?: DateRange; onSelect?: (range?: DateRange) => void; defaultSelected?: DateRange; numberOfMonths?: number }
interface BaseCalendarProps extends VariantProps<typeof calendarVariants> {
  className?: string
  disabled?: boolean | Date | Date[] | ((date: Date) => boolean)
  fromDate?: Date
  toDate?: Date
  fromMonth?: Date
  toMonth?: Date
  fromYear?: number
  toYear?: number
  showOutsideDays?: boolean
  showWeekNumber?: boolean
  fixedWeeks?: boolean
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  locale?: Locale
  footer?: React.ReactNode
  // Custom
  compact?: boolean
  showToday?: boolean
  allowClear?: boolean
  placeholder?: string
  error?: boolean
  helperText?: string
  onDayClick?: (date: Date, modifiers: any) => void
  onMonthChange?: (month: Date) => void
  onYearChange?: (year: number) => void
}

export type CalendarProps = BaseCalendarProps & (SingleCalendarProps | MultipleCalendarProps | RangeCalendarProps)

/* ---------- Componente principal ---------- */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  (
    {
      className, variant, size, compact, showToday = true, allowClear, error, helperText,
      ...props
    },
    ref
  ) => {
    // Inyectar los estilos globales solo una vez
    React.useEffect(() => {
      if (!document.getElementById('calendar-styles')) {
        const style = document.createElement('style')
        style.id = 'calendar-styles'
        style.textContent = calendarStyles
        document.head.appendChild(style)
      }
    }, [])

    // Componentes custom para DayPicker (iconos de navegación, etc)
    const components = {
      IconLeft: (props: { className?: string }) => <ChevronLeft className={cn('h-4 w-4', props.className)} />,
      IconRight: (props: { className?: string }) => <ChevronRight className={cn('h-4 w-4', props.className)} />,
      ...((props as any).components || {}),
    }

    // Props aseguradas para DayPicker
    const dayPickerProps: DayPickerProps = {
      locale: props.locale || esLocale,
      showOutsideDays: true,
      weekStartsOn: 1,
      fixedWeeks: true,
      ...props,
      components,
      className: cn(
        'rdp',
        compact && 'rdp-compact',
        error && 'border-destructive',
        className
      ),
    }

    // Clear
    const handleClear = React.useCallback(() => {
      if (props.mode === 'single' && props.onSelect) props.onSelect(undefined)
      else if (props.mode === 'multiple' && props.onSelect) props.onSelect([])
      else if (props.mode === 'range' && props.onSelect) props.onSelect(undefined)
    }, [props])

    // Hay selección
    const hasSelection = React.useMemo(() => {
      if (props.mode === 'single') return !!props.selected
      if (props.mode === 'multiple') return Array.isArray(props.selected) && props.selected.length > 0
      if (props.mode === 'range') return !!(props.selected && (props.selected as DateRange).from)
      return false
    }, [props.selected, props.mode])

return (
  <div ref={ref} className={cn(calendarVariants({ variant, size }), className)}>
    {/* Clear */}
    {allowClear && hasSelection && (
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
        <span className="text-sm text-muted-foreground">
          {props.mode === 'range' &&
            (props.selected as DateRange)?.from &&
            (props.selected as DateRange)?.to
            ? `${format(
                (props.selected as DateRange).from as Date,
                'dd/MM/yyyy',
                { locale: esLocale }
              )} - ${format(
                (props.selected as DateRange).to as Date,
                'dd/MM/yyyy',
                { locale: esLocale }
              )}`
            : props.mode === 'single' && props.selected
            ? format(props.selected as Date, 'dd/MM/yyyy', { locale: esLocale })
            : props.mode === 'multiple' &&
              Array.isArray(props.selected)
            ? `${(props.selected as Date[]).length} fecha(s) seleccionada(s)`
            : ''}
        </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0"
              tabIndex={-1}
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Limpiar selección</span>
            </Button>
          </div>
        )}

        <DayPicker {...dayPickerProps} />

        {(helperText || error) && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
              {helperText}
            </p>
          </div>
        )}

        {showToday && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Hoy: {format(new Date(), 'dd/MM/yyyy', { locale: esLocale })}</span>
            </div>
          </div>
        )}
      </div>
    )
  }
)
Calendar.displayName = 'Calendar'

/* ---------- Presets de rangos rápidos ---------- */
export function useDateRangePresets() {
  const today = new Date()
  return React.useMemo(() => [
    {
      label: 'Hoy',
      value: 'today',
      range: { from: today, to: today }
    },
    {
      label: 'Últimos 7 días',
      value: 'last7days',
      range: { from: subMonths(today, 0).setDate(today.getDate() - 6) as any, to: today }
    },
    {
      label: 'Últimos 30 días',
      value: 'last30days',
      range: { from: subMonths(today, 0).setDate(today.getDate() - 29) as any, to: today }
    },
    {
      label: 'Este mes',
      value: 'thisMonth',
      range: { from: startOfMonth(today), to: endOfMonth(today) }
    },
    {
      label: 'Mes pasado',
      value: 'lastMonth',
      range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) }
    },
    {
      label: 'Últimos 3 meses',
      value: 'last3months',
      range: { from: startOfMonth(subMonths(today, 2)), to: endOfMonth(today) }
    },
    {
      label: 'Este año',
      value: 'thisYear',
      range: { from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31) }
    }
  ], [today])
}

/* ---------- Picker avanzado de rango con presets ---------- */
interface DateRangePickerProps extends Omit<RangeCalendarProps, 'mode'> {
  className?: string
  showPresets?: boolean
  presets?: Array<{ label: string; value: string; range: DateRange }>
}

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({ className, showPresets = true, presets, ...props }, ref) => {
    const defaultPresets = useDateRangePresets()
    const datePresets = presets || defaultPresets
    const handlePresetSelect = React.useCallback((preset: { range: DateRange }) => {
      props.onSelect?.(preset.range)
    }, [props])

    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {showPresets && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Rangos rápidos</h4>
            <div className="grid grid-cols-2 gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="justify-start text-xs"
                  type="button"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Calendar
          mode="range"
          numberOfMonths={2}
          {...props}
        />
      </div>
    )
  }
)
DateRangePicker.displayName = 'DateRangePicker'

// Exporta tipos útiles si los necesitas fuera
export type { DateRange }
export { format, isValid, startOfMonth, endOfMonth, addMonths, subMonths }
