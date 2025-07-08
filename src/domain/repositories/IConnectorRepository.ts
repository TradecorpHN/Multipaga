// src/domain/repositories/IConnectorRepository.ts
// ──────────────────────────────────────────────────────────────────────────────
// IConnectorRepository - Interface del repositorio para conectores de pago
// ──────────────────────────────────────────────────────────────────────────────

import { ConnectorType } from '../value-objects/ConnectorType'

/**
 * Información detallada de un conector
 */
export interface ConnectorInfo {
  connector_name: string
  connector_label?: string
  connector_type: ConnectorType
  merchant_connector_id?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: string[]
  metadata?: Record<string, any>
  connector_account_details?: ConnectorAccountDetails
  pm_auth_config?: PaymentMethodAuthConfig
  connector_webhook_details?: ConnectorWebhookDetails
  created_at: Date
  modified_at: Date
}

/**
 * Detalles de la cuenta del conector
 */
export interface ConnectorAccountDetails {
  auth_type: 'HeaderKey' | 'BodyKey' | 'SignatureKey' | 'MultiAuthKey'
  api_key?: string
  api_secret?: string
  key1?: string
  key2?: string
  merchant_id?: string
  merchant_account_id?: string
  test_mode?: boolean
  additional_config?: Record<string, any>
}

/**
 * Configuración de autenticación del método de pago
 */
export interface PaymentMethodAuthConfig {
  enabled_payment_methods: string[]
  auth_connector?: string
  three_ds_requestor_url?: string
  authentication_connector_details?: Record<string, any>
}

/**
 * Detalles del webhook del conector
 */
export interface ConnectorWebhookDetails {
  merchant_secret?: string
  additional_webhook_details?: Record<string, any>
}

/**
 * Parámetros para crear un conector
 */
export interface CreateConnectorParams {
  connector_type: ConnectorType
  connector_name: string
  connector_account_details: ConnectorAccountDetails
  connector_label?: string
  business_country?: string
  business_label?: string
  business_sub_label?: string
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: string[]
  metadata?: Record<string, any>
  pm_auth_config?: PaymentMethodAuthConfig
  connector_webhook_details?: ConnectorWebhookDetails
}

/**
 * Parámetros para actualizar un conector
 */
export interface UpdateConnectorParams {
  merchant_connector_id: string
  connector_type?: ConnectorType
  connector_label?: string
  connector_account_details?: Partial<ConnectorAccountDetails>
  business_country?: string
  business_label?: string
  business_sub_label?: string
  test_mode?: boolean
  disabled?: boolean
  payment_methods_enabled?: string[]
  metadata?: Record<string, any>
  pm_auth_config?: PaymentMethodAuthConfig
  connector_webhook_details?: ConnectorWebhookDetails
}

/**
 * Filtros para buscar conectores
 */
export interface ConnectorFilters {
  connector_type?: ConnectorType
  business_country?: string
  business_label?: string
  test_mode?: boolean
  disabled?: boolean
  payment_method?: string
}

/**
 * Opciones de paginación
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
  sort_by?: 'created_at' | 'modified_at' | 'connector_name'
  sort_order?: 'asc' | 'desc'
}

/**
 * Respuesta paginada de conectores
 */
export interface PaginatedConnectorsResponse {
  connectors: ConnectorInfo[]
  total_count: number
  has_more: boolean
  next_offset?: number
}

/**
 * Configuración de routing de conectores
 */
export interface ConnectorRoutingConfig {
  connector_name: string
  merchant_connector_id: string
  percentage: number
  priority: number
  enabled: boolean
}

/**
 * Estadísticas de performance de un conector
 */
export interface ConnectorPerformanceStats {
  connector_name: string
  merchant_connector_id: string
  success_rate: number
  average_response_time_ms: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  total_volume: number
  currency: string
  period_start: Date
  period_end: Date
}

/**
 * Interface del repositorio para gestión de conectores
 * 
 * Define las operaciones disponibles para gestionar conectores de pago,
 * incluyendo configuración, monitoreo y routing de transacciones.
 */
export interface IConnectorRepository {
  /**
   * Crea un nuevo conector
   */
  create(merchantId: string, params: CreateConnectorParams): Promise<ConnectorInfo>

  /**
   * Obtiene un conector por su ID
   */
  findById(merchantId: string, merchantConnectorId: string): Promise<ConnectorInfo | null>

