

// Extended interfaces to fix TypeScript errors
export interface PaymentMethodData {
  type?: string // Add missing type property
  card?: CardDetails
  wallet?: WalletDetails
  pay_later?: PayLaterDetails
  bank_redirect?: BankRedirectDetails
  bank_transfer?: BankTransferDetails
  crypto?: CryptoDetails
  bank_debit?: BankDebitDetails
  reward?: RewardDetails
  upi?: UpiDetails
  voucher?: VoucherDetails
  gift_card?: GiftCardDetails
  mobile_payment?: MobilePaymentDetails
}

export interface CardDetails {
  card_number?: string
  card_exp_month?: string
  card_exp_year?: string
  card_holder_name?: string
  card_cvc?: string
  card_issuer?: string
  card_network?: string
  card_type?: string
  card_issuing_country?: string
  bank_code?: string
  nick_name?: string
  last4?: string
  payment_checks?: PaymentChecks
  authentication_data?: AuthenticationData
}

export interface PaymentChecks {
  cvc_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
  address_line1_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
  address_postal_code_check?: 'pass' | 'fail' | 'unavailable' | 'unchecked'
}

export interface AuthenticationData {
  threeds_server_transaction_id?: string
  acs_reference_number?: string
  acs_trans_id?: string
  acs_signed_content?: string
  ds_trans_id?: string
  version?: string
  trans_status?: string
  eci?: string
  cavv?: string
  xid?: string
}

// Extended PaymentResponse interface with missing properties
export interface PaymentResponse {
  payment_id: string
  merchant_id: string
  status: PaymentStatus
  amount: number
  currency: string
  amount_capturable?: number
  amount_received?: number
  connector?: string
  client_secret?: string
  created: string
  updated_at: string // Add missing updated_at property
  description?: string
  metadata?: Record<string, any>
  customer_id?: string
  customer?: CustomerDetails // Add missing customer property
  connector_transaction_id?: string
  payment_method?: PaymentMethodData
  error_code?: string
  error_message?: string
  next_action?: NextActionData
  cancellation_reason?: string
  authentication_type?: string
  statement_descriptor?: string
  capture_method?: 'automatic' | 'manual'
  payment_experience?: PaymentExperience[]
  payment_method_id?: string
  payment_token?: string
  shipping?: ShippingDetails
  billing?: BillingDetails
  manual_retry_allowed?: boolean
  connector_metadata?: Record<string, any>
  feature_metadata?: FeatureMetadata
  reference_id?: string
  payment_link?: PaymentLinkResponse
  business_country?: string
  business_label?: string
  business_sub_label?: string
  allowed_payment_method_types?: PaymentMethod[]
  ephemeral_key?: EphemeralKeyCreateResponse
  manual_retry_allowed_payment_methods?: PaymentMethod[]
  frm_message?: FrmMessage
  refunds?: RefundResponse[] // Add missing refunds property
  disputes?: DisputeResponse[]
  attempt_count?: number
  profile_id?: string
  order_details?: OrderDetails[]
  charges?: Charges
}

export type PaymentStatus = 
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'cancelled'
  | 'succeeded'
  | 'failed'
  | 'partially_captured'
  | 'partially_captured_and_capturable'

export interface CustomerDetails {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  phone_country_code?: string
  description?: string
  created?: string
  metadata?: Record<string, any>
  address?: AddressDetails
  default_payment_method_id?: string
}

export interface RefundResponse {
  refund_id: string
  payment_id: string
  merchant_id: string
  connector_transaction_id: string
  connector: string
  connector_refund_id?: string
  external_reference_id?: string
  refund_type: 'instant' | 'regular'
  total_amount: number
  currency: string
  refund_amount: number
  refund_status: 'failure' | 'manual_review' | 'pending' | 'success'
  sent_to_gateway: boolean
  refund_reason?: string
  failure_reason?: string
  metadata?: Record<string, any>
  error_message?: string
  error_code?: string
  created_at: string
  updated_at: string
  description?: string
  attempt_id: string
  refund_arn?: string
  charges?: Charges
  profile_id?: string
  merchant_connector_id?: string
}

export interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: DisputeStage
  dispute_status: DisputeStatus
  connector: string
  connector_status: string
  connector_dispute_id: string
  connector_reason?: string
  connector_reason_code?: string
  challenge_required_by?: string
  connector_created_at?: string
  connector_updated_at?: string
  created_at: string
  profile_id?: string
  merchant_connector_id?: string
}

export type DisputeStage = 'pre_dispute' | 'dispute' | 'pre_arbitration' | 'arbitration'
export type DisputeStatus = 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'

export interface WalletDetails {
  apple_pay?: ApplePayDetails
  google_pay?: GooglePayDetails
  paypal?: PaypalDetails
  samsung_pay?: SamsungPayDetails
  ali_pay?: AliPayDetails
  we_chat_pay?: WeChatPayDetails
  mb_way?: MbWayDetails
  mobile_pay?: MobilePaymentDetails 
  vipps?: VippsDetails
  dana?: DanaDetails
  gcash?: GcashDetails
  momo?: MomoDetails
  kakao_pay?: KakaoPayDetails
}

export interface ApplePayDetails {
  payment_data?: string
  payment_method?: ApplePayPaymentMethod
  transaction_identifier?: string
}

export interface ApplePayPaymentMethod {
  display_name?: string
  network?: string
  type?: string
}

export interface GooglePayDetails {
  type?: 'google_pay'
  info?: GooglePayPaymentMethodInfo
  tokenization_data?: GooglePayTokenizationData
}

export interface GooglePayPaymentMethodInfo {
  card_network?: string
  card_details?: string
}

export interface GooglePayTokenizationData {
  type?: string
  token?: string
}

export interface PaypalDetails {
  redirect_url?: string
  experience_context?: PaypalExperienceContext
}

export interface PaypalExperienceContext {
  payment_method_preference?: string
  brand_name?: string
  locale?: string
  shipping_preference?: string
  user_action?: string
  return_url?: string
  cancel_url?: string
}

export interface PayLaterDetails {
  klarna?: KlarnaDetails
  affirm?: AffirmDetails
  afterpay_clearpay?: AfterpayClearpayDetails
}

export interface KlarnaDetails {
  billing_country?: string
  purchase_country?: string
}

export interface AffirmDetails {
  billing_country?: string
}

export interface AfterpayClearpayDetails {
  billing_country?: string
}

export interface BankRedirectDetails {
  ideal?: IdealDetails
  sofort?: SofortDetails
  eps?: EpsDetails
  giropay?: GiropayDetails
  przelewy24?: Przelewy24Details
  bancontact?: BancontactDetails
}

export interface IdealDetails {
  bank?: string
  country?: string
}

export interface SofortDetails {
  country?: string
  preferred_language?: string
}

export interface EpsDetails {
  bank?: string
  country?: string
}

export interface GiropayDetails {
  country?: string
}

export interface Przelewy24Details {
  email?: string
  country?: string
}

export interface BancontactDetails {
  country?: string
}

export interface BankTransferDetails {
  account_number?: string
  routing_number?: string
  bank_name?: string
  bank_country_code?: string
  bank_city?: string
}

export interface CryptoDetails {
  pay_currency?: string
  network?: string
}

export interface BankDebitDetails {
  account_number?: string
  routing_number?: string
  bank_account_type?: string
  bank_name?: string
  bank_country_code?: string
  bank_city?: string
}

export interface RewardDetails {
  type?: string
  amount?: number
}

export interface UpiDetails {
  upi_id?: string
}

export interface VoucherDetails {
  type?: string
  number?: string
}

export interface GiftCardDetails {
  type?: string
  number?: string
  pin?: string
}

export interface MobilePaymentDetails {
  type?: string
  number?: string
}

export interface SamsungPayDetails {
  type?: string
}

export interface AliPayDetails {
  type?: string
}

export interface WeChatPayDetails {
  type?: string
}

export interface MbWayDetails {
  telephone_number?: string
}

export interface VippsDetails {
  telephone_number?: string
}

export interface DanaDetails {
  type?: string
}

export interface GcashDetails {
  type?: string
}

