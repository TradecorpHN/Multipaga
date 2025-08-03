import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import '@/presentation/styles/globals.css'
import EnvironmentSwitcher from '@/components/layout/EnvironmentSwitcher'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Multipaga - Hyperswitch Payment Management',
  description: 'Manage payments, refunds, disputes and reconciliation with Hyperswitch API',
  keywords: ['payments', 'hyperswitch', 'payment gateway', 'refunds', 'disputes'],
  authors: [{ name: 'Multipaga' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0f0f23',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          {/* Add EnvironmentSwitcher here, perhaps in a fixed position or a footer */}
          <div className="fixed bottom-4 right-4 z-50">
            <EnvironmentSwitcher />
          </div>
        </Providers>
      </body>
    </html>
  )
}

