'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (totpCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ totp_code: totpCode }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Verificación 2FA exitosa');
        router.push('/dashboard');
      } else {
        setError(result.error || 'Error al verificar el código 2FA');
        toast.error(result.error || 'Error al verificar el código 2FA');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setError('Error de conexión');
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logotext.png"
              alt="Multipaga Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verificación 2FA</h1>
          <p className="text-white/80">Autenticación de Dos Factores</p>
          <p className="text-white/60 text-sm mt-2">
            Ingresa el código de 6 dígitos de tu aplicación de autenticación
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* 2FA Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TOTP Code Field */}
          <div>
            <label htmlFor="totpCode" className="block text-sm font-medium text-white/90 mb-2">
              Código de Verificación
            </label>
            <input
              id="totpCode"
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent text-center text-2xl tracking-widest"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || totpCode.length !== 6}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                <span>Verificar Código</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBackToLogin}
            className="flex items-center justify-center space-x-2 text-white/60 hover:text-white/80 font-medium transition-colors mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al login</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 text-blue-100 rounded-xl text-sm">
          <p className="font-medium mb-2">¿No tienes acceso a tu aplicación de autenticación?</p>
          <p>Contacta al administrador del sistema para obtener ayuda con la recuperación de tu cuenta.</p>
        </div>
      </div>
    </div>
  );
}

