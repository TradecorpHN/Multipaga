'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, Eye, EyeOff, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';

// Validation schema
const loginSchema = z.object({
  apiKey: z
    .string()
    .min(10, 'API Key debe tener al menos 10 caracteres')
    .max(128, 'API Key no debe exceder 128 caracteres')
    .regex(/^(snd_[a-zA-Z0-9]{10,})$/, 'API Key debe comenzar con "snd_"'),
  merchantId: z
    .string()
    .min(10, 'Merchant ID debe tener al menos 10 caracteres después del prefijo')
    .regex(/^(merchant_[a-zA-Z0-9]{10,})$/, 'Merchant ID debe comenzar con "merchant_"'),
  profileId: z
    .string()
    .min(10, 'Profile ID debe tener al menos 10 caracteres')
    .regex(/^(pro_[a-zA-Z0-9]{10,})$/, 'Profile ID debe comenzar con "pro_"'),
  customerId: z.string().min(1, 'Customer ID es requerido'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Interface for validation response
interface ValidationResponse {
  success: boolean;
  error?: string;
  code?: string;
  field?: string;
}

// Valid dashboard routes
const VALID_DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/connectors',
  '/dashboard/customers',
  '/dashboard/disputes',
  '/dashboard/invoices',
  '/dashboard/mandates',
  '/dashboard/payments',
  '/dashboard/payouts',
  '/dashboard/reconciliation',
  '/dashboard/refunds',
  '/dashboard/remittances',
  '/dashboard/settings',
  '/dashboard/transactions',
  '/dashboard/vault',
];

// Viewport configuration
export const generateViewport = () => ({
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f2937',
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      merchantId: '',
      profileId: '',
      customerId: '',
      environment: 'sandbox',
    },
  });

  // State variables
  const [showCredentials, setShowCredentials] = useState({
    apiKey: false,
    merchantId: false,
    profileId: false,
    customerId: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<keyof LoginFormData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [validationStatus, setValidationStatus] = useState<
    Record<keyof LoginFormData, 'idle' | 'validating' | 'valid' | 'invalid'>
  >({
    apiKey: 'idle',
    merchantId: 'idle',
    profileId: 'idle',
    customerId: 'idle',
    environment: 'valid',
  });
  const [mounted, setMounted] = useState(false);
  const [validatedFields, setValidatedFields] = useState<Set<keyof LoginFormData>>(new Set());
  const [logoError, setLogoError] = useState(false);

  // Watch form values
  const formValues = watch();

  // Get reason from search params
  const reason = searchParams?.get('reason');
  const reasonMessages: Record<string, string> = {
    session_expired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    unauthorized: 'No tienes autorización para acceder a esta página.',
    invalid_token: 'Token de sesión inválido. Por favor, inicia sesión nuevamente.',
  };

  // Load environment from cookie
  useEffect(() => {
    setMounted(true);
    const cookieEnv = document.cookie.match(/hyperswitch_env=([^;]+)/)?.[1] as 'sandbox' | 'production';
    if (cookieEnv) {
      setEnvironment(cookieEnv);
      setValue('environment', cookieEnv);
    }
  }, [setValue]);

  // Debounced validation function
  const validateField = useCallback(
    debounce(async (field: keyof LoginFormData, value: string) => {
      if (!value || value.length < 10 || (field === 'customerId' && value.length < 1)) {
        setValidationStatus(prev => ({ ...prev, [field]: 'idle' }));
        return;
      }

      // Skip validation if already validated
      if (validatedFields.has(field)) {
        return;
      }

      setValidationStatus(prev => ({ ...prev, [field]: 'validating' }));
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            field,
            value,
            environment,
            apiKey: field !== 'apiKey' ? formValues.apiKey : undefined,
            merchantId: field === 'profileId' || field === 'customerId' ? formValues.merchantId : undefined,
          }),
        });
        const result: ValidationResponse = await response.json();
        setValidationStatus(prev => ({
          ...prev,
          [field]: result.success ? 'valid' : 'invalid',
        }));
        if (result.success) {
          setValidatedFields(prev => new Set(prev).add(field));
        } else {
          setAuthError(result.error || `Error al validar ${field}`);
          toast.error(result.error || `Error al validar ${field}`, { duration: 4000 });
        }
      } catch (error) {
        setValidationStatus(prev => ({ ...prev, [field]: 'invalid' }));
        setAuthError(`Error al validar ${field}`);
        toast.error(`Error al validar ${field}`, { duration: 4000 });
      }
    }, 500),
    [environment, formValues.apiKey, formValues.merchantId, validatedFields]
  );

  // Validate credentials only when necessary
  useEffect(() => {
    const fieldsToValidate: (keyof LoginFormData)[] = ['apiKey', 'merchantId', 'profileId', 'customerId'];
    fieldsToValidate.forEach(field => {
      const value = formValues[field];
      if (value && (field === 'customerId' ? value.length >= 1 : value.length >= 10) && !validatedFields.has(field)) {
        validateField(field, value);
      }
    });
  }, [formValues.apiKey, formValues.merchantId, formValues.profileId, formValues.customerId, validateField, validatedFields]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setLoginSuccess(true);
        toast.success('Inicio de sesión exitoso', { duration: 3000 });

        // Wait for the session cookie to be set
        const checkSession = async () => {
          try {
            const sessionResponse = await fetch('/api/auth/session', {
              method: 'GET',
              credentials: 'include',
            });
            const sessionResult = await sessionResponse.json();
            if (!sessionResult.isAuthenticated) {
              throw new Error('Session not established');
            }
            return true;
          } catch (error) {
            return false;
          }
        };

        // Polling to ensure session cookie is set (max 5 attempts, 500ms interval)
        let sessionReady = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          sessionReady = await checkSession();
          if (sessionReady) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!sessionReady) {
          setAuthError('No se pudo establecer la sesión');
          toast.error('No se pudo establecer la sesión', { duration: 4000 });
          setIsSubmitting(false);
          return;
        }

        // Delay for toast visibility
        setTimeout(() => {
          const defaultRedirect = '/dashboard';
          const redirectParam = searchParams?.get('redirect');
          let redirect = defaultRedirect;

          // Enhanced redirect validation
          if (redirectParam) {
            try {
              const decodedRedirect = decodeURIComponent(redirectParam);
              const isValidRedirect =
                VALID_DASHBOARD_ROUTES.includes(decodedRedirect) &&
                !decodedRedirect.includes('..') &&
                !decodedRedirect.startsWith('//');
              redirect = isValidRedirect ? decodedRedirect : defaultRedirect;
            } catch (error) {
              console.warn('Invalid redirect parameter:', redirectParam);
              redirect = defaultRedirect;
            }
          }

          router.push(redirect);
        }, 3000);
      } else {
        setAuthError(result.error || 'Error al iniciar sesión');
        toast.error(result.error || 'Error al iniciar sesión', { duration: 4000 });
      }
    } catch (error) {
      setAuthError('Error al iniciar sesión');
      toast.error('Error al iniciar sesión', { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle copy to clipboard
  const handleCopy = (field: keyof LoginFormData, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success(`${field} copiado al portapapeles`, { duration: 2000 });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Toggle credential visibility
  const toggleCredentialVisibility = (field: keyof typeof showCredentials) => {
    setShowCredentials(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Handle environment change
  const handleEnvironmentChange = (value: 'sandbox' | 'production') => {
    setEnvironment(value);
    setValue('environment', value);
    document.cookie = `hyperswitch_env=${value}; path=/; max-age=31536000`;
    reset({ ...formValues, environment: value });
    setValidationStatus({
      apiKey: 'idle',
      merchantId: 'idle',
      profileId: 'idle',
      customerId: 'idle',
      environment: 'valid',
    });
    setValidatedFields(new Set());
  };

  // Handle logo error
  const handleLogoError = () => {
    setLogoError(true);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 relative overflow-hidden">
      {/* Animated background elements with blue theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Glassmorphism container with blue tones */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-lg mx-4 relative overflow-hidden"
        role="region"
        aria-label="Formulario de inicio de sesión"
      >
        {/* Gradient overlay with blue theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl"></div>
        
        <AnimatePresence>
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl"
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-800 font-medium">Iniciando sesión...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header with Multipaga logo */}
<div className="flex flex-col items-center justify-center mb-8 relative z-10">
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
    className="mb-4"
  >
    {!logoError ? (
      <img
        src="/logotext.png"  
        alt="Multipaga"
        className="h-12 w-auto object-contain max-w-[200px]"
        onError={handleLogoError}
        onLoad={() => setLogoError(false)}
      />
    ) : (
      // Fallback: Texto estilizado si la imagen no carga
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Multipaga
        </h1>
      </div>
    )}
  </motion.div>
  <motion.p
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4 }}
    className="text-lg font-medium text-white/90"
  >
    Iniciar Sesión
  </motion.p>
</div>

        {/* Alert messages with blue theme */}
        {reason && reasonMessages[reason] && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-100 rounded-2xl flex items-center relative z-10"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm">{reasonMessages[reason]}</span>
          </motion.div>
        )}

        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-100 rounded-2xl flex items-center relative z-10"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm">{authError}</span>
          </motion.div>
        )}

        {loginSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-100 rounded-2xl flex items-center relative z-10"
            role="alert"
          >
            <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm">Inicio de sesión exitoso, redirigiendo...</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
          {/* API Key Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label htmlFor="apiKey" className="block text-sm font-semibold text-white/90 mb-2">
              API Key
            </label>
            <div className="relative group">
              <input
                id="apiKey"
                type={showCredentials.apiKey ? 'text' : 'password'}
                {...register('apiKey')}
                className={`w-full p-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 pr-32 ${
                  errors.apiKey 
                    ? 'border-red-400/50 bg-red-500/10' 
                    : validationStatus.apiKey === 'valid' 
                    ? 'border-green-400/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-blue-300/30'
                }`}
                placeholder="Ingresa tu API Key"
                aria-invalid={errors.apiKey ? 'true' : 'false'}
                aria-describedby={errors.apiKey ? 'apiKey-error' : undefined}
              />
              
              {/* Action buttons */}
              <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                <motion.button
                  type="button"
                  onClick={() => handleCopy('apiKey', formValues.apiKey)}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Copiar API Key"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Copy className={`h-4 w-4 ${copiedField === 'apiKey' ? 'text-green-400' : ''}`} />
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => toggleCredentialVisibility('apiKey')}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label={showCredentials.apiKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showCredentials.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.button>
              </div>

              {/* Status indicators */}
              {validationStatus.apiKey === 'validating' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                </div>
              )}
              {validationStatus.apiKey === 'valid' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              )}
            </div>
            {errors.apiKey && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                id="apiKey-error"
                className="mt-2 text-sm text-red-300"
              >
                {errors.apiKey.message}
              </motion.p>
            )}
          </motion.div>

          {/* Merchant ID Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label htmlFor="merchantId" className="block text-sm font-semibold text-white/90 mb-2">
              Merchant ID
            </label>
            <div className="relative group">
              <input
                id="merchantId"
                type={showCredentials.merchantId ? 'text' : 'password'}
                {...register('merchantId')}
                className={`w-full p-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 pr-32 ${
                  errors.merchantId 
                    ? 'border-red-400/50 bg-red-500/10' 
                    : validationStatus.merchantId === 'valid' 
                    ? 'border-green-400/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-blue-300/30'
                }`}
                placeholder="Ingresa tu Merchant ID"
                aria-invalid={errors.merchantId ? 'true' : 'false'}
                aria-describedby={errors.merchantId ? 'merchantId-error' : undefined}
              />
              
              <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                <motion.button
                  type="button"
                  onClick={() => handleCopy('merchantId', formValues.merchantId)}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Copiar Merchant ID"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Copy className={`h-4 w-4 ${copiedField === 'merchantId' ? 'text-green-400' : ''}`} />
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => toggleCredentialVisibility('merchantId')}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label={showCredentials.merchantId ? 'Ocultar Merchant ID' : 'Mostrar Merchant ID'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showCredentials.merchantId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.button>
              </div>

              {validationStatus.merchantId === 'validating' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                </div>
              )}
              {validationStatus.merchantId === 'valid' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              )}
            </div>
            {errors.merchantId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                id="merchantId-error"
                className="mt-2 text-sm text-red-300"
              >
                {errors.merchantId.message}
              </motion.p>
            )}
          </motion.div>

          {/* Profile ID Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <label htmlFor="profileId" className="block text-sm font-semibold text-white/90 mb-2">
              Profile ID
            </label>
            <div className="relative group">
              <input
                id="profileId"
                type={showCredentials.profileId ? 'text' : 'password'}
                {...register('profileId')}
                className={`w-full p-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 pr-32 ${
                  errors.profileId 
                    ? 'border-red-400/50 bg-red-500/10' 
                    : validationStatus.profileId === 'valid' 
                    ? 'border-green-400/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-blue-300/30'
                }`}
                placeholder="Ingresa tu Profile ID"
                aria-invalid={errors.profileId ? 'true' : 'false'}
                aria-describedby={errors.profileId ? 'profileId-error' : undefined}
              />
              
              <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                <motion.button
                  type="button"
                  onClick={() => handleCopy('profileId', formValues.profileId)}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Copiar Profile ID"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Copy className={`h-4 w-4 ${copiedField === 'profileId' ? 'text-green-400' : ''}`} />
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => toggleCredentialVisibility('profileId')}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label={showCredentials.profileId ? 'Ocultar Profile ID' : 'Mostrar Profile ID'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showCredentials.profileId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.button>
              </div>

              {validationStatus.profileId === 'validating' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                </div>
              )}
              {validationStatus.profileId === 'valid' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              )}
            </div>
            {errors.profileId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                id="profileId-error"
                className="mt-2 text-sm text-red-300"
              >
                {errors.profileId.message}
              </motion.p>
            )}
          </motion.div>

          {/* Customer ID Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <label htmlFor="customerId" className="block text-sm font-semibold text-white/90 mb-2">
              Customer ID
            </label>
            <div className="relative group">
              <input
                id="customerId"
                type={showCredentials.customerId ? 'text' : 'password'}
                {...register('customerId')}
                className={`w-full p-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 pr-32 ${
                  errors.customerId 
                    ? 'border-red-400/50 bg-red-500/10' 
                    : validationStatus.customerId === 'valid' 
                    ? 'border-green-400/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-blue-300/30'
                }`}
                placeholder="Ingresa tu Customer ID"
                aria-invalid={errors.customerId ? 'true' : 'false'}
                aria-describedby={errors.customerId ? 'customerId-error' : undefined}
              />
              
              <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                <motion.button
                  type="button"
                  onClick={() => handleCopy('customerId', formValues.customerId)}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Copiar Customer ID"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Copy className={`h-4 w-4 ${copiedField === 'customerId' ? 'text-green-400' : ''}`} />
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => toggleCredentialVisibility('customerId')}
                  className="p-2 text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/10"
                  aria-label={showCredentials.customerId ? 'Ocultar Customer ID' : 'Mostrar Customer ID'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showCredentials.customerId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.button>
              </div>

              {validationStatus.customerId === 'validating' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                </div>
              )}
              {validationStatus.customerId === 'valid' && (
                <div className="absolute inset-y-0 right-20 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              )}
            </div>
            {errors.customerId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                id="customerId-error"
                className="mt-2 text-sm text-red-300"
              >
                {errors.customerId.message}
              </motion.p>
            )}
          </motion.div>

          {/* Environment Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <label htmlFor="environment" className="block text-sm font-semibold text-white/90 mb-2">
              Entorno
            </label>
            <select
              id="environment"
              {...register('environment')}
              onChange={(e) => handleEnvironmentChange(e.target.value as 'sandbox' | 'production')}
              className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 hover:border-blue-300/30"
            >
              <option value="sandbox" className="bg-gray-800 text-white">Sandbox</option>
              <option value="production" className="bg-gray-800 text-white">Production</option>
            </select>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting || !isValid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            whileHover={{ scale: isSubmitting || !isValid ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting || !isValid ? 1 : 0.98 }}
            className={`w-full p-4 flex items-center justify-center rounded-2xl text-white font-semibold transition-all duration-300 ${
              isSubmitting || !isValid 
                ? 'bg-gray-500/50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
            }`}
            aria-label="Iniciar sesión"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-3" />
                Iniciar Sesión
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}