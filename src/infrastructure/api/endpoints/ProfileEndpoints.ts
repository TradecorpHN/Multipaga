// src/infrastructure/api/endpoints/ProfileEndpoints.ts
// ──────────────────────────────────────────────────────────────────────────────
// Endpoints API para manejo de perfiles de negocio según especificación Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import type { BusinessProfile, WebhookDetails, RoutingAlgorithm } from '@/types/hyperswitch'

// Schemas de validación para perfiles
export const BusinessProfileCreateSchema = z.object({
  profile_name: z.string().min(1).max(64, 'Nombre muy largo'),
  return_url: z.string().url('URL de retorno inválida').optional(),
  enable_payment_response_hash: z.boolean().default(false),
  payment_response_hash_key: z.string().optional(),
  redirect_to_merchant_with_http_post: z.boolean().default(false),
  webhook_details: z.object({
    webhook_version: z.string().optional(),
    webhook_username: z.string().optional(),
    webhook_password: z.string().optional(),
    webhook_url: z.string().url('URL de webhook inválida').optional(),
    payment_created_enabled: z.boolean().default(false),
    payment_succeeded_enabled: z.boolean().default(true),
    payment_failed_enabled: z.boolean().default(true),
  }).optional(),
  metadata: z.record(z.string()).optional(),
  routing_algorithm: z.object({
    type: z.enum(['single', 'priority', 'volume_split', 'advanced']),
    data: z.record(z.any()),
  }).optional(),
  intent_fulfillment_time: z.number().int().min(1).max(7200).optional(), // máximo 2 horas
  frm_routing_algorithm: z.object({
    type: z.string(),
    data: z.record(z.any()),
  }).optional(),
  payout_routing_algorithm: z.object({
    type: z.string(),
    data: z.record(z.any()),
  }).optional(),
  is_recon_enabled: z.boolean().default(false),
  applepay_verified_domains: z.array(z.string().url()).optional(),
  payment_link_config: z.object({
    domain_name: z.string().optional(),
    business_name: z.string().optional(),
    business_logo: z.string().url().optional(),
    theme: z.enum(['light', 'dark']).default('light'),
  }).optional(),
  session_expiry: z.number().int().min(300).max(86400).default(3600), // 5 min a 24 horas
  authentication_connector_details: z.object({
    authentication_connector: z.string(),
    three_ds_requestor_name: z.string().optional(),
    three_ds_requestor_url: z.string().url().optional(),
  }).optional(),
  payout_link_config: z.object({
    domain_name: z.string().optional(),
    business_name: z.string().optional(),
    business_logo: z.string().url().optional(),
  }).optional(),
  is_extended_card_info_enabled: z.boolean().default(false),
  extended_card_info_config: z.object({
    is_extended_card_info_enabled: z.boolean(),
  }).optional(),
  use_billing_as_payment_method_billing: z.boolean().default(false),
  collect_shipping_details_from_wallet_connector: z.boolean().default(false),
  collect_billing_details_from_wallet_connector: z.boolean().default(false),
  outgoing_webhook_custom_http_headers: z.record(z.string()).optional(),
  tax_connector_id: z.string().optional(),
  is_tax_connector_enabled: z.boolean().default(false),
  is_network_tokenization_enabled: z.boolean().default(false),
  is_click_to_pay_enabled: z.boolean().default(false),
  order_fulfillment_time: z.number().int().min(1).optional(),
  order_fulfillment_time_origin: z.enum(['create', 'confirm']).optional(),
  should_collect_cvv_during_payment: z.boolean().default(true),
  dynamic_routing_algorithm: z.object({
    type: z.string(),
    data: z.record(z.any()),
  }).optional(),
})

export const BusinessProfileUpdateSchema = BusinessProfileCreateSchema.partial().extend({
  profile_id: z.string().min(1),
})

export const ProfileListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export const WebhookDetailsSchema = z.object({
  webhook_version: z.string().optional(),
  webhook_username: z.string().optional(),
  webhook_password: z.string().optional(),
  webhook_url: z.string().url('URL de webhook inválida').optional(),
  payment_created_enabled: z.boolean().default(false),
  payment_succeeded_enabled: z.boolean().default(true),
  payment_failed_enabled: z.boolean().default(true),
  payment_cancelled_enabled: z.boolean().default(true),
  payment_processing_enabled: z.boolean().default(false),
  action_required_enabled: z.boolean().default(true),
  refund_succeeded_enabled: z.boolean().default(true),
  refund_failed_enabled: z.boolean().default(true),
  dispute_opened_enabled: z.boolean().default(true),
  dispute_challenged_enabled: z.boolean().default(true),
  dispute_won_enabled: z.boolean().default(true),
  dispute_lost_enabled: z.boolean().default(true),
})

