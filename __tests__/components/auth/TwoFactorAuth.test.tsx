import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import TwoFactorAuth from '../../../src/components/auth/TwoFactorAuth'

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

// Mock react-qr-code
jest.mock('react-qr-code', () => {
  return function QRCode({ value }: { value: string }) {
    return <div data-testid="qr-code">{value}</div>
  }
})

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

describe('TwoFactorAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Setup Mode', () => {
    it('renders setup mode correctly', async () => {
      const mockQRResponse = {
        success: true,
        qrCodeUrl: 'otpauth://totp/test',
        secretKey: 'ABCD1234EFGH5678',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRResponse,
      })

      render(<TwoFactorAuth mode="setup" />)
      
      await waitFor(() => {
        expect(screen.getByText('Habilitar Autenticación de Dos Factores')).toBeInTheDocument()
        expect(screen.getByText('Usa cualquier aplicación de autenticación para completar la configuración')).toBeInTheDocument()
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
        expect(screen.getByText('ABCD1234EFGH5678')).toBeInTheDocument()
      })
    })

    it('generates QR code on mount', async () => {
      const mockQRResponse = {
        success: true,
        qrCodeUrl: 'otpauth://totp/test',
        secretKey: 'ABCD1234EFGH5678',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRResponse,
      })

      render(<TwoFactorAuth mode="setup" />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/2fa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
      })
    })

    it('handles OTP input correctly', async () => {
      const user = userEvent.setup()
      const mockQRResponse = {
        success: true,
        qrCodeUrl: 'otpauth://totp/test',
        secretKey: 'ABCD1234EFGH5678',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRResponse,
      })

      render(<TwoFactorAuth mode="setup" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Find OTP input fields
      const otpInputs = screen.getAllByRole('textbox')
      const otpFields = otpInputs.filter(input => 
        input.getAttribute('maxLength') === '1' && 
        input.getAttribute('inputMode') === 'numeric'
      )

      expect(otpFields).toHaveLength(6)

      // Type OTP
      await user.type(otpFields[0], '1')
      await user.type(otpFields[1], '2')
      await user.type(otpFields[2], '3')
      await user.type(otpFields[3], '4')
      await user.type(otpFields[4], '5')
      await user.type(otpFields[5], '6')

      // Check values
      expect(otpFields[0]).toHaveValue('1')
      expect(otpFields[1]).toHaveValue('2')
      expect(otpFields[2]).toHaveValue('3')
      expect(otpFields[3]).toHaveValue('4')
      expect(otpFields[4]).toHaveValue('5')
      expect(otpFields[5]).toHaveValue('6')
    })

    it('verifies OTP and shows recovery codes', async () => {
      const user = userEvent.setup()
      const mockQRResponse = {
        success: true,
        qrCodeUrl: 'otpauth://totp/test',
        secretKey: 'ABCD1234EFGH5678',
      }

      const mockVerifyResponse = {
        success: true,
        recoveryCodes: ['code1', 'code2', 'code3', 'code4', 'code5', 'code6', 'code7', 'code8'],
      }

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVerifyResponse,
        })

      render(<TwoFactorAuth mode="setup" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Find and fill OTP inputs
      const otpInputs = screen.getAllByRole('textbox')
      const otpFields = otpInputs.filter(input => 
        input.getAttribute('maxLength') === '1' && 
        input.getAttribute('inputMode') === 'numeric'
      )

      for (let i = 0; i < 6; i++) {
        await user.type(otpFields[i], (i + 1).toString())
      }

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/2fa/verify-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ otp: '123456' }),
        })
      })

      await waitFor(() => {
        expect(screen.getByText('¡2FA Configurado Exitosamente!')).toBeInTheDocument()
        expect(screen.getByText('Códigos de Recuperación')).toBeInTheDocument()
        expect(screen.getByText('code1')).toBeInTheDocument()
        expect(screen.getByText('code2')).toBeInTheDocument()
      })
    })

    it('handles skip functionality', async () => {
      const mockSkip = jest.fn()
      const mockQRResponse = {
        success: true,
        qrCodeUrl: 'otpauth://totp/test',
        secretKey: 'ABCD1234EFGH5678',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRResponse,
      })

      render(<TwoFactorAuth mode="setup" onSkip={mockSkip} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      const skipButton = screen.getByTestId('skip-now')
      await userEvent.setup().click(skipButton)

      expect(mockSkip).toHaveBeenCalled()
    })
  })

  describe('Verify Mode', () => {
    it('renders verify mode correctly', () => {
      render(<TwoFactorAuth mode="verify" />)
      
      expect(screen.getByText('Verificación de Dos Factores')).toBeInTheDocument()
      expect(screen.getByText('Ingresa el código de tu aplicación de autenticación')).toBeInTheDocument()
    })

    it('handles OTP verification', async () => {
      const user = userEvent.setup()
      const mockVerifyResponse = {
        success: true,
        message: 'Verificación exitosa',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      })

      render(<TwoFactorAuth mode="verify" />)
      
      // Find OTP input fields
      const otpInputs = screen.getAllByRole('textbox')
      const otpFields = otpInputs.filter(input => 
        input.getAttribute('maxLength') === '1' && 
        input.getAttribute('inputMode') === 'numeric'
      )

      // Type OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpFields[i], (i + 1).toString())
      }

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/2fa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ otp: '123456' }),
        })
        expect(toast.success).toHaveBeenCalledWith('Verificación exitosa')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('switches to recovery code mode', async () => {
      const user = userEvent.setup()
      render(<TwoFactorAuth mode="verify" />)
      
      const recoveryLink = screen.getByText('Usar código de recuperación')
      await user.click(recoveryLink)

      expect(screen.getByText('Ingresa uno de tus códigos de recuperación')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ingresa código de recuperación')).toBeInTheDocument()
    })

    it('handles recovery code verification', async () => {
      const user = userEvent.setup()
      const mockVerifyResponse = {
        success: true,
        message: 'Verificación con código de recuperación exitosa',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockVerifyResponse,
      })

      render(<TwoFactorAuth mode="verify" />)
      
      // Switch to recovery mode
      const recoveryLink = screen.getByText('Usar código de recuperación')
      await user.click(recoveryLink)

      // Enter recovery code
      const recoveryInput = screen.getByPlaceholderText('Ingresa código de recuperación')
      await user.type(recoveryInput, 'recovery123')

      // Submit
      const verifyButton = screen.getByText('Verificar')
      await user.click(verifyButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/2fa/verify-recovery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ recoveryCode: 'recovery123' }),
        })
        expect(toast.success).toHaveBeenCalledWith('Verificación exitosa')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles verification errors', async () => {
      const user = userEvent.setup()
      const mockErrorResponse = {
        success: false,
        error: 'Código OTP inválido',
        code: 'INVALID_OTP',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      })

      render(<TwoFactorAuth mode="verify" />)
      
      // Find OTP input fields
      const otpInputs = screen.getAllByRole('textbox')
      const otpFields = otpInputs.filter(input => 
        input.getAttribute('maxLength') === '1' && 
        input.getAttribute('inputMode') === 'numeric'
      )

      // Type invalid OTP
      for (let i = 0; i < 6; i++) {
        await user.type(otpFields[i], '0')
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Código OTP inválido')
        expect(screen.getByText('Código OTP inválido')).toBeInTheDocument()
      })
    })
  })

  it('copies secret key to clipboard', async () => {
    const user = userEvent.setup()
    const mockQRResponse = {
      success: true,
      qrCodeUrl: 'otpauth://totp/test',
      secretKey: 'ABCD1234EFGH5678',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQRResponse,
    })

    // Mock clipboard API
    const mockWriteText = jest.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<TwoFactorAuth mode="setup" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /copiar/i })
    await user.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith('ABCD1234EFGH5678')
    expect(toast.success).toHaveBeenCalledWith('Clave secreta copiada al portapapeles')
  })

  it('shows loading state during verification', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    )

    render(<TwoFactorAuth mode="verify" />)
    
    // Find OTP input fields
    const otpInputs = screen.getAllByRole('textbox')
    const otpFields = otpInputs.filter(input => 
      input.getAttribute('maxLength') === '1' && 
      input.getAttribute('inputMode') === 'numeric'
    )

    // Type OTP
    for (let i = 0; i < 6; i++) {
      await user.type(otpFields[i], (i + 1).toString())
    }

    expect(screen.getByText('Verificando...')).toBeInTheDocument()
  })
})

