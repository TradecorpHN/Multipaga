// types/hyperswitch.ts
// ──────────────────────────────────────────────────────────────────────────────
// Tipos base según OpenAPI de Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'HNL'
  | 'MXN'
  | 'GTQ'
  | string

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

export type DisputeStatus =
  | 'dispute_opened'
  | 'dispute_expired'
  | 'dispute_accepted'
  | 'dispute_cancelled'
  | 'dispute_challenged'
  | 'dispute_won'
  | 'dispute_lost'

export type DisputeStage =
  | 'pre_dispute'
  | 'dispute'
  | 'pre_arbitration'

export type PaymentMethod =
  | 'card'
  | 'wallet'
  | 'pay_later'
  | 'bank_redirect'
  | 'bank_transfer'
  | 'crypto'
  | 'bank_debit'
  | 'reward'
  | 'upi'
  | 'voucher'
  | 'gift_card'
  | 'mobile_payment'

export type Connector =
  | 'adyenplatform'
  | 'stripe_billing_test'
  | 'phonypay'
  | 'fauxpay'
  | 'pretendpay'
  | 'stripe_test'
  | 'adyen_test'
  | 'checkout_test'
  | 'paypal_test'
  | 'aci'
  | 'adyen'
  | 'airwallex'
  | 'archipel'
  | 'authorizedotnet'
  | 'bambora'
  | 'bamboraapac'
  | 'bankofamerica'
  | 'barclaycard'
  | 'billwerk'
  | 'bitpay'
  | 'bluesnap'
  | 'boku'
  | 'braintree'
  | 'cashtocode'
  | 'chargebee'
  | 'checkout'
  | 'coinbase'
  | 'coingate'
  | 'cryptopay'
  | 'ctp_mastercard'
  | 'ctp_visa'
  | 'cybersource'
  | 'datatrans'
  | 'deutschebank'
  | 'digitalvirgo'
  | 'dlocal'
  | 'ebanx'
  | 'elavon'
  | 'facilitapay'
  | 'fiserv'
  | 'fiservemea'
  | 'fiuu'
  | 'forte'
  | 'getnet'
  | 'globalpay'
  | 'globepay'
  | 'gocardless'
  | 'gpayments'
  | 'hipay'
  | 'helcim'
  | 'hyperswitch_vault'
  | 'inespay'
  | 'iatapay'
  | 'itaubank'
  | 'jpmorgan'
  | 'juspaythreedsserver'
  | 'klarna'
  | 'lafise'
  | 'mifinity'
  | 'mollie'
  | 'moneris'
  | 'multisafepay'
  | 'netcetera'
  | 'nexinets'
  | 'nexixpay'
  | 'nmi'
  | 'nomupay'
  | 'noon'
  | 'novalnet'
  | 'nuvei'
  | 'opennode'
  | 'paybox'
  | 'payme'
  | 'payone'
  | 'paypal'
  | 'paystack'
  | 'payu'
  | 'placetopay'
  | 'powertranz'
  | 'prophetpay'
  | 'rapyd'
  | 'razorpay'
  | 'recurly'
  | 'redsys'
  | 'riskified'
  | 'shift4'
  | 'signifyd'
  | 'square'
  | 'stax'
  | 'stripe'
  | 'stripebilling'
  | 'trustpay'
  | 'tokenio'
  | 'tsys'
  | 'volt'
  | 'wellsfargo'
  | 'wise'
  | 'worldline'
  | 'worldpay'
  | 'worldpayvantiv'
  | 'worldpayxml'
  | 'xendit'
  | 'zen'
  | 'plaid'
  | 'zsl';



// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Payments
// ──────────────────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  amount: number
  currency: Currency
  customer_id?: string
  description?: string
  statement_descriptor?: string
  statement_descriptor_suffix?: string
  metadata?: Record<string, any>
  return_url?: string
  payment_method?: PaymentMethodData
  payment_method_type?: PaymentMethod
  connector?: Connector[]
  capture_method?: 'automatic' | 'manual'
  confirm?: boolean
  customer?: CustomerDetails
  billing?: BillingDetails
  shipping?: ShippingDetails
  business_country?: string
  business_label?: string
  profile_id?: string
}

