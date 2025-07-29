// ==============================================================================
// auth.schema.ts - Esquemas de validación para autenticación
// ==============================================================================

// /home/kali/multipaga/src/presentation/components/forms/validation/auth.schema.ts
import { z } from 'zod'
import { REGEX_PATTERNS } from '@/presentation/lib/constants'

/**
 * Esquema de validación para inicio de sesión
 */
export const loginSchema = z.object({
  api_key: z
    .string()
    .min(1, 'API key is required')
    .min(32, 'API key must be at least 32 characters')
    .regex(REGEX_PATTERNS.API_KEY, 'Invalid API key format')
    .trim(),
  
  publishable_key: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  profile_id: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  remember_me: z
    .boolean()
    .optional()
    .default(false),
})

/**
 * Esquema de validación para configuración inicial
 */
export const setupSchema = z.object({
  merchant_id: z
    .string()
    .min(1, 'Merchant ID is required')
    .max(64, 'Merchant ID must be less than 64 characters')
    .trim(),
  
  api_key: z
    .string()
    .min(1, 'API key is required')
    .min(32, 'API key must be at least 32 characters')
    .regex(REGEX_PATTERNS.API_KEY, 'Invalid API key format')
    .trim(),
  
  publishable_key: z
    .string()
    .min(1, 'Publishable key is required')
    .trim(),
  
  profile_id: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  base_url: z
    .string()
    .url('Invalid base URL')
    .default('https://sandbox.hyperswitch.io'),
  
  webhook_url: z
    .string()
    .url('Invalid webhook URL')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  return_url: z
    .string()
    .url('Invalid return URL')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  business_profile: z.object({
    profile_name: z
      .string()
      .min(1, 'Profile name is required')
      .max(64, 'Profile name must be less than 64 characters')
      .trim(),
    
    business_country: z
      .string()
      .length(2, 'Country code must be 2 characters')
      .optional()
      .nullable(),
    
    business_label: z
      .string()
      .max(64, 'Business label must be less than 64 characters')
      .optional()
      .nullable()
      .transform(val => val === '' ? null : val),
  }).optional(),
})

/**
 * Esquema de validación para cambio de API key
 */
export const changeApiKeySchema = z.object({
  current_api_key: z
    .string()
    .min(1, 'Current API key is required')
    .regex(REGEX_PATTERNS.API_KEY, 'Invalid current API key format'),
  
  new_api_key: z
    .string()
    .min(1, 'New API key is required')
    .min(32, 'New API key must be at least 32 characters')
    .regex(REGEX_PATTERNS.API_KEY, 'Invalid new API key format')
    .trim(),
  
  confirm_api_key: z
    .string()
    .min(1, 'Please confirm the new API key'),
}).refine((data) => data.new_api_key === data.confirm_api_key, {
  message: "API keys don't match",
  path: ["confirm_api_key"],
}).refine((data) => data.current_api_key !== data.new_api_key, {
  message: "New API key must be different from current API key",
  path: ["new_api_key"],
})

/**
 * Esquema de validación para configuración de webhook
 */
export const webhookConfigSchema = z.object({
  webhook_url: z
    .string()
    .url('Invalid webhook URL')
    .refine(url => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS'
    }),
  
  webhook_username: z
    .string()
    .min(1, 'Username is required for webhook authentication')
    .max(64, 'Username must be less than 64 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  webhook_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  webhook_version: z
    .enum(['v1', 'v2'])
    .default('v2'),
  
  events: z.object({
    payment_created_enabled: z.boolean().default(true),
    payment_succeeded_enabled: z.boolean().default(true),
    payment_failed_enabled: z.boolean().default(true),
    payment_cancelled_enabled: z.boolean().default(false),
    payment_processing_enabled: z.boolean().default(false),
    payment_requires_action_enabled: z.boolean().default(true),
    refund_succeeded_enabled: z.boolean().default(true),
    refund_failed_enabled: z.boolean().default(true),
    dispute_opened_enabled: z.boolean().default(true),
    dispute_challenged_enabled: z.boolean().default(true),
    dispute_won_enabled: z.boolean().default(true),
    dispute_lost_enabled: z.boolean().default(true),
  }).default({}),
  
  retry_config: z.object({
    max_retries: z
      .number()
      .min(0, 'Max retries must be 0 or more')
      .max(10, 'Max retries cannot exceed 10')
      .default(3),
    
    retry_delay_seconds: z
      .number()
      .min(1, 'Retry delay must be at least 1 second')
      .max(3600, 'Retry delay cannot exceed 1 hour')
      .default(30),
    
    exponential_backoff: z.boolean().default(true),
  }).default({}),
})

/**
 * Esquema de validación para configuración de seguridad
 */
