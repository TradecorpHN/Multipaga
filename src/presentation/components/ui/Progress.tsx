// /home/kali/multipaga/src/presentation/components/ui/Progress.tsx
'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  CheckCircle, 
  Circle,
} from 'lucide-react'
import { cn } from '@/presentation/lib/utils'

// Variantes del componente
const progressVariants = cva(
  'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      variant: {
        default: 'bg-secondary',
        success: 'bg-green-100 dark:bg-green-900/20',
        warning: 'bg-yellow-100 dark:bg-yellow-900/20',
        destructive: 'bg-red-100 dark:bg-red-900/20',
        info: 'bg-blue-100 dark:bg-blue-900/20',
      },
      size: {
        sm: 'h-2',
        default: 'h-4',
        lg: 'h-6',
        xl: 'h-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        destructive: 'bg-red-500',
        info: 'bg-blue-500',
      },
      pattern: {
        solid: '',
        striped: 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-pulse',
        animated: 'bg-gradient-to-r from-current via-white/30 to-current bg-[length:40px_100%] animate-[shimmer_2s_ease-in-out_infinite]',
      },
    },
    defaultVariants: {
      variant: 'default',
      pattern: 'solid',
    },
  }
)

// Props del componente principal
interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  value?: number
  max?: number
  showValue?: boolean
  showPercentage?: boolean
  label?: string
  description?: string
  formatValue?: (value: number) => string
  indeterminate?: boolean
  animated?: boolean
  color?: string
  className?: string
  indicatorClassName?: string
}

// Componente principal
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  value = 0, 
  max = 100,
  variant,
  size,
  pattern,
  showValue = false,
  showPercentage = false,
  label,
  description,
  formatValue,
  indeterminate = false,
  animated = false,
  color,
  indicatorClassName,
  ...props 
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const displayValue = React.useMemo(() => {
    if (formatValue) return formatValue(value)
    if (showPercentage) return `${Math.round(percentage)}%`
    if (showValue) return `${value}/${max}`
    return null
  }, [value, max, percentage, formatValue, showPercentage, showValue])

  return (
    <div className="space-y-2">
      {(label || displayValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </span>
          )}
          {displayValue && (
            <span className="text-sm font-medium text-muted-foreground">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size }), className)}
        {...props}
        value={indeterminate ? undefined : value}
        max={max}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            progressIndicatorVariants({ 
              variant, 
              pattern: animated || indeterminate ? 'animated' : pattern 
            }),
            indeterminate && 'animate-pulse',
            indicatorClassName
          )}
          style={{
            transform: indeterminate 
              ? 'translateX(-100%)' 
              : `translateX(-${100 - percentage}%)`,
            backgroundColor: color,
          }}
        />
      </ProgressPrimitive.Root>
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Componente de progreso circular
interface CircularProgressProps {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
  showValue?: boolean
  showPercentage?: boolean
  label?: string
  formatValue?: (value: number) => string
  indeterminate?: boolean
  className?: string
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showValue = true,
  showPercentage = false,
  label,
  formatValue,
  indeterminate = false,
  className,
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const colorMap = {
    default: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    destructive: 'stroke-red-500',
    info: 'stroke-blue-500',
  }
  
  const displayValue = React.useMemo(() => {
    if (formatValue) return formatValue(value)
    if (showPercentage) return `${Math.round(percentage)}%`
    if (showValue) return value.toString()
    return null
  }, [value, percentage, formatValue, showPercentage, showValue])

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted stroke-current opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? 0 : strokeDashoffset}
          className={cn(
            'transition-all duration-300 ease-in-out',
            colorMap[variant],
            indeterminate && 'animate-spin'
          )}
          style={{
            strokeDasharray: indeterminate 
              ? `${circumference * 0.25} ${circumference * 0.75}`
              : circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {displayValue && (
          <span className="text-2xl font-bold">
            {displayValue}
          </span>
        )}
        {label && (
          <span className="text-sm text-muted-foreground text-center">
            {label}
          </span>
        )}
      </div>
    </div>
  )
})
CircularProgress.displayName = 'CircularProgress'

// Componente de progreso por pasos
interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'current' | 'completed' | 'error'
  optional?: boolean
}

