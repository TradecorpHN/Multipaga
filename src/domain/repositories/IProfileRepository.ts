// src/domain/repositories/IProfileRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// IProfileRepository - Interface del repositorio para perfiles de merchant
// ──────────────────────────────────────────────────────────────────────────────

import { 
  MerchantProfile, 
  MerchantProfileData,
  WebhookDetails,
  RoutingAlgorithm,
  PaymentLinkConfig,
  AuthenticationConnectorDetails,
  ExtendedCardInfoConfig
} from '../entities/MerchantProfile'

/**
 * Filtros para buscar perfiles
 */
export interface ProfileFilters {
  profile_name?: string
  is_recon_enabled?: boolean
  is_tax_connector_enabled?: boolean
  is_network_tokenization_enabled?: boolean
  is_click_to_pay_enabled?: boolean
  is_extended_card_info_enabled?: boolean
  created_after?: Date
  created_before?: Date
  modified_after?: Date
  modified_before?: Date
}

/**
 * Opciones de ordenamiento para perfiles
 */
export interface ProfileSortOptions {
  sort_by?: 'created_at' | 'modified_at' | 'profile_name'
  sort_order?: 'asc' | 'desc'
}

/**
 * Opciones de paginación
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
}

/**
 * Respuesta paginada de perfiles
 */
export interface PaginatedProfilesResponse {
  profiles: MerchantProfileData[]
  total_count: number
  has_more: boolean
  next_offset?: number
}

/**
 * Parámetros para crear un perfil
 */
export interface CreateProfileParams {
  profile_name: string
  return_url?: string
  enable_payment_response_hash?: boolean
  payment_response_hash_key?: string
  redirect_to_merchant_with_http_post?: boolean
  webhook_details?: WebhookDetails
  metadata?: Record<string, any>
  routing_algorithm?: RoutingAlgorithm
  intent_fulfillment_time?: number
  frm_routing_algorithm?: RoutingAlgorithm
  payout_routing_algorithm?: RoutingAlgorithm
  is_recon_enabled?: boolean
  applepay_verified_domains?: string[]
  payment_link_config?: PaymentLinkConfig
  session_expiry?: number
  authentication_connector_details?: AuthenticationConnectorDetails
  payout_link_config?: PaymentLinkConfig
  is_extended_card_info_enabled?: boolean
  extended_card_info_config?: ExtendedCardInfoConfig
  use_billing_as_payment_method_billing?: boolean
  collect_shipping_details_from_wallet_connector?: boolean
  collect_billing_details_from_wallet_connector?: boolean
  outgoing_webhook_custom_http_headers?: Record<string, string>
  tax_connector_id?: string
  is_tax_connector_enabled?: boolean
  is_network_tokenization_enabled?: boolean
  is_click_to_pay_enabled?: boolean
  order_fulfillment_time?: number
  order_fulfillment_time_origin?: string
  should_collect_cvv_during_payment?: boolean
  dynamic_routing_algorithm?: RoutingAlgorithm
}

/**
 * Parámetros para actualizar un perfil
 */
export interface UpdateProfileParams {
  profile_id: string
  profile_name?: string
  return_url?: string
  enable_payment_response_hash?: boolean
  payment_response_hash_key?: string
  redirect_to_merchant_with_http_post?: boolean
  webhook_details?: WebhookDetails
  metadata?: Record<string, any>
  routing_algorithm?: RoutingAlgorithm
  intent_fulfillment_time?: number
  frm_routing_algorithm?: RoutingAlgorithm
  payout_routing_algorithm?: RoutingAlgorithm
  is_recon_enabled?: boolean
  applepay_verified_domains?: string[]
  payment_link_config?: PaymentLinkConfig
  session_expiry?: number
  authentication_connector_details?: AuthenticationConnectorDetails
  payout_link_config?: PaymentLinkConfig
  is_extended_card_info_enabled?: boolean
  extended_card_info_config?: ExtendedCardInfoConfig
  use_billing_as_payment_method_billing?: boolean
  collect_shipping_details_from_wallet_connector?: boolean
  collect_billing_details_from_wallet_connector?: boolean
  outgoing_webhook_custom_http_headers?: Record<string, string>
  tax_connector_id?: string
  is_tax_connector_enabled?: boolean
  is_network_tokenization_enabled?: boolean
  is_click_to_pay_enabled?: boolean
  order_fulfillment_time?: number
  order_fulfillment_time_origin?: string
  should_collect_cvv_during_payment?: boolean
  dynamic_routing_algorithm?: RoutingAlgorithm
}

/**
 * Resumen de perfil para listados
 */
export interface ProfileSummary {
  profile_id: string
  profile_name: string
  merchant_id: string
  is_recon_enabled: boolean
  is_tax_connector_enabled: boolean
  is_network_tokenization_enabled: boolean
  is_click_to_pay_enabled: boolean
  session_expiry: number
  webhook_configured: boolean
  routing_configured: boolean
  created_at: Date
  modified_at: Date
}

/**
 * Configuración de webhook para un perfil
 */
export interface ProfileWebhookConfig {
  profile_id: string
  webhook_details: WebhookDetails
  webhook_events_enabled: string[]
  webhook_test_status?: 'pending' | 'success' | 'failed'
  last_webhook_test?: Date
  webhook_failures_count: number
}

/**
 * Configuración de routing para un perfil
 */
export interface ProfileRoutingConfig {
  profile_id: string
  routing_algorithm: RoutingAlgorithm
  frm_routing_algorithm?: RoutingAlgorithm
  payout_routing_algorithm?: RoutingAlgorithm
  dynamic_routing_algorithm?: RoutingAlgorithm
  configured_connectors: string[]
  fallback_connectors: string[]
}

/**
 * Estadísticas de uso de un perfil
 */
export interface ProfileUsageStatistics {
  profile_id: string
  total_payments: number
  successful_payments: number
  failed_payments: number
  total_volume: number
  success_rate: number
  average_session_duration_minutes: number
  most_used_payment_methods: Array<{
    method: string
    usage_count: number
    percentage: number
  }>
  connector_distribution: Array<{
    connector: string
    usage_count: number
    percentage: number
  }>
  period_start: Date
  period_end: Date
}

/**
 * Configuración de seguridad del perfil
 */
export interface ProfileSecurityConfig {
  profile_id: string
  enable_payment_response_hash: boolean
  payment_response_hash_key?: string
  redirect_to_merchant_with_http_post: boolean
  authentication_connector_details?: AuthenticationConnectorDetails
  is_network_tokenization_enabled: boolean
  should_collect_cvv_during_payment: boolean
  outgoing_webhook_custom_http_headers?: Record<string, string>
  session_expiry: number
}

/**
 * Template de perfil para creación rápida
 */
export interface ProfileTemplate {
  template_name: string
  description: string
  category: 'ecommerce' | 'subscription' | 'marketplace' | 'custom'
  default_config: Partial<CreateProfileParams>
  recommended_connectors: string[]
  features: string[]
}

/**
 * Interface del repositorio para gestión de perfiles de merchant
 * 
 * Define las operaciones disponibles para gestionar perfiles de merchant,
 * incluyendo configuración, análisis y optimización.
 */
export interface IProfileRepository {
  /**
   * Crea un nuevo perfil de merchant
   */
  create(merchantId: string, params: CreateProfileParams): Promise<MerchantProfile>

  /**
   * Guarda un perfil
   */
  save(profile: MerchantProfile): Promise<void>

  /**
   * Actualiza un perfil existente
   */
  update(profile: MerchantProfile): Promise<void>

  /**
   * Obtiene un perfil por su ID
   */
  findById(merchantId: string, profileId: string): Promise<MerchantProfile | null>

  /**
   * Obtiene un perfil por su nombre
   */
  findByName(merchantId: string, profileName: string): Promise<MerchantProfile | null>