export const securityConfigSchema = z.object({
  ip_whitelist: z
    .array(z.string().ip('Invalid IP address'))
    .max(50, 'Maximum 50 IP addresses allowed')
    .optional()
    .default([]),
  
  rate_limiting: z.object({
    enabled: z.boolean().default(true),
    requests_per_minute: z
      .number()
      .min(10, 'Minimum 10 requests per minute')
      .max(1000, 'Maximum 1000 requests per minute')
      .default(100),
    
    burst_limit: z
      .number()
      .min(1, 'Minimum 1 burst request')
      .max(100, 'Maximum 100 burst requests')
      .default(10),
  }).default({}),
  
  session_config: z.object({
    timeout_minutes: z
      .number()
      .min(5, 'Minimum session timeout is 5 minutes')
      .max(1440, 'Maximum session timeout is 24 hours')
      .default(30),
    
    auto_refresh: z.boolean().default(true),
    
    refresh_threshold_minutes: z
      .number()
      .min(1, 'Minimum refresh threshold is 1 minute')
      .max(60, 'Maximum refresh threshold is 60 minutes')
      .default(5),
  }).default({}),
  
  encryption: z.object({
    enable_response_encryption: z.boolean().default(false),
    enable_request_encryption: z.boolean().default(false),
    encryption_key: z
      .string()
      .min(32, 'Encryption key must be at least 32 characters')
      .optional()
      .nullable(),
  }).default({}),
})

/**
 * Esquema de validación para configuración de notificaciones
 */
export const notificationConfigSchema = z.object({
  email_notifications: z.object({
    enabled: z.boolean().default(true),
    email_address: z
      .string()
      .email('Invalid email address')
      .optional()
      .nullable(),
    
    events: z.object({
      payment_failures: z.boolean().default(true),
      dispute_opened: z.boolean().default(true),
      large_refunds: z.boolean().default(true),
      system_errors: z.boolean().default(true),
      security_alerts: z.boolean().default(true),
    }).default({}),
  }).default({}),
  
  slack_notifications: z.object({
    enabled: z.boolean().default(false),
    webhook_url: z
      .string()
      .url('Invalid Slack webhook URL')
      .optional()
      .nullable(),
    
    channel: z
      .string()
      .min(1, 'Channel name is required')
      .max(21, 'Channel name must be less than 21 characters')
      .regex(/^#[a-z0-9_-]+$/, 'Invalid channel name format')
      .optional()
      .nullable(),
    
    events: z.object({
      payment_failures: z.boolean().default(true),
      dispute_opened: z.boolean().default(true),
      system_errors: z.boolean().default(true),
    }).default({}),
  }).default({}),
  
  dashboard_notifications: z.object({
    enabled: z.boolean().default(true),
    sound_enabled: z.boolean().default(false),
    desktop_notifications: z.boolean().default(true),
    
    events: z.object({
      new_payments: z.boolean().default(true),
      payment_failures: z.boolean().default(true),
      new_disputes: z.boolean().default(true),
      refund_requests: z.boolean().default(true),
    }).default({}),
  }).default({}),
})

// Tipos TypeScript inferidos de los esquemas
export type LoginFormData = z.infer<typeof loginSchema>
export type SetupFormData = z.infer<typeof setupSchema>
export type ChangeApiKeyFormData = z.infer<typeof changeApiKeySchema>
export type WebhookConfigFormData = z.infer<typeof webhookConfigSchema>
export type SecurityConfigFormData = z.infer<typeof securityConfigSchema>
export type NotificationConfigFormData = z.infer<typeof notificationConfigSchema>

// Valores por defecto para formularios
export const DEFAULT_LOGIN_VALUES: LoginFormData = {
  api_key: '',
  publishable_key: null,
  profile_id: null,
  remember_me: false,
}

export const DEFAULT_SETUP_VALUES: SetupFormData = {
  merchant_id: '',
  api_key: '',
  publishable_key: '',
  profile_id: null,
  base_url: 'https://sandbox.hyperswitch.io',
  webhook_url: null,
  return_url: null,
  business_profile: {
    profile_name: '',
    business_country: null,
    business_label: null,
  },
}

export const DEFAULT_WEBHOOK_CONFIG_VALUES: WebhookConfigFormData = {
  webhook_url: '',
  webhook_username: null,
  webhook_password: null,
  webhook_version: 'v2',
  events: {
    payment_created_enabled: true,
    payment_succeeded_enabled: true,
    payment_failed_enabled: true,
    payment_cancelled_enabled: false,
    payment_processing_enabled: false,
    payment_requires_action_enabled: true,
    refund_succeeded_enabled: true,
    refund_failed_enabled: true,
    dispute_opened_enabled: true,
    dispute_challenged_enabled: true,
    dispute_won_enabled: true,
    dispute_lost_enabled: true,
  },
  retry_config: {
    max_retries: 3,
    retry_delay_seconds: 30,
    exponential_backoff: true,
  },
}

// Funciones de validación adicionales
export const validateApiKeyFormat = (apiKey: string): boolean => {
  return REGEX_PATTERNS.API_KEY.test(apiKey)
}

export const validateProfileId = (id: string): boolean => {
  return /^pro_[a-z0-9]{20}$/.test(id);
};

export const validateMerchantId = (merchantId: string): boolean => {
  return merchantId.length > 0 && merchantId.length <= 64
}