  /**
   * Obtiene un conector por su nombre
   */
  findByName(merchantId: string, connectorName: string): Promise<ConnectorInfo | null>

  /**
   * Lista todos los conectores de un merchant con filtros opcionales
   */
  findAll(
    merchantId: string, 
    filters?: ConnectorFilters, 
    pagination?: PaginationOptions
  ): Promise<PaginatedConnectorsResponse>

  /**
   * Lista conectores habilitados para un método de pago específico
   */
  findEnabledForPaymentMethod(
    merchantId: string, 
    paymentMethod: string
  ): Promise<ConnectorInfo[]>

  /**
   * Lista conectores activos (no deshabilitados)
   */
  findActive(merchantId: string): Promise<ConnectorInfo[]>

  /**
   * Actualiza un conector existente
   */
  update(merchantId: string, params: UpdateConnectorParams): Promise<ConnectorInfo>

  /**
   * Deshabilita un conector (soft delete)
   */
  disable(merchantId: string, merchantConnectorId: string): Promise<void>

  /**
   * Habilita un conector previamente deshabilitado
   */
  enable(merchantId: string, merchantConnectorId: string): Promise<void>

  /**
   * Elimina completamente un conector
   */
  delete(merchantId: string, merchantConnectorId: string): Promise<void>

  /**
   * Verifica la conectividad de un conector
   */
  testConnection(merchantId: string, merchantConnectorId: string): Promise<{
    status: 'success' | 'failure'
    response_time_ms: number
    error_message?: string
    tested_at: Date
  }>

  /**
   * Obtiene los métodos de pago soportados por un conector
   */
  getSupportedPaymentMethods(connectorName: string): Promise<string[]>

  /**
   * Obtiene las configuraciones de routing para un merchant
   */
  getRoutingConfig(merchantId: string): Promise<ConnectorRoutingConfig[]>

  /**
   * Actualiza la configuración de routing para un merchant
   */
  updateRoutingConfig(
    merchantId: string, 
    config: ConnectorRoutingConfig[]
  ): Promise<void>

  /**
   * Obtiene estadísticas de performance de un conector
   */
  getPerformanceStats(
    merchantId: string,
    merchantConnectorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ConnectorPerformanceStats>

  /**
   * Obtiene estadísticas de performance de todos los conectores
   */
  getAllPerformanceStats(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ConnectorPerformanceStats[]>

  /**
   * Verifica si un conector soporta un método de pago específico
   */
  supportsPaymentMethod(
    connectorName: string, 
    paymentMethod: string
  ): Promise<boolean>

  /**
   * Obtiene la configuración de webhook de un conector
   */
  getWebhookConfig(
    merchantId: string, 
    merchantConnectorId: string
  ): Promise<ConnectorWebhookDetails | null>

  /**
   * Actualiza la configuración de webhook de un conector
   */
  updateWebhookConfig(
    merchantId: string,
    merchantConnectorId: string,
    webhookDetails: ConnectorWebhookDetails
  ): Promise<void>

  /**
   * Lista todos los tipos de conectores disponibles
   */
  getAvailableConnectorTypes(): Promise<ConnectorType[]>

  /**
   * Valida las credenciales de un conector
   */
  validateCredentials(
    connectorName: string,
    credentials: ConnectorAccountDetails
  ): Promise<{
    valid: boolean
    error_message?: string
    supported_features?: string[]
  }>

  /**
   * Obtiene el conector recomendado para un país/región específica
   */
  getRecommendedConnector(
    country: string,
    paymentMethod?: string
  ): Promise<ConnectorInfo | null>

  /**
   * Sincroniza la configuración de un conector con el gateway externo
   */
  syncConfiguration(
    merchantId: string, 
    merchantConnectorId: string
  ): Promise<void>

  /**
   * Obtiene el historial de cambios de configuración de un conector
   */
  getConfigurationHistory(
    merchantId: string,
    merchantConnectorId: string,
    limit?: number
  ): Promise<Array<{
    changed_at: Date
    changed_by?: string
    changes: Record<string, { old_value: any; new_value: any }>
    version: number
  }>>

  /**
   * Restaura una configuración anterior de un conector
   */
  restoreConfiguration(
    merchantId: string,
    merchantConnectorId: string,
    version: number
  ): Promise<ConnectorInfo>
}