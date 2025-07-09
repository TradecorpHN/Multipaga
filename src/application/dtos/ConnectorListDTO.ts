// src/application/dtos/ConnectorListDTO.ts
// ──────────────────────────────────────────────────────────────────────────────
// DTOs para listado de conectores - Transferencia de datos de conectores
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

/**
 * Schema de validación para conector individual
 */
export const ConnectorSchema = z.object({
  connector_name: z.string(),
  connector_label: z.string().optional(),
  merchant_connector_id: z.string(),
  connector_type: z.enum(['payment_processor', 'payment_vault', 'authentication_processor']),
  disabled: z.boolean().default(false),
  payment_methods_enabled: z.array(z.object({
    payment_method: z.string(),
    payment_method_types: z.array(z.object({
      payment_method_type: z.string(),
      minimum_amount: z.number().optional(),
      maximum_amount: z.number().optional(),
      recurring_enabled: z.boolean().default(false),
      installment_payment_enabled: z.boolean().default(false),
    }))
  })),
  test_mode: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'integration_test']).default('inactive'),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  business_sub_label: z.string().optional(),
  frm_configs: z.array(z.object({
    gateway: z.string(),
    payment_methods: z.array(z.string())
  })).optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string(),
  modified_at: z.string(),
  connector_account_details: z.object({
    auth_type: z.enum(['HeaderKey', 'BodyKey', 'SignatureKey', 'MultiAuthKey', 'CertificateAuth']),
    api_key: z.string().optional(),
    key1: z.string().optional(),
    key2: z.string().optional(),
    api_secret: z.string().optional(),
    certificate: z.string().optional(),
    private_key: z.string().optional(),
  }).optional(),
  pm_auth_config: z.record(z.any()).optional(),
  connector_webhook_details: z.object({
    merchant_secret: z.string(),
    webhook_url: z.string().optional(),
    webhook_version: z.string().optional(),
    payment_created_enabled: z.boolean().default(false),
    payment_succeeded_enabled: z.boolean().default(false),
    payment_failed_enabled: z.boolean().default(false),
    payment_cancelled_enabled: z.boolean().default(false),
    payment_processing_enabled: z.boolean().default(false),
    payment_action_required_enabled: z.boolean().default(false),
    refund_succeeded_enabled: z.boolean().default(false),
    refund_failed_enabled: z.boolean().default(false),
    dispute_opened_enabled: z.boolean().default(false),
    dispute_challenged_enabled: z.boolean().default(false),
    dispute_won_enabled: z.boolean().default(false),
    dispute_lost_enabled: z.boolean().default(false),
  }).optional(),
  applepay_verified_domains: z.array(z.string()).optional(),
  profile_id: z.string().optional(),
})

/**
 * Schema para filtros de listado de conectores
 */
