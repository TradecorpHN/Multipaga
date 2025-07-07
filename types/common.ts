// types/common.ts
// ──────────────────────────────────────────────────────────────────────────────
// Tipos comunes para la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

// Tipos de sesión y autenticación
export interface SessionData {
  merchant_id: string
  api_key: string
  profile_id?: string
  publishable_key?: string
  business_profile?: BusinessProfile
  expires_at: string
}

export interface BusinessProfile {
  profile_id: string
  profile_name: string
  merchant_id: string
  return_url?: string
  enable_payment_response_hash: boolean
  payment_response_hash_key?: string
  redirect_to_merchant_with_http_post: boolean
  webhook_details?: WebhookDetails
  metadata?: Record<string, any>
  routing_algorithm?: RoutingAlgorithm
  intent_fulfillment_time?: number
  frm_routing_algorithm?: FrmRoutingAlgorithm
  payout_routing_algorithm?: PayoutRoutingAlgorithm
  is_recon_enabled: boolean
  applepay_verified_domains?: string[]
  payment_link_config?: PaymentLinkConfig
  session_expiry: number
  authentication_connector_details?: AuthenticationConnectorDetails
  payout_link_config?: PayoutLinkConfig
  is_extended_card_info_enabled?: boolean
  extended_card_info_config?: ExtendedCardInfoConfig
  use_billing_as_payment_method_billing?: boolean
  collect_shipping_details_from_wallet_connector?: boolean
  collect_billing_details_from_wallet_connector?: boolean
  outgoing_webhook_custom_http_headers?: Record<string, string>
  tax_connector_id?: string
  is_tax_connector_enabled: boolean
  is_network_tokenization_enabled: boolean
  is_click_to_pay_enabled?: boolean
  order_fulfillment_time?: number
  order_fulfillment_time_origin?: string
  should_collect_cvv_during_payment?: boolean
  dynamic_routing_algorithm?: DynamicRoutingAlgorithm
}

export interface WebhookDetails {
  webhook_version?: string
  webhook_username?: string
  webhook_password?: string
  webhook_url?: string
  payment_created_enabled?: boolean
  payment_succeeded_enabled?: boolean
  payment_failed_enabled?: boolean
}

// Tipos de configuración
export interface AppConfig {
  hyperswitch: {
    baseUrl: string
    apiVersion: string
    timeout: number
  }
  features: {
    enableDisputes: boolean
    enableRefunds: boolean
    enableWebhooks: boolean
    enableAnalytics: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: 'es' | 'en'
    currency: string
    dateFormat: string
  }
}

// Tipos de navegación
export interface NavItem {
  name: string
  href: string
  icon?: string
  badge?: string | number
  children?: NavItem[]
  external?: boolean
}

export interface BreadcrumbItem {
  name: string
  href?: string
  current?: boolean
}

// Tipos de notificaciones
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: string
  url?: string
}

// Tipos de formularios
export interface FormField {
  name: string
  label: string
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'file'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: { label: string; value: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => boolean | string
  }
}

export interface FormData {
  [key: string]: any
}

export interface FormErrors {
  [key: string]: string
}

// Tipos de tabla
export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => React.ReactNode
}

export interface TableRow {
  [key: string]: any
}

export interface TableProps {
  columns: TableColumn[]
  data: TableRow[]
  loading?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onRowClick?: (row: TableRow) => void
  emptyMessage?: string
}

// Tipos de filtros
export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface DateRange {
  start: Date
  end: Date
}

export interface FilterState {
  search?: string
  dateRange?: DateRange
  status?: string[]
  connector?: string[]
  currency?: string[]
  [key: string]: any
}

// Tipos de estadísticas
export interface StatCard {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon?: string
  color?: string
  format?: 'currency' | 'number' | 'percentage'
}

export interface ChartData {
  label: string
  value: number
  color?: string
}

export interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
}

// Tipos de modales
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  type?: 'danger' | 'warning' | 'info'
}

// Tipos de loading
export interface LoadingState {
  isLoading: boolean
  error?: string
  lastUpdated?: Date
}

// Tipos de paginación
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

// Tipos de API Response
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: PaginationInfo
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// Tipos para archivos
export interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  url?: string
  error?: string
}

export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
}

// Tipos de búsqueda
export interface SearchResult {
  id: string
  type: 'payment' | 'customer' | 'dispute' | 'refund'
  title: string
  subtitle?: string
  url: string
  relevance: number
}

export interface SearchFilters {
  types?: string[]
  dateRange?: DateRange
  [key: string]: any
}

// Tipos de export
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  fields?: string[]
  filters?: FilterState
  dateRange?: DateRange
}

// Tipos de webhook
export interface WebhookEvent {
  id: string
  type: string
  data: any
  timestamp: string
  processed: boolean
  retries: number
  lastRetry?: string
  error?: string
}

// Interfaces para formularios específicos
export interface PaymentFormData {
  amount: number
  currency: string
  customer?: {
    email?: string
    name?: string
    phone?: string
  }
  description?: string
  payment_method_type?: string
  return_url?: string
  metadata?: Record<string, any>
}

export interface RefundFormData {
  payment_id: string
  amount?: number
  reason?: string
  notify_customer?: boolean
}

export interface CustomerFormData {
  name?: string
  email?: string
  phone?: string
  phone_country_code?: string
  description?: string
  metadata?: Record<string, any>
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
}

// Tipos de validación
export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface ValidationSchema {
  [field: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Preferencias de usuario
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'es' | 'en'
  timezone: string
  dateFormat: string
  currency: string
  notifications: {
    email: boolean
    browser: boolean
    webhook: boolean
  }
  dashboard: {
    defaultDateRange: string
    autoRefresh: boolean
    refreshInterval: number
  }
}

// Logs y auditoría
export interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string
  user_id?: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, any>
}

// Métricas
export interface Metric {
  name: string
  value: number
  unit?: string
  timestamp: string
  labels?: Record<string, string>
}

export interface MetricSeries {
  metric: string
  data: { timestamp: string; value: number }[]
  unit?: string
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// ──────────────────────────────────────────────────────────────────────────────
// Stubs / alias para tipos de Hyperswitch OpenAPI que faltaban
// ──────────────────────────────────────────────────────────────────────────────

export type RoutingAlgorithm = any
export type FrmRoutingAlgorithm = any
export type PayoutRoutingAlgorithm = any
export type DynamicRoutingAlgorithm = any

export type PaymentLinkConfig = any
export type PayoutLinkConfig = any

export interface AuthenticationConnectorDetails {
  authentication_connectors: string[]
  three_ds_requestor_url: string
  three_ds_requestor_app_url?: string
}

export interface ExtendedCardInfoConfig {
  public_key: string
  ttl_in_secs?: number
}

// Re-export commonly used types
export type { ReactNode } from 'react'
