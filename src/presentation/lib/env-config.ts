import { z } from 'zod'

// ✅ Esquema solo para variables públicas (disponibles en el cliente)
const publicEnvSchema = z.object({
  // Next.js Public Configuration (disponible en cliente)
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
  
  // Environment (público)
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Configuración pública opcional
  NEXT_PUBLIC_ENABLE_DEBUG_TOOLS: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
})

// ✅ Esquema para variables del servidor (solo disponible en server-side)
const serverEnvSchema = z.object({
  // Hyperswitch API Configuration (SOLO SERVIDOR)
  HYPERSWITCH_API_KEY: z.string().min(1, 'Hyperswitch API key is required'),
  HYPERSWITCH_BASE_URL: z.string().url('Invalid Hyperswitch base URL'),
  
  // Security Configuration (SOLO SERVIDOR)
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be 32 characters').optional(),
  
  // Optional server-only
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  SESSION_EXPIRY_HOURS: z.string().transform(Number).default('24'),
})

type PublicEnvConfig = z.infer<typeof publicEnvSchema>
type ServerEnvConfig = z.infer<typeof serverEnvSchema>

class EnvironmentConfig {
  private static instance: EnvironmentConfig
  private publicConfig: PublicEnvConfig
  private serverConfig: ServerEnvConfig | null = null

  private constructor() {
    // ✅ Siempre validar variables públicas
    this.publicConfig = this.validatePublicEnv()
    
    // ✅ Solo validar variables del servidor si estamos en server-side
    if (typeof window === 'undefined') {
      this.serverConfig = this.validateServerEnv()
    }
  }

  private validatePublicEnv(): PublicEnvConfig {
    try {
      return publicEnvSchema.parse({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_ENABLE_DEBUG_TOOLS: process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS,
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join('\n')
        console.warn(`⚠️ Public environment validation warning:\n${errorMessage}`)
      }
      
      // ✅ Retornar configuración por defecto en caso de error
      return {
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NODE_ENV: 'development' as const,
        NEXT_PUBLIC_ENABLE_DEBUG_TOOLS: undefined,
        NEXT_PUBLIC_APP_VERSION: undefined,
      }
    }
  }

  private validateServerEnv(): ServerEnvConfig {
    try {
      return serverEnvSchema.parse({
        HYPERSWITCH_API_KEY: process.env.HYPERSWITCH_API_KEY,
        HYPERSWITCH_BASE_URL: process.env.HYPERSWITCH_BASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        SENTRY_DSN: process.env.SENTRY_DSN,
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
        SESSION_EXPIRY_HOURS: process.env.SESSION_EXPIRY_HOURS,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join('\n')
        
        // ✅ Solo mostrar error en servidor, no en cliente
        if (typeof window === 'undefined') {
          console.error(`❌ Server environment validation failed:\n${errorMessage}`)
        }
      }
      throw error
    }
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig()
    }
    return EnvironmentConfig.instance
  }

  // ✅ Getters seguros que funcionan en cliente y servidor
  public get publicEnv(): PublicEnvConfig {
    return this.publicConfig
  }

  public get serverEnv(): ServerEnvConfig {
    if (typeof window !== 'undefined') {
      throw new Error('Server environment variables not available in client-side code')
    }
    if (!this.serverConfig) {
      throw new Error('Server environment not initialized')
    }
    return this.serverConfig
  }

  public get isProduction(): boolean {
    return this.publicConfig.NODE_ENV === 'production'
  }

  public get isDevelopment(): boolean {
    return this.publicConfig.NODE_ENV === 'development'
  }

  public get isTest(): boolean {
    return this.publicConfig.NODE_ENV === 'test'
  }

  // ✅ Método seguro para obtener variables del servidor
  public getServerVar<T extends keyof ServerEnvConfig>(key: T): ServerEnvConfig[T] | null {
    if (typeof window !== 'undefined') {
      console.warn(`⚠️ Attempted to access server variable '${String(key)}' from client-side`)
      return null
    }
    return this.serverConfig?.[key] || null
  }
}

// ✅ Inicialización segura
let envConfig: EnvironmentConfig

try {
  envConfig = EnvironmentConfig.getInstance()
} catch (error) {
  console.warn('⚠️ Environment config initialization failed, using defaults')
  // Crear instancia mínima para desarrollo
  envConfig = {
    publicEnv: {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development' as const,
    },
    serverEnv: null,
    isProduction: false,
    isDevelopment: true,
    isTest: false,
    getServerVar: () => null,
  } as any
}

// ✅ Export convenience methods (solo públicas para cliente)
export const env = envConfig.publicEnv
export const isProduction = envConfig.isProduction
export const isDevelopment = envConfig.isDevelopment
export const isTest = envConfig.isTest

// ✅ Export servidor-side utilities (solo funciona en servidor)
export const getServerEnv = () => {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ getServerEnv() called from client-side, returning null')
    return null
  }
  try {
    return envConfig.serverEnv
  } catch {
    return null
  }
}

// Export the full config class for advanced usage
export { EnvironmentConfig }