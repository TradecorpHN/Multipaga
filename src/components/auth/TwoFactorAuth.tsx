'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, 
  Shield, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'react-qr-code';

interface TwoFactorAuthProps {
  mode?: 'setup' | 'verify';
  onSuccess?: () => void;
  onSkip?: () => void;
}

export default function TwoFactorAuth({ mode = 'setup', onSuccess, onSkip }: TwoFactorAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State variables
  const [currentMode, setCurrentMode] = useState<'totp' | 'recovery'>(mode === 'setup' ? 'totp' : 'totp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [mounted, setMounted] = useState(false);

  // OTP input state
  const [otpValues, setOtpValues] = useState<string[]>(new Array(6).fill(''));
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Recovery code input state
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (mode === 'setup') {
      generateQRCode();
    }
  }, [mode]);

  // Generate QR code for 2FA setup
  const generateQRCode = async () => {
    try {
      const response = await fetch('/api/auth/2fa/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setQrCodeUrl(result.qrCodeUrl);
        setSecretKey(result.secretKey);
      } else {
        setError(result.error || 'Error al generar código QR');
        toast.error(result.error || 'Error al generar código QR');
      }
    } catch (error) {
      setError('Error al generar código QR');
      toast.error('Error al generar código QR');
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtpValues.every(val => val !== '') && newOtpValues.join('').length === 6) {
      handleVerifyOtp(newOtpValues.join(''));
    }
  };

  // Handle OTP key down
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtpValues = pastedData.split('').concat(new Array(6 - pastedData.length).fill(''));
    setOtpValues(newOtpValues);

    // Auto-submit if complete
    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (otp: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === 'setup' ? '/api/auth/2fa/verify-setup' : '/api/auth/2fa/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ otp }),
      });

      const result = await response.json();

      if (result.success) {
        if (mode === 'setup') {
          setRecoveryCodes(result.recoveryCodes || []);
          setShowRecoveryCodes(true);
          toast.success('2FA configurado exitosamente');
        } else {
          toast.success('Verificación exitosa');
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setError(result.error || 'Código OTP inválido');
        toast.error(result.error || 'Código OTP inválido');
        // Clear OTP inputs on error
        setOtpValues(new Array(6).fill(''));
        otpRefs.current[0]?.focus();
      }
    } catch (error) {
      setError('Error al verificar código OTP');
      toast.error('Error al verificar código OTP');
      setOtpValues(new Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify recovery code
  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      setError('Por favor ingresa un código de recuperación');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/verify-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ recoveryCode: recoveryCode.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Verificación exitosa');
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Código de recuperación inválido');
        toast.error(result.error || 'Código de recuperación inválido');
      }
    } catch (error) {
      setError('Error al verificar código de recuperación');
      toast.error('Error al verificar código de recuperación');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy secret key
  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    toast.success('Clave secreta copiada al portapapeles');
  };

  // Copy recovery codes
  const copyRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Códigos de recuperación copiados al portapapeles');
  };

  // Handle skip 2FA
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      router.push('/dashboard');
    }
  };

  // Handle finish setup
  const handleFinishSetup = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push('/dashboard');
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
        className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl w-full max-w-2xl mx-4"
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
                <span className="text-gray-800 font-medium">Verificando...</span>
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
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-white mb-2"
          >
            {mode === 'setup' ? 'Habilitar Autenticación de Dos Factores' : 'Verificación de Dos Factores'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white/70 text-center"
          >
            {mode === 'setup' 
              ? 'Usa cualquier aplicación de autenticación para completar la configuración'
              : 'Ingresa el código de tu aplicación de autenticación'
            }
          </motion.p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-100 rounded-2xl flex items-center"
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {showRecoveryCodes ? (
            // Recovery codes display
            <motion.div
              key="recovery-codes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  ¡2FA Configurado Exitosamente!
                </h2>
                <p className="text-white/70 mb-6">
                  Guarda estos códigos de recuperación en un lugar seguro. Los necesitarás si pierdes acceso a tu dispositivo de autenticación.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white">Códigos de Recuperación</h3>
                  <button
                    onClick={copyRecoveryCodes}
                    className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">Copiar</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 text-center font-mono text-white"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleFinishSetup}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all duration-300"
              >
                Continuar al Dashboard
              </button>
            </motion.div>
          ) : mode === 'setup' && !showRecoveryCodes ? (
            // Setup mode
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Instructions */}
              <div className="lg:col-span-3 space-y-4 text-white/80">
                <h3 className="text-lg font-medium text-white mb-4">
                  Sigue estos pasos para configurar la autenticación de dos factores:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p>Escanea el código QR mostrado en pantalla con tu aplicación de autenticación</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p>Ingresa el código OTP de 6 dígitos generado por tu aplicación de autenticación en el campo de texto a continuación</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                {qrCodeUrl && (
                  <div className="bg-white p-4 rounded-2xl">
                    <QRCode value={qrCodeUrl} size={200} />
                  </div>
                )}
                
                {secretKey && (
                  <div className="text-center">
                    <p className="text-sm text-white/70 mb-2">O ingresa manualmente:</p>
                    <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg p-3">
                      <code className="text-sm font-mono text-white flex-1">{secretKey}</code>
                      <button
                        onClick={copySecretKey}
                        className="text-blue-300 hover:text-blue-200 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* OTP Input */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-4">
                    Ingresa el código de 6 dígitos generado por tu aplicación de autenticación
                  </label>
                  <div className="flex justify-center space-x-2" onPaste={handleOtpPaste}>
                    {otpValues.map((value, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-12 text-center text-xl font-semibold bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    data-testid="skip-now"
                    onClick={handleSkip}
                    className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-3 px-6 rounded-2xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300"
                  >
                    Omitir por ahora
                  </button>
                  <button
                    data-button-for="enable2FA"
                    onClick={() => handleVerifyOtp(otpValues.join(''))}
                    disabled={otpValues.some(val => val === '') || isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Habilitar 2FA
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Verify mode
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentMode === 'totp' ? (
                // TOTP verification
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-4 text-center">
                      Ingresa el código de 6 dígitos generado por tu aplicación de autenticación
                    </label>
                    <div className="flex justify-center space-x-2" onPaste={handleOtpPaste}>
                      {otpValues.map((value, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={value}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-16 h-16 text-center text-2xl font-semibold bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-white/70 mb-2">
                      ¿No tienes acceso a tu código?{' '}
                      <button
                        onClick={() => setCurrentMode('recovery')}
                        className="text-blue-300 hover:text-blue-200 transition-colors underline"
                      >
                        Usar código de recuperación
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                // Recovery code verification
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-4 text-center">
                      Ingresa uno de tus códigos de recuperación
                    </label>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Ingresa código de recuperación"
                      className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 text-center font-mono"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => setCurrentMode('totp')}
                      className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium py-3 px-6 rounded-2xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Usar TOTP</span>
                    </button>
                    <button
                      onClick={handleVerifyRecoveryCode}
                      disabled={!recoveryCode.trim() || isSubmitting}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      Verificar
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-white/70">
                      ¿No tienes acceso a tu código?{' '}
                      <button
                        onClick={() => setCurrentMode('totp')}
                        className="text-blue-300 hover:text-blue-200 transition-colors underline"
                      >
                        Usar código TOTP
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* Footer for verify mode */}
              <div className="text-center pt-6 border-t border-white/10">
                <p className="text-sm text-white/70">
                  ¿Iniciar sesión con una cuenta diferente?{' '}
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="text-blue-300 hover:text-blue-200 transition-colors underline"
                  >
                    Haz clic aquí para cerrar sesión.
                  </button>
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

