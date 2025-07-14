// Definir la interface unificada que combine ambos requerimientos
export interface PaymentFiltersInput {
  // Campos opcionales de filtrado (lo que espera PaymentFilters)
  status?: string[]
  search?: string
  currency?: string[]
  customer_id?: string
  capture_method?: string[]
  customer_email?: string
  amount_min?: number
  amount_max?: number
  created_from?: string
  created_to?: string
  connector?: string
  has_disputes?: boolean
}

export interface PaymentFiltersWithPagination extends PaymentFiltersInput {
  // Campos requeridos para la API (lo que usa PaymentList internamente)
  offset: number
  limit: number
  sort_by: 'amount' | 'status' | 'created'
  sort_order: 'asc' | 'desc'
  metadata?: Record<string, string>
}