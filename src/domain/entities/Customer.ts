// src/domain/entities/Customer.ts
// ──────────────────────────────────────────────────────────────────────────────
// Customer Entity - Entidad de dominio para clientes
// ──────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// Schema de validación para la dirección del cliente
const AddressSchema = z.object({
  line1: z.string().min(1, 'Dirección línea 1 es requerida').max(200),
  line2: z.string().max(200).optional(),
  line3: z.string().max(200).optional(),
  city: z.string().min(1, 'Ciudad es requerida').max(100),
  state: z.string().max(100).optional(),
  zip: z.string().min(1, 'Código postal es requerido').max(20),
  country: z.string().length(2, 'Código de país debe ser ISO 3166-1 alpha-2').toUpperCase(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

// Schema de validación para el cliente
const CustomerSchema = z.object({
  customer_id: z.string().min(1).max(64, 'ID de cliente no puede exceder 64 caracteres'),
  name: z.string().min(1, 'Nombre es requerido').max(255),
  email: z.string().email('Email debe ser válido').max(320),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Teléfono debe ser válido').optional(),
  phone_country_code: z.string().length(2).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  connector_customer: z.record(z.string(), z.string()).optional(),
  created_at: z.string().datetime(),
  modified_at: z.string().datetime(),
  address: AddressSchema.optional(),
  default_payment_method_id: z.string().optional(),
})

export type CustomerAddress = z.infer<typeof AddressSchema>
export type CustomerData = z.infer<typeof CustomerSchema>

/**
 * Customer Entity - Representa un cliente en el sistema
 * 
 * Esta entidad encapsula toda la información relacionada con un cliente,
 * incluyendo datos personales, direcciones, y métodos de pago asociados.
 */
export class Customer {
  private constructor(
    private readonly _customerId: string,
    private readonly _name: string,
    private readonly _email: string,
    private readonly _createdAt: Date,
    private _modifiedAt: Date,
    private _phone?: string,
    private _phoneCountryCode?: string,
    private _description?: string,
    private _metadata?: Record<string, any>,
    private _connectorCustomer?: Record<string, string>,
    private _address?: CustomerAddress,
    private _defaultPaymentMethodId?: string
  ) {}

  /**
   * Factory method para crear un nuevo cliente
   */
  public static create(data: {
    customer_id: string
    name: string
    email: string
    phone?: string
    phone_country_code?: string
    description?: string
    metadata?: Record<string, any>
    address?: CustomerAddress
  }): Customer {
    // Validar datos de entrada
    const validatedData = CustomerSchema.omit({ 
      created_at: true, 
      modified_at: true,
      connector_customer: true,
      default_payment_method_id: true
    }).parse(data)

    const now = new Date()

    return new Customer(
      validatedData.customer_id,
      validatedData.name,
      validatedData.email,
      now,
      now,
      validatedData.phone,
      validatedData.phone_country_code,
      validatedData.description,
      validatedData.metadata,
      undefined,
      validatedData.address
    )
  }

  /**
   * Factory method para reconstruir un cliente desde datos persistidos
   */
  public static fromData(data: CustomerData): Customer {
    const validatedData = CustomerSchema.parse(data)
    
    return new Customer(
      validatedData.customer_id,
      validatedData.name,
      validatedData.email,
      new Date(validatedData.created_at),
      new Date(validatedData.modified_at),
      validatedData.phone,
      validatedData.phone_country_code,
      validatedData.description,
      validatedData.metadata,
      validatedData.connector_customer,
      validatedData.address,
      validatedData.default_payment_method_id
    )
  }

  // Getters
  public get customerId(): string {
    return this._customerId
  }

  public get name(): string {
    return this._name
  }

  public get email(): string {
    return this._email
  }

  public get phone(): string | undefined {
    return this._phone
  }

  public get phoneCountryCode(): string | undefined {
    return this._phoneCountryCode
  }

  public get description(): string | undefined {
    return this._description
  }

  public get metadata(): Record<string, any> | undefined {
    return this._metadata
  }

  public get connectorCustomer(): Record<string, string> | undefined {
    return this._connectorCustomer
  }

  public get address(): CustomerAddress | undefined {
    return this._address
  }

  public get defaultPaymentMethodId(): string | undefined {
    return this._defaultPaymentMethodId
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get modifiedAt(): Date {
    return this._modifiedAt
  }

  // Business methods
  
  /**
   * Actualiza la información del cliente
   */
  public updateInfo(data: {
    name?: string
    email?: string
    phone?: string
    phone_country_code?: string
    description?: string
  }): void {
    if (data.name !== undefined) {
      const validated = z.string().min(1).max(255).parse(data.name)
      this._name = validated
    }
    
    if (data.email !== undefined) {
      const validated = z.string().email().max(320).parse(data.email)
      this._email = validated
    }
    
    if (data.phone !== undefined) {
      const validated = z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().parse(data.phone)
      this._phone = validated
    }
    
    if (data.phone_country_code !== undefined) {
      const validated = z.string().length(2).optional().parse(data.phone_country_code)
      this._phoneCountryCode = validated
    }
    
    if (data.description !== undefined) {
      const validated = z.string().max(1000).optional().parse(data.description)
      this._description = validated
    }

    this._modifiedAt = new Date()
  }

  /**
   * Actualiza la dirección del cliente
   */
  public updateAddress(address: CustomerAddress): void {
    const validatedAddress = AddressSchema.parse(address)
    this._address = validatedAddress
    this._modifiedAt = new Date()
  }

  /**
   * Elimina la dirección del cliente
   */
  public removeAddress(): void {
    this._address = undefined
    this._modifiedAt = new Date()
  }

  /**
   * Actualiza los metadatos del cliente
   */
  public updateMetadata(metadata: Record<string, any>): void {
    this._metadata = { ...this._metadata, ...metadata }
    this._modifiedAt = new Date()
  }

  /**
   * Establece el método de pago por defecto
   */
  public setDefaultPaymentMethod(paymentMethodId: string): void {
    this._defaultPaymentMethodId = paymentMethodId
    this._modifiedAt = new Date()
  }

  /**
   * Asocia al cliente con un conector específico
   */
  public setConnectorCustomer(connector: string, connectorCustomerId: string): void {
    if (!this._connectorCustomer) {
      this._connectorCustomer = {}
    }
    this._connectorCustomer[connector] = connectorCustomerId
    this._modifiedAt = new Date()
  }

  /**
   * Verifica si el cliente está completamente configurado
   */
  public isComplete(): boolean {
    return !!(
      this._customerId &&
      this._name &&
      this._email &&
      this._address?.line1 &&
      this._address?.city &&
      this._address?.zip &&
      this._address?.country
    )
  }

  /**
   * Verifica si el cliente tiene un método de pago por defecto
   */
  public hasDefaultPaymentMethod(): boolean {
    return !!this._defaultPaymentMethodId
  }

  /**
   * Obtiene el ID de cliente para un conector específico
   */
  public getConnectorCustomerId(connector: string): string | undefined {
    return this._connectorCustomer?.[connector]
  }

  /**
   * Serializa la entidad a formato de datos
   */
  public toData(): CustomerData {
    return {
      customer_id: this._customerId,
      name: this._name,
      email: this._email,
      phone: this._phone,
      phone_country_code: this._phoneCountryCode,
      description: this._description,
      metadata: this._metadata,
      connector_customer: this._connectorCustomer,
      address: this._address,
      default_payment_method_id: this._defaultPaymentMethodId,
      created_at: this._createdAt.toISOString(),
      modified_at: this._modifiedAt.toISOString(),
    }
  }

  /**
   * Convierte a formato para Hyperswitch API
   */
  public toHyperswitchFormat() {
    return {
      customer_id: this._customerId,
      name: this._name,
      email: this._email,
      phone: this._phone,
      phone_country_code: this._phoneCountryCode,
      description: this._description,
      metadata: this._metadata,
      address: this._address,
    }
  }
}