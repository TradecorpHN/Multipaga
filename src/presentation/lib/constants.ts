// src/presentation/lib/constants.ts
// ──────────────────────────────────────────────────────────────────────────────
// Constants - Constantes globales de la aplicación Multipaga
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Configuración de la aplicación
 */
export const APP_CONFIG = {
  name: 'Multipaga',
  version: '1.0.0',
  description: 'Plataforma de gestión de pagos con Hyperswitch',
  author: 'Multipaga Team',
  repository: 'https://github.com/multipaga/multipaga-dashboard',
  documentation: 'https://docs.multipaga.com',
  support_email: 'support@multipaga.com'
} as const

/**
 * URLs y endpoints
 */
export const API_ENDPOINTS = {
  // Hyperswitch endpoints
  HYPERSWITCH_BASE: process.env.HYPERSWITCH_BASE_URL || 'https://sandbox.hyperswitch.io',
  HYPERSWITCH_API_VERSION: 'v1',
  
  // Endpoints internos
  INTERNAL_API_BASE: '/api',
  PAYMENTS: '/payments',
  REFUNDS: '/refunds', 
  DISPUTES: '/disputes',
  CUSTOMERS: '/customers',
  PAYMENT_METHODS: '/payment_methods',
  PROFILES: '/profiles',
  CONNECTORS: '/connectors',
  RECONCILIATION: '/reconciliation',
  WEBHOOKS: '/webhooks',
  ANALYTICS: '/analytics',
  
  // Proxy endpoints
  HYPERSWITCH_PROXY: '/api/hyperswitch'
} as const

/**
 * Configuración de autenticación
 */
export const AUTH_CONFIG = {
  SESSION_TIMEOUT_MINUTES: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  PASSWORD_MIN_LENGTH: 8,
  API_KEY_LENGTH: 64,
  REFRESH_TOKEN_THRESHOLD_MINUTES: 5
} as const

/**
 * Configuración de paginación
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
  SIZES: [10, 20, 50, 100] as const
} as const

/**
 * Limites de la aplicación
 */
export const LIMITS = {
  // Montos
  MIN_PAYMENT_AMOUNT: 1, // 1 centavo
  MAX_PAYMENT_AMOUNT: 999999999, // ~$10M
  MIN_REFUND_AMOUNT: 1,
  MAX_REFUND_AMOUNT: 999999999,
  
  // Archivos
  MAX_FILE_SIZE_MB: 10,
  MAX_FILES_PER_UPLOAD: 5,
  ALLOWED_FILE_TYPES: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'],
  
  // Strings
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_METADATA_KEY_LENGTH: 40,
  MAX_METADATA_VALUE_LENGTH: 500,
  MAX_METADATA_KEYS: 50,
  
  // Búsqueda
  MIN_SEARCH_QUERY_LENGTH: 2,
  MAX_SEARCH_RESULTS: 1000,
  SEARCH_DEBOUNCE_MS: 300
} as const

/**
 * Timeouts y intervalos
 */
export const TIMEOUTS = {
  API_REQUEST_TIMEOUT_MS: 30000, // 30 segundos
  WEBHOOK_TIMEOUT_MS: 10000, // 10 segundos
  POLLING_INTERVAL_MS: 5000, // 5 segundos
  NOTIFICATION_DURATION_MS: 5000, // 5 segundos
  CACHE_TTL_MS: 300000, // 5 minutos
  IDLE_TIMEOUT_MS: 1800000 // 30 minutos
} as const

/**
 * Estados de payment según Hyperswitch
 */
export const PAYMENT_STATUSES = {
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  REQUIRES_CONFIRMATION: 'requires_confirmation', 
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
  REQUIRES_CAPTURE: 'requires_capture',
  CANCELLED: 'cancelled',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  PARTIALLY_CAPTURED: 'partially_captured',
  PARTIALLY_CAPTURED_AND_CAPTURABLE: 'partially_captured_and_capturable'
} as const

/**
 * Estados de refund según Hyperswitch
 */
export const REFUND_STATUSES = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILURE: 'failure',
  MANUAL_REVIEW: 'manual_review'
} as const

/**
 * Estados de dispute según Hyperswitch
 */
export const DISPUTE_STATUSES = {
  OPENED: 'dispute_opened',
  EXPIRED: 'dispute_expired',
  ACCEPTED: 'dispute_accepted',
  CANCELLED: 'dispute_cancelled',
  CHALLENGED: 'dispute_challenged',
  WON: 'dispute_won',
  LOST: 'dispute_lost'
} as const