// Tipos exportados
export type BusinessProfileCreateData = z.infer<typeof BusinessProfileCreateSchema>
export type BusinessProfileUpdateData = z.infer<typeof BusinessProfileUpdateSchema>
export type ProfileListParams = z.infer<typeof ProfileListSchema>
export type WebhookDetailsData = z.infer<typeof WebhookDetailsSchema>

// Endpoints de perfiles de negocio
export class ProfileEndpoints {

  /**
   * POST /account/{merchant_id}/business_profile - Crea un nuevo perfil de negocio
   */
  static createProfile = {
    method: 'POST' as const,
    path: '/account/{merchant_id}/business_profile' as const,
    bodySchema: BusinessProfileCreateSchema,
    
    buildUrl: (baseUrl: string, merchantId: string): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      return `${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile`
    },
    
    validateBody: (body: unknown): BusinessProfileCreateData => {
      return BusinessProfileCreateSchema.parse(body)
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    }
  }

  /**
   * GET /account/{merchant_id}/business_profile - Lista perfiles de negocio
   */
  static listProfiles = {
    method: 'GET' as const,
    path: '/account/{merchant_id}/business_profile' as const,
    paramsSchema: ProfileListSchema,
    
    buildUrl: (baseUrl: string, merchantId: string, params?: ProfileListParams): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      
      const url = new URL(`${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile`)
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(key, String(value))
          }
        })
      }
      
      return url.toString()
    },
    
    validateParams: (params: unknown): ProfileListParams => {
      return ProfileListSchema.parse(params)
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    }
  }

  /**
   * GET /account/{merchant_id}/business_profile/{profile_id} - Obtiene detalles de un perfil específico
   */
  static getProfile = {
    method: 'GET' as const,
    path: '/account/{merchant_id}/business_profile/{profile_id}' as const,
    
    buildUrl: (baseUrl: string, merchantId: string, profileId: string): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      if (!profileId || profileId.trim() === '') {
        throw new Error('Profile ID es requerido')
      }
      return `${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile/${encodeURIComponent(profileId)}`
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    },
    
    validateProfileId: (profileId: string): string => {
      const schema = z.string().min(1, 'Profile ID no puede estar vacío')
      return schema.parse(profileId)
    }
  }

  /**
   * POST /account/{merchant_id}/business_profile/{profile_id} - Actualiza un perfil de negocio
   */
  static updateProfile = {
    method: 'POST' as const,
    path: '/account/{merchant_id}/business_profile/{profile_id}' as const,
    bodySchema: BusinessProfileUpdateSchema,
    
    buildUrl: (baseUrl: string, merchantId: string, profileId: string): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      if (!profileId || profileId.trim() === '') {
        throw new Error('Profile ID es requerido')
      }
      return `${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile/${encodeURIComponent(profileId)}`
    },
    
    validateBody: (body: unknown): BusinessProfileUpdateData => {
      return BusinessProfileUpdateSchema.parse(body)
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    },
    
    validateProfileId: (profileId: string): string => {
      const schema = z.string().min(1, 'Profile ID no puede estar vacío')
      return schema.parse(profileId)
    }
  }

  /**
   * DELETE /account/{merchant_id}/business_profile/{profile_id} - Elimina un perfil de negocio
   */
  static deleteProfile = {
    method: 'DELETE' as const,
    path: '/account/{merchant_id}/business_profile/{profile_id}' as const,
    
    buildUrl: (baseUrl: string, merchantId: string, profileId: string): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      if (!profileId || profileId.trim() === '') {
        throw new Error('Profile ID es requerido')
      }
      return `${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile/${encodeURIComponent(profileId)}`
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    },
    
    validateProfileId: (profileId: string): string => {
      const schema = z.string().min(1, 'Profile ID no puede estar vacío')
      return schema.parse(profileId)
    }
  }

  /**
   * PUT /account/{merchant_id}/business_profile/{profile_id}/toggle_extended_card_info - Activa/desactiva información extendida de tarjeta
   */
  static toggleExtendedCardInfo = {
    method: 'PUT' as const,
    path: '/account/{merchant_id}/business_profile/{profile_id}/toggle_extended_card_info' as const,
    bodySchema: z.object({
      is_extended_card_info_enabled: z.boolean(),
    }),
    
    buildUrl: (baseUrl: string, merchantId: string, profileId: string): string => {
      if (!merchantId || merchantId.trim() === '') {
        throw new Error('Merchant ID es requerido')
      }
      if (!profileId || profileId.trim() === '') {
        throw new Error('Profile ID es requerido')
      }
      return `${baseUrl}/account/${encodeURIComponent(merchantId)}/business_profile/${encodeURIComponent(profileId)}/toggle_extended_card_info`
    },
    
    validateBody: (body: unknown) => {
      return z.object({ is_extended_card_info_enabled: z.boolean() }).parse(body)
    },
    
    validateMerchantId: (merchantId: string): string => {
      const schema = z.string().min(1, 'Merchant ID no puede estar vacío')
      return schema.parse(merchantId)
    },
    
    validateProfileId: (profileId: string): string => {
      const schema = z.string().min(1, 'Profile ID no puede estar vacío')
      return schema.parse(profileId)
    }
  }
}

