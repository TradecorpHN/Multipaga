// src/domain/value-objects/DisputeStatus.ts
// ──────────────────────────────────────────────────────────────────────────────
// DisputeStatus Value Object - Representa los estados de disputas según Hyperswitch
// ──────────────────────────────────────────────────────────────────────────────

/**
 * DisputeStatus Value Object
 * 
 * Representa los diferentes estados que puede tener una disputa en Hyperswitch,
 * incluyendo validaciones de transiciones y lógica de negocio.
 */
export class DisputeStatus {
  private static readonly VALID_STATUSES = [
    'dispute_opened',
    'dispute_expired', 
    'dispute_accepted',
    'dispute_cancelled',
    'dispute_challenged',
    'dispute_won',
    'dispute_lost'
  ] as const

  private static readonly STATUS_DESCRIPTIONS = {
    'dispute_opened': 'Disputa abierta - Requiere respuesta',
    'dispute_expired': 'Disputa expirada - Se perdió por falta de respuesta',
    'dispute_accepted': 'Disputa aceptada - El merchant acepta la disputa',
    'dispute_cancelled': 'Disputa cancelada',
    'dispute_challenged': 'Disputa disputada - Se envió evidencia',
    'dispute_won': 'Disputa ganada - El merchant ganó la disputa',
    'dispute_lost': 'Disputa perdida - El merchant perdió la disputa'
  } as const

  private static readonly STATUS_CATEGORIES = {
    pending: ['dispute_opened'],
    in_progress: ['dispute_challenged'],
    resolved: ['dispute_accepted', 'dispute_won', 'dispute_lost'],
    closed: ['dispute_expired', 'dispute_cancelled', 'dispute_accepted', 'dispute_won', 'dispute_lost']
  } as const

  private static readonly ACTIONABLE_STATUSES = [
    'dispute_opened'
  ] as const

  private static readonly FINAL_STATUSES = [
    'dispute_expired',
    'dispute_accepted', 
    'dispute_cancelled',
    'dispute_won',
    'dispute_lost'
  ] as const

  private static readonly SUCCESSFUL_STATUSES = [
    'dispute_won',
    'dispute_accepted' // Aceptar puede ser considerado exitoso si es estratégico
  ] as const

  private constructor(private readonly _value: string) {
    if (!DisputeStatus.isValid(_value)) {
      throw new Error(`Estado de disputa inválido: ${_value}`)
    }
  }

  /**
   * Crea una instancia de DisputeStatus desde un string
   */
  public static fromString(value: string): DisputeStatus {
    return new DisputeStatus(value.toLowerCase())
  }

  /**
   * Verifica si un valor es un estado de disputa válido
   */
  public static isValid(value: string): value is typeof DisputeStatus.VALID_STATUSES[number] {
    return DisputeStatus.VALID_STATUSES.includes(value.toLowerCase() as any)
  }

  /**
   * Obtiene todos los estados válidos
   */
  public static getAllStatuses(): readonly string[] {
    return DisputeStatus.VALID_STATUSES
  }

  /**
   * Obtiene estados por categoría
   */
  public static getByCategory(category: keyof typeof DisputeStatus.STATUS_CATEGORIES): readonly string[] {
    return DisputeStatus.STATUS_CATEGORIES[category]
  }

  /**
   * Obtiene estados que requieren acción
   */
  public static getActionableStatuses(): readonly string[] {
    return DisputeStatus.ACTIONABLE_STATUSES
  }

  /**
   * Obtiene estados finales
   */
  public static getFinalStatuses(): readonly string[] {
    return DisputeStatus.FINAL_STATUSES
  }

  /**
   * Obtiene estados considerados exitosos
   */
  public static getSuccessfulStatuses(): readonly string[] {
    return DisputeStatus.SUCCESSFUL_STATUSES
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
    return DisputeStatus.STATUS_DESCRIPTIONS[this._value as keyof typeof DisputeStatus.STATUS_DESCRIPTIONS]
  }

  /**
   * Verifica si la disputa está pendiente de acción
   */
  public isPending(): boolean {
    return DisputeStatus.STATUS_CATEGORIES.pending.includes(this._value as any)
  }

  /**
   * Verifica si la disputa está en progreso
   */
  public isInProgress(): boolean {
    return DisputeStatus.STATUS_CATEGORIES.in_progress.includes(this._value as any)
  }

