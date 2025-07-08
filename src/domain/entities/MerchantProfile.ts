// src/domain/entities/MerchantProfile.ts
// ──────────────────────────────────────────────────────────────────────────────
// MerchantProfile Entity - Entidad de dominio para perfiles de merchant
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Schema de validación para detalles de webhook
const WebhookDetailsSchema = z.object({
  webhook_version: z.string().optional(),
  webhook_username: z.string().max(255).optional(),
  webhook_password: z.string().max(255).optional(),
  webhook_url: z.string().url().optional(),
  payment_created_enabled: z.boolean().default(false),
  payment_succeeded_enabled: z.boolean().default(false),
  payment_failed_enabled: z.boolean().default(false),
})

// Schema de validación para algoritmo de enrutamiento
const RoutingAlgorithmSchema = z.object({
  type: z.enum(['single', 'priority', 'volume_split', 'advanced']),
  data: z.record(z.string(), z.any()),
})

// Schema de validación para configuración de links de pago
const PaymentLinkConfigSchema = z.object({
  theme: z.string().default('#0570de'),
  logo: z.string().url().optional(),
  seller_name: z.string().max(255).optional(),
  sdk_layout: z.string().default('accordion'),
  display_sdk_only: z.boolean().default(false),
  enabled_saved_payment_method: z.boolean().default(false),
})

// Schema de validación para detalles de conector de autenticación
const AuthenticationConnectorDetailsSchema = z.object({
  authentication_connectors: z.array(z.string()),
  three_ds_requestor_url: z.string().url().optional(),
})

// Schema de validación para configuración de información extendida de tarjeta
const ExtendedCardInfoConfigSchema = z.object({
  is_connector_agnostic_mit_enabled: z.boolean().default(false),
})

// Schema principal del perfil de merchant
const MerchantProfileSchema = z.object({
  profile_id: z.string().min(1),
  profile_name: z.string().min(1).max(255),
  merchant_id: z.string().min(1),
  return_url: z.string().url().optional(),
  enable_payment_response_hash: z.boolean().default(false),
  payment_response_hash_key: z.string().optional(),
  redirect_to_merchant_with_http_post: z.boolean().default(false),
  webhook_details: WebhookDetailsSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  routing_algorithm: RoutingAlgorithmSchema.optional(),
  intent_fulfillment_time: z.number().min(0).optional(),
  frm_routing_algorithm: RoutingAlgorithmSchema.optional(),
  payout_routing_algorithm: RoutingAlgorithmSchema.optional(),
  is_recon_enabled: z.boolean().default(false),
  applepay_verified_domains: z.array(z.string().url()).optional(),
  payment_link_config: PaymentLinkConfigSchema.optional(),
  session_expiry: z.number().min(60).max(7200).default(900), // 15 minutos por defecto
  authentication_connector_details: AuthenticationConnectorDetailsSchema.optional(),
  payout_link_config: PaymentLinkConfigSchema.optional(),
  is_extended_card_info_enabled: z.boolean().default(false),
  extended_card_info_config: ExtendedCardInfoConfigSchema.optional(),
  use_billing_as_payment_method_billing: z.boolean().default(false),
  collect_shipping_details_from_wallet_connector: z.boolean().default(false),
  collect_billing_details_from_wallet_connector: z.boolean().default(false),
  outgoing_webhook_custom_http_headers: z.record(z.string(), z.string()).optional(),
  tax_connector_id: z.string().optional(),
  is_tax_connector_enabled: z.boolean().default(false),
  is_network_tokenization_enabled: z.boolean().default(false),
  is_click_to_pay_enabled: z.boolean().default(false),
  order_fulfillment_time: z.number().min(0).optional(),
  order_fulfillment_time_origin: z.string().optional(),
  should_collect_cvv_during_payment: z.boolean().default(false),
  dynamic_routing_algorithm: RoutingAlgorithmSchema.optional(),
  created_at: z.string().datetime(),
  modified_at: z.string().datetime(),
})

export type WebhookDetails = z.infer<typeof WebhookDetailsSchema>
export type RoutingAlgorithm = z.infer<typeof RoutingAlgorithmSchema>
export type PaymentLinkConfig = z.infer<typeof PaymentLinkConfigSchema>
export type AuthenticationConnectorDetails = z.infer<typeof AuthenticationConnectorDetailsSchema>
export type ExtendedCardInfoConfig = z.infer<typeof ExtendedCardInfoConfigSchema>
export type MerchantProfileData = z.infer<typeof MerchantProfileSchema>

