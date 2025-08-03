import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import SignInPage from '../../../src/components/auth/SignInPage'

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
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

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

describe('SignInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders sign in form correctly', () => {
    render(<SignInPage />)
    
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
    expect(screen.getByText('Bienvenido de vuelta a Multipaga')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tu contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<SignInPage />)
    
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email requerido')).toBeInTheDocument()
      expect(screen.getByText('Contraseña requerida')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('handles successful login without 2FA', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      success: true,
      requires2FA: false,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        has2FA: false,
      },
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Inicio de sesión exitoso')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login requiring 2FA', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      success: true,
      requires2FA: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        has2FA: true,
      },
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/2fa')
    })
  })

  it('handles login failure', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      success: false,
      error: 'Credenciales incorrectas',
      code: 'INVALID_CREDENTIALS',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => mockResponse,
    })

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciales incorrectas')
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<SignInPage />)
    
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('handles magic link request', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      success: true,
      message: 'Se ha enviado un enlace mágico a tu email',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const magicLinkButton = screen.getByText('Enviar enlace mágico')
    
    await user.type(emailInput, 'test@example.com')
    await user.click(magicLinkButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })
      expect(toast.success).toHaveBeenCalledWith('Se ha enviado un enlace mágico a tu email')
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, requires2FA: false }),
      }), 100))
    )

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('navigates to signup page', async () => {
    const user = userEvent.setup()
    render(<SignInPage />)
    
    const signupLink = screen.getByText('Regístrate aquí')
    await user.click(signupLink)
    
    expect(mockPush).toHaveBeenCalledWith('/auth/signup')
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

    render(<SignInPage />)
    
    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error de conexión')
      expect(screen.getByText('Error de conexión')).toBeInTheDocument()
    })
  })
})

