'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, 
  UserPlus, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2,
  Mail,
  Lock,
  User,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Validation schema
const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Por favor ingresa un email válido'),
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no debe exceder 50 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial')
    .optional(),
  confirmPassword: z
    .string()
    .optional(),
}).refine((data) => {
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpPageProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function SignUpPage({ onSuccess, redirectTo }: SignUpPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  // State variables
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEmailOnly, setIsEmailOnly] = useState(true); // Start with magic link by default
  const [mounted, setMounted] = useState(false);

  // Watch form values
  const email = watch('email');
  const name = watch('name');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle form submission
  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      if (isEmailOnly) {
        // Magic link registration flow
        const response = await fetch('/api/auth/signup-magic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: data.email,
            name: data.name 
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('Se ha enviado un enlace mágico a tu email');
          router.push(`/auth/check-email?email=${encodeURIComponent(data.email)}&type=signup`);
        } else {
          setAuthError(result.error || 'Error al enviar el enlace de registro');
          toast.error(result.error || 'Error al enviar el enlace de registro');
        }
      } else {
        // Regular registration flow
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            name: data.name,
            password: data.password,
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('Registro exitoso');
          
          if (result.requiresVerification) {
            // Redirect to email verification
            router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
          } else if (result.requires2FA) {
            // Redirect to 2FA setup
            router.push('/auth/2fa-setup');
          } else {
            // Successful registration
            if (onSuccess) {
              onSuccess();
            } else {
              const redirect = redirectTo || searchParams?.get('redirect') || '/dashboard';
              router.push(redirect);
            }
          }
        } else {
          setAuthError(result.error || 'Error al registrar usuario');
          toast.error(result.error || 'Error al registrar usuario');
        }
      }
    } catch (error) {
      const errorMessage = 'Error al registrar usuario. Por favor, intenta nuevamente.';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle registration mode
  const toggleRegistrationMode = () => {
    setIsEmailOnly(!isEmailOnly);
    setAuthError(null);
    if (isEmailOnly) {
      // Switching to password mode, clear password fields
      setValue('password', '');
      setValue('confirmPassword', '');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-md mx-4"
      >
        {/* Loading overlay */}
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
                <span className="text-gray-800 font-medium">
                  {isEmailOnly ? 'Enviando enlace...' : 'Registrando usuario...'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Multipaga
              </h1>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-medium text-white/90"
          >
            Bienvenido a Hyperswitch
          </motion.p>
        </div>

        {/* Alert messages */}
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-100 rounded-2xl flex items-center"
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm">{authError}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ${
                  errors.email ? 'border-red-400/50' : 'border-white/20'
                }`}
                placeholder="Ingresa tu Email"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-300">{errors.email.message}</p>
            )}
          </motion.div>

          {/* Name Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label htmlFor="name" className="block text-sm font-semibold text-white/90 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ${
                  errors.name ? 'border-red-400/50' : 'border-white/20'
                }`}
                placeholder="Ingresa tu nombre completo"
              />
            </div>
            {errors.name && (
              <p className="mt-2 text-sm text-red-300">{errors.name.message}</p>
            )}
          </motion.div>

          {/* Password Fields */}
          <AnimatePresence>
            {!isEmailOnly && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className={`w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ${
                        errors.password ? 'border-red-400/50' : 'border-white/20'
                      }`}
                      placeholder="Crea una contraseña segura"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-300">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/90 mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      className={`w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-sm border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 ${
                        errors.confirmPassword ? 'border-red-400/50' : 'border-white/20'
                      }`}
                      placeholder="Confirma tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-300">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            type="submit"
            disabled={isSubmitting || !isValid || !email || !name || (!isEmailOnly && (!password || !confirmPassword))}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isEmailOnly ? <Mail className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                <span>{isEmailOnly ? 'Comenzar, ¡gratis!' : 'Crear Cuenta'}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </motion.button>

          {/* Registration Mode Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleRegistrationMode}
              className="text-sm text-blue-300 hover:text-blue-200 transition-colors underline"
            >
              {isEmailOnly ? 'Registrarse con contraseña' : 'Registrarse con enlace mágico'}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-white/70">
              ¿Ya tienes una cuenta?{' '}
              <Link
                href="/auth/signin"
                className="text-blue-300 hover:text-blue-200 transition-colors font-medium"
              >
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/50">
            Al registrarte, aceptas nuestros{' '}
            <Link href="/terms" className="text-blue-300 hover:text-blue-200 transition-colors">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="text-blue-300 hover:text-blue-200 transition-colors">
              Política de Privacidad
            </Link>
          </p>
          <p className="text-xs text-white/50 mt-2">
            © 2024 Multipaga. Todos los derechos reservados.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

