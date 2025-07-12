import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { hyperswitchClient } from '@/infrastructure/api/clients/HyperswitchClient'
import { z } from 'zod'
import toast from 'react-hot-toast'

// Auth State Schema
const AuthStateSchema = z.object({
  merchantId: z.string(),
  profileId: z.string(),
  profileName: z.string().optional(),
  isAuthenticated: z.boolean(),
  expiresAt: z.string(),
})

type AuthState = z.infer<typeof AuthStateSchema>

// Login Credentials Schema
const LoginCredentialsSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  profileId: z.string().min(1, 'Profile ID is required'),
})

type LoginCredentials = z.infer<typeof LoginCredentialsSchema>

// Auth Context Interface
interface AuthContextValue {
  authState: AuthState | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

// Cookie Keys
const AUTH_COOKIE_KEY = 'hyperswitch_auth'
const AUTH_EXPIRY_HOURS = 24

// Create Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load auth state from cookies on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const cookieData = Cookies.get(AUTH_COOKIE_KEY)
        if (cookieData) {
          const parsedData = JSON.parse(cookieData)
          const validatedData = AuthStateSchema.parse(parsedData)
          
          // Check if session is expired
          if (new Date(validatedData.expiresAt) > new Date()) {
            setAuthState(validatedData)
            hyperswitchClient.setAuthContext(validatedData.merchantId, validatedData.profileId)
          } else {
            // Session expired, clear cookies
            Cookies.remove(AUTH_COOKIE_KEY)
          }
        }
      } catch (error) {
        console.error('Failed to load auth state:', error)
        Cookies.remove(AUTH_COOKIE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuthState()
  }, [])

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    
    try {
      // Validate credentials
      const validatedCredentials = LoginCredentialsSchema.parse(credentials)
      
      // Verify profile exists by attempting to fetch it
      const profileResponse = await hyperswitchClient.get(
        `/account/${validatedCredentials.merchantId}/profile/${validatedCredentials.profileId}`
      )
      
      // Calculate expiry time
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + AUTH_EXPIRY_HOURS)
      
      // Create auth state
      const newAuthState: AuthState = {
        merchantId: validatedCredentials.merchantId,
        profileId: validatedCredentials.profileId,
        profileName: (profileResponse as any).profile_name,
        isAuthenticated: true,
        expiresAt: expiresAt.toISOString(),
      }
      
      // Set auth context in HTTP client
      hyperswitchClient.setAuthContext(validatedCredentials.merchantId, validatedCredentials.profileId)
      
      // Save to cookies
      Cookies.set(AUTH_COOKIE_KEY, JSON.stringify(newAuthState), {
        expires: expiresAt,
        secure: true,
        sameSite: 'strict',
      })
      
      // Update state
      setAuthState(newAuthState)
      
      // Show success message
      toast.success('Login successful!')
      
      // Redirect to dashboard
      router.push('/')
      
    } catch (error) {
      let errorMessage = 'Login failed. Please check your credentials.'
      
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'Invalid Merchant ID or Profile ID'
        } else if (error.message.includes('401')) {
          errorMessage = 'Unauthorized. Please check your API key configuration.'
        }
      }
      
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Clear auth context in HTTP client
      hyperswitchClient.clearAuthContext()
      
      // Clear cookies
      Cookies.remove(AUTH_COOKIE_KEY)
      
      // Clear state
      setAuthState(null)
      
      // Show success message
      toast.success('Logged out successfully')
      
      // Redirect to login
      router.push('/login')
      
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout properly')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Refresh auth function (extends session)
  const refreshAuth = useCallback(async () => {
    if (!authState) return
    
    try {
      // Calculate new expiry time
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + AUTH_EXPIRY_HOURS)
      
      // Update auth state with new expiry
      const updatedAuthState: AuthState = {
        ...authState,
        expiresAt: expiresAt.toISOString(),
      }
      
      // Update cookies
      Cookies.set(AUTH_COOKIE_KEY, JSON.stringify(updatedAuthState), {
        expires: expiresAt,
        secure: true,
        sameSite: 'strict',
      })
      
      // Update state
      setAuthState(updatedAuthState)
      
    } catch (error) {
      console.error('Failed to refresh auth:', error)
      throw error
    }
  }, [authState])

  // Auto-refresh session before expiry
  useEffect(() => {
    if (!authState) return
    
    const checkAndRefresh = () => {
      const expiryTime = new Date(authState.expiresAt).getTime()
      const currentTime = new Date().getTime()
      const timeUntilExpiry = expiryTime - currentTime
      
      // Refresh if less than 1 hour until expiry
      if (timeUntilExpiry < 60 * 60 * 1000 && timeUntilExpiry > 0) {
        refreshAuth()
      }
    }
    
    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000)
    
    // Check immediately
    checkAndRefresh()
    
    return () => clearInterval(interval)
  }, [authState, refreshAuth])

  const contextValue: AuthContextValue = {
    authState,
    isLoading,
    login,
    logout,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Helper hook for protected routes
export function useRequireAuth() {
  const { authState, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && !authState?.isAuthenticated) {
      router.push('/login')
    }
  }, [authState, isLoading, router])
  
  return { isAuthenticated: authState?.isAuthenticated ?? false, isLoading }
}