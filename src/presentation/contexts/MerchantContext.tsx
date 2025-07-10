'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { getHyperswitchClient } from '@/lib/hyperswitch'
import type { MerchantAccount } from '@/lib/hyperswitch'

// Define el tipo de Connector para usarlo correctamente
export type Connector = {
  merchant_connector_id: string
  connector_name: string
  connector_type: string
  status: 'active' | 'inactive' | 'error'
  test_mode: boolean
  created_at: string
  updated_at: string
}

// Estado del contexto
interface MerchantState {
  currentMerchant: MerchantAccount | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  profile: {
    id: string
    name: string
    return_url?: string
    enable_payment_response_hash: boolean
    payment_response_hash_key?: string
    redirect_to_merchant_with_http_post: boolean
    webhook_details?: {
      webhook_url: string
      webhook_version: string
    }
    metadata?: Record<string, any>
    routing_algorithm?: string
    intent_fulfillment_time?: number
    frm_routing_algorithm?: string
    payout_routing_algorithm?: string
  } | null
  connectors: Connector[]
  permissions: {
    canViewPayments: boolean
    canCreateRefunds: boolean
    canViewAnalytics: boolean
    canManageConnectors: boolean
    canManageWebhooks: boolean
    canViewDisputes: boolean
    canManageProfile: boolean
    canViewReconciliation: boolean
  }
  preferences: {
    timezone: string
    currency: string
    dateFormat: string
    language: string
    theme: 'light' | 'dark' | 'system'
    dashboardLayout: 'grid' | 'list'
    showWelcomeMessage: boolean
    autoRefreshInterval: number
    notifications: {
      email: boolean
      webhook: boolean
      sms: boolean
      push: boolean
    }
  }
}

// Acciones del reducer
type MerchantAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MERCHANT'; payload: MerchantAccount }
  | { type: 'SET_PROFILE'; payload: MerchantState['profile'] }
  | { type: 'SET_CONNECTORS'; payload: Connector[] }
  | { type: 'SET_PERMISSIONS'; payload: Partial<MerchantState['permissions']> }
  | { type: 'SET_PREFERENCES'; payload: Partial<MerchantState['preferences']> }
  | { type: 'UPDATE_MERCHANT'; payload: Partial<MerchantAccount> }
  | { type: 'ADD_CONNECTOR'; payload: Connector }
  | { type: 'UPDATE_CONNECTOR'; payload: { id: string; data: Partial<Connector> } }
  | { type: 'REMOVE_CONNECTOR'; payload: string }
  | { type: 'RESET' }

const initialState: MerchantState = {
  currentMerchant: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  profile: null,
  connectors: [],
  permissions: {
    canViewPayments: true,
    canCreateRefunds: true,
    canViewAnalytics: true,
    canManageConnectors: true,
    canManageWebhooks: true,
    canViewDisputes: true,
    canManageProfile: true,
    canViewReconciliation: true,
  },
  preferences: {
    timezone: 'America/Tegucigalpa',
    currency: 'HNL',
    dateFormat: 'dd/MM/yyyy',
    language: 'es',
    theme: 'system',
    dashboardLayout: 'grid',
    showWelcomeMessage: true,
    autoRefreshInterval: 300000, // 5 minutos
    notifications: {
      email: true,
      webhook: true,
      sms: false,
      push: true,
    },
  },
}

// Reducer idéntico (no requiere cambios)