export interface PaymentResponse {
  payment_id: string
  merchant_id: string
  status: PaymentStatus
  amount: number
  currency: Currency
  amount_capturable?: number
  amount_received?: number
  connector?: string
  client_secret?: string
  created: string
  description?: string
  metadata?: Record<string, any>
  order_details?: OrderDetails[]
  customer_id?: string
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
}

export interface PaymentMethodData {
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
}

export interface WalletDetails {
  apple_pay?: ApplePayDetails
  google_pay?: GooglePayDetails
  paypal?: PaypalDetails
  samsung_pay?: SamsungPayDetails
  // ... otros wallets
}

export interface ApplePayDetails {
  payment_data?: string
  payment_method?: ApplePayPaymentMethod
  transaction_identifier?: string
}

export interface GooglePayDetails {
  type?: 'google_pay'
  info?: GooglePayPaymentMethodInfo
  tokenization_data?: GooglePayTokenizationData
}

export interface PaypalDetails {
  redirect_url?: string
  experience_context?: PaypalExperienceContext
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Customer
// ──────────────────────────────────────────────────────────────────────────────

export interface CustomerDetails {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  phone_country_code?: string
  description?: string
  metadata?: Record<string, any>
}

export interface CustomerRequest {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  phone_country_code?: string
  description?: string
  metadata?: Record<string, any>
  address?: AddressDetails
}

export interface CustomerResponse {
  customer_id: string
  name?: string
  email?: string
  phone?: string
  phone_country_code?: string
  description?: string
  created: string
  metadata?: Record<string, any>
  address?: AddressDetails
  default_payment_method_id?: string
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Address, Billing y Shipping
// ──────────────────────────────────────────────────────────────────────────────

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


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Disputes
// ──────────────────────────────────────────────────────────────────────────────

export interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: Currency
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

export interface DisputeListRequest {
  limit?: number
  dispute_status?: DisputeStatus
  dispute_stage?: DisputeStage
  reason?: string
  connector?: string
  received_time?: string
  received_time_lt?: string
  received_time_gt?: string
  received_time_lte?: string
  received_time_gte?: string
}

export interface DisputeEvidenceRequest {
  dispute_id: string
  evidence_type:
    | 'transaction_receipt'
    | 'customer_communication'
    | 'shipping_documentation'
    | 'cancellation_policy'
    | 'refund_policy'
    | 'other'
  evidence_description: string
  customer_email?: string
  shipping_tracking_number?: string
  refund_amount?: number
  additional_notes?: string
  evidence_files: string[]
  submitted_at: string
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Refunds
// ──────────────────────────────────────────────────────────────────────────────

export interface RefundRequest {
  payment_id: string
  amount?: number
  reason?: string
  refund_type?: 'instant' | 'regular'
  metadata?: Record<string, any>
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
  currency: Currency
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


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Webhooks
// ──────────────────────────────────────────────────────────────────────────────

export interface WebhookRequest {
  webhook_id?: string
  webhook_url: string
  webhook_events: WebhookEvent[]
  webhook_username?: string
  webhook_password?: string
  webhook_headers?: Record<string, string>
  disabled?: boolean
}

export type WebhookEvent =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_processing'
  | 'action_required'
  | 'refund_succeeded'
  | 'refund_failed'
  | 'dispute_opened'
  | 'dispute_challenged'
  | 'dispute_won'
  | 'dispute_lost'

export interface WebhookResponse {
  webhook_id: string
  merchant_id: string
  webhook_url: string
  webhook_events: WebhookEvent[]
  webhook_username?: string
  webhook_headers?: Record<string, string>
  disabled: boolean
  created: string
  last_modified: string
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para Analytics
// ──────────────────────────────────────────────────────────────────────────────

export interface AnalyticsRequest {
  time_range?: {
    start_time?: string
    end_time?: string
  }
  granularity?: {
    granularity_unit: 'minute' | 'hour' | 'day' | 'week' | 'month'
    jump?: number
  }
  group_by_names?: string[]
  filters?: AnalyticsFilter[]
}

export interface AnalyticsFilter {
  dimension: string
  values: string[]
}

export interface AnalyticsResponse {
  queryData: AnalyticsData[]
  metaData: AnalyticsMetaData[]
}

export interface AnalyticsData {
  time_bucket?: string
  dimensions?: Record<string, string>
  [key: string]: any
}

export interface AnalyticsMetaData {
  column_name: string
  data_type: string
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces adicionales: NextActionData & más
// ──────────────────────────────────────────────────────────────────────────────

export interface NextActionData {
  redirect_to_url?: {
    redirect_to_url: string
    type: 'redirect_to_url'
  }
  display_bank_transfer_information?: {
    bank_transfer_steps_and_charges_details: BankTransferNextStepsData
    type: 'display_bank_transfer_information'
  }
  third_party_sdk_session_token?: {
    session_token: Record<string, any>
    type: 'third_party_sdk_session_token'
  }
  qr_code_information?: {
    image_data_url: string
    qr_code_url?: string
    type: 'qr_code_information'
  }
  wait_screen_information?: {
    display_from_timestamp: number
    display_to_timestamp?: number
    type: 'wait_screen_information'
  }
  fetch_qr_code_information?: {
    qr_code_fetch_url: string
    type: 'fetch_qr_code_information'
  }
  display_voucher_information?: {
    voucher_details: VoucherNextStepData
    type: 'display_voucher_information'
  }
}

export interface BankTransferNextStepsData {
  connector_payment_id: string
  instructions?: BankTransferInstructions[]
}

export interface BankTransferInstructions {
  expected_amount?: number
  expected_currency?: Currency
}

export interface VoucherNextStepData {
  expires_at?: string
  reference?: string
  instructions?: string
}

export interface OrderDetails {
  product_name: string
  quantity: number
  amount: number
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
  currency: Currency
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
  charge_currency: Currency
}


// ──────────────────────────────────────────────────────────────────────────────
// Interfaces para errores y payloads de webhook
// ──────────────────────────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: {
    type: string
    message: string
    code?: string
    reason?: string
    metadata?: Record<string, any>
  }
}

export type WebhookEventData = {
  payment?: PaymentResponse
  refund?: RefundResponse
  dispute?: DisputeResponse
  [key: string]: any
}

export interface WebhookPayload {
  event_type: WebhookEvent
  event_id: string
  created: string
  resource_id: string
  resource: WebhookEventData
  api_version: string
}


// ──────────────────────────────────────────────────────────────────────────────
// Utility types
// ──────────────────────────────────────────────────────────────────────────────

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>


// ──────────────────────────────────────────────────────────────────────────────
// Stubs para los tipos de método de pago que antes faltaban
// ──────────────────────────────────────────────────────────────────────────────

export interface PayLaterDetails      { [key: string]: any }
export interface BankRedirectDetails  { [key: string]: any }
export interface BankTransferDetails  { [key: string]: any }
export interface CryptoDetails        { [key: string]: any }
export interface BankDebitDetails     { [key: string]: any }
export interface RewardDetails        { [key: string]: any }
export interface UpiDetails           { [key: string]: any }
export interface VoucherDetails       { [key: string]: any }
export interface GiftCardDetails      { [key: string]: any }
export interface MobilePaymentDetails { [key: string]: any }

export interface SamsungPayDetails          { [key: string]: any }
export interface PaypalExperienceContext    { [key: string]: any }
export interface ApplePayPaymentMethod      { [key: string]: any }
export interface GooglePayPaymentMethodInfo { [key: string]: any }
export interface GooglePayTokenizationData  { [key: string]: any }