export interface MomoDetails {
  type?: string
}

export interface KakaoPayDetails {
  type?: string
}

export interface NextActionData {
  redirect_to_url?: string
  type?: string
  image_data_url?: string
  display_to_timestamp?: number
  three_ds_method_url?: string
  three_ds_method_data?: string
  authorize_url?: string
  qr_code_url?: string
  wait_screen_information?: WaitScreenInformation
}

export interface WaitScreenInformation {
  display_from_timestamp?: number
  display_to_timestamp?: number
}

export interface OrderDetails {
  product_name?: string
  quantity?: number
  amount?: number
  product_img_link?: string
  product_id?: string
  category?: string
  sub_category?: string
  brand?: string
  product_type?: string
}

export interface PaymentExperience {
  payment_experience_type:
    | 'redirect_to_url'
    | 'invoke_sdk_client'
    | 'display_qr_code'
    | 'one_click'
    | 'link_wallet'
    | 'invoke_payment_app'
    | 'display_wait_screen'
    | 'collect_otp'
  eligible_connectors: string[]
}

export interface FeatureMetadata {
  redirect_response?: RedirectResponse
  search_tags?: string[]
  apple_pay_recurring_details?: ApplePayRecurringDetails
}

export interface RedirectResponse {
  param?: string
  json_payload?: Record<string, any>
}

export interface ApplePayRecurringDetails {
  payment_description: string
  regular_billing: ApplePayRegularBillingDetails
  billing_agreement?: string
  management_url: string
}

export interface ApplePayRegularBillingDetails {
  label: string
  amount: number
  currency: string
  recurring_payment_start_date?: string
  recurring_payment_interval_unit?: 'month' | 'day' | 'hour' | 'minute'
  recurring_payment_interval_count?: number
}

export interface PaymentLinkResponse {
  link: string
  payment_link_id: string
}

export interface EphemeralKeyCreateResponse {
  secret: string
  customer_id: string
  created: number
  expires: number
}

export interface FrmMessage {
  frm_name?: string
  frm_transaction_id?: string
  frm_transaction_type?: string
  frm_status?: string
  frm_score?: number
  frm_reason?: Record<string, any>
  frm_error?: string
}

export interface Charges {
  charge_type: string
  charge_amount: number
  charge_currency: string
}

export interface AddressDetails {
  line1?: string
  line2?: string
  line3?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  first_name?: string
  last_name?: string
}

export interface BillingDetails {
  address?: AddressDetails
  phone?: PhoneDetails
  email?: string
}

export interface ShippingDetails {
  address?: AddressDetails
  phone?: PhoneDetails
  name?: string
  email?: string
}

export interface PhoneDetails {
  number?: string
  country_code?: string
}

export type PaymentMethod = string