export const ConnectorListFiltersSchema = z.object({
  merchant_id: z.string(),
  profile_id: z.string().optional(),
  connector_type: z.enum(['payment_processor', 'payment_vault', 'authentication_processor']).optional(),
  payment_method: z.string().optional(),
  status: z.enum(['active', 'inactive', 'integration_test']).optional(),
  business_country: z.string().optional(),
  business_label: z.string().optional(),
  disabled: z.boolean().optional(),
  test_mode: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

/**
 * Schema para respuesta de listado de conectores
 */
export const ConnectorListResponseSchema = z.object({
  connectors: z.array(ConnectorSchema),
  total_count: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().optional(),
})

/**
 * Schema para métricas de conector
 */
export const ConnectorMetricsSchema = z.object({
  connector_name: z.string(),
  merchant_connector_id: z.string(),
  total_payments: z.number(),
  successful_payments: z.number(),
  failed_payments: z.number(),
  success_rate: z.number().min(0).max(100),
  total_volume: z.number(),
  average_response_time_ms: z.number(),
  uptime_percentage: z.number().min(0).max(100),
  last_24h_status: z.enum(['healthy', 'degraded', 'down']),
  error_codes: z.record(z.number()),
  payment_method_breakdown: z.record(z.object({
    count: z.number(),
    volume: z.number(),
    success_rate: z.number(),
  })),
  recent_errors: z.array(z.object({
    error_code: z.string(),
    error_message: z.string(),
    timestamp: z.string(),
    payment_id: z.string().optional(),
  })),
  period_start: z.string(),
  period_end: z.string(),
})

/**
 * Schema para configuración de conector
 */
export const ConnectorConfigSchema = z.object({
  merchant_connector_id: z.string(),
  connector_name: z.string(),
  routing_algorithm: z.object({
    type: z.enum(['priority', 'volume_split', 'advanced']),
    data: z.any(),
  }).optional(),
  primary_business_details: z.array(z.object({
    country: z.string(),
    business: z.string(),
  })),
  secondary_business_details: z.array(z.object({
    country: z.string(), 
    business: z.string(),
  })).optional(),
  sub_merchants_enabled: z.boolean().default(false),
  payment_methods_enabled: z.array(z.object({
    payment_method: z.string(),
    payment_method_types: z.array(z.object({
      payment_method_type: z.string(),
      card_networks: z.array(z.string()).optional(),
      accepted_currencies: z.record(z.object({
        minimum_amount: z.number(),
        maximum_amount: z.number(),
        recurring_enabled: z.boolean(),
        installment_payment_enabled: z.boolean(),
      })),
      accepted_countries: z.record(z.object({
        minimum_amount: z.number(),
        maximum_amount: z.number(),
      })),
      surcharge_details: z.object({
        surcharge: z.number().optional(),
        tax_on_surcharge: z.number().optional(),
      }).optional(),
    })),
  })),
  test_mode: z.boolean().default(false),
  disabled: z.boolean().default(false),
})

// ──────────────────────────────────────────────────────────────────────────────
// Type exports
// ──────────────────────────────────────────────────────────────────────────────

export type ConnectorDTO = z.infer<typeof ConnectorSchema>
export type ConnectorListFiltersDTO = z.infer<typeof ConnectorListFiltersSchema>
export type ConnectorListResponseDTO = z.infer<typeof ConnectorListResponseSchema>
export type ConnectorMetricsDTO = z.infer<typeof ConnectorMetricsSchema>
export type ConnectorConfigDTO = z.infer<typeof ConnectorConfigSchema>

// ──────────────────────────────────────────────────────────────────────────────
// DTOs específicos para requests
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DTO para solicitud de listado de conectores
 */
export interface ConnectorListRequestDTO {
  merchant_id: string
  profile_id?: string
  connector_type?: 'payment_processor' | 'payment_vault' | 'authentication_processor'
  payment_method?: string
  status?: 'active' | 'inactive' | 'integration_test'
  business_country?: string
  business_label?: string
  disabled?: boolean
  test_mode?: boolean
  limit?: number
  offset?: number
  include_metrics?: boolean
  include_config?: boolean
  sort_by?: 'created_at' | 'modified_at' | 'connector_name' | 'success_rate'
  sort_order?: 'asc' | 'desc'
}

/**
 * DTO para respuesta enriquecida de conector
 */
export interface ConnectorDetailDTO extends ConnectorDTO {
  metrics?: ConnectorMetricsDTO
  config?: ConnectorConfigDTO
  health_status: {
    status: 'healthy' | 'degraded' | 'down'
    last_check: string
    uptime_24h: number
    response_time_avg: number
    error_rate_24h: number
  }
  payment_methods_summary: {
    total_enabled: number
    by_type: Record<string, number>
    supported_currencies: string[]
    supported_countries: string[]
  }
}

/**
 * DTO para resumen de conectores
 */
export interface ConnectorSummaryDTO {
  total_connectors: number
  active_connectors: number
  inactive_connectors: number
  test_connectors: number
  by_type: Record<string, number>
  by_country: Record<string, number>
  health_overview: {
    healthy: number
    degraded: number
    down: number
  }
  top_performers: Array<{
    connector_name: string
    merchant_connector_id: string
    success_rate: number
    volume: number
  }>
  recent_changes: Array<{
    connector_name: string
    merchant_connector_id: string
    change_type: 'created' | 'updated' | 'enabled' | 'disabled'
    timestamp: string
  }>
}

/**
 * DTO para balances de conectores
 */
export interface ConnectorBalanceDTO {
  merchant_connector_id: string
  connector_name: string
  currency: string
  available_balance: number
  pending_balance: number
  reserved_balance: number
  total_balance: number
  last_updated: string
  status: 'active' | 'insufficient_funds' | 'error'
  next_payout_date: string | null
  payout_schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    delay_days: number
  }
}

/**
 * Utilidades para validación
 */
export class ConnectorListValidation {
  
  /**
   * Valida filtros de listado de conectores
   */
  static validateFilters(filters: unknown): ConnectorListFiltersDTO {
    return ConnectorListFiltersSchema.parse(filters)
  }
  
  /**
   * Valida respuesta de conector individual
   */
  static validateConnector(connector: unknown): ConnectorDTO {
    return ConnectorSchema.parse(connector)
  }
  
  /**
   * Valida respuesta de listado
   */
  static validateListResponse(response: unknown): ConnectorListResponseDTO {
    return ConnectorListResponseSchema.parse(response)
  }
  
  /**
   * Valida métricas de conector
   */
  static validateMetrics(metrics: unknown): ConnectorMetricsDTO {
    return ConnectorMetricsSchema.parse(metrics)
  }
  
  /**
   * Sanitiza filtros eliminando campos no permitidos
   */
  static sanitizeFilters(filters: Record<string, any>): ConnectorListFiltersDTO {
    const allowedFields = ConnectorListFiltersSchema.keyof().options
    const sanitized = Object.keys(filters)
      .filter(key => allowedFields.includes(key as any))
      .reduce((obj, key) => {
        obj[key] = filters[key]
        return obj
      }, {} as Record<string, any>)
    
    return ConnectorListFiltersSchema.parse(sanitized)
  }
}

export default ConnectorListValidation