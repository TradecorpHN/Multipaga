// /home/kali/multipaga/src/presentation/contexts/ThemeContext.tsx
// ──────────────────────────────────────────────────────────────────────────────
// ThemeContext - Context para gestión de temas y modo oscuro/claro
// ──────────────────────────────────────────────────────────────────────────────

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

// Tipos de tema
type Theme = 'light' | 'dark' | 'system'

// Configuración de colores por tema
interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  muted: string
  mutedForeground: string
  border: string
  input: string
  ring: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  info: string
  infoForeground: string
}

// Configuración de fuentes
interface ThemeTypography {
  fontFamily: string
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  fontWeight: {
    normal: string
    medium: string
    semibold: string
    bold: string
  }
  lineHeight: {
    none: string
    tight: string
    snug: string
    normal: string
    relaxed: string
  }
}

// Configuración de espaciado
interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  '4xl': string
}

// Configuración de bordes
interface ThemeBorders {
  radius: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  width: {
    0: string
    1: string
    2: string
    4: string
    8: string
  }
}

// Configuración de sombras
interface ThemeShadows {
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  inner: string
  none: string
}

// Configuración de animaciones
interface ThemeAnimations {
  transition: {
    none: string
    all: string
    default: string
    colors: string
    opacity: string
    shadow: string
    transform: string
  }
  duration: {
    75: string
    100: string
    150: string
    200: string
    300: string
    500: string
    700: string
    1000: string
  }
  ease: {
    linear: string
    in: string
    out: string
    'in-out': string
  }
}