/**
 * MerchantProfile Entity - Representa un perfil de merchant en el sistema
 * 
 * Esta entidad encapsula toda la configuración y preferencias de un
 * perfil de merchant, incluyendo configuraciones de webhook, enrutamiento,
 * y opciones de pago.
 */
export class MerchantProfile {
  private constructor(
    private readonly _profileId: string,
    private _profileName: string,
    private readonly _merchantId: string,
    private readonly _createdAt: Date,
    private _modifiedAt: Date,
    private _returnUrl?: string,
    private _enablePaymentResponseHash: boolean = false,
    private _paymentResponseHashKey?: string,
    private _redirectToMerchantWithHttpPost: boolean = false,
    private _webhookDetails?: WebhookDetails,
    private _metadata?: Record<string, any>,
    private _routingAlgorithm?: RoutingAlgorithm,
    private _intentFulfillmentTime?: number,
    private _frmRoutingAlgorithm?: RoutingAlgorithm,
    private _payoutRoutingAlgorithm?: RoutingAlgorithm,
    private _isReconEnabled: boolean = false,
    private _applepayVerifiedDomains?: string[],
    private _paymentLinkConfig?: PaymentLinkConfig,
    private _sessionExpiry: number = 900,
    private _authenticationConnectorDetails?: AuthenticationConnectorDetails,
    private _payoutLinkConfig?: PaymentLinkConfig,
    private _isExtendedCardInfoEnabled: boolean = false,
    private _extendedCardInfoConfig?: ExtendedCardInfoConfig,
    private _useBillingAsPaymentMethodBilling: boolean = false,
    private _collectShippingDetailsFromWalletConnector: boolean = false,
    private _collectBillingDetailsFromWalletConnector: boolean = false,
    private _outgoingWebhookCustomHttpHeaders?: Record<string, string>,
    private _taxConnectorId?: string,
    private _isTaxConnectorEnabled: boolean = false,
    private _isNetworkTokenizationEnabled: boolean = false,
    private _isClickToPayEnabled: boolean = false,
    private _orderFulfillmentTime?: number,
    private _orderFulfillmentTimeOrigin?: string,
    private _shouldCollectCvvDuringPayment: boolean = false,
    private _dynamicRoutingAlgorithm?: RoutingAlgorithm
  ) {}

  /**
   * Factory method para crear un nuevo perfil de merchant
   */
  public static create(data: {
    profile_id: string
    profile_name: string
    merchant_id: string
    return_url?: string
    enable_payment_response_hash?: boolean
    payment_response_hash_key?: string
    redirect_to_merchant_with_http_post?: boolean
    webhook_details?: WebhookDetails
    metadata?: Record<string, any>
    session_expiry?: number
  }): MerchantProfile {
    const now = new Date()

    return new MerchantProfile(
      data.profile_id,
      data.profile_name,
      data.merchant_id,
      now,
      now,
      data.return_url,
      data.enable_payment_response_hash,
      data.payment_response_hash_key,
      data.redirect_to_merchant_with_http_post,
      data.webhook_details,
      data.metadata,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      data.session_expiry
    )
  }

  /**
   * Factory method para reconstruir un perfil desde datos persistidos
   */
  public static fromData(data: MerchantProfileData): MerchantProfile {
    const validatedData = MerchantProfileSchema.parse(data)

    return new MerchantProfile(
      validatedData.profile_id,
      validatedData.profile_name,
      validatedData.merchant_id,
      new Date(validatedData.created_at),
      new Date(validatedData.modified_at),
      validatedData.return_url,
      validatedData.enable_payment_response_hash,
      validatedData.payment_response_hash_key,
      validatedData.redirect_to_merchant_with_http_post,
      validatedData.webhook_details,
      validatedData.metadata,
      validatedData.routing_algorithm,
      validatedData.intent_fulfillment_time,
      validatedData.frm_routing_algorithm,
      validatedData.payout_routing_algorithm,
      validatedData.is_recon_enabled,
      validatedData.applepay_verified_domains,
      validatedData.payment_link_config,
      validatedData.session_expiry,
      validatedData.authentication_connector_details,
      validatedData.payout_link_config,
      validatedData.is_extended_card_info_enabled,
      validatedData.extended_card_info_config,
      validatedData.use_billing_as_payment_method_billing,
      validatedData.collect_shipping_details_from_wallet_connector,
      validatedData.collect_billing_details_from_wallet_connector,
      validatedData.outgoing_webhook_custom_http_headers,
      validatedData.tax_connector_id,
      validatedData.is_tax_connector_enabled,
      validatedData.is_network_tokenization_enabled,
      validatedData.is_click_to_pay_enabled,
      validatedData.order_fulfillment_time,
      validatedData.order_fulfillment_time_origin,
      validatedData.should_collect_cvv_during_payment,
      validatedData.dynamic_routing_algorithm
    )
  }