/**
 * Etapas de dispute
 */
export const DISPUTE_STAGES = {
  PRE_DISPUTE: 'pre_dispute',
  DISPUTE: 'dispute', 
  PRE_ARBITRATION: 'pre_arbitration'
} as const

/**
 * Tipos de evidencia para disputas
 */
export const EVIDENCE_TYPES = {
  TRANSACTION_RECEIPT: 'transaction_receipt',
  CUSTOMER_COMMUNICATION: 'customer_communication',
  SHIPPING_DOCUMENTATION: 'shipping_documentation',
  CANCELLATION_POLICY: 'cancellation_policy',
  REFUND_POLICY: 'refund_policy',
  OTHER: 'other'
} as const

/**
 * Métodos de pago soportados
 */
export const PAYMENT_METHODS = {
  CARD: 'card',
  WALLET: 'wallet',
  BANK_REDIRECT: 'bank_redirect',
  BANK_TRANSFER: 'bank_transfer',
  PAY_LATER: 'pay_later',
  CRYPTO: 'crypto',
  UPI: 'upi',
  VOUCHER: 'voucher',
  GIFT_CARD: 'gift_card',
  MOBILE_PAYMENT: 'mobile_payment'
} as const

/**
 * Redes de tarjetas
 */
export const CARD_NETWORKS = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMERICAN_EXPRESS: 'amex',
  DISCOVER: 'discover',
  DINERS_CLUB: 'diners',
  JCB: 'jcb',
  UNION_PAY: 'unionpay'
} as const

/**
 * Tipos de wallet
 */
export const WALLET_TYPES = {
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  PAYPAL: 'paypal',
  SAMSUNG_PAY: 'samsung_pay',
  ALI_PAY: 'ali_pay',
  WE_CHAT_PAY: 'we_chat_pay'
} as const

/**
 * Conectores principales
 */
export const CONNECTORS = {
  // Producción
  STRIPE: 'stripe',
  ADYEN: 'adyen',
  CHECKOUT: 'checkout',
  PAYPAL: 'paypal',
  BRAINTREE: 'braintree',
  SQUARE: 'square',
  CYBERSOURCE: 'cybersource',
  WORLDPAY: 'worldpay',
  RAZORPAY: 'razorpay',
  PAYU: 'payu',
  
  // Test
  STRIPE_TEST: 'stripe_test',
  ADYEN_TEST: 'adyen_test',
  CHECKOUT_TEST: 'checkout_test',
  PAYPAL_TEST: 'paypal_test',
  PHONYPAY: 'phonypay',
  FAUXPAY: 'fauxpay',
  PRETENDPAY: 'pretendpay'
} as const

/**
 * Monedas soportadas
 */
export const CURRENCIES = {
  // Principales
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  
  // América Latina
  HNL: 'HNL', // Lempira hondureño
  GTQ: 'GTQ', // Quetzal guatemalteco
  CRC: 'CRC', // Colón costarricense
  MXN: 'MXN', // Peso mexicano
  BRL: 'BRL', // Real brasileño
  ARS: 'ARS', // Peso argentino
  COP: 'COP', // Peso colombiano
  PEN: 'PEN', // Sol peruano
  CLP: 'CLP', // Peso chileno
  
  // Otras
  CAD: 'CAD',
  AUD: 'AUD',
  JPY: 'JPY',
  CHF: 'CHF'
} as const

/**
 * Códigos de país (ISO 3166-1 alpha-2)
 */
export const COUNTRIES = {
  // América Central
  HN: 'HN', // Honduras
  GT: 'GT', // Guatemala
  CR: 'CR', // Costa Rica
  NI: 'NI', // Nicaragua
  PA: 'PA', // Panamá
  SV: 'SV', // El Salvador
  BZ: 'BZ', // Belice
  
  // América del Norte
  US: 'US', // Estados Unidos
  CA: 'CA', // Canadá
  MX: 'MX', // México
  
  // América del Sur
  BR: 'BR', // Brasil
  AR: 'AR', // Argentina
  CL: 'CL', // Chile
  CO: 'CO', // Colombia
  PE: 'PE', // Perú
  
  // Europa
  GB: 'GB', // Reino Unido
  DE: 'DE', // Alemania
  FR: 'FR', // Francia
  ES: 'ES', // España
  IT: 'IT', // Italia
  NL: 'NL'  // Países Bajos
} as const

/**
 * Configuración de notificaciones
 */