interface StepProgressProps {
  steps: Step[]
  currentStep?: string
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'compact'
  onStepClick?: (stepId: string) => void
  className?: string
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(({
  steps,
  currentStep,
  orientation = 'horizontal',
  variant = 'default',
  onStepClick,
  className,
}, ref) => {
  const currentIndex = currentStep ? steps.findIndex(step => step.id === currentStep) : -1
  
  const getStepIcon = (step: Step, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <Circle className="w-5 h-5 text-red-500 fill-current" />
      case 'current':
        return (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
          </div>
        )
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
          </div>
        )
    }
  }
  
  const isHorizontal = orientation === 'horizontal'
  const isCompact = variant === 'compact'

  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        isHorizontal ? 'flex-row items-center' : 'flex-col',
        className
      )}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div
            className={cn(
              'flex items-center',
              isHorizontal ? 'flex-col text-center' : 'flex-row',
              onStepClick && 'cursor-pointer',
              !isCompact && 'p-4'
            )}
            onClick={() => onStepClick?.(step.id)}
          >
            <div className={cn(
              'flex-shrink-0',
              !isHorizontal && 'mr-4'
            )}>
              {getStepIcon(step, index)}
            </div>
            {!isCompact && (
              <div className={cn(
                'min-w-0',
                isHorizontal ? 'mt-2' : 'flex-1'
              )}>
                <h3 className={cn(
                  'text-sm font-medium',
                  step.status === 'completed' && 'text-green-600',
                  step.status === 'current' && 'text-primary',
                  step.status === 'error' && 'text-red-600',
                  step.status === 'pending' && 'text-muted-foreground'
                )}>
                  {step.title}
                  {step.optional && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (opcional)
                    </span>
                  )}
                </h3>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-shrink-0',
              isHorizontal 
                ? 'h-px bg-border flex-1 mx-4' 
                : 'w-px bg-border h-8 ml-2.5'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
})
StepProgress.displayName = 'StepProgress'

// Componente de progreso con múltiples barras
interface MultiProgressProps {
  data: Array<{
    label: string
    value: number
    color?: string
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
  }>
  max?: number
  height?: number
  showValues?: boolean
  showPercentages?: boolean
  stacked?: boolean
  className?: string
}

const MultiProgress = React.forwardRef<HTMLDivElement, MultiProgressProps>(({
  data,
  max = 100,
  height = 24,
  showValues = false,
  showPercentages = true,
  stacked = false,
  className,
}, ref) => {
  const total = stacked ? data.reduce((sum, item) => sum + item.value, 0) : max
  
  return (
    <div ref={ref} className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-4 text-sm">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.label}</span>
            {(showValues || showPercentages) && (
              <span className="text-muted-foreground">
                {showValues && `${item.value}`}
                {showValues && showPercentages && '/'}
                {showPercentages && `${((item.value / total) * 100).toFixed(1)}%`}
              </span>
            )}
          </div>
        ))}
      </div>
      {stacked ? (
        <div 
          className="w-full bg-secondary rounded-full overflow-hidden"
          style={{ height }}
        >
          <div className="h-full flex">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              return (
                <div
                  key={index}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, index) => (
            <Progress
              key={index}
              value={item.value}
              max={max}
              variant={item.variant}
              size={height <= 16 ? 'sm' : height <= 24 ? 'default' : 'lg'}
              color={item.color}
              className="w-full"
            />
          ))}
        </div>
      )}
    </div>
  )
})
MultiProgress.displayName = 'MultiProgress'

// Hook para manejar progreso
interface UseProgressOptions {
  initial?: number
  max?: number
  step?: number
  autoStart?: boolean
  interval?: number
  onComplete?: () => void
  onStep?: (value: number) => void
}

interface UseProgressReturn {
  value: number
  percentage: number
  isRunning: boolean
  isComplete: boolean
  start: () => void
  pause: () => void
  reset: () => void
  setValue: (value: number) => void
  increment: (amount?: number) => void
  decrement: (amount?: number) => void
}