// Utility functions for working with Hyperswitch data
export class HyperswitchUtils {
  /**
   * Format payment amount for display
   */
  static formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100) // Hyperswitch uses smallest currency unit
  }

  /**
   * Get payment status color for UI
   */
  static getPaymentStatusColor(status: PaymentStatus): string {
    const colors: Record<PaymentStatus, string> = {
      'succeeded': 'text-green-600',
      'processing': 'text-blue-600',
      'requires_capture': 'text-yellow-600',
      'requires_action': 'text-orange-600',
      'requires_confirmation': 'text-purple-600',
      'requires_payment_method': 'text-gray-600',
      'failed': 'text-red-600',
      'cancelled': 'text-gray-500',
      'partially_captured': 'text-yellow-500',
      'partially_captured_and_capturable': 'text-yellow-600',
    }
    return colors[status] || 'text-gray-600'
  }

  /**
   * Get payment status label for display
   */
  static getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      'succeeded': 'Exitoso',
      'processing': 'Procesando',
      'requires_capture': 'Requiere Captura',
      'requires_action': 'Requiere Acción',
      'requires_confirmation': 'Requiere Confirmación',
      'requires_payment_method': 'Requiere Método de Pago',
      'failed': 'Fallido',
      'cancelled': 'Cancelado',
      'partially_captured': 'Parcialmente Capturado',
      'partially_captured_and_capturable': 'Parcial y Capturable',
    }
    return labels[status] || status
  }

  /**
   * Get refund status color for UI
   */
  static getRefundStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'success': 'text-green-600',
      'pending': 'text-yellow-600',
      'manual_review': 'text-orange-600',
      'failure': 'text-red-600',
    }
    return colors[status] || 'text-gray-600'
  }

  /**
   * Get refund status label for display
   */
  static getRefundStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'success': 'Exitoso',
      'pending': 'Pendiente',
      'manual_review': 'Revisión Manual',
      'failure': 'Fallido',
    }
    return labels[status] || status
  }

  /**
   * Check if payment can be captured
   */
  static canCapturePayment(payment: PaymentResponse): boolean {
    return payment.status === 'requires_capture' && !!payment.amount_capturable
  }

  /**
   * Check if payment can be refunded
   */
  static canRefundPayment(payment: PaymentResponse): boolean {
    return payment.status === 'succeeded' || payment.status === 'partially_captured'
  }

  /**
   * Calculate remaining refundable amount
   */
  static getRemainingRefundableAmount(payment: PaymentResponse): number {
    const totalRefunded = payment.refunds?.reduce((sum, refund) => {
      return refund.refund_status === 'success' ? sum + refund.refund_amount : sum
    }, 0) || 0
    
    return Math.max(0, (payment.amount_received || payment.amount) - totalRefunded)
  }

  /**
   * Get payment method display name
   */
  static getPaymentMethodDisplayName(paymentMethod?: PaymentMethodData): string {
    if (!paymentMethod) return 'Desconocido'
    
    if (paymentMethod.card) {
      const card = paymentMethod.card
      return `•••• ${card.last4 || '****'} (${card.card_network || 'Card'})`
    }
    
    if (paymentMethod.wallet) {
      if (paymentMethod.wallet.apple_pay) return 'Apple Pay'
      if (paymentMethod.wallet.google_pay) return 'Google Pay'
      if (paymentMethod.wallet.paypal) return 'PayPal'
      return 'Digital Wallet'
    }
    
    if (paymentMethod.bank_transfer) return 'Bank Transfer'
    if (paymentMethod.bank_redirect) return 'Bank Redirect'
    if (paymentMethod.pay_later) return 'Pay Later'
    if (paymentMethod.crypto) return 'Cryptocurrency'
    
    return paymentMethod.type || 'Payment Method'
  }

  /**
   * Validate webhook signature (implement according to Hyperswitch webhook security)
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // This is a placeholder - implement actual webhook signature validation
    // according to Hyperswitch documentation
    console.warn('Webhook signature validation not implemented')
    return true
  }

  /**
   * Parse webhook event data
   */
  static parseWebhookEvent(payload: any): {
    type: string
    payment?: PaymentResponse
    refund?: RefundResponse
    dispute?: DisputeResponse
  } {
    return {
      type: payload.event_type || payload.type || 'unknown',
      payment: payload.content?.payment || payload.payment,
      refund: payload.content?.refund || payload.refund,
      dispute: payload.content?.dispute || payload.dispute,
    }
  }

  /**
   * Generate payment intent for client-side usage
   */
  static generatePaymentIntent(payment: PaymentResponse): {
    client_secret: string | undefined
    payment_id: string
    amount: number
    currency: string
    status: PaymentStatus
  } {
    return {
      client_secret: payment.client_secret,
      payment_id: payment.payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    }
  }

  /**
   * Convert amount to smallest currency unit (cents)
   */
  static toSmallestUnit(amount: number, currency: string): number {
    // Most currencies use 2 decimal places, but some use 0 or 3
    const zeroCurrencies = ['JPY', 'KRW', 'CLP', 'VND']
    const threeCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND']
    
    if (zeroCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount)
    } else if (threeCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount * 1000)
    } else {
      return Math.round(amount * 100)
    }
  }

  /**
   * Convert amount from smallest currency unit to major unit
   */
  static fromSmallestUnit(amount: number, currency: string): number {
    const zeroCurrencies = ['JPY', 'KRW', 'CLP', 'VND']
    const threeCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND']
    
    if (zeroCurrencies.includes(currency.toUpperCase())) {
      return amount
    } else if (threeCurrencies.includes(currency.toUpperCase())) {
      return amount / 1000
    } else {
      return amount / 100
    }
  }
}