  // Getters
  public get profileId(): string {
    return this._profileId
  }

  public get profileName(): string {
    return this._profileName
  }

  public get merchantId(): string {
    return this._merchantId
  }

  public get returnUrl(): string | undefined {
    return this._returnUrl
  }

  public get enablePaymentResponseHash(): boolean {
    return this._enablePaymentResponseHash
  }

  public get paymentResponseHashKey(): string | undefined {
    return this._paymentResponseHashKey
  }

  public get redirectToMerchantWithHttpPost(): boolean {
    return this._redirectToMerchantWithHttpPost
  }

  public get webhookDetails(): WebhookDetails | undefined {
    return this._webhookDetails
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  public get routingAlgorithm(): RoutingAlgorithm | undefined {
    return this._routingAlgorithm
  }

  public get intentFulfillmentTime(): number | undefined {
    return this._intentFulfillmentTime
  }

  public get isReconEnabled(): boolean {
    return this._isReconEnabled
  }

  public get sessionExpiry(): number {
    return this._sessionExpiry
  }

  public get isExtendedCardInfoEnabled(): boolean {
    return this._isExtendedCardInfoEnabled
  }

  public get isTaxConnectorEnabled(): boolean {
    return this._isTaxConnectorEnabled
  }

  public get isNetworkTokenizationEnabled(): boolean {
    return this._isNetworkTokenizationEnabled
  }

  public get isClickToPayEnabled(): boolean {
    return this._isClickToPayEnabled
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get modifiedAt(): Date {
    return this._modifiedAt
  }

  // Business methods

  /**
   * Actualiza el nombre del perfil
   */
  public updateProfileName(name: string): void {
    const validated = z.string().min(1).max(255).parse(name)
    this._profileName = validated
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza la URL de retorno
   */
  public updateReturnUrl(url: string | undefined): void {
    if (url !== undefined) {
      const validated = z.string().url().parse(url)
      this._returnUrl = validated
    } else {
      this._returnUrl = undefined
    }
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza la configuración de webhook
   */
  public updateWebhookDetails(webhookDetails: WebhookDetails): void {
    const validated = WebhookDetailsSchema.parse(webhookDetails)
    this._webhookDetails = validated
    this._modifiedAt = new Date()
  }

  /**
   * Elimina la configuración de webhook
   */
  public removeWebhookDetails(): void {
    this._webhookDetails = undefined
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza los metadatos
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza el algoritmo de enrutamiento
   */
  public updateRoutingAlgorithm(algorithm: RoutingAlgorithm): void {
    const validated = RoutingAlgorithmSchema.parse(algorithm)
    this._routingAlgorithm = validated
    this._modifiedAt = new Date()
  }

  /**
   * Habilita/deshabilita la reconciliación
   */
  public toggleRecon(enabled: boolean): void {
    this._isReconEnabled = enabled
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza la expiración de sesión
   */
  public updateSessionExpiry(seconds: number): void {
    const validated = z.number().min(60).max(7200).parse(seconds)
    this._sessionExpiry = validated
    this._modifiedAt = new Date()
  }

  /**
   * Habilita/deshabilita información extendida de tarjeta
   */
  public toggleExtendedCardInfo(enabled: boolean): void {
    this._isExtendedCardInfoEnabled = enabled
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza la configuración de información extendida de tarjeta
   */
  public updateExtendedCardInfoConfig(config: ExtendedCardInfoConfig): void {
    const validated = ExtendedCardInfoConfigSchema.parse(config)
    this._extendedCardInfoConfig = validated
    this._modifiedAt = new Date()
  }

  /**
   * Habilita/deshabilita tokenización de red
   */
  public toggleNetworkTokenization(enabled: boolean): void {
    this._isNetworkTokenizationEnabled = enabled
    this._modifiedAt = new Date()
  }

  /**
   * Habilita/deshabilita Click to Pay
   */
  public toggleClickToPay(enabled: boolean): void {
    this._isClickToPayEnabled = enabled
    this._modifiedAt = new Date()
  }

  /**
   * Configura conector de impuestos
   */
  public configureTaxConnector(connectorId: string, enabled: boolean): void {
    this._taxConnectorId = connectorId
    this._isTaxConnectorEnabled = enabled
    this._modifiedAt = new Date()
  }

  /**
   * Añade dominio verificado para Apple Pay
   */
  public addApplePayVerifiedDomain(domain: string): void {
    const validated = z.string().url().parse(domain)
    
    if (!this._applepayVerifiedDomains) {
      this._applepayVerifiedDomains = []
    }
    
    if (!this._applepayVerifiedDomains.includes(validated)) {
      this._applepayVerifiedDomains.push(validated)
      this._modifiedAt = new Date()
    }
  }

  /**
   * Elimina dominio verificado de Apple Pay
   */
  public removeApplePayVerifiedDomain(domain: string): void {
    if (this._applepayVerifiedDomains) {
      this._applepayVerifiedDomains = this._applepayVerifiedDomains.filter(d => d !== domain)
      this._modifiedAt = new Date()
    }
  }

  /**
   * Verifica si el perfil está completamente configurado
   */
  public isFullyConfigured(): boolean {
    return !!(
      this._profileName &&
      this._returnUrl &&
      this._webhookDetails?.webhook_url
    )
  }

  /**
   * Verifica si los webhooks están configurados
   */
  public hasWebhooksConfigured(): boolean {
    return !!(this._webhookDetails?.webhook_url)
  }

  /**
   * Verifica si Apple Pay está configurado
   */
  public hasApplePayConfigured(): boolean {
    return !!(this._applepayVerifiedDomains && this._applepayVerifiedDomains.length > 0)
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): MerchantProfileData {
    return {
      profile_id: this._profileId,
      profile_name: this._profileName,
      merchant_id: this._merchantId,
      return_url: this._returnUrl,
      enable_payment_response_hash: this._enablePaymentResponseHash,
      payment_response_hash_key: this._paymentResponseHashKey,
      redirect_to_merchant_with_http_post: this._redirectToMerchantWithHttpPost,
      webhook_details: this._webhookDetails,
      metadata: this._metadata,
      routing_algorithm: this._routingAlgorithm,
      intent_fulfillment_time: this._intentFulfillmentTime,
      frm_routing_algorithm: this._frmRoutingAlgorithm,
      payout_routing_algorithm: this._payoutRoutingAlgorithm,
      is_recon_enabled: this._isReconEnabled,
      applepay_verified_domains: this._applepayVerifiedDomains,
      payment_link_config: this._paymentLinkConfig,
      session_expiry: this._sessionExpiry,
      authentication_connector_details: this._authenticationConnectorDetails,
      payout_link_config: this._payoutLinkConfig,
      is_extended_card_info_enabled: this._isExtendedCardInfoEnabled,
      extended_card_info_config: this._extendedCardInfoConfig,
      use_billing_as_payment_method_billing: this._useBillingAsPaymentMethodBilling,
      collect_shipping_details_from_wallet_connector: this._collectShippingDetailsFromWalletConnector,
      collect_billing_details_from_wallet_connector: this._collectBillingDetailsFromWalletConnector,
      outgoing_webhook_custom_http_headers: this._outgoingWebhookCustomHttpHeaders,
      tax_connector_id: this._taxConnectorId,
      is_tax_connector_enabled: this._isTaxConnectorEnabled,
      is_network_tokenization_enabled: this._isNetworkTokenizationEnabled,
      is_click_to_pay_enabled: this._isClickToPayEnabled,
      order_fulfillment_time: this._orderFulfillmentTime,
      order_fulfillment_time_origin: this._orderFulfillmentTimeOrigin,
      should_collect_cvv_during_payment: this._shouldCollectCvvDuringPayment,
      dynamic_routing_algorithm: this._dynamicRoutingAlgorithm,
      created_at: this._createdAt.toISOString(),
      modified_at: this._modifiedAt.toISOString(),
    }
  }

  /**
   * Convierte a formato para Hyperswitch API
   */
  public toHyperswitchFormat() {
    return {
      profile_id: this._profileId,
      profile_name: this._profileName,
      merchant_id: this._merchantId,
      return_url: this._returnUrl,
      enable_payment_response_hash: this._enablePaymentResponseHash,
      payment_response_hash_key: this._paymentResponseHashKey,
      redirect_to_merchant_with_http_post: this._redirectToMerchantWithHttpPost,
      webhook_details: this._webhookDetails,
      metadata: this._metadata,
      routing_algorithm: this._routingAlgorithm,
      session_expiry: this._sessionExpiry,
      is_recon_enabled: this._isReconEnabled,
      applepay_verified_domains: this._applepayVerifiedDomains,
      payment_link_config: this._paymentLinkConfig,
    }
  }
}