// Utilidades para manejo de perfiles
export class ProfileUtils {
  
  /**
   * Valida configuración de webhook
   */
  static validateWebhookConfig(webhook: WebhookDetailsData): string[] {
    const errors: string[] = []
    
    if (webhook.webhook_url && !webhook.webhook_url.startsWith('https://')) {
      errors.push('La URL del webhook debe usar HTTPS')
    }
    
    if (webhook.webhook_username && !webhook.webhook_password) {
      errors.push('Si especifica username, debe incluir password')
    }
    
    if (webhook.webhook_password && !webhook.webhook_username) {
      errors.push('Si especifica password, debe incluir username')
    }
    
    return errors
  }

  /**
   * Genera configuración de webhook por defecto
   */
  static getDefaultWebhookConfig(): WebhookDetailsData {
    return {
      webhook_version: '1.0',
      payment_created_enabled: false,
      payment_succeeded_enabled: true,
      payment_failed_enabled: true,
      payment_cancelled_enabled: true,
      payment_processing_enabled: false,
      action_required_enabled: true,
      refund_succeeded_enabled: true,
      refund_failed_enabled: true,
      dispute_opened_enabled: true,
      dispute_challenged_enabled: true,
      dispute_won_enabled: true,
      dispute_lost_enabled: true,
    }
  }

  /**
   * Valida dominios de Apple Pay
   */
  static validateApplePayDomains(domains: string[]): string[] {
    const errors: string[] = []
    
    domains.forEach((domain, index) => {
      try {
        const url = new URL(`https://${domain}`)
        if (url.hostname !== domain) {
          errors.push(`Dominio ${index + 1} inválido: ${domain}`)
        }
      } catch {
        errors.push(`Dominio ${index + 1} inválido: ${domain}`)
      }
    })
    
    return errors
  }

  /**
   * Genera configuración de routing por defecto
   */
  static getDefaultRoutingConfig(type: 'single' | 'priority' | 'volume_split' | 'advanced' = 'single') {
    const configs = {
      single: {
        type: 'single',
        data: {
          connector: 'stripe',
          merchant_connector_id: null,
        },
      },
      priority: {
        type: 'priority',
        data: {
          connectors: [
            { connector: 'stripe', priority: 1 },
            { connector: 'adyen', priority: 2 },
          ],
        },
      },
      volume_split: {
        type: 'volume_split',
        data: {
          splits: [
            { connector: 'stripe', percentage: 70 },
            { connector: 'adyen', percentage: 30 },
          ],
        },
      },
      advanced: {
        type: 'advanced',
        data: {
          rules: [
            {
              condition: { amount: { gte: 100000 } }, // >= $1000
              connector: 'adyen',
            },
            {
              condition: { country: 'US' },
              connector: 'stripe',
            },
          ],
          fallback: 'stripe',
        },
      },
    }
    
    return configs[type]
  }

  /**
   * Valida configuración de sesión
   */
  static validateSessionConfig(sessionExpiry: number): string[] {
    const errors: string[] = []
    
    if (sessionExpiry < 300) {
      errors.push('La expiración de sesión no puede ser menor a 5 minutos')
    }
    
    if (sessionExpiry > 86400) {
      errors.push('La expiración de sesión no puede ser mayor a 24 horas')
    }
    
    return errors
  }

