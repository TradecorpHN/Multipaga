// src/domain/value-objects/RefundStatus.ts
// ──────────────────────────────────────────────────────────────────────────────
// RefundStatus Value Object - Representa los estados de reembolsos según Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

/**
 * RefundStatus Value Object
 * 
 * Representa los diferentes estados que puede tener un reembolso en Hyperswitch,
 * incluyendo validaciones de transiciones y lógica de negocio.
 */
export class RefundStatus {
  private static readonly VALID_STATUSES = [
    'failure',
    'manual_review', 
    'pending',
    'success'
  ] as const

  private static readonly STATUS_DESCRIPTIONS = {
    'failure': 'Fallido - El reembolso no pudo ser procesado',
    'manual_review': 'Revisión manual - El reembolso requiere revisión manual',
    'pending': 'Pendiente - El reembolso está siendo procesado',
    'success': 'Exitoso - El reembolso se completó exitosamente'
  } as const

  private static readonly STATUS_CATEGORIES = {
    processing: ['pending', 'manual_review'],
    completed: ['success', 'failure'],
    successful: ['success'],
    failed: ['failure'],
    actionable: ['pending', 'manual_review']
  } as const

  private static readonly FINAL_STATUSES = [
    'success',
    'failure'
  ] as const

  private static readonly RETRYABLE_STATUSES = [
    'failure'
  ] as const

  private constructor(private readonly _value: string) {
    if (!RefundStatus.isValid(_value)) {
      throw new Error(`Estado de reembolso inválido: ${_value}`)
    }
  }

  /**
   * Crea una instancia de RefundStatus desde un string
   */
  public static fromString(value: string): RefundStatus {
    return new RefundStatus(value.toLowerCase())
  }

  /**
   * Verifica si un valor es un estado de reembolso válido
   */
  public static isValid(value: string): value is typeof RefundStatus.VALID_STATUSES[number] {
    return RefundStatus.VALID_STATUSES.includes(value.toLowerCase() as any)
  }

  /**
   * Obtiene todos los estados válidos
   */
  public static getAllStatuses(): readonly string[] {
    return RefundStatus.VALID_STATUSES
  }

  /**
   * Obtiene estados por categoría
   */
  public static getByCategory(category: keyof typeof RefundStatus.STATUS_CATEGORIES): readonly string[] {
    return RefundStatus.STATUS_CATEGORIES[category]
  }

  /**
   * Obtiene estados finales
   */
  public static getFinalStatuses(): readonly string[] {
    return RefundStatus.FINAL_STATUSES
  }

  /**
   * Obtiene estados que pueden ser reintentados
   */
  public static getRetryableStatuses(): readonly string[] {
    return RefundStatus.RETRYABLE_STATUSES
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
    return RefundStatus.STATUS_DESCRIPTIONS[this._value as keyof typeof RefundStatus.STATUS_DESCRIPTIONS]
  }

  /**
   * Verifica si el reembolso está siendo procesado
   */
  public isProcessing(): boolean {
    return RefundStatus.STATUS_CATEGORIES.processing.includes(this._value as any)
  }

  /**
   * Verifica si el reembolso está completado
   */
  public isCompleted(): boolean {
    return RefundStatus.STATUS_CATEGORIES.completed.includes(this._value as any)
  }

  /**
   * Verifica si el reembolso fue exitoso
   */
  public isSuccessful(): boolean {
    return this._value === 'success'
  }

  /**
   * Verifica si el reembolso falló
   */
  public isFailed(): boolean {
    return this._value === 'failure'
  }

  /**
   * Verifica si el reembolso está pendiente
   */
  public isPending(): boolean {
    return this._value === 'pending'
  }

  /**
   * Verifica si el reembolso está en revisión manual
   */
  public isInManualReview(): boolean {
    return this._value === 'manual_review'
  }

