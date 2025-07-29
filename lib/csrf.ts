import { encryptData, decryptData } from './crypto';
import { v4 as uuidv4 } from 'uuid';

// Validar y obtener CSRF_SECRET
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error('CSRF_SECRET no está configurado');
  }
  return secret;
}

const CSRF_SECRET = getCsrfSecret();

/**
 * Genera un token CSRF cifrado
 * @returns Token CSRF codificado en base64
 */
export function generateCsrfToken(): string {
  const token = {
    value: uuidv4(),
    timestamp: Date.now(),
  };
  return encryptData(JSON.stringify(token), CSRF_SECRET);
}

/**
 * Valida un token CSRF cifrado
 * @param token Token CSRF en base64
 * @returns Verdadero si el token es válido y no ha expirado
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const decrypted = JSON.parse(decryptData(token, CSRF_SECRET));
    const tokenAge = Date.now() - decrypted.timestamp;
    return tokenAge < 30 * 60 * 1000; // 30 minutos de validez
  } catch (error) {
    return false;
  }
}