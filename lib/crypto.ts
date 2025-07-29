import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

// Configuración de cifrado
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Longitud recomendada para GCM
const AUTH_TAG_LENGTH = 16; // Tag de autenticación para GCM
const SALT_LENGTH = 16; // Longitud de la sal para PBKDF2
const KEY_LENGTH = 32; // Longitud de la clave para AES-256
const PBKDF2_ITERATIONS = 100000; // Iteraciones para derivación de clave

/**
 * Deriva una clave segura a partir del secreto usando PBKDF2
 * @param secret Secreto para derivar la clave
 * @param salt Sal para la derivación
 * @returns Clave derivada de 32 bytes
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    throw new Error('El secreto debe ser una cadena de al menos 16 caracteres');
  }
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Cifra datos utilizando AES-256-GCM
 * @param data Datos a cifrar (string)
 * @param secret Secreto para derivar la clave
 * @returns String codificado en base64 (sal + iv + datos cifrados + authTag)
 */
export function encryptData(data: string, secret: string): string {
  try {
    // Validar entrada
    if (!data || typeof data !== 'string') {
      throw new Error('Los datos a cifrar deben ser una cadena no vacía');
    }

    // Generar sal y derivar clave
    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey(secret, salt);

    // Generar IV aleatorio
    const iv = randomBytes(IV_LENGTH);

    // Crear cifrador
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Cifrar datos
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Obtener tag de autenticación
    const authTag = cipher.getAuthTag();

    // Combinar sal, IV, datos cifrados y authTag en un solo buffer
    const combined = Buffer.concat([salt, iv, encrypted, authTag]);

    // Codificar en base64 para compatibilidad con strings
    return combined.toString('base64');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cifrar';
    throw new Error(`Error al cifrar datos: ${errorMessage}`);
  }
}

/**
 * Descifra datos cifrados con AES-256-GCM
 * @param encryptedData Datos cifrados en base64
 * @param secret Secreto para derivar la clave
 * @returns Datos descifrados (string)
 */
export function decryptData(encryptedData: string, secret: string): string {
  try {
    // Validar entrada
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Los datos cifrados deben ser una cadena no vacía');
    }

    // Decodificar de base64
    const buffer = Buffer.from(encryptedData, 'base64');

    // Verificar longitud mínima del buffer
    if (buffer.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Datos cifrados inválidos: longitud insuficiente');
    }

    // Extraer sal, IV, datos cifrados y authTag
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH, buffer.length - AUTH_TAG_LENGTH);
    const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH);

    // Derivar clave
    const key = deriveKey(secret, salt);

    // Crear descifrador
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Descifrar datos
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');

    return decrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al descifrar';
    throw new Error(`Error al descifrar datos: ${errorMessage}`);
  }
}