  /**
   * Verifica si el reembolso está en estado final
   */
  public isFinal(): boolean {
    return RefundStatus.FINAL_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el reembolso puede ser reintentado
   */
  public canRetry(): boolean {
    return RefundStatus.RETRYABLE_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el reembolso requiere acción
   */
  public requiresAction(): boolean {
    return this._value === 'manual_review'
  }

  /**
   * Verifica si se puede hacer una transición a otro estado
   */
  public canTransitionTo(newStatus: RefundStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['manual_review', 'success', 'failure'],
      'manual_review': ['success', 'failure', 'pending'], // Puede volver a pending si se reintenta
      'success': [], // Estado final
      'failure': ['pending'] // Puede reintentar
    }

    return validTransitions[this._value]?.includes(newStatus._value) ?? false
  }

  /**
   * Obtiene los posibles estados siguientes
   */
  public getPossibleTransitions(): RefundStatus[] {
    const transitions: Record<string, string[]> = {
      'pending': ['manual_review', 'success', 'failure'],
      'manual_review': ['success', 'failure', 'pending'],
      'success': [],
      'failure': ['pending']
    }

    return (transitions[this._value] || []).map(status => RefundStatus.fromString(status))
  }

  /**
   * Obtiene la prioridad del estado (para ordenamiento)
   */
  public getPriority(): number {
    const priorities: Record<string, number> = {
      'failure': 1, // Máxima prioridad - requiere atención
      'manual_review': 2, // Requiere revisión manual
      'pending': 3, // En proceso
      'success': 4 // Exitoso - menor prioridad porque está completo
    }

    return priorities[this._value] || 999
  }

  /**
   * Obtiene el color asociado al estado (para UI)
   */
  public getColor(): string {
    const colors: Record<string, string> = {
      'pending': '#f59e0b', // Amarillo - en proceso
      'manual_review': '#8b5cf6', // Púrpura - requiere revisión
      'success': '#10b981', // Verde - éxito
      'failure': '#ef4444' // Rojo - fallo
    }

    return colors[this._value] || '#6b7280'
  }

  /**
   * Obtiene el icono asociado al estado
   */
  public getIcon(): string {
    const icons: Record<string, string> = {
      'pending': 'clock',
      'manual_review': 'eye',
      'success': 'check-circle',
      'failure': 'x-circle'
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
    isProcessing: boolean
    isSuccessful: boolean
    isFailed: boolean
    isFinal: boolean
    canRetry: boolean
    requiresAction: boolean
  } {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'manual_review': 'Revisión Manual',
      'success': 'Exitoso',
      'failure': 'Fallido'
    }

    return {
      label: labels[this._value] || this._value,
      description: this.description,
      color: this.getColor(),
      icon: this.getIcon(),
      priority: this.getPriority(),
      isProcessing: this.isProcessing(),
      isSuccessful: this.isSuccessful(),
      isFailed: this.isFailed(),
      isFinal: this.isFinal(),
      canRetry: this.canRetry(),
      requiresAction: this.requiresAction()
    }
  }

  /**
   * Obtiene información sobre el impacto en el negocio
   */
  public getBusinessImpact(): {
    customer_satisfaction: 'positive' | 'neutral' | 'negative'
    operational_impact: 'none' | 'low' | 'medium' | 'high'
    financial_impact: 'none' | 'pending' | 'completed'
    urgency: 'low' | 'medium' | 'high' | 'critical'
    action_required: boolean
    time_sensitive: boolean
  } {
    const impacts: Record<string, any> = {
      'pending': {
        customer_satisfaction: 'neutral',
        operational_impact: 'low',
        financial_impact: 'pending',
        urgency: 'medium',
        action_required: false,
        time_sensitive: true
      },
      'manual_review': {
        customer_satisfaction: 'negative',
        operational_impact: 'high',
        financial_impact: 'pending',
        urgency: 'high',
        action_required: true,
        time_sensitive: true
      },
      'success': {
        customer_satisfaction: 'positive',
        operational_impact: 'none',
        financial_impact: 'completed',
        urgency: 'low',
        action_required: false,
        time_sensitive: false
      },
      'failure': {
        customer_satisfaction: 'negative',
        operational_impact: 'medium',
        financial_impact: 'none',
        urgency: 'high',
        action_required: true,
        time_sensitive: true
      }
    }

    return impacts[this._value] || {
      customer_satisfaction: 'neutral',
      operational_impact: 'medium',
      financial_impact: 'pending',
      urgency: 'medium',
      action_required: false,
      time_sensitive: false
    }
  }

  /**
   * Obtiene el mensaje de acción recomendada
   */
  public getActionMessage(): string | null {
    const messages: Record<string, string> = {
      'pending': 'El reembolso está siendo procesado. Monitorea el estado para actualizaciones.',
      'manual_review': 'El reembolso requiere revisión manual. Verifica los detalles y aprueba o rechaza.',
      'success': 'Reembolso completado exitosamente. El cliente ha sido notificado.',
      'failure': 'El reembolso falló. Revisa la causa del error y considera reintentar o procesar manualmente.'
    }

    return messages[this._value] || null
  }

  /**
   * Obtiene información de tiempo estimado de resolución
   */
  public getTimeEstimate(): {
    typical_resolution_minutes: number
    max_resolution_minutes: number
    sla_category: 'immediate' | 'same_day' | 'next_day' | 'manual'
  } {
    const estimates: Record<string, any> = {
      'pending': {
        typical_resolution_minutes: 15,
        max_resolution_minutes: 60,
        sla_category: 'same_day'
      },
      'manual_review': {
        typical_resolution_minutes: 240, // 4 horas
        max_resolution_minutes: 1440, // 24 horas
        sla_category: 'manual'
      },
      'success': {
        typical_resolution_minutes: 0,
        max_resolution_minutes: 0,
        sla_category: 'immediate'
      },
      'failure': {
        typical_resolution_minutes: 0,
        max_resolution_minutes: 0,
        sla_category: 'immediate'
      }
    }

    return estimates[this._value] || {
      typical_resolution_minutes: 60,
      max_resolution_minutes: 240,
      sla_category: 'same_day'
    }
  }

  /**
   * Obtiene las posibles causas de fallo (si aplica)
   */
  public getFailureCauses(): string[] {
    if (this._value !== 'failure') {
      return []
    }

    return [
      'Fondos insuficientes en la cuenta merchant',
      'Cuenta de destino inválida o cerrada',
      'Límites de reembolso excedidos',
      'Problemas de conectividad con el procesador',
      'Validaciones de seguridad fallidas',
      'Reembolso fuera del período permitido',
      'Duplicado - reembolso ya procesado',
      'Error en la configuración del conector'
    ]
  }

  /**
   * Obtiene las acciones de remedación disponibles
   */
  public getRemediationActions(): string[] {
    const actions: Record<string, string[]> = {
      'pending': [
        'Monitorear estado',
        'Verificar con el procesador si hay retrasos'
      ],
      'manual_review': [
        'Revisar detalles del reembolso',
        'Verificar información del cliente',
        'Aprobar manualmente',
        'Rechazar con motivo',
        'Solicitar información adicional'
      ],
      'success': [
        'Confirmar recepción con el cliente',
        'Actualizar registros contables'
      ],
      'failure': [
        'Revisar causa del error',
        'Verificar configuración del conector',
        'Reintentar el reembolso',
        'Procesar reembolso manual',
        'Contactar al cliente con alternativas'
      ]
    }

    return actions[this._value] || []
  }

  /**
   * Verifica si el estado indica un problema operacional
   */
  public indicatesOperationalIssue(): boolean {
    return this._value === 'failure' || this._value === 'manual_review'
  }

  /**
   * Obtiene métricas de éxito típicas
   */
  public getSuccessMetrics(): {
    typical_success_rate: number
    resolution_time_p50: number
    resolution_time_p95: number
    customer_satisfaction_score: number
  } {
    const metrics: Record<string, any> = {
      'pending': {
        typical_success_rate: 0.95,
        resolution_time_p50: 10,
        resolution_time_p95: 45,
        customer_satisfaction_score: 3.5
      },
      'manual_review': {
        typical_success_rate: 0.85,
        resolution_time_p50: 180,
        resolution_time_p95: 720,
        customer_satisfaction_score: 2.8
      },
      'success': {
        typical_success_rate: 1.0,
        resolution_time_p50: 0,
        resolution_time_p95: 0,
        customer_satisfaction_score: 4.5
      },
      'failure': {
        typical_success_rate: 0.0,
        resolution_time_p50: 0,
        resolution_time_p95: 0,
        customer_satisfaction_score: 1.5
      }
    }

    return metrics[this._value] || {
      typical_success_rate: 0.5,
      resolution_time_p50: 60,
      resolution_time_p95: 240,
      customer_satisfaction_score: 3.0
    }
  }

  /**
   * Compara con otro RefundStatus
   */
  public equals(other: RefundStatus): boolean {
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