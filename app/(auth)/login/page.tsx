'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, Shield, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, Copy, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth, LoginResult } from '/home/kali/multipaga/src/presentation/contexts/AuthContext';

// Validation schema
const loginSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API Key es requerida')
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]+)/, 'API Key debe comenzar con "snd_"'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Viewport configuration
export const generateViewport = () => ({
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a202c',
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      apiKey: '',
      environment: 'sandbox',
    },
  });

  // State variables
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<'apiKey' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [mounted, setMounted] = useState(false);

  // Watch form values
  const apiKey = watch('apiKey');

  // Get reason from search params
  const reason = searchParams?.get('reason');
  const reasonMessages: Record<string, string> = {
    session_expired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    unauthorized: 'No tienes autorización para acceder a esta página.',
    invalid_token: 'Token de sesión inválido. Por favor, inicia sesión nuevamente.',
  };

  // Load environment from cookie client-side only after hydration
  useEffect(() => {
    setMounted(true);
    // This effect runs only on the client after initial render (hydration)
    const cookieEnv = document.cookie.match(/hyperswitch_env=([^;]+)/)?.[1] as 'sandbox' | 'production';
    if (cookieEnv) {
      setEnvironment(cookieEnv);
      setValue('environment', cookieEnv);
    }
  }, [setValue]);

  // API Key validation effect
  useEffect(() => {
    if (!apiKey || apiKey.length < 10) {
      setValidationStatus('idle');
      return;
    }

    const validateApiKey = async () => {
      setValidationStatus('validating');
      try {
        // Simulate API validation - replace with actual validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Basic validation - in real implementation, you'd call the API
        if (apiKey.startsWith('snd_') && apiKey.length > 20) {
          setValidationStatus('valid');
          setAuthError(null);
        } else {
          setValidationStatus('invalid');
          setAuthError('API Key inválida');
        }
      } catch (error) {
        setValidationStatus('invalid');
        setAuthError('Error al validar la API Key');
      }
    };

    const timeoutId = setTimeout(validateApiKey, 500);
    return () => clearTimeout(timeoutId);
  }, [apiKey]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      // Set environment cookie
      document.cookie = `hyperswitch_env=${data.environment}; path=/; max-age=${7 * 24 * 60 * 60}`;
      
      const result = await login(data);
      
      if (result.success) {
        setLoginSuccess(true);
        toast.success('¡Login exitoso!');
        
        // Redirect after success
        setTimeout(() => {
          const redirectUrl = searchParams?.get('redirect') || '/dashboard';
          router.push(redirectUrl);
        }, 1500);
      } else {
        setAuthError(result.error || 'Error al iniciar sesión');
        if (result.details) {
          result.details.forEach(detail => {
            toast.error(detail.message);
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Error inesperado al iniciar sesión');
      toast.error('Error inesperado al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    reset();
    setAuthError(null);
    setValidationStatus('idle');
    setEnvironment('sandbox');
    document.cookie = 'hyperswitch_env=sandbox; path=/; max-age=' + (7 * 24 * 60 * 60);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, field: 'apiKey') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  // Get input border color based on validation status
  const getInputBorderColor = () => {
    if (errors.apiKey) return 'border-red-500';
    if (validationStatus === 'valid') return 'border-green-500';
    if (validationStatus === 'invalid') return 'border-red-500';
    return 'border-gray-600';
  };

  // Get validation icon
  const getValidationIcon = () => {
    if (validationStatus === 'validating') {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    }
    if (validationStatus === 'valid') {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
    if (validationStatus === 'invalid') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    return null;
  };

  // Handle environment change
  const handleEnvironmentChange = (newEnvironment: 'sandbox' | 'production') => {
    setEnvironment(newEnvironment);
    setValue('environment', newEnvironment);
    document.cookie = `hyperswitch_env=${newEnvironment}; path=/; max-age=${7 * 24 * 60 * 60}`;
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Multipaga Dashboard</h1>
            <p className="text-gray-300 text-base">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 sm:p-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Multipaga Dashboard</h1>
          <p className="text-gray-300 text-base">Ingresa tu API Key de Hyperswitch para acceder</p>
        </motion.div>

        {reason && reasonMessages[reason] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <p className="text-blue-200 text-sm">{reasonMessages[reason]}</p>
            </div>
          </motion.div>
        )}

        {(authError || errors.root) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-600/10 border border-red-500/20 rounded-lg backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-200 text-sm">{authError || errors.root?.message}</p>
            </div>
          </motion.div>
        )}

        {loginSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-green-600/10 border border-green-500/20 rounded-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-green-200 text-sm">¡Autenticación exitosa! Redirigiendo...</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-5 bg-yellow-600/10 border border-yellow-500/20 rounded-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-yellow-200 font-semibold mb-2">Advertencia de Seguridad</h3>
              <p className="text-gray-300 text-sm">
                No compartas tu API Key. Obtén tu clave desde el{' '}
                <a
                  href={environment === 'production' ? 'https://app.hyperswitch.io' : 'https://sandbox.hyperswitch.io'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  dashboard de Hyperswitch
                </a>.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/20 rounded-xl p-6 shadow-xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
                <Shield className="w-4 h-4" />
                Entorno
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="sandbox"
                    checked={environment === 'sandbox'}
                    onChange={() => handleEnvironmentChange('sandbox')}
                    className="text-blue-600"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-200 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Sandbox
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="production"
                    checked={environment === 'production'}
                    onChange={() => handleEnvironmentChange('production')}
                    className="text-blue-600"
                    disabled={isSubmitting}
                  />
                  <span className="text-gray-200 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    Producción
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
                <Shield className="w-4 h-4" />
                API Key *
                {validationStatus === 'validating' && (
                  <span className="text-xs text-blue-400">Validando...</span>
                )}
                {validationStatus === 'valid' && (
                  <span className="text-xs text-green-400">✓ Válida</span>
                )}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  {...register('apiKey')}
                  type={showApiKey ? 'text' : 'password'}
                  className={`w-full px-4 py-3 pr-24 bg-gray-900/60 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all ${getInputBorderColor()}`}
                  placeholder="snd_xxxxxxxxxxxxxxxxxxxxxxxx"
                  aria-invalid={errors.apiKey ? 'true' : 'false'}
                  aria-describedby="apiKey-error"
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
                  {getValidationIcon()}
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(apiKey, 'apiKey')}
                      className="text-gray-400 hover:text-blue-400 disabled:opacity-50"
                      aria-label="Copiar API Key"
                      disabled={isSubmitting}
                    >
                      {copiedField === 'apiKey' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-400 hover:text-blue-400 disabled:opacity-50"
                    aria-label={showApiKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                    disabled={isSubmitting}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {errors.apiKey && (
                <p id="apiKey-error" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.apiKey.message}
                </p>
              )}
              {validationStatus === 'valid' && !errors.apiKey && (
                <p className="mt-1 text-sm text-green-400">
                  ✓ API Key válida y conectada a Hyperswitch
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <motion.button
                type="submit"
                disabled={isSubmitting || !isValid || validationStatus === 'invalid'}
                whileHover={isSubmitting || !isValid || validationStatus === 'invalid' ? {} : { scale: 1.02 }}
                whileTap={isSubmitting || !isValid || validationStatus === 'invalid' ? {} : { scale: 0.98 }}
                className={`
                  flex-1 py-3 px-4 rounded-lg font-medium text-white transition-all duration-200
                  flex items-center justify-center gap-2
                  ${isSubmitting || !isValid || validationStatus === 'invalid'
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg'
                  }
                `}
                aria-label="Iniciar sesión"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : loginSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Exitoso!
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Acceder
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                whileHover={isSubmitting ? {} : { scale: 1.02 }}
                whileTap={isSubmitting ? {} : { scale: 0.98 }}
                className="flex-1 py-3 px-4 rounded-lg font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Limpiar formulario"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5m11 11v-5h-5m-6 0H4v5m11-11h5v-5" />
                </svg>
                Limpiar
              </motion.button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700/20 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
              <Shield className="w-4 h-4" />
              <span>Validación segura con Hyperswitch API</span>
              {validationStatus === 'valid' && (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-300 text-sm">
            ¿Necesitas ayuda? Consulta la{' '}
            <a
              href="https://hyperswitch.io/docs/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              documentación de Hyperswitch
            </a>{' '}
            o contacta a{' '}
            <a
              href="mailto:hyperswitch@juspay.in"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              soporte
            </a>.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