export const NOTIFICATIONS = {
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  POSITIONS: {
    TOP_RIGHT: 'top-right',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_LEFT: 'bottom-left',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center'
  },
  DEFAULT_DURATION: 5000,
  MAX_NOTIFICATIONS: 5
} as const

/**
 * Configuración de theme/UI
 */
export const UI_CONFIG = {
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  },
  ANIMATION_DURATION: 200,
  LOADING_DELAY: 300,
  COLORS: {
    PRIMARY: '#0570de',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6'
  }
} as const

/**
 * Eventos de webhook soportados
 */
export const WEBHOOK_EVENTS = {
  // Pagos
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_CANCELLED: 'payment_cancelled',
  PAYMENT_PROCESSING: 'payment_processing',
  ACTION_REQUIRED: 'action_required',
  
  // Reembolsos
  REFUND_SUCCEEDED: 'refund_succeeded',
  REFUND_FAILED: 'refund_failed',
  
  // Disputas
  DISPUTE_OPENED: 'dispute_opened',
  DISPUTE_CHALLENGED: 'dispute_challenged',
  DISPUTE_WON: 'dispute_won',
  DISPUTE_LOST: 'dispute_lost'
} as const

/**
 * Configuración de analytics
 */
export const ANALYTICS = {
  RETENTION_DAYS: 90,
  AGGREGATION_INTERVALS: {
    HOUR: 'hour',
    DAY: 'day', 
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year'
  },
  METRICS: {
    PAYMENT_VOLUME: 'payment_volume',
    PAYMENT_COUNT: 'payment_count',
    SUCCESS_RATE: 'success_rate',
    AVERAGE_AMOUNT: 'average_amount',
    REFUND_RATE: 'refund_rate',
    DISPUTE_RATE: 'dispute_rate'
  }
} as const

/**
 * Configuración de reconciliación
 */
export const RECONCILIATION = {
  BATCH_SIZE: 1000,
  MATCH_THRESHOLD: 95, // Porcentaje de coincidencia mínimo
  AUTO_APPROVE_THRESHOLD: 98,
  RETENTION_DAYS: 365,
  PROCESSING_WINDOW_HOURS: 24
} as const

/**
 * Configuración de rate limiting
 */
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_HOUR: 1000,
  BURST_LIMIT: 10,
  WINDOW_SIZE_MS: 60000 // 1 minuto
} as const

/**
 * Configuración de logging
 */
export const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },
  MAX_LOG_SIZE_MB: 100,
  LOG_RETENTION_DAYS: 30,
  STRUCTURED_LOGGING: true
} as const

/**
 * Configuración de cache
 */
export const CACHE = {
  TTL_SHORT: 60, // 1 minuto
  TTL_MEDIUM: 300, // 5 minutos
  TTL_LONG: 3600, // 1 hora
  TTL_VERY_LONG: 86400, // 24 horas
  MAX_SIZE_MB: 100
} as const

/**
 * Expresiones regulares comunes
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  CARD_NUMBER: /^[0-9]{13,19}$/,
  CVV: /^[0-9]{3,4}$/,
  EXPIRY_MONTH: /^(0[1-9]|1[0-2])$/,
  EXPIRY_YEAR: /^[0-9]{2,4}$/,
  PAYMENT_ID: /^pay_[a-zA-Z0-9]{26}$/,
  REFUND_ID: /^ref_[a-zA-Z0-9]{26}$/,
  CUSTOMER_ID: /^cus_[a-zA-Z0-9_]{1,64}$/,
  API_KEY: /^[a-zA-Z0-9_]{32,}$/
} as const

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  UNAUTHORIZED: 'No tienes autorización para realizar esta acción.',
  FORBIDDEN: 'Acceso denegado.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos.',
  INTERNAL_ERROR: 'Error interno del servidor. Intenta nuevamente.',
  TIMEOUT: 'La operación ha excedido el tiempo límite.',
  RATE_LIMITED: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
  MAINTENANCE: 'El sistema está en mantenimiento. Intenta más tarde.'
} as const

/**
 * Configuración de desarrollo
 */
export const DEV_CONFIG = {
  MOCK_API_DELAY_MS: 1000,
  ENABLE_DEVTOOLS: true,
  LOG_LEVEL: 'debug',
  SHOW_PERFORMANCE_METRICS: true
} as const

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_WEBHOOKS: true,
  ENABLE_DISPUTES: true,
  ENABLE_RECONCILIATION: true,
  ENABLE_MULTI_CURRENCY: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_EXPORT: true,
  ENABLE_ADVANCED_FILTERS: true,
  ENABLE_REAL_TIME_UPDATES: true
} as const