// API Client Configuration
export interface HyperswitchConfig {
  apiKey: string
  baseUrl: string
  publishableKey?: string
  webhookSecret?: string
  environment: 'sandbox' | 'production'
}

// Default configuration
export const defaultConfig: HyperswitchConfig = {
  apiKey: process.env.HYPERSWITCH_API_KEY || '',
  baseUrl: process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
}

// Error handling
export class HyperswitchError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public param?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'HyperswitchError'
  }
}

// API Client class for Hyperswitch operations
export class HyperswitchAPI {
  private static config = defaultConfig

  /**
   * Get a payment by ID
   */
  static async getPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default', // Replace with actual merchant ID
          'x-profile-id': 'default', // Replace with actual profile ID
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to fetch payment',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while fetching payment',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Capture a payment
   */
  static async capturePayment(
    paymentId: string,
    captureData: {
      amount?: number
      statement_descriptor?: string
    }
  ): Promise<PaymentResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
        body: JSON.stringify(captureData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to capture payment',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while capturing payment',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Cancel a payment
   */
  static async cancelPayment(
    paymentId: string,
    cancelData: {
      cancellation_reason?: string
    }
  ): Promise<PaymentResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
        body: JSON.stringify(cancelData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to cancel payment',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while canceling payment',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Create a payment
   */
  static async createPayment(paymentData: {
    amount: number
    currency: string
    customer_id?: string
    description?: string
    payment_method?: PaymentMethodData
    capture_method?: 'automatic' | 'manual'
    confirm?: boolean
    return_url?: string
    metadata?: Record<string, any>
  }): Promise<PaymentResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to create payment',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while creating payment',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Confirm a payment
   */
  static async confirmPayment(
    paymentId: string,
    confirmData: {
      payment_method?: string
      return_url?: string
    }
  ): Promise<PaymentResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
        body: JSON.stringify(confirmData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to confirm payment',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while confirming payment',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * List payments
   */
  static async listPayments(params: {
    limit?: number
    offset?: number
    customer_id?: string
    status?: string[]
    created_after?: string
    created_before?: string
  } = {}): Promise<{
    data: PaymentResponse[]
    has_more: boolean
    total_count: number
  }> {
    try {
      const searchParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','))
          } else {
            searchParams.append(key, String(value))
          }
        }
      })

      const response = await fetch(`/api/hyperswitch/payments?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to list payments',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while listing payments',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Create a refund
   */
  static async createRefund(refundData: {
    payment_id: string
    amount?: number
    reason?: string
    metadata?: Record<string, any>
  }): Promise<RefundResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
        body: JSON.stringify(refundData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to create refund',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while creating refund',
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Get a refund by ID
   */
  static async getRefund(refundId: string): Promise<RefundResponse> {
    try {
      const response = await fetch(`/api/hyperswitch/refunds/${refundId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': 'default',
          'x-profile-id': 'default',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new HyperswitchError(
          error.error?.message || 'Failed to fetch refund',
          error.error?.code,
          error.error?.type,
          undefined,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof HyperswitchError) {
        throw error
      }
      throw new HyperswitchError(
        'Network error occurred while fetching refund',
        'NETWORK_ERROR'
      )
    }
  }
}

// Default export - this is what the import statement is looking for
const Hyperswitch = {
  utils: HyperswitchUtils,
  config: defaultConfig,
  Error: HyperswitchError,
  // API methods
  getPayment: HyperswitchAPI.getPayment,
  capturePayment: HyperswitchAPI.capturePayment,
  cancelPayment: HyperswitchAPI.cancelPayment,
  createPayment: HyperswitchAPI.createPayment,
  confirmPayment: HyperswitchAPI.confirmPayment,
  listPayments: HyperswitchAPI.listPayments,
  createRefund: HyperswitchAPI.createRefund,
  getRefund: HyperswitchAPI.getRefund,
}

export default Hyperswitch