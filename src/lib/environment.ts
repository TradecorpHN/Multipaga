// Environment configuration for Multipaga
export type Environment = 'sandbox' | 'production';

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
  description: string;
  color: string;
}

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  sandbox: {
    name: 'Sandbox',
    apiUrl: 'https://sandbox.hyperswitch.io',
    publishableKey: process.env.NEXT_PUBLIC_HYPERSWITCH_SANDBOX_PUBLISHABLE_KEY || '',
    secretKey: process.env.HYPERSWITCH_SANDBOX_SECRET_KEY || '',
    description: 'Entorno de pruebas para desarrollo y testing',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  production: {
    name: 'Producción',
    apiUrl: 'https://api.hyperswitch.io',
    publishableKey: process.env.NEXT_PUBLIC_HYPERSWITCH_PRODUCTION_PUBLISHABLE_KEY || '',
    secretKey: process.env.HYPERSWITCH_PRODUCTION_SECRET_KEY || '',
    description: 'Entorno de producción para transacciones reales',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
};

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private currentEnvironment: Environment;

  private constructor() {
    // Default to sandbox for safety
    this.currentEnvironment = (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'sandbox';
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  public getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  public setEnvironment(env: Environment): void {
    this.currentEnvironment = env;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('multipaga_environment', env);
    }
  }

  public getConfig(): EnvironmentConfig {
    return ENVIRONMENTS[this.currentEnvironment];
  }

  public getApiUrl(): string {
    return this.getConfig().apiUrl;
  }

  public getPublishableKey(): string {
    return this.getConfig().publishableKey;
  }

  public getSecretKey(): string {
    return this.getConfig().secretKey;
  }

  public isProduction(): boolean {
    return this.currentEnvironment === 'production';
  }

  public isSandbox(): boolean {
    return this.currentEnvironment === 'sandbox';
  }

  public initializeFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('multipaga_environment') as Environment;
      if (stored && ENVIRONMENTS[stored]) {
        this.currentEnvironment = stored;
      }
    }
  }

  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (!config.apiUrl) {
      errors.push(`API URL no configurada para ${config.name}`);
    }

    if (!config.publishableKey) {
      errors.push(`Publishable Key no configurada para ${config.name}`);
    }

    if (!config.secretKey) {
      errors.push(`Secret Key no configurada para ${config.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const environmentManager = EnvironmentManager.getInstance();

// Utility functions
export const getCurrentEnvironment = () => environmentManager.getCurrentEnvironment();
export const getCurrentConfig = () => environmentManager.getConfig();
export const getApiUrl = () => environmentManager.getApiUrl();
export const getPublishableKey = () => environmentManager.getPublishableKey();
export const isProduction = () => environmentManager.isProduction();
export const isSandbox = () => environmentManager.isSandbox();

