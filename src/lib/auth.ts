// src/lib/auth.ts - Server-side only authentication utilities

import { randomUUID } from "crypto"

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
 * Hook para verificar si estamos en servidor
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined'
}