  /**
   * Verifica si la disputa está resuelta
   */
  public isResolved(): boolean {
    return DisputeStatus.STATUS_CATEGORIES.resolved.includes(this._value as any)
  }

  /**
   * Verifica si la disputa está cerrada
   */
  public isClosed(): boolean {
    return DisputeStatus.STATUS_CATEGORIES.closed.includes(this._value as any)
  }

  /**
   * Verifica si la disputa está en estado final
   */
  public isFinal(): boolean {
    return DisputeStatus.FINAL_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si la disputa requiere acción
   */
  public requiresAction(): boolean {
    return DisputeStatus.ACTIONABLE_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si el estado es considerado exitoso
   */
  public isSuccessful(): boolean {
    return DisputeStatus.SUCCESSFUL_STATUSES.includes(this._value as any)
  }

  /**
   * Verifica si la disputa fue ganada
   */
  public isWon(): boolean {
    return this._value === 'dispute_won'
  }

  /**
   * Verifica si la disputa fue perdida
   */
  public isLost(): boolean {
    return this._value === 'dispute_lost'
  }

  /**
   * Verifica si la disputa fue aceptada
   */
  public isAccepted(): boolean {
    return this._value === 'dispute_accepted'
  }

  /**
   * Verifica si la disputa fue cancelada
   */
  public isCancelled(): boolean {
    return this._value === 'dispute_cancelled'
  }

  /**
   * Verifica si la disputa expiró
   */
  public isExpired(): boolean {
    return this._value === 'dispute_expired'
  }

  /**
   * Verifica si la disputa fue disputada (evidencia enviada)
   */
  public isChallenged(): boolean {
    return this._value === 'dispute_challenged'
  }

  /**
   * Verifica si la disputa está abierta
   */
  public isOpened(): boolean {
    return this._value === 'dispute_opened'
  }

  /**
   * Verifica si se puede añadir evidencia
   */
  public canAddEvidence(): boolean {
    return this._value === 'dispute_opened'
  }

  /**
   * Verifica si se puede enviar evidencia
   */
  public canSubmitEvidence(): boolean {
    return this._value === 'dispute_opened'
  }

  /**
   * Verifica si se puede aceptar la disputa
   */
  public canAccept(): boolean {
    return this._value === 'dispute_opened' || this._value === 'dispute_challenged'
  }

  /**
   * Verifica si se puede cancelar la disputa
   */
  public canCancel(): boolean {
    return this._value === 'dispute_opened'
  }

  /**
   * Verifica si se puede hacer una transición a otro estado
   */
  public canTransitionTo(newStatus: DisputeStatus): boolean {
    const validTransitions: Record<string, string[]> = {
      'dispute_opened': ['dispute_challenged', 'dispute_accepted', 'dispute_expired', 'dispute_cancelled'],
      'dispute_challenged': ['dispute_won', 'dispute_lost'],
      'dispute_expired': [], // Estado final
      'dispute_accepted': [], // Estado final
      'dispute_cancelled': [], // Estado final
      'dispute_won': [], // Estado final
      'dispute_lost': [] // Estado final
    }

    return validTransitions[this._value]?.includes(newStatus._value) ?? false
  }

  /**
   * Obtiene los posibles estados siguientes
   */
  public getPossibleTransitions(): DisputeStatus[] {
    const transitions: Record<string, string[]> = {
      'dispute_opened': ['dispute_challenged', 'dispute_accepted', 'dispute_expired', 'dispute_cancelled'],
      'dispute_challenged': ['dispute_won', 'dispute_lost'],
      'dispute_expired': [],
      'dispute_accepted': [],
      'dispute_cancelled': [],
      'dispute_won': [],
      'dispute_lost': []
    }

    return (transitions[this._value] || []).map(status => DisputeStatus.fromString(status))
  }

  /**
   * Obtiene la prioridad del estado (para ordenamiento)
   */
  public getPriority(): number {
    const priorities: Record<string, number> = {
      'dispute_opened': 1, // Máxima prioridad - requiere acción
      'dispute_challenged': 2, // En proceso
      'dispute_expired': 3, // Perdido por inacción
      'dispute_lost': 4, // Perdido
      'dispute_cancelled': 5, // Cancelado
      'dispute_accepted': 6, // Aceptado
      'dispute_won': 7 // Ganado - menor prioridad porque está resuelto positivamente
    }

    return priorities[this._value] || 999
  }

  /**
   * Obtiene el color asociado al estado (para UI)
   */
  public getColor(): string {
    const colors: Record<string, string> = {
      'dispute_opened': '#f59e0b', // Amarillo/naranja - alerta
      'dispute_challenged': '#3b82f6', // Azul - en proceso
      'dispute_won': '#10b981', // Verde - éxito
      'dispute_accepted': '#6b7280', // Gris - neutro
      'dispute_lost': '#ef4444', // Rojo - fallo
      'dispute_expired': '#dc2626', // Rojo oscuro - crítico
      'dispute_cancelled': '#6b7280' // Gris - cancelado
    }

    return colors[this._value] || '#6b7280'
  }

  /**
   * Obtiene el icono asociado al estado
   */
  public getIcon(): string {
    const icons: Record<string, string> = {
      'dispute_opened': 'alert-triangle',
      'dispute_challenged': 'shield',
      'dispute_won': 'check-circle',
      'dispute_accepted': 'info',
      'dispute_lost': 'x-circle',
      'dispute_expired': 'clock',
      'dispute_cancelled': 'x'
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
    requiresAction: boolean
    isFinal: boolean
  } {
    const labels: Record<string, string> = {
      'dispute_opened': 'Abierta',
      'dispute_challenged': 'Disputada',
      'dispute_won': 'Ganada',
      'dispute_accepted': 'Aceptada',
      'dispute_lost': 'Perdida',
      'dispute_expired': 'Expirada',
      'dispute_cancelled': 'Cancelada'
    }

    return {
      label: labels[this._value] || this._value,
      description: this.description,
      color: this.getColor(),
      icon: this.getIcon(),
      priority: this.getPriority(),
      requiresAction: this.requiresAction(),
      isFinal: this.isFinal()
    }
  }

  /**
   * Obtiene información sobre el impacto en el negocio
   */
  public getBusinessImpact(): {
    severity: 'low' | 'medium' | 'high' | 'critical'
    financial_impact: 'none' | 'low' | 'medium' | 'high'
    action_required: boolean
    time_sensitive: boolean
  } {
    const impacts: Record<string, any> = {
      'dispute_opened': {
        severity: 'high',
        financial_impact: 'high',
        action_required: true,
        time_sensitive: true
      },
      'dispute_challenged': {
        severity: 'medium',
        financial_impact: 'medium',
        action_required: false,
        time_sensitive: true
      },
      'dispute_won': {
        severity: 'low',
        financial_impact: 'none',
        action_required: false,
        time_sensitive: false
      },
      'dispute_accepted': {
        severity: 'medium',
        financial_impact: 'high',
        action_required: false,
        time_sensitive: false
      },
      'dispute_lost': {
        severity: 'high',
        financial_impact: 'high',
        action_required: false,
        time_sensitive: false
      },
      'dispute_expired': {
        severity: 'critical',
        financial_impact: 'high',
        action_required: false,
        time_sensitive: false
      },
      'dispute_cancelled': {
        severity: 'low',
        financial_impact: 'none',
        action_required: false,
        time_sensitive: false
      }
    }

    return impacts[this._value] || {
      severity: 'medium',
      financial_impact: 'medium',
      action_required: false,
      time_sensitive: false
    }
  }

  /**
   * Compara con otro DisputeStatus
   */
  public equals(other: DisputeStatus): boolean {
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

  /**
   * Obtiene el mensaje de acción recomendada
   */
  public getActionMessage(): string | null {
    const messages: Record<string, string> = {
      'dispute_opened': 'Responde con evidencia antes de la fecha límite para disputar este cargo.',
      'dispute_challenged': 'Esperando decisión del banco emisor. Monitorea el estado regularmente.',
      'dispute_won': 'Disputa resuelta a tu favor. Los fondos han sido devueltos.',
      'dispute_accepted': 'Disputa aceptada. Los fondos permanecen con el titular de la tarjeta.',
      'dispute_lost': 'Disputa perdida. Considera mejorar la evidencia para futuras disputas similares.',
      'dispute_expired': 'Disputa perdida por expiración. Revisa los procesos para evitar futuras expiraciones.',
      'dispute_cancelled': 'Disputa cancelada. No se requiere acción adicional.'
    }

    return messages[this._value] || null
  }
}