export const useProgress = ({
  initial = 0,
  max = 100,
  step = 1,
  autoStart = false,
  interval = 100,
  onComplete,
  onStep,
}: UseProgressOptions = {}): UseProgressReturn => {
  const [value, setValue] = React.useState(initial)
  const [isRunning, setIsRunning] = React.useState(autoStart)
  const intervalRef = React.useRef<NodeJS.Timeout>()
  
  const percentage = Math.min((value / max) * 100, 100)
  const isComplete = value >= max
  
  const start = React.useCallback(() => {
    setIsRunning(true)
  }, [])
  
  const pause = React.useCallback(() => {
    setIsRunning(false)
  }, [])
  
  const reset = React.useCallback(() => {
    setValue(initial)
    setIsRunning(false)
  }, [initial])
  
  const increment = React.useCallback((amount = step) => {
    setValue(prev => {
      const newValue = Math.min(prev + amount, max)
      onStep?.(newValue)
      if (newValue >= max) {
        onComplete?.()
      }
      return newValue
    })
  }, [step, max, onStep, onComplete])
  
  const decrement = React.useCallback((amount = step) => {
    setValue(prev => {
      const newValue = Math.max(prev - amount, 0)
      onStep?.(newValue)
      return newValue
    })
  }, [step, onStep])
  
  React.useEffect(() => {
    if (isRunning && !isComplete) {
      intervalRef.current = setInterval(() => {
        increment()
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isComplete, increment, interval])
  
  React.useEffect(() => {
    if (isComplete) {
      setIsRunning(false)
    }
  }, [isComplete])
  
  return {
    value,
    percentage,
    isRunning,
    isComplete,
    start,
    pause,
    reset,
    setValue,
    increment,
    decrement,
  }
}

// Hook para progreso por pasos
interface UseStepProgressOptions {
  steps: string[]
  initialStep?: string
  autoAdvance?: boolean
  onStepChange?: (stepId: string, index: number) => void
  onComplete?: () => void
}

interface UseStepProgressReturn {
  currentStep: string | null
  currentIndex: number
  isComplete: boolean
  canGoNext: boolean
  canGoPrevious: boolean
  goToStep: (stepId: string) => void
  nextStep: () => void
  previousStep: () => void
  reset: () => void
  complete: () => void
}

export const useStepProgress = ({
  steps,
  initialStep,
  autoAdvance = false,
  onStepChange,
  onComplete,
}: UseStepProgressOptions): UseStepProgressReturn => {
  const [currentStep, setCurrentStep] = React.useState<string | null>(
    initialStep || steps[0] || null
  )
  
  const currentIndex = currentStep ? steps.indexOf(currentStep) : -1
  const isComplete = currentIndex === steps.length - 1
  const canGoNext = currentIndex < steps.length - 1
  const canGoPrevious = currentIndex > 0
  
  const goToStep = React.useCallback((stepId: string) => {
    if (steps.includes(stepId)) {
      setCurrentStep(stepId)
      const index = steps.indexOf(stepId)
      onStepChange?.(stepId, index)
      
      if (index === steps.length - 1) {
        onComplete?.()
      }
    }
  }, [steps, onStepChange, onComplete])
  
  const nextStep = React.useCallback(() => {
    if (canGoNext) {
      const nextIndex = currentIndex + 1
      goToStep(steps[nextIndex])
    }
  }, [canGoNext, currentIndex, steps, goToStep])
  
  const previousStep = React.useCallback(() => {
    if (canGoPrevious) {
      const prevIndex = currentIndex - 1
      goToStep(steps[prevIndex])
    }
  }, [canGoPrevious, currentIndex, steps, goToStep])
  
  const reset = React.useCallback(() => {
    setCurrentStep(steps[0] || null)
  }, [steps])
  
  const complete = React.useCallback(() => {
    const lastStep = steps[steps.length - 1]
    if (lastStep) {
      goToStep(lastStep)
    }
  }, [steps, goToStep])
  
  return {
    currentStep,
    currentIndex,
    isComplete,
    canGoNext,
    canGoPrevious,
    goToStep,
    nextStep,
    previousStep,
    reset,
    complete,
  }
}

// Agregar estilos de animación personalizados
const progressStyles = `
  @keyframes shimmer {
    0% { background-position: -40px 0; }
    100% { background-position: 40px 0; }
  }
`

if (typeof window !== 'undefined' && !document.querySelector('#progress-styles')) {
  const style = document.createElement('style')
  style.id = 'progress-styles'
  style.textContent = progressStyles
  document.head.appendChild(style)
}

// Exports SOLO componentes y types, SIN los hooks (ya exportados)
export { 
  Progress, 
  CircularProgress, 
  StepProgress, 
  MultiProgress,
}

export type { 
  ProgressProps, 
  CircularProgressProps, 
  StepProgressProps, 
  MultiProgressProps,
  Step,
  UseProgressOptions,
  UseProgressReturn,
  UseStepProgressOptions,
  UseStepProgressReturn,
}