// Configuración completa del tema
interface ThemeConfig {
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  borders: ThemeBorders
  shadows: ThemeShadows
  animations: ThemeAnimations
  breakpoints: {
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
}

// Estado del contexto
interface ThemeState {
  theme: Theme
  actualTheme: 'light' | 'dark' // El tema actualmente aplicado
  config: ThemeConfig
  customColors: Partial<ThemeColors>
  preferences: {
    animations: boolean
    reducedMotion: boolean
    highContrast: boolean
    colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
    fontSize: 'sm' | 'base' | 'lg' | 'xl'
    compactMode: boolean
  }
  isLoading: boolean
}

// Contexto
interface ThemeContextType {
  state: ThemeState
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  updateCustomColors: (colors: Partial<ThemeColors>) => void
  updatePreferences: (preferences: Partial<ThemeState['preferences']>) => void
  resetTheme: () => void
  applyTheme: (themeConfig: Partial<ThemeConfig>) => void
  getThemeVariable: (variable: string) => string
  isDarkMode: boolean
}

// Configuraciones predeterminadas
const defaultLightColors: ThemeColors = {
  primary: '220 70% 50%',
  secondary: '220 14% 96%',
  accent: '220 14% 96%',
  background: '0 0% 100%',
  foreground: '220 13% 9%',
  card: '0 0% 100%',
  cardForeground: '220 13% 9%',
  popover: '0 0% 100%',
  popoverForeground: '220 13% 9%',
  muted: '220 14% 96%',
  mutedForeground: '220 13% 45%',
  border: '220 13% 91%',
  input: '220 13% 91%',
  ring: '220 70% 50%',
  destructive: '0 100% 50%',
  destructiveForeground: '210 40% 98%',
  success: '142 76% 36%',
  successForeground: '355 0% 100%',
  warning: '38 92% 50%',
  warningForeground: '48 96% 89%',
  info: '221 83% 53%',
  infoForeground: '210 40% 98%',
}

const defaultDarkColors: ThemeColors = {
  primary: '220 70% 50%',
  secondary: '215 28% 17%',
  accent: '215 28% 17%',
  background: '220 13% 9%',
  foreground: '220 14% 96%',
  card: '220 13% 9%',
  cardForeground: '220 14% 96%',
  popover: '220 13% 9%',
  popoverForeground: '220 14% 96%',
  muted: '215 28% 17%',
  mutedForeground: '220 13% 45%',
  border: '215 28% 17%',
  input: '215 28% 17%',
  ring: '220 70% 50%',
  destructive: '0 62% 30%',
  destructiveForeground: '210 40% 98%',
  success: '142 76% 36%',
  successForeground: '355 0% 100%',
  warning: '38 92% 50%',
  warningForeground: '48 96% 89%',
  info: '221 83% 53%',
  infoForeground: '210 40% 98%',
}

const defaultConfig: ThemeConfig = {
  colors: defaultLightColors,
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  borders: {
    radius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
    width: {
      0: '0',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },
  animations: {
    transition: {
      none: 'none',
      all: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      default: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      colors: 'color, background-color, border-color, text-decoration-color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      shadow: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    ease: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
}

// Estado inicial
const initialState: ThemeState = {
  theme: 'system',
  actualTheme: 'light',
  config: defaultConfig,
  customColors: {},
  preferences: {
    animations: true,
    reducedMotion: false,
    highContrast: false,
    colorBlindMode: 'none',
    fontSize: 'base',
    compactMode: false,
  },
  isLoading: false,
}

// Contexto
const ThemeContext = createContext<ThemeContextType | null>(null)

// Utilidades
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyThemeToDocument = (theme: 'light' | 'dark', config: ThemeConfig) => {
  const root = document.documentElement
  const colors = theme === 'dark' ? defaultDarkColors : defaultLightColors
  
  // Aplicar variables CSS
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
  
  // Aplicar clase del tema
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  
  // Aplicar configuración de meta tags
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff')
  }
}

// Provider
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system', 
  storageKey = 'multipaga-theme' 
}: ThemeProviderProps) {
  const [state, setState] = useState<ThemeState>(() => ({
    ...initialState,
    theme: defaultTheme,
  }))

  // Determinar tema actual
  const resolveTheme = useCallback((theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }, [])

  // Aplicar tema
  const applyTheme = useCallback((themeConfig: Partial<ThemeConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...themeConfig },
    }))
  }, [])

  // Cambiar tema
  const setTheme = useCallback((theme: Theme) => {
    setState(prev => ({
      ...prev,
      theme,
      actualTheme: resolveTheme(theme),
    }))
    
    // Guardar en localStorage
    localStorage.setItem(storageKey, theme)
    
    // Aplicar tema al documento
    applyThemeToDocument(resolveTheme(theme), state.config)
  }, [resolveTheme, storageKey, state.config])

  // Alternar tema
  const toggleTheme = useCallback(() => {
    const newTheme = state.actualTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [state.actualTheme, setTheme])

  // Actualizar colores personalizados
  const updateCustomColors = useCallback((colors: Partial<ThemeColors>) => {
    setState(prev => ({
      ...prev,
      customColors: { ...prev.customColors, ...colors },
    }))
    
    // Aplicar colores al documento
    const root = document.documentElement
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }, [])

  // Actualizar preferencias
  const updatePreferences = useCallback((preferences: Partial<ThemeState['preferences']>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...preferences },
    }))
    
    // Guardar en localStorage
    localStorage.setItem(`${storageKey}-preferences`, JSON.stringify({
      ...state.preferences,
      ...preferences,
    }))
    
    // Aplicar preferencias al documento
    const root = document.documentElement
    
    if (preferences.animations !== undefined) {
      root.style.setProperty('--animations', preferences.animations ? 'all' : 'none')
    }
    
    if (preferences.reducedMotion !== undefined) {
      root.style.setProperty('--motion', preferences.reducedMotion ? 'reduce' : 'no-preference')
    }
    
    if (preferences.fontSize !== undefined) {
      root.style.setProperty('--base-font-size', 
        preferences.fontSize === 'sm' ? '0.875rem' :
        preferences.fontSize === 'lg' ? '1.125rem' :
        preferences.fontSize === 'xl' ? '1.25rem' : '1rem'
      )
    }
    
    if (preferences.compactMode !== undefined) {
      root.classList.toggle('compact', preferences.compactMode)
    }
  }, [state.preferences, storageKey])

  // Resetear tema
  const resetTheme = useCallback(() => {
    setState(initialState)
    localStorage.removeItem(storageKey)
    localStorage.removeItem(`${storageKey}-preferences`)
    applyThemeToDocument('light', defaultConfig)
  }, [storageKey])

  // Obtener variable de tema
  const getThemeVariable = useCallback((variable: string) => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variable}`)
  }, [])

  // Cargar tema desde localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme
      const savedPreferences = localStorage.getItem(`${storageKey}-preferences`)
      
      if (savedTheme) {
        setState(prev => ({
          ...prev,
          theme: savedTheme,
          actualTheme: resolveTheme(savedTheme),
        }))
      }
      
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences)
        setState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, ...preferences },
        }))
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }, [storageKey, resolveTheme])

  // Aplicar tema inicial
  useEffect(() => {
    applyThemeToDocument(state.actualTheme, state.config)
  }, [state.actualTheme, state.config])

  // Escuchar cambios en tema del sistema
  useEffect(() => {
    if (state.theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setState(prev => ({
        ...prev,
        actualTheme: newTheme,
      }))
      applyThemeToDocument(newTheme, state.config)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [state.theme, state.config])

  // Escuchar cambios en preferencias del sistema
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      updatePreferences({ reducedMotion: e.matches })
    }

    reducedMotionQuery.addEventListener('change', handleMotionChange)
    return () => reducedMotionQuery.removeEventListener('change', handleMotionChange)
  }, [updatePreferences])

  const contextValue: ThemeContextType = {
    state,
    setTheme,
    toggleTheme,
    updateCustomColors,
    updatePreferences,
    resetTheme,
    applyTheme,
    getThemeVariable,
    isDarkMode: state.actualTheme === 'dark',
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hooks adicionales
export const useThemeColors = () => {
  const { state } = useTheme()
  return { ...state.config.colors, ...state.customColors }
}

export const useThemePreferences = () => {
  const { state, updatePreferences } = useTheme()
  return { preferences: state.preferences, updatePreferences }
}

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}