// src/lib/auth.ts - Server-side only authentication utilities

/**
 * Declara globalmente las variables de entorno usadas por Hyperswitch.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Clave de API para autenticar con Hyperswitch */
      HYPERSWITCH_API_KEY: string
      /** URL base del servicio Hyperswitch */
      HYPERSWITCH_BASE_URL: string
      /** Timeout en milisegundos para peticiones (opcional) */
      HYPERSWITCH_TIMEOUT?: string
    }
  }
}

import { randomUUID } from "crypto"

/** Configuración validada de Hyperswitch */
interface HyperswitchConfig {
  apiKey: string
  baseUrl: string
  timeout: number
}

/**
 * ✅ Configuración lazy-loaded que solo se ejecuta en servidor
 */
let _config: HyperswitchConfig | null = null

function getConfig(): HyperswitchConfig {
  // ✅ Verificar que estamos en servidor
  if (typeof window !== 'undefined') {
    throw new Error('Hyperswitch config should only be accessed on the server-side')
  }

  // ✅ Lazy loading para evitar ejecución en import
  if (!_config) {
    const apiKey = process.env.HYPERSWITCH_API_KEY
    const baseUrlEnv = process.env.HYPERSWITCH_BASE_URL
    
    if (!apiKey) {
      console.warn('⚠️ HYPERSWITCH_API_KEY not found, using development default')
      // ✅ Valor por defecto en lugar de crash
      return {
        apiKey: 'pk_dev_default_key',
        baseUrl: 'https://sandbox.hyperswitch.io',
        timeout: 5000
      }
    }
    
    if (!baseUrlEnv) {
      console.warn('⚠️ HYPERSWITCH_BASE_URL not found, using development default')
      return {
        apiKey: apiKey || 'pk_dev_default_key',
        baseUrl: 'https://sandbox.hyperswitch.io',
        timeout: 5000
      }
    }

    const timeoutEnv = process.env["HYPERSWITCH_TIMEOUT"]
    const timeout = timeoutEnv ? parseInt(timeoutEnv, 10) : 5000
    
    if (isNaN(timeout) || timeout < 0) {
      console.warn('⚠️ Invalid HYPERSWITCH_TIMEOUT, using default 5000ms')
    }

    // Normaliza la URL base: elimina barras finales
    const baseUrl = baseUrlEnv.replace(/\/+$/g, "")

    _config = { apiKey, baseUrl, timeout: isNaN(timeout) ? 5000 : timeout }
  }

  return _config
}

/**
 * Genera un correlation ID para trazabilidad de peticiones.
 */
export function generateCorrelationId(): string {
  if (typeof randomUUID === "function") {
    return randomUUID()
  }
  // Fallback simple
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

/**
 * ✅ Construye las cabeceras de autenticación necesarias para Hyperswitch.
 * SOLO funciona en servidor.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ getAuthHeaders() called from client-side, returning empty headers')
    return {
      "Content-Type": "application/json",
      "X-Correlation-ID": generateCorrelationId(),
    }
  }

  try {
    const config = getConfig()
    return {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "X-Correlation-ID": generateCorrelationId(),
    }
  } catch (error) {
    console.warn('⚠️ Error getting auth headers:', error)
    return {
      "Content-Type": "application/json",
      "X-Correlation-ID": generateCorrelationId(),
    }
  }
}

/**
 * ✅ Ensambla la URL completa para un endpoint de Hyperswitch.
 * SOLO funciona en servidor.
 */
export function buildUrl(path: string): string {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ buildUrl() called from client-side, returning placeholder')
    return `https://sandbox.hyperswitch.io${path.startsWith("/") ? path : `/${path}`}`
  }

  try {
    const config = getConfig()
    const cleaned = path.startsWith("/") ? path : `/${path}`
    return `${config.baseUrl}${cleaned}`
  } catch (error) {
    console.warn('⚠️ Error building URL:', error)
    const cleaned = path.startsWith("/") ? path : `/${path}`
    return `https://sandbox.hyperswitch.io${cleaned}`
  }
}

/**
 * ✅ Versión segura para obtener configuración en cliente
 */
export function getClientSafeConfig() {
  return {
    baseUrl: 'https://sandbox.hyperswitch.io', // URL pública segura
    timeout: 5000,
    // ❌ NO incluir API key en cliente
  }
}

/**
 * ✅ Hook para verificar si estamos en servidor
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * ✅ Función para verificar si la configuración es válida (server-side only)
 */
export function validateConfig(): boolean {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ validateConfig() should only be called server-side')
    return false
  }

  try {
    const config = getConfig()
    return !!(config.apiKey && config.baseUrl)
  } catch {
    return false
  }
}
