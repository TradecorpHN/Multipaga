/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚠️ CRÍTICO: NO usar experimental.appDir en Next.js 14+
  // App Router está habilitado por defecto en Next.js 13.4+
  
  // React configuration
  reactStrictMode: true,
  
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['localhost', 'hyperswitch.io'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables que serán públicas
  env: {
    HYPERSWITCH_BASE_URL: process.env.HYPERSWITCH_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
    ]
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // DOCTYPE será manejado automáticamente por Next.js
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fix para Three.js y otras librerías del lado cliente
    if (!isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      })
    }

    // GLSL loader para shaders
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader', 'glslify-loader'],
    })

    // Optimización para desarrollo
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }

    return config
  },

  // Compilación optimizada
  compiler: {
    // Remover console.log en producción excepto errores
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Configuraciones experimentales SEGURAS para Next.js 14
  experimental: {
    // Server Actions si los necesitas
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimizaciones de CSS
    optimizeCss: true,
    // Mejorar tree shaking
    serverComponentsExternalPackages: ['@hyperswitch/node'],
  },

  // Trailing slash
  trailingSlash: false,

  // Configuración de output para deployment
  output: 'standalone',

  // TypeScript configuration
  typescript: {
    // ⚠️ Solo usar en desarrollo si tienes errores de tipos que quieres ignorar temporalmente
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig