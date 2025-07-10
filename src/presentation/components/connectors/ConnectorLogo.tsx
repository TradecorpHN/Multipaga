// ==============================================================================
// ConnectorLogo.tsx - Componente para mostrar logos de conectores
// ==============================================================================

'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Building,
  CreditCard,
  Zap,
  Shield,
  DollarSign,
  AlertTriangle
} from 'lucide-react'

interface ConnectorLogoProps {
  connectorName: string
  connectorType?: 'payment_processor' | 'payment_vas' | 'authentication_processor' | 'payout_processor' | 'fraud_check'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'rounded' | 'circle'
  showFallback?: boolean
  className?: string
  alt?: string
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const variantClasses = {
  default: 'rounded',
  rounded: 'rounded-lg',
  circle: 'rounded-full'
}

// Mapeo de conectores conocidos a sus logos
const CONNECTOR_LOGOS: Record<string, string> = {
  'stripe': '/logos/connectors/stripe.svg',
  'adyen': '/logos/connectors/adyen.svg',
  'paypal': '/logos/connectors/paypal.svg',
  'square': '/logos/connectors/square.svg',
  'braintree': '/logos/connectors/braintree.svg',
  'checkout.com': '/logos/connectors/checkout.svg', // ← actualiza aquí si tus archivos usan .com
  'checkout': '/logos/connectors/checkout.svg',
  'worldpay': '/logos/connectors/worldpay.svg',
  'rapyd': '/logos/connectors/rapyd.svg',
  'multisafepay': '/logos/connectors/multisafepay.svg',
  'payme': '/logos/connectors/payme.svg',
  'fiserv': '/logos/connectors/fiserv.svg',
  'bluesnap': '/logos/connectors/bluesnap.svg',
  'nmi': '/logos/connectors/nmi.svg',
  'dlocal': '/logos/connectors/dlocal.svg',
  'aci': '/logos/connectors/aci.svg',
  'authorizedotnet': '/logos/connectors/authorize.svg',
  'cybersource': '/logos/connectors/cybersource.svg',
  'globalpay': '/logos/connectors/globalpay.svg',
  'klarna': '/logos/connectors/klarna.svg',
  'mollie': '/logos/connectors/mollie.svg',
  'noon': '/logos/connectors/noon.svg',
  'nuvei': '/logos/connectors/nuvei.svg',
  'payu': '/logos/connectors/payu.svg',
  'powertranz': '/logos/connectors/powertranz.svg',
  'shift4': '/logos/connectors/shift4.svg',
  'trustpay': '/logos/connectors/trustpay.svg',
  'worldline': '/logos/connectors/worldline.svg',
}

// Iconos de fallback por tipo de conector
const FALLBACK_ICONS = {
  payment_processor: CreditCard,
  payment_vas: Zap,
  authentication_processor: Shield,
  payout_processor: DollarSign,
  fraud_check: AlertTriangle,
  default: Building
}

export function ConnectorLogo({
  connectorName,
  connectorType = 'payment_processor',
  size = 'md',
  variant = 'default',
  showFallback = true,
  className,
  alt
}: ConnectorLogoProps) {
  // Match flexible, soporta minúsculas y también nombres "checkout.com"
  const lookupName = connectorName.replace(/\s+/g, '').toLowerCase()
  const logoPath = CONNECTOR_LOGOS[lookupName] ?? CONNECTOR_LOGOS[connectorName.toLowerCase()]
  const FallbackIcon = FALLBACK_ICONS[connectorType] || FALLBACK_ICONS.default

  const baseClasses = cn(
    'object-contain bg-white/5 backdrop-blur-sm border border-white/10',
    sizeClasses[size],
    variantClasses[variant],
    className
  )

  // Si hay logo disponible, mostrarlo
  if (logoPath) {
    return (
      <div className={cn('relative overflow-hidden', baseClasses)}>
        <Image
          src={logoPath}
          alt={alt || `${connectorName} logo`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-1"
          onError={(e) => {
            // Si falla la carga de la imagen, mostrar fallback
            if (showFallback) {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }
          }}
        />
        {showFallback && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 hover:opacity-100">
            <FallbackIcon className="w-1/2 h-1/2 text-white/60" />
          </div>
        )}
      </div>
    )
  }

  // Fallback: mostrar icono y primera letra del conector
  if (showFallback) {
    return (
      <div className={cn(
        'flex items-center justify-center text-white/80 bg-gradient-to-br from-purple-500/20 to-blue-500/20',
        baseClasses
      )}>
        {size === 'xl' ? (
          <div className="flex flex-col items-center space-y-1">
            <FallbackIcon className="w-6 h-6" />
            <span className="text-xs font-medium">
              {connectorName.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <FallbackIcon className="w-1/2 h-1/2" />
        )}
      </div>
    )
  }

  return null
}

export default ConnectorLogo
