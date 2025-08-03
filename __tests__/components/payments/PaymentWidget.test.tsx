import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import PaymentWidget from '../../../src/components/payments/PaymentWidget'

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const defaultProps = {
  clientSecret: 'pi_test_1234567890',
  publishableKey: 'pk_test_1234567890',
  amount: 2000, // $20.00
  currency: 'usd',
  customerId: 'cus_test_123',
  merchantId: 'mer_test_123',
  profileId: 'pro_test_123',
}

describe('PaymentWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders payment widget correctly', async () => {
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
        {
          id: 'paypal',
          type: 'wallet',
          name: 'PayPal',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Pago Seguro')).toBeInTheDocument()
      expect(screen.getByText('$20.00')).toBeInTheDocument()
      expect(screen.getByText('Método de Pago')).toBeInTheDocument()
    })
  })

  it('loads payment methods on initialization', async () => {
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/payments/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          client_secret: defaultProps.clientSecret,
          publishable_key: defaultProps.publishableKey,
          amount: defaultProps.amount,
          currency: defaultProps.currency,
          customer_id: defaultProps.customerId,
          merchant_id: defaultProps.merchantId,
          profile_id: defaultProps.profileId,
        }),
      })
    })
  })

  it('shows loading state initially', () => {
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, payment_methods: [] }),
      }), 100))
    )

    render(<PaymentWidget {...defaultProps} />)
    
    expect(screen.getByText('Cargando métodos de pago...')).toBeInTheDocument()
  })

  it('displays payment methods when loaded', async () => {
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
        {
          id: 'paypal',
          type: 'wallet',
          name: 'PayPal',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Tarjeta de Crédito')).toBeInTheDocument()
      expect(screen.getByText('PayPal')).toBeInTheDocument()
    })
  })

  it('shows card form when card payment method is selected', async () => {
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Tarjeta de Crédito')).toBeInTheDocument()
    })

    // Card should be auto-selected and form should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('MM/AA')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('123')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Juan Pérez')).toBeInTheDocument()
    })
  })

  it('formats card number input correctly', async () => {
    const user = userEvent.setup()
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
    })

    const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')
    await user.type(cardNumberInput, '4111111111111111')

    expect(cardNumberInput).toHaveValue('4111 1111 1111 1111')
  })

  it('formats expiry date input correctly', async () => {
    const user = userEvent.setup()
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('MM/AA')).toBeInTheDocument()
    })

    const expiryInput = screen.getByPlaceholderText('MM/AA')
    await user.type(expiryInput, '1225')

    expect(expiryInput).toHaveValue('12/25')
  })

  it('validates required fields before submission', async () => {
    const user = userEvent.setup()
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Pagar $20.00')).toBeInTheDocument()
    })

    const payButton = screen.getByText('Pagar $20.00')
    await user.click(payButton)

    await waitFor(() => {
      expect(screen.getByText('Por favor completa todos los campos de la tarjeta')).toBeInTheDocument()
    })
  })

  it('processes payment successfully', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = jest.fn()
    
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    const mockPaymentResponse = {
      success: true,
      payment_intent: {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 2000,
        currency: 'usd',
      },
    }

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentMethods,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentResponse,
      })

    render(<PaymentWidget {...defaultProps} onSuccess={mockOnSuccess} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
    })

    // Fill card form
    const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')
    const expiryInput = screen.getByPlaceholderText('MM/AA')
    const cvcInput = screen.getByPlaceholderText('123')
    const nameInput = screen.getByPlaceholderText('Juan Pérez')

    await user.type(cardNumberInput, '4111111111111111')
    await user.type(expiryInput, '1225')
    await user.type(cvcInput, '123')
    await user.type(nameInput, 'John Doe')

    // Submit payment
    const payButton = screen.getByText('Pagar $20.00')
    await user.click(payButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          client_secret: defaultProps.clientSecret,
          payment_method: 'card',
          payment_method_data: {
            card: {
              card_number: '4111111111111111',
              card_exp_month: '12',
              card_exp_year: '2025',
              card_cvc: '123',
              card_holder_name: 'John Doe',
            },
          },
          customer_id: defaultProps.customerId,
          merchant_id: defaultProps.merchantId,
          profile_id: defaultProps.profileId,
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Pago procesado exitosamente')
      expect(mockOnSuccess).toHaveBeenCalledWith(mockPaymentResponse.payment_intent)
    })
  })

  it('handles payment errors', async () => {
    const user = userEvent.setup()
    const mockOnError = jest.fn()
    
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    const mockErrorResponse = {
      success: false,
      error: 'Tarjeta declinada',
      code: 'CARD_DECLINED',
    }

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentMethods,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      })

    render(<PaymentWidget {...defaultProps} onError={mockOnError} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
    })

    // Fill card form
    const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')
    const expiryInput = screen.getByPlaceholderText('MM/AA')
    const cvcInput = screen.getByPlaceholderText('123')
    const nameInput = screen.getByPlaceholderText('Juan Pérez')

    await user.type(cardNumberInput, '4000000000000002') // Declined card
    await user.type(expiryInput, '1225')
    await user.type(cvcInput, '123')
    await user.type(nameInput, 'John Doe')

    // Submit payment
    const payButton = screen.getByText('Pagar $20.00')
    await user.click(payButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Tarjeta declinada')
      expect(screen.getByText('Tarjeta declinada')).toBeInTheDocument()
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  it('shows no payment methods message when none available', async () => {
    const mockPaymentMethods = {
      success: true,
      payment_methods: [],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('No hay métodos de pago disponibles')).toBeInTheDocument()
      expect(screen.getByText('Por favor contacta al soporte para habilitar métodos de pago.')).toBeInTheDocument()
    })
  })

  it('handles payment method loading errors', async () => {
    const mockOnError = jest.fn()
    const mockErrorResponse = {
      success: false,
      error: 'Error al cargar métodos de pago',
      code: 'PAYMENT_METHODS_ERROR',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse,
    })

    render(<PaymentWidget {...defaultProps} onError={mockOnError} />)
    
    await waitFor(() => {
      expect(screen.getByText('Error al cargar métodos de pago')).toBeInTheDocument()
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  it('shows processing state during payment', async () => {
    const user = userEvent.setup()
    
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentMethods,
      })
      .mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, payment_intent: {} }),
        }), 100))
      )

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
    })

    // Fill card form
    const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')
    const expiryInput = screen.getByPlaceholderText('MM/AA')
    const cvcInput = screen.getByPlaceholderText('123')
    const nameInput = screen.getByPlaceholderText('Juan Pérez')

    await user.type(cardNumberInput, '4111111111111111')
    await user.type(expiryInput, '1225')
    await user.type(cvcInput, '123')
    await user.type(nameInput, 'John Doe')

    // Submit payment
    const payButton = screen.getByText('Pagar $20.00')
    await user.click(payButton)

    expect(screen.getByText('Procesando...')).toBeInTheDocument()
    expect(payButton).toBeDisabled()
  })

  it('selects payment method correctly', async () => {
    const user = userEvent.setup()
    const mockPaymentMethods = {
      success: true,
      payment_methods: [
        {
          id: 'card',
          type: 'card',
          name: 'Tarjeta de Crédito',
          enabled: true,
        },
        {
          id: 'paypal',
          type: 'wallet',
          name: 'PayPal',
          enabled: true,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaymentMethods,
    })

    render(<PaymentWidget {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Tarjeta de Crédito')).toBeInTheDocument()
      expect(screen.getByText('PayPal')).toBeInTheDocument()
    })

    // Select PayPal
    const paypalOption = screen.getByLabelText(/PayPal/i)
    await user.click(paypalOption)

    // Card form should not be visible for PayPal
    expect(screen.queryByPlaceholderText('1234 5678 9012 3456')).not.toBeInTheDocument()
  })
})

