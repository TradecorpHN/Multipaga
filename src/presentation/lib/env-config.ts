import { z } from 'zod'

const envSchema = z.object({
  // Hyperswitch API Configuration
  HYPERSWITCH_API_KEY: z.string().min(1, 'Multipaga API key is required'),
  HYPERSWITCH_BASE_URL: z.string().url('Invalid Multipaga base URL'),
  
  // Next.js Public Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
  
  // Optional: Monitoring & Analytics
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  
  // Security Configuration
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Session Configuration
  SESSION_EXPIRY_HOURS: z.string().transform(Number).default('24'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

type EnvConfig = z.infer<typeof envSchema>

class EnvironmentConfig {
  private static instance: EnvironmentConfig
  private config: EnvConfig

  private constructor() {
    try {
      this.config = envSchema.parse({
        HYPERSWITCH_API_KEY: process.env.HYPERSWITCH_API_KEY,
        HYPERSWITCH_BASE_URL: process.env.HYPERSWITCH_BASE_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        SENTRY_DSN: process.env.SENTRY_DSN,
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
        SESSION_EXPIRY_HOURS: process.env.SESSION_EXPIRY_HOURS,
        NODE_ENV: process.env.NODE_ENV,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join('\n')
        throw new Error(`Environment validation failed:\n${errorMessage}`)
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

  public get env(): EnvConfig {
    return this.config
  }

  public get isProduction(): boolean {
    return this.config.NODE_ENV === 'production'
  }

  public get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development'
  }

  public get isTest(): boolean {
    return this.config.NODE_ENV === 'test'
  }
}

// Singleton instance
const envConfig = EnvironmentConfig.getInstance()

// Export convenience methods
export const env = envConfig.env
export const isProduction = envConfig.isProduction
export const isDevelopment = envConfig.isDevelopment
export const isTest = envConfig.isTest

// Export the full config class for advanced usage
export { EnvironmentConfig }