
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Wallet,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PaymentElement, useElements, useStripe, Elements } from '@juspay-tech/react-hyper-js';
import { getPublishableKey } from '@/src/lib/environment';

// Types
interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank_transfer' | 'crypto';
  name: string;
  icon?: string;
  enabled: boolean;
  supported_countries?: string[];
  supported_currencies?: string[];
}

interface PaymentWidgetProps {
  clientSecret: string;
  amount: number;
  currency: string;
  customerId?: string;
  merchantId?: string;
  profileId?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  theme?: 'light' | 'dark' | 'auto';
  locale?: string;
  appearance?: {
    theme?: string;
    variables?: Record<string, string>;
  };
}

export default function PaymentWidget({
  clientSecret,
  amount,
  currency,
  customerId,
  merchantId,
  profileId,
  onSuccess,
  onError,
  theme = 'auto',
  locale = 'es',
  appearance,
}: PaymentWidgetProps) {
  const publishableKey = getPublishableKey();

  if (!publishableKey) {
    return (
      <div className="text-center p-6 text-red-500">
        Error: Publishable Key no configurada. Por favor, verifica tu archivo .env.local.
      </div>
    );
  }

  const options = {
    clientSecret,
    locale,
    appearance: appearance || { theme: 'flat' },
  };

  return (
    <Elements stripe={publishableKey} options={options}>
      <PaymentForm 
        clientSecret={clientSecret}
        amount={amount}
        currency={currency}
        customerId={customerId}
        merchantId={merchantId}
        profileId={profileId}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  customerId?: string;
  merchantId?: string;
  profileId?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
}

function PaymentForm({
  clientSecret,
  amount,
  currency,
  customerId,
  merchantId,
  profileId,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded. Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.submit();

    if (submitError) {
      setError(submitError.message || 'Error al enviar el pago');
      toast.error(submitError.message || 'Error al enviar el pago');
      setIsProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/payments/success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Error al confirmar el pago');
      toast.error(confirmError.message || 'Error al confirmar el pago');
      if (onError) {
        onError(confirmError);
      }
    } else if (paymentIntent) {
      if (paymentIntent.status === 'succeeded') {
        toast.success('Pago procesado exitosamente');
        if (onSuccess) {
          onSuccess(paymentIntent);
        }
      } else {
        // Handle other statuses, e.g., 'requires_action'
        setError(`Pago ${paymentIntent.status}`);
        toast.error(`Pago ${paymentIntent.status}`);
        if (onError) {
          onError(new Error(`Payment ${paymentIntent.status}`));
        }
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pago Seguro</h3>
              <p className="text-blue-100 text-sm">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: currency.toUpperCase(),
                }).format(amount / 100)}
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center"
            >
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <PaymentElement />
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-2 mt-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  <span>Pagar {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: currency.toUpperCase(),
                  }).format(amount / 100)}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Security notice */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <Shield className="h-4 w-4 mr-1" />
              Pago seguro procesado por Hyperswitch
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