  /**
   * Calcula configuración de seguridad recomendada
   */
  static getRecommendedSecurityConfig() {
    return {
      enable_payment_response_hash: true,
      redirect_to_merchant_with_http_post: true,
      session_expiry: 3600, // 1 hora
      should_collect_cvv_during_payment: true,
      is_network_tokenization_enabled: true,
      authentication_connector_details: {
        three_ds_requestor_name: 'Multipaga',
      },
    }
  }

  /**
   * Valida configuración de payment link
   */
  static validatePaymentLinkConfig(config: any): string[] {
    const errors: string[] = []
    
    if (config.business_logo && !config.business_logo.startsWith('https://')) {
      errors.push('El logo del negocio debe usar HTTPS')
    }
    
    if (config.business_name && config.business_name.length > 50) {
      errors.push('El nombre del negocio no puede exceder 50 caracteres')
    }
    
    if (config.domain_name && !config.domain_name.match(/^[a-zA-Z0-9-._]+$/)) {
      errors.push('El nombre de dominio contiene caracteres inválidos')
    }
    
    return errors
  }

  /**
   * Genera configuración de compliance por defecto
   */
  static getComplianceConfig() {
    return {
      is_recon_enabled: true,
      is_tax_connector_enabled: false,
      collect_shipping_details_from_wallet_connector: true,
      collect_billing_details_from_wallet_connector: true,
      use_billing_as_payment_method_billing: false,
      is_extended_card_info_enabled: false,
    }
  }

  /**
   * Determina si un perfil está completamente configurado
   */
  static isProfileComplete(profile: BusinessProfile): boolean {
    const requiredFields = [
      'profile_name',
      'return_url',
      'webhook_details.webhook_url',
    ]
    
    return requiredFields.every(field => {
      const keys = field.split('.')
      let value: any = profile
      
      for (const key of keys) {
        value = value?.[key]
        if (value === undefined || value === null || value === '') {
          return false
        }
      }
      
      return true
    })
  }

  /**
   * Calcula score de configuración del perfil (0-100)
   */
  static calculateConfigScore(profile: BusinessProfile): number {
    let score = 0
    const maxScore = 100
    
    // Configuración básica (30 puntos)
    if (profile.profile_name) score += 10
    if (profile.return_url) score += 10
    if (profile.webhook_details?.webhook_url) score += 10
    
    // Configuración de seguridad (25 puntos)
    if (profile.enable_payment_response_hash) score += 5
    if (profile.should_collect_cvv_during_payment) score += 5
    if (profile.is_network_tokenization_enabled) score += 5
    if (profile.authentication_connector_details) score += 10
    
    // Configuración avanzada (25 puntos)
    if (profile.routing_algorithm) score += 10
    if (profile.payment_link_config) score += 5
    if (profile.applepay_verified_domains?.length) score += 5
    if (profile.is_recon_enabled) score += 5
    
    // Compliance y optimización (20 puntos)
    if (profile.metadata && Object.keys(profile.metadata).length > 0) score += 5
    if (profile.outgoing_webhook_custom_http_headers) score += 5
    if (profile.intent_fulfillment_time) score += 5
    if (profile.order_fulfillment_time) score += 5
    
    return Math.min(score, maxScore)
  }
}

// Constantes para perfiles
export const PROFILE_CONSTANTS = {
  MAX_PROFILE_NAME_LENGTH: 64,
  MIN_SESSION_EXPIRY: 300, // 5 minutos
  MAX_SESSION_EXPIRY: 86400, // 24 horas
  DEFAULT_SESSION_EXPIRY: 3600, // 1 hora
  MAX_INTENT_FULFILLMENT_TIME: 7200, // 2 horas
  MAX_ORDER_FULFILLMENT_TIME: 604800, // 7 días
  MAX_BUSINESS_NAME_LENGTH: 50,
  MAX_APPLEPAY_DOMAINS: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SUPPORTED_THEMES: ['light', 'dark'] as const,
  SUPPORTED_ROUTING_TYPES: ['single', 'priority', 'volume_split', 'advanced'] as const,
  WEBHOOK_VERSION: '1.0',
  REQUIRED_HTTPS_FIELDS: ['webhook_url', 'return_url', 'business_logo'] as const,
} as const

export default ProfileEndpoints