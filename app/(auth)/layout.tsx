import { ReactNode } from 'react';

export const metadata = {
  title: 'Multipaga - Login',
  description: 'Inicia sesión en el dashboard de Multipaga con tus credenciales de Hyperswitch',
};

export const viewport = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  themeColor: '#000000',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      {children}
    </div>
  );
}