// src/lib/auth.ts

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
 * Carga y valida variables de entorno al inicio.
 * Lanza error si falta alguna variable o es inválida.
 */
const config: HyperswitchConfig = (() => {
  const apiKey = process.env.HYPERSWITCH_API_KEY
  const baseUrlEnv = process.env.HYPERSWITCH_BASE_URL
  if (!apiKey) throw new Error("Missing HYPERSWITCH_API_KEY environment variable")
  if (!baseUrlEnv) throw new Error("Missing HYPERSWITCH_BASE_URL environment variable")

  const timeoutEnv = process.env["HYPERSWITCH_TIMEOUT"]
  const timeout = timeoutEnv ? parseInt(timeoutEnv, 10) : 5000
  if (isNaN(timeout) || timeout < 0) {
    throw new Error("HYPERSWITCH_TIMEOUT must be a positive integer in milliseconds")
  }

  // Normaliza la URL base: elimina barras finales con replace de dos argumentos
  const baseUrl = baseUrlEnv.replace(/\/+$/g, "")

  return { apiKey, baseUrl, timeout }
})()

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
 * Construye las cabeceras de autenticación necesarias para Hyperswitch.
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "X-Correlation-ID": generateCorrelationId(),
  }
}

/**
 * Ensambla la URL completa para un endpoint de Hyperswitch.
 * Acepta rutas con o sin slash inicial.
 */
export function buildUrl(path: string): string {
  const cleaned = path.startsWith("/") ? path : `/${path}`
  return `${config.baseUrl}${cleaned}`
}

/**
 * Realiza una petición HTTP a Hyperswitch con timeout, manejo de errores y parseo JSON.
 * @param path Ruta del endpoint (e.g. "/payments").
 * @param init Opciones de fetch adicionales.
 * @returns Respuesta parseada como JSON de tipo T.
 */
export async function hyperswitchFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = buildUrl(path)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout)

  const headers = {
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string> || {}),
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Hyperswitch error ${response.status}: ${errText}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === "AbortError") {
      throw new Error(
        `Request to ${url} timed out after ${config.timeout}ms`
      )
    }
    throw err
  }
}

// Convierte este archivo en módulo para que las declaraciones globales apliquen
export {}
