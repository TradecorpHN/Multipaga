// src/domain/value-objects/PaymentStatus.ts
// ──────────────────────────────────────────────────────────────────────────────
// PaymentStatus Value Object - Representa los estados de pagos según Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

/**
 * PaymentStatus Value Object
 * 
 * Representa los diferentes estados que puede tener un pago en Hyperswitch,
 * incluyendo validaciones de transiciones y lógica de negocio.
 */
export class PaymentStatus {
  private static readonly VALID_STATUSES = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'cancelled',
    'succeeded',
    'failed',
    'partially_captured',
    'partially_captured_and_capturable'
  ] as const

  private static readonly STATUS_DESCRIPTIONS = {
    'requires_payment_method': 'Requiere método de pago - El pago necesita un método de pago',
    'requires_confirmation': 'Requiere confirmación - El pago debe ser confirmado',
    'requires_action': 'Requiere acción - Se necesita acción adicional del cliente',
    'processing': 'Procesando - El pago está siendo procesado',
    'requires_capture': 'Requiere captura - El pago fue autorizado y requiere captura',
    'cancelled': 'Cancelado - El pago fue cancelado',
    'succeeded': 'Exitoso - El pago se completó exitosamente',
    'failed': 'Fallido - El pago falló',
    'partially_captured': 'Parcialmente capturado - Solo se capturó parte del monto autorizado',
    'partially_captured_and_capturable': 'Parcialmente capturado y capturable - Parte capturada, parte disponible'
  } as const

  private static readonly STATUS_CATEGORIES = {
    pending: ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'],
    authorized: ['requires_capture'],
    successful: ['succeeded', 'partially_captured', 'partially_captured_and_capturable'],
    failed: ['failed', 'cancelled'],
    actionable: ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture']
  } as const

  private static readonly FINAL_STATUSES = [
    'succeeded',
    'failed', 
    'cancelled'
  ] as const

  private static readonly CAPTURABLE_STATUSES = [
    'requires_capture',
    'partially_captured_and_capturable'
  ] as const

  private static readonly CANCELLABLE_STATUSES = [
    'requires_payment_method',
    'requires_confirmation', 
    'requires_action',
    'processing',
    'requires_capture',
    'partially_captured_and_capturable'
  ] as const

  private constructor(private readonly _value: string) {
    if (!PaymentStatus.isValid(_value)) {
      throw new Error(`Estado de pago inválido: ${_value}`)
    }
  }

  /**
   * Crea una instancia de PaymentStatus desde un string
   */
  public static fromString(value: string): PaymentStatus {
    return new PaymentStatus(value.toLowerCase())
  }

  /**
   * Verifica si un valor es un estado de pago válido
   */
  public static isValid(value: string): value is typeof PaymentStatus.VALID_STATUSES[number] {
    return PaymentStatus.VALID_STATUSES.includes(value.toLowerCase() as any)
  }

  /**
   * Obtiene todos los estados válidos
   */
  public static getAllStatuses(): readonly string[] {
    return PaymentStatus.VALID_STATUSES
  }

  /**
   * Obtiene estados por categoría
   */
  public static getByCategory(category: keyof typeof PaymentStatus.STATUS_CATEGORIES): readonly string[] {
    return PaymentStatus.STATUS_CATEGORIES[category]
  }

  /**
   * Obtiene estados finales
   */
  public static getFinalStatuses(): readonly string[] {
    return PaymentStatus.FINAL_STATUSES
  }

  /**
   * Obtiene estados que permiten captura
   */
  public static getCapturableStatuses(): readonly string[] {
    return PaymentStatus.CAPTURABLE_STATUSES
  }

  /**
   * Obtiene estados que permiten cancelación
   */
  public static getCancellableStatuses(): readonly string[] {
    return PaymentStatus.CANCELLABLE_STATUSES
  }

  /**
   * Obtiene el valor del estado
   */
  public get value(): string {
    return this._value
  }

  /**
   * Obtiene la descripción del estado
   */
  public get description(): string {
    return PaymentStatus.STATUS_DESCRIPTIONS[this._value as keyof typeof PaymentStatus.STATUS_DESCRIPTIONS]
  }

  /**
   * Verifica si el pago está pendiente
   */
  public isPending(): boolean {
    return PaymentStatus.STATUS_CATEGORIES.pending.includes(this._value as any)
  }

  /**
   * Verifica si el pago está autorizado (pero no capturado)
   */
  public isAuthorized(): boolean {
    return PaymentStatus.STATUS_CATEGORIES.authorized.includes(this._value as any)
  }

  /**
   * Verifica si el pago es exitoso
   */
  public isSuccessful(): boolean {
    return PaymentStatus.STATUS_CATEGORIES.successful.includes(this._value as any)
  }

  /**
   * Verifica si el pago falló
   */
  public isFailed(): boolean {
    return PaymentStatus.STATUS_CATEGORIES.failed.includes(this._value as any)
  }

  /**
   * Verifica si el pago requiere acción
   */
  public requiresAction(): boolean {
    return this._value === 'requires_action'
  }

  /**
   * Verifica si el pago está en estado final
   */
  public isFinal(): boolean {
    return PaymentStatus.FINAL_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el pago puede ser capturado
   */
  public canCapture(): boolean {
    return PaymentStatus.CAPTURABLE_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el pago puede ser cancelado
   */
  public canCancel(): boolean {
    return PaymentStatus.CANCELLABLE_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el pago puede ser reembolsado
   */
  public canRefund(): boolean {
    return this._value === 'succeeded' || 
           this._value === 'partially_captured' || 
           this._value === 'partially_captured_and_capturable'
  }

  /**
   * Verifica si el pago puede ser autorizado
   */
  public canAuthorize(): boolean {
    return this._value === 'requires_confirmation' || 
           this._value === 'requires_payment_method'
  }

  /**
   * Verifica si el pago está completamente capturado
   */
  public isFullyCaptured(): boolean {
    return this._value === 'succeeded'
  }

  /**
   * Verifica si el pago está parcialmente capturado
   */
  public isPartiallyCaptured(): boolean {
    return this._value === 'partially_captured' || 
           this._value === 'partially_captured_and_capturable'
  }

  /**
   * Verifica si el pago está procesando
   */
  public isProcessing(): boolean {
    return this._value === 'processing'
  }

  /**
   * Verifica si el pago fue cancelado
   */
  public isCancelled(): boolean {
    return this._value === 'cancelled'
  }

  /**
   * Verifica si el pago requiere método de pago
   */
  public requiresPaymentMethod(): boolean {
    return this._value === 'requires_payment_method'
  }

  /**
   * Verifica si el pago requiere confirmación
   */
  public requiresConfirmation(): boolean {
    return this._value === 'requires_confirmation'
  }

  /**
   * Verifica si el pago requiere captura
   */
  public requiresCapture(): boolean {
    return this._value === 'requires_capture'
  }

  /**
   * Verifica si se puede hacer una transición a otro estado
   */
  public canTransitionTo(newStatus: PaymentStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'requires_payment_method': [
        'requires_confirmation', 'requires_action', 'processing', 
        'succeeded', 'failed', 'cancelled'
      ],
      'requires_confirmation': [
        'requires_action', 'processing', 'requires_capture', 
        'succeeded', 'failed', 'cancelled'
      ],
      'requires_action': [
        'processing', 'requires_capture', 'succeeded', 'failed', 'cancelled'
      ],
      'processing': [
        'requires_capture', 'succeeded', 'failed', 'cancelled'
      ],
      'requires_capture': [
        'succeeded', 'partially_captured', 'partially_captured_and_capturable', 'cancelled'
      ],
      'partially_captured': [
        'partially_captured_and_capturable', 'succeeded', 'cancelled'
      ],
      'partially_captured_and_capturable': [
        'succeeded', 'cancelled'
      ],
      'succeeded': [], // Estado final
      'failed': [], // Estado final
      'cancelled': [] // Estado final
    }

    return validTransitions[this._value]?.includes(newStatus._value) ?? false
  }

  /**
   * Obtiene los posibles estados siguientes
   */
  public getPossibleTransitions(): PaymentStatus[] {
    const transitions: Record<string, string[]> = {
      'requires_payment_method': [
        'requires_confirmation', 'requires_action', 'processing', 
        'succeeded', 'failed', 'cancelled'
      ],
      'requires_confirmation': [
        'requires_action', 'processing', 'requires_capture', 
        'succeeded', 'failed', 'cancelled'
      ],
      'requires_action': [
        'processing', 'requires_capture', 'succeeded', 'failed', 'cancelled'
      ],
      'processing': [
        'requires_capture', 'succeeded', 'failed', 'cancelled'
      ],
      'requires_capture': [
        'succeeded', 'partially_captured', 'partially_captured_and_capturable', 'cancelled'
      ],
      'partially_captured': [
        'partially_captured_and_capturable', 'succeeded', 'cancelled'
      ],
      'partially_captured_and_capturable': [
        'succeeded', 'cancelled'
      ],
      'succeeded': [],
      'failed': [],
      'cancelled': []
    }

    return (transitions[this._value] || []).map(status => PaymentStatus.fromString(status))
  }

  /**
   * Obtiene la prioridad del estado (para ordenamiento)
   */
  public getPriority(): number {
    const priorities: Record<string, number> = {
      'failed': 1, // Máxima prioridad - requiere atención
      'requires_action': 2, // Requiere acción del cliente
      'requires_confirmation': 3, // Requiere confirmación
      'requires_payment_method': 4, // Requiere método de pago
      'processing': 5, // En proceso
      'requires_capture': 6, // Autorizado, esperando captura
      'partially_captured_and_capturable': 7, // Parcialmente procesado
      'partially_captured': 8, // Parcialmente capturado
      'cancelled': 9, // Cancelado
      'succeeded': 10 // Exitoso - menor prioridad porque está completo
    }

    return priorities[this._value] || 999
  }

  /**
   * Obtiene el color asociado al estado (para UI)
   */
  public getColor(): string {
    const colors: Record<string, string> = {
      'requires_payment_method': '#f59e0b', // Amarillo - pendiente
      'requires_confirmation': '#f59e0b', // Amarillo - pendiente
      'requires_action': '#f59e0b', // Amarillo - requiere acción
      'processing': '#3b82f6', // Azul - procesando
      'requires_capture': '#8b5cf6', // Púrpura - autorizado
      'succeeded': '#10b981', // Verde - éxito
      'partially_captured': '#059669', // Verde oscuro - parcialmente exitoso
      'partially_captured_and_capturable': '#059669', // Verde oscuro
      'failed': '#ef4444', // Rojo - fallo
      'cancelled': '#6b7280' // Gris - cancelado
    }

    return colors[this._value] || '#6b7280'
  }

  /**
   * Obtiene el icono asociado al estado
   */
  public getIcon(): string {
    const icons: Record<string, string> = {
      'requires_payment_method': 'credit-card',
      'requires_confirmation': 'check-circle',
      'requires_action': 'alert-circle',
      'processing': 'loader',
      'requires_capture': 'dollar-sign',
      'succeeded': 'check-circle',
      'partially_captured': 'check-circle-2',
      'partially_captured_and_capturable': 'check-circle-2',
      'failed': 'x-circle',
      'cancelled': 'x'
    }

    return icons[this._value] || 'help-circle'
  }

  /**
   * Obtiene información para mostrar en la UI
   */
  public getDisplayInfo(): {
    label: string
    description: string
    color: string
    icon: string
    priority: number
    isPending: boolean
    isSuccessful: boolean
    isFailed: boolean
    isFinal: boolean
    canCapture: boolean
    canCancel: boolean
    canRefund: boolean
  } {
    const labels: Record<string, string> = {
      'requires_payment_method': 'Requiere Método de Pago',
      'requires_confirmation': 'Requiere Confirmación',
      'requires_action': 'Requiere Acción',
      'processing': 'Procesando',
      'requires_capture': 'Requiere Captura',
      'succeeded': 'Exitoso',
      'partially_captured': 'Parcialmente Capturado',
      'partially_captured_and_capturable': 'Parcial y Capturable',
      'failed': 'Fallido',
      'cancelled': 'Cancelado'
    }

    return {
      label: labels[this._value] || this._value,
      description: this.description,
      color: this.getColor(),
      icon: this.getIcon(),
      priority: this.getPriority(),
      isPending: this.isPending(),
      isSuccessful: this.isSuccessful(),
      isFailed: this.isFailed(),
      isFinal: this.isFinal(),
      canCapture: this.canCapture(),
      canCancel: this.canCancel(),
      canRefund: this.canRefund()
    }
  }

  /**
   * Obtiene información sobre el impacto en el negocio
   */
  public getBusinessImpact(): {
    revenue_impact: 'none' | 'pending' | 'partial' | 'full'
    urgency: 'low' | 'medium' | 'high' | 'critical'
    customer_experience: 'positive' | 'neutral' | 'negative'
    action_required: boolean
    time_sensitive: boolean
  } {
    const impacts: Record<string, any> = {
      'requires_payment_method': {
        revenue_impact: 'none',
        urgency: 'medium',
        customer_experience: 'neutral',
        action_required: true,
        time_sensitive: true
      },
      'requires_confirmation': {
        revenue_impact: 'pending',
        urgency: 'medium',
        customer_experience: 'neutral',
        action_required: true,
        time_sensitive: true
      },
      'requires_action': {
        revenue_impact: 'pending',
        urgency: 'high',
        customer_experience: 'negative',
        action_required: true,
        time_sensitive: true
      },
      'processing': {
        revenue_impact: 'pending',
        urgency: 'low',
        customer_experience: 'neutral',
        action_required: false,
        time_sensitive: false
      },
      'requires_capture': {
        revenue_impact: 'pending',
        urgency: 'medium',
        customer_experience: 'neutral',
        action_required: true,
        time_sensitive: true
      },
      'succeeded': {
        revenue_impact: 'full',
        urgency: 'low',
        customer_experience: 'positive',
        action_required: false,
        time_sensitive: false
      },
      'partially_captured': {
        revenue_impact: 'partial',
        urgency: 'low',
        customer_experience: 'neutral',
        action_required: false,
        time_sensitive: false
      },
      'partially_captured_and_capturable': {
        revenue_impact: 'partial',
        urgency: 'medium',
        customer_experience: 'neutral',
        action_required: true,
        time_sensitive: true
      },
      'failed': {
        revenue_impact: 'none',
        urgency: 'high',
        customer_experience: 'negative',
        action_required: true,
        time_sensitive: false
      },
      'cancelled': {
        revenue_impact: 'none',
        urgency: 'low',
        customer_experience: 'neutral',
        action_required: false,
        time_sensitive: false
      }
    }

    return impacts[this._value] || {
      revenue_impact: 'none',
      urgency: 'medium',
      customer_experience: 'neutral',
      action_required: false,
      time_sensitive: false
    }
  }

  /**
   * Obtiene el mensaje de acción recomendada
   */
  public getActionMessage(): string | null {
    const messages: Record<string, string> = {
      'requires_payment_method': 'El cliente debe proporcionar un método de pago válido.',
      'requires_confirmation': 'Confirma el pago para proceder con la autorización.',
      'requires_action': 'El cliente debe completar la autenticación adicional (ej. 3D Secure).',
      'processing': 'El pago está siendo procesado. Monitorea el estado.',
      'requires_capture': 'El pago fue autorizado. Captura los fondos para completar la transacción.',
      'succeeded': 'Pago completado exitosamente. Procede con el cumplimiento del pedido.',
      'partially_captured': 'Solo se capturó parte del monto. Verifica si se requiere captura adicional.',
      'partially_captured_and_capturable': 'Captura el monto restante o cancela la autorización.',
      'failed': 'El pago falló. Revisa la causa del error y considera reintentar.',
      'cancelled': 'El pago fue cancelado. No se requiere acción adicional.'
    }

    return messages[this._value] || null
  }

  /**
   * Obtiene métricas de conversión esperadas
   */
  public getConversionMetrics(): {
    completion_probability: number
    typical_completion_time_minutes: number
    drop_off_risk: 'low' | 'medium' | 'high'
  } {
    const metrics: Record<string, any> = {
      'requires_payment_method': {
        completion_probability: 0.45,
        typical_completion_time_minutes: 5,
        drop_off_risk: 'high'
      },
      'requires_confirmation': {
        completion_probability: 0.85,
        typical_completion_time_minutes: 2,
        drop_off_risk: 'medium'
      },
      'requires_action': {
        completion_probability: 0.65,
        typical_completion_time_minutes: 3,
        drop_off_risk: 'high'
      },
      'processing': {
        completion_probability: 0.95,
        typical_completion_time_minutes: 1,
        drop_off_risk: 'low'
      },
      'requires_capture': {
        completion_probability: 0.98,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      },
      'succeeded': {
        completion_probability: 1.0,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      },
      'partially_captured': {
        completion_probability: 1.0,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      },
      'partially_captured_and_capturable': {
        completion_probability: 0.95,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      },
      'failed': {
        completion_probability: 0.0,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      },
      'cancelled': {
        completion_probability: 0.0,
        typical_completion_time_minutes: 0,
        drop_off_risk: 'low'
      }
    }

    return metrics[this._value] || {
      completion_probability: 0.5,
      typical_completion_time_minutes: 5,
      drop_off_risk: 'medium'
    }
  }

  /**
   * Compara con otro PaymentStatus
   */
  public equals(other: PaymentStatus): boolean {
    return this._value === other._value
  }

  /**
   * Representación en string
   */
  public toString(): string {
    return this._value
  }

  /**
   * Serialización JSON
   */
  public toJSON(): string {
    return this._value
  }
}