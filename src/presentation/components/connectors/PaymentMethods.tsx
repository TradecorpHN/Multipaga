'use client'

import React from 'react'
import { Badge } from '@/presentation/components/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/presentation/components/ui/Card'
import { Separator } from '@/presentation/components/ui/Separator'
import { cn } from '@/presentation/lib/utils'
import {
  CreditCard,
  Building,
  Smartphone,
  QrCode,
  Banknote,
  Wallet,
  Globe,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface PaymentMethodType {
  payment_method_type: string
  minimum_amount?: number
  maximum_amount?: number
  recurring_enabled?: boolean
  installment_payment_enabled?: boolean
}

interface PaymentMethodsEnabled {
  payment_method: string
  payment_method_types?: PaymentMethodType[]
}

interface PaymentMethodsProps {
  paymentMethods: PaymentMethodsEnabled[]
  currency?: string
  variant?: 'compact' | 'detailed' | 'grid'
  showLimits?: boolean
  showFeatures?: boolean
  className?: string
}

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  card: CreditCard,
  bank_transfer: Building,
  wallet: Wallet,
  bank_redirect: Globe,
  crypto: Shield,
  voucher: Banknote,
  upi: Smartphone,
  pay_later: Clock,
  gift_card: CreditCard,
  real_time_payment: Smartphone,
  open_banking: Building,
  mobile_payment: Smartphone,
  qr_code: QrCode,
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  card: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bank_transfer: 'bg-green-500/10 text-green-400 border-green-500/20',
  wallet: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  bank_redirect: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  crypto: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  voucher: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  upi: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  pay_later: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  gift_card: 'bg-red-500/10 text-red-400 border-red-500/20',
  real_time_payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  open_banking: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  mobile_payment: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  qr_code: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const formatPaymentMethodName = (method: string): string => {
  return method
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatPaymentMethodType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatAmount = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount / 100)
}

export function PaymentMethods({
  paymentMethods,
  currency = 'USD',
  variant = 'detailed',
  showLimits = true,
  showFeatures = true,
  className
}: PaymentMethodsProps) {
  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No payment methods configured</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {paymentMethods.map((pm, index) => {
          const Icon = PAYMENT_METHOD_ICONS[pm.payment_method] || CreditCard
          return (
            <Badge
              key={index}
              variant="secondary"
              className={cn(
                'flex items-center space-x-1 px-2 py-1',
                PAYMENT_METHOD_COLORS[pm.payment_method] || 'bg-gray-500/10 text-gray-400'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="text-xs">{formatPaymentMethodName(pm.payment_method)}</span>
            </Badge>
          )
        })}
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {paymentMethods.map((pm, index) => {
          const Icon = PAYMENT_METHOD_ICONS[pm.payment_method] || CreditCard
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    PAYMENT_METHOD_COLORS[pm.payment_method] || 'bg-gray-500/10'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm">
                    {formatPaymentMethodName(pm.payment_method)}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {pm.payment_method_types && pm.payment_method_types.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {pm.payment_method_types.slice(0, 3).map((type, typeIndex) => (
                        <Badge key={typeIndex} variant="outline" className="text-xs">
                          {formatPaymentMethodType(type.payment_method_type)}
                        </Badge>
                      ))}
                      {pm.payment_method_types.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pm.payment_method_types.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Variant: detailed (default)
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Payment Methods</span>
          <Badge variant="secondary">{paymentMethods.length}</Badge>
        </CardTitle>
        <CardDescription>
          Supported payment methods and their configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.map((pm, index) => {
          const Icon = PAYMENT_METHOD_ICONS[pm.payment_method] || CreditCard
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'p-2 rounded-lg border',
                  PAYMENT_METHOD_COLORS[pm.payment_method] || 'bg-gray-500/10 text-gray-400'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">
                    {formatPaymentMethodName(pm.payment_method)}
                  </h4>
                  {pm.payment_method_types && pm.payment_method_types.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {pm.payment_method_types.length} type{pm.payment_method_types.length !== 1 ? 's' : ''} available
                    </p>
                  )}
                </div>
              </div>
              {pm.payment_method_types && pm.payment_method_types.length > 0 && (
                <div className="ml-11 space-y-2">
                  {pm.payment_method_types.map((type, typeIndex) => (
                    <div key={typeIndex} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/5 border border-gray-200/10">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {formatPaymentMethodType(type.payment_method_type)}
                        </Badge>
                        {showFeatures && (
                          <div className="flex items-center space-x-2">
                            {type.recurring_enabled && (
                              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Recurring
                              </Badge>
                            )}
                            {type.installment_payment_enabled && (
                              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-400">
                                <Clock className="w-3 h-3 mr-1" />
                                Installments
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      {showLimits && (type.minimum_amount || type.maximum_amount) && (
                        <div className="text-xs text-gray-500">
                          {type.minimum_amount && (
                            <span>Min: {formatAmount(type.minimum_amount, currency)}</span>
                          )}
                          {type.minimum_amount && type.maximum_amount && ' • '}
                          {type.maximum_amount && (
                            <span>Max: {formatAmount(type.maximum_amount, currency)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {index < paymentMethods.length - 1 && <Separator />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