  /**
   * Lista todos los perfiles de un merchant
   */
  findAll(
    merchantId: string,
    filters?: ProfileFilters,
    sortOptions?: ProfileSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedProfilesResponse>

  /**
   * Obtiene el perfil por defecto de un merchant
   */
  findDefault(merchantId: string): Promise<MerchantProfile | null>

  /**
   * Establece un perfil como predeterminado
   */
  setAsDefault(merchantId: string, profileId: string): Promise<void>

  /**
   * Actualiza un perfil con parámetros específicos
   */
  updateProfile(
    merchantId: string,
    params: UpdateProfileParams
  ): Promise<MerchantProfile>

  /**
   * Elimina un perfil
   */
  delete(merchantId: string, profileId: string): Promise<void>

  /**
   * Clona un perfil existente
   */
  clone(
    merchantId: string,
    sourceProfileId: string,
    newProfileName: string
  ): Promise<MerchantProfile>

  /**
   * Obtiene resúmenes de perfiles para listados
   */
  getSummaries(merchantId: string): Promise<ProfileSummary[]>

  /**
   * Configura webhooks para un perfil
   */
  configureWebhooks(
    merchantId: string,
    profileId: string,
    webhookDetails: WebhookDetails
  ): Promise<void>

  /**
   * Obtiene configuración de webhooks de un perfil
   */
  getWebhookConfig(
    merchantId: string,
    profileId: string
  ): Promise<ProfileWebhookConfig | null>

  /**
   * Prueba la configuración de webhooks
   */
  testWebhooks(
    merchantId: string,
    profileId: string
  ): Promise<{
    success: boolean
    response_time_ms: number
    error_message?: string
    tested_at: Date
  }>

  /**
   * Configura algoritmos de routing para un perfil
   */
  configureRouting(
    merchantId: string,
    profileId: string,
    routingConfig: Partial<ProfileRoutingConfig>
  ): Promise<void>

  /**
   * Obtiene configuración de routing de un perfil
   */
  getRoutingConfig(
    merchantId: string,
    profileId: string
  ): Promise<ProfileRoutingConfig | null>

  /**
   * Configura dominios verificados de Apple Pay
   */
  configureApplePayDomains(
    merchantId: string,
    profileId: string,
    domains: string[]
  ): Promise<void>

  /**
   * Obtiene dominios verificados de Apple Pay
   */
  getApplePayDomains(
    merchantId: string,
    profileId: string
  ): Promise<string[]>

  /**
   * Verifica un dominio de Apple Pay
   */
  verifyApplePayDomain(
    merchantId: string,
    profileId: string,
    domain: string
  ): Promise<{
    verified: boolean
    verification_file_url?: string
    error_message?: string
  }>

  /**
   * Obtiene estadísticas de uso de un perfil
   */
  getUsageStatistics(
    merchantId: string,
    profileId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProfileUsageStatistics>

  /**
   * Obtiene configuración de seguridad de un perfil
   */
  getSecurityConfig(
    merchantId: string,
    profileId: string
  ): Promise<ProfileSecurityConfig>

  /**
   * Actualiza configuración de seguridad de un perfil
   */
  updateSecurityConfig(
    merchantId: string,
    profileId: string,
    securityConfig: Partial<ProfileSecurityConfig>
  ): Promise<void>

  /**
   * Obtiene templates de perfil disponibles
   */
  getProfileTemplates(): Promise<ProfileTemplate[]>

  /**
   * Crea un perfil desde un template
   */
  createFromTemplate(
    merchantId: string,
    templateName: string,
    profileName: string,
    customizations?: Partial<CreateProfileParams>
  ): Promise<MerchantProfile>

  /**
   * Valida la configuración de un perfil
   */
  validateConfiguration(
    merchantId: string,
    profileId: string
  ): Promise<{
    valid: boolean
    warnings: string[]
    errors: string[]
    recommendations: string[]
  }>

  /**
   * Obtiene el historial de cambios de un perfil
   */
  getChangeHistory(
    merchantId: string,
    profileId: string,
    limit?: number
  ): Promise<Array<{
    changed_at: Date
    changed_by?: string
    changes: Record<string, { old_value: any; new_value: any }>
    version: number
  }>>

  /**
   * Restaura una versión anterior de un perfil
   */
  restoreVersion(
    merchantId: string,
    profileId: string,
    version: number
  ): Promise<MerchantProfile>

  /**
   * Exporta configuración de un perfil
   */
  exportConfiguration(
    merchantId: string,
    profileId: string,
    format: 'json' | 'yaml'
  ): Promise<{
    download_url: string
    expires_at: Date
  }>

  /**
   * Importa configuración a un perfil
   */
  importConfiguration(
    merchantId: string,
    profileId: string,
    configData: string,
    format: 'json' | 'yaml'
  ): Promise<{
    success: boolean
    applied_changes: string[]
    warnings: string[]
    errors: string[]
  }>

  /**
   * Obtiene recomendaciones de optimización para un perfil
   */
  getOptimizationRecommendations(
    merchantId: string,
    profileId: string
  ): Promise<Array<{
    type: 'performance' | 'security' | 'configuration' | 'features'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimated_impact: string
    implementation_effort: 'low' | 'medium' | 'high'
  }>>

  /**
   * Sincroniza la configuración con conectores externos
   */
  syncWithConnectors(
    merchantId: string,
    profileId: string
  ): Promise<{
    success: boolean
    synced_connectors: string[]
    failed_connectors: Array<{
      connector: string
      error_message: string
    }>
  }>

  /**
   * Busca perfiles por texto libre
   */
  search(
    merchantId: string,
    query: string,
    filters?: Partial<ProfileFilters>
  ): Promise<ProfileSummary[]>
}