function merchantReducer(state: MerchantState, action: MerchantAction): MerchantState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_MERCHANT':
      return {
        ...state,
        currentMerchant: action.payload,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }
    case 'SET_PROFILE':
      return { ...state, profile: action.payload }
    case 'SET_CONNECTORS':
      return { ...state, connectors: action.payload }
    case 'SET_PERMISSIONS':
      return { ...state, permissions: { ...state.permissions, ...action.payload } }
    case 'SET_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } }
    case 'UPDATE_MERCHANT':
      return {
        ...state,
        currentMerchant: state.currentMerchant
          ? { ...state.currentMerchant, ...action.payload }
          : null,
        lastUpdated: new Date(),
      }
    case 'ADD_CONNECTOR':
      return { ...state, connectors: [...state.connectors, action.payload] }
    case 'UPDATE_CONNECTOR':
      return {
        ...state,
        connectors: state.connectors.map(connector =>
          connector.merchant_connector_id === action.payload.id
            ? { ...connector, ...action.payload.data }
            : connector
        ),
      }
    case 'REMOVE_CONNECTOR':
      return {
        ...state,
        connectors: state.connectors.filter(
          connector => connector.merchant_connector_id !== action.payload
        ),
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// Contexto
interface MerchantContextType {
  state: MerchantState
  loadMerchant: (merchantId: string) => Promise<void>
  updateMerchant: (data: Partial<MerchantAccount>) => Promise<void>
  refreshMerchant: () => Promise<void>
  loadProfile: (profileId: string) => Promise<void>
  updateProfile: (data: Partial<MerchantState['profile']>) => Promise<void>
  loadConnectors: () => Promise<void>
  addConnector: (connectorData: any) => Promise<void>
  updateConnector: (connectorId: string, data: any) => Promise<void>
  removeConnector: (connectorId: string) => Promise<void>
  updatePreferences: (preferences: Partial<MerchantState['preferences']>) => Promise<void>
  updatePermissions: (permissions: Partial<MerchantState['permissions']>) => void
  checkPermission: (permission: keyof MerchantState['permissions']) => boolean
  reset: () => void
  isInitialized: boolean
}

const MerchantContext = createContext<MerchantContextType | null>(null)

// Provider
interface MerchantProviderProps {
  children: React.ReactNode
  initialMerchantId?: string
}

export function MerchantProvider({ children, initialMerchantId }: MerchantProviderProps) {
  const [state, dispatch] = useReducer(merchantReducer, initialState)
  const hyperswitch = getHyperswitchClient()

  // Load merchant data
  const loadMerchant = useCallback(async (merchantId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const merchantData = await hyperswitch.getMerchantAccount() as MerchantAccount
      dispatch({ type: 'SET_MERCHANT', payload: merchantData })
      await Promise.all([
        loadConnectors(),
        loadProfile((merchantData as any).profile_id || 'default'), // Cast defensivo
      ])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading merchant'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      toast.error(errorMessage)
    }
  }, [])

  // Update merchant
  const updateMerchant = useCallback(async (data: Partial<MerchantAccount>) => {
    if (!state.currentMerchant) return
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      // Implementa tu método real aquí si tienes endpoint de updateMerchant
      const updatedMerchant = { ...state.currentMerchant, ...data }
      dispatch({ type: 'UPDATE_MERCHANT', payload: updatedMerchant })
      toast.success('Merchant updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating merchant'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      toast.error(errorMessage)
    }
  }, [state.currentMerchant])

  // Refresh merchant data
  const refreshMerchant = useCallback(async () => {
    if (!state.currentMerchant) return
    await loadMerchant(state.currentMerchant.merchant_id)
  }, [state.currentMerchant, loadMerchant])

  // Load profile (simulación, adáptalo a tu API real)
  const loadProfile = useCallback(async (profileId: string) => {
    try {
      const profile = {
        id: profileId,
        name: 'Default Profile',
        return_url: 'https://multipaga.com/return',
        enable_payment_response_hash: false,
        redirect_to_merchant_with_http_post: false,
        metadata: {},
        routing_algorithm: 'round_robin',
        intent_fulfillment_time: 900,
      }
      dispatch({ type: 'SET_PROFILE', payload: profile })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [])

  // Update profile (simulación, adáptalo a tu API real)
  const updateProfile = useCallback(async (data: Partial<MerchantState['profile']>) => {
    if (!state.profile) return
    try {
      const updatedProfile = { ...state.profile, ...data }
      dispatch({ type: 'SET_PROFILE', payload: updatedProfile })
      toast.success('Profile updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating profile'
      toast.error(errorMessage)
    }
  }, [state.profile])

  // Load connectors
const loadConnectors = useCallback(async () => {
  if (!state.currentMerchant) return
  try {
    // Forzamos el tipado correcto
    const connectorsResult = await hyperswitch.listConnectors()
    let connectors: Connector[] = []

    // Si la respuesta es un array
    if (Array.isArray(connectorsResult)) {
      connectors = connectorsResult
    }
    // Si la respuesta es un objeto con propiedad connectors (el caso típico)
    else if (connectorsResult && typeof connectorsResult === 'object' && Array.isArray((connectorsResult as any).connectors)) {
      connectors = (connectorsResult as any).connectors
    }

    dispatch({ type: 'SET_CONNECTORS', payload: connectors })
  } catch (error) {
    console.error('Error loading connectors:', error)
  }
}, [state.currentMerchant])

  // Add connector
  const addConnector = useCallback(async (connectorData: any) => {
    if (!state.currentMerchant) return
    try {
      const newConnector = await hyperswitch.createConnector(connectorData) as Connector
      dispatch({ type: 'ADD_CONNECTOR', payload: newConnector })
      toast.success('Connector added successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding connector'
      toast.error(errorMessage)
    }
  }, [state.currentMerchant])

  // Update connector
  const updateConnector = useCallback(async (connectorId: string, data: any) => {
    if (!state.currentMerchant) return
    try {
      const updatedConnector = await hyperswitch.updateConnector(connectorId, data) as Partial<Connector>
      dispatch({
        type: 'UPDATE_CONNECTOR',
        payload: { id: connectorId, data: updatedConnector },
      })
      toast.success('Connector updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating connector'
      toast.error(errorMessage)
    }
  }, [state.currentMerchant])

  // Remove connector
  const removeConnector = useCallback(async (connectorId: string) => {
    if (!state.currentMerchant) return
    try {
      await hyperswitch.deleteConnector(connectorId)
      dispatch({ type: 'REMOVE_CONNECTOR', payload: connectorId })
      toast.success('Connector removed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error removing connector'
      toast.error(errorMessage)
    }
  }, [state.currentMerchant])

  // Update preferences
  const updatePreferences = useCallback(async (preferences: Partial<MerchantState['preferences']>) => {
    try {
      const newPreferences = { ...state.preferences, ...preferences }
      localStorage.setItem('merchantPreferences', JSON.stringify(newPreferences))
      dispatch({ type: 'SET_PREFERENCES', payload: preferences })
      toast.success('Preferences updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating preferences'
      toast.error(errorMessage)
    }
  }, [state.preferences])

  // Update permissions
  const updatePermissions = useCallback((permissions: Partial<MerchantState['permissions']>) => {
    dispatch({ type: 'SET_PERMISSIONS', payload: permissions })
  }, [])

  // Check permission
  const checkPermission = useCallback((permission: keyof MerchantState['permissions']) => {
    return state.permissions[permission]
  }, [state.permissions])

  // Reset context
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Load initial data
  useEffect(() => {
    if (initialMerchantId) {
      loadMerchant(initialMerchantId)
    }
  }, [initialMerchantId, loadMerchant])

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('merchantPreferences')
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences)
        dispatch({ type: 'SET_PREFERENCES', payload: preferences })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }, [])

  const contextValue: MerchantContextType = {
    state,
    loadMerchant,
    updateMerchant,
    refreshMerchant,
    loadProfile,
    updateProfile,
    loadConnectors,
    addConnector,
    updateConnector,
    removeConnector,
    updatePreferences,
    updatePermissions,
    checkPermission,
    reset,
    isInitialized: !!state.currentMerchant,
  }

  return (
    <MerchantContext.Provider value={contextValue}>
      {children}
    </MerchantContext.Provider>
  )
}

// Hook
export function useMerchant() {
  const context = useContext(MerchantContext)
  if (!context) {
    throw new Error('useMerchant must be used within a MerchantProvider')
  }
  return context
}

export const useMerchantState = () => {
  const { state } = useMerchant()
  return state
}

export const useMerchantPermissions = () => {
  const { state, checkPermission } = useMerchant()
  return { permissions: state.permissions, checkPermission }
}

export const useMerchantPreferences = () => {
  const { state, updatePreferences } = useMerchant()
  return { preferences: state.preferences, updatePreferences }
}

export const useMerchantConnectors = () => {
  const { state, loadConnectors, addConnector, updateConnector, removeConnector } = useMerchant()
  return {
    connectors: state.connectors,
    loadConnectors,
    addConnector,
    updateConnector,
    removeConnector,
  }
}
