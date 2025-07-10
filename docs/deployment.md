# Deployment Guide - Multipaga

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Configuración de Entornos](#configuración-de-entornos)
- [Variables de Entorno](#variables-de-entorno)
- [Build y Deployment](#build-y-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Configuración de Base de Datos](#configuración-de-base-de-datos)
- [Monitoreo y Logging](#monitoreo-y-logging)
- [Seguridad](#seguridad)
- [Performance Optimization](#performance-optimization)
- [Backup y Recovery](#backup-y-recovery)
- [Troubleshooting](#troubleshooting)

## Descripción General

Multipaga está diseñado para ser desplegado en múltiples entornos, desde desarrollo local hasta producción. La aplicación es **stateless** y utiliza **Vercel** como plataforma principal de deployment, con soporte para contenedores Docker cuando sea necesario.

### Arquitectura de Deployment

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging      │    │   Production    │
│   (localhost)   │    │   (Preview)      │    │   (vercel.app)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │   Hyperswitch    │
                    │   (Sandbox/Prod) │
                    └──────────────────┘
```

## Configuración de Entornos

### 1. Entorno de Desarrollo

```bash
# Configuración local para desarrollo
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_KEY=snd_your_sandbox_key
```

### 2. Entorno de Staging

```bash
# Configuración para preview/staging
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://multipaga-staging.vercel.app
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_KEY=snd_your_staging_key
```

### 3. Entorno de Producción

```bash
# Configuración para producción
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://multipaga.com
HYPERSWITCH_BASE_URL=https://api.hyperswitch.io
HYPERSWITCH_API_KEY=your_production_key
```

## Variables de Entorno

### Archivo de Configuración Base

```bash
# .env.example

# ==========================================
# APPLICATION CONFIGURATION
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_VERSION=1.0.0

# ==========================================
# HYPERSWITCH CONFIGURATION
# ==========================================
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_VERSION=v1
HYPERSWITCH_API_KEY=snd_your_api_key_here
HYPERSWITCH_PUBLISHABLE_KEY=pk_snd_your_publishable_key
HYPERSWITCH_SECRET_KEY=sk_snd_your_secret_key
HYPERSWITCH_WEBHOOK_SECRET=whsec_your_webhook_secret

# ==========================================
# SECURITY CONFIGURATION
# ==========================================
JWT_SECRET=your_jwt_secret_here_make_it_long_and_secure
ENCRYPTION_KEY=your_encryption_key_32_characters
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# ==========================================
# CACHE CONFIGURATION
# ==========================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
CACHE_TTL_DEFAULT=300
CACHE_TTL_PAYMENTS=600
CACHE_TTL_CUSTOMERS=1800

# ==========================================
# EXTERNAL SERVICES
# ==========================================
SENTRY_DSN=https://your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# ==========================================
# EMAIL CONFIGURATION
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@multipaga.com

# ==========================================
# LOGGING CONFIGURATION
# ==========================================
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_REQUEST_LOGGING=true

# ==========================================
# API CONFIGURATION
# ==========================================
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=60000
API_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000

# ==========================================
# WEBHOOK CONFIGURATION
# ==========================================
WEBHOOK_TIMEOUT=5000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=2000

# ==========================================
# FEATURE FLAGS
# ==========================================
FEATURE_RECONCILIATION_ENABLED=true
FEATURE_ADVANCED_ANALYTICS=false
FEATURE_MULTI_CURRENCY=true
FEATURE_WEBHOOK_LOGS=true

# ==========================================
# DEVELOPMENT ONLY
# ==========================================
NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=false
MOCK_HYPERSWITCH_API=false
ENABLE_API_MOCKING=false
```

### Validación de Variables de Entorno

```typescript
// src/infrastructure/config/EnvironmentValidator.ts
import { z } from 'zod'

const EnvironmentSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Hyperswitch
  HYPERSWITCH_BASE_URL: z.string().url(),
  HYPERSWITCH_API_KEY: z.string().min(1),
  HYPERSWITCH_SECRET_KEY: z.string().min(1),
  
  // Security
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(32),
  
  // Optional
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export function validateEnvironment() {
  try {
    return EnvironmentSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Environment validation failed:')
    console.error(error.errors)
    process.exit(1)
  }
}

// Load and validate on app start
export const config = validateEnvironment()
```

### Configuración por Entorno

```typescript
// src/infrastructure/config/Config.ts
export interface AppConfig {
  app: {
    name: string
    version: string
    url: string
    environment: string
  }
  hyperswitch: {
    baseUrl: string
    apiKey: string
    webhookSecret: string
  }
  cache: {
    ttl: {
      default: number
      payments: number
      customers: number
    }
  }
  security: {
    jwtSecret: string
    encryptionKey: string
  }
  features: {
    reconciliationEnabled: boolean
    advancedAnalytics: boolean
    multiCurrency: boolean
  }
}

export function createConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development'
  
  const baseConfig: AppConfig = {
    app: {
      name: 'Multipaga',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      environment: env,
    },
    hyperswitch: {
      baseUrl: process.env.HYPERSWITCH_BASE_URL!,
      apiKey: process.env.HYPERSWITCH_API_KEY!,
      webhookSecret: process.env.HYPERSWITCH_WEBHOOK_SECRET!,
    },
    cache: {
      ttl: {
        default: parseInt(process.env.CACHE_TTL_DEFAULT || '300'),
        payments: parseInt(process.env.CACHE_TTL_PAYMENTS || '600'),
        customers: parseInt(process.env.CACHE_TTL_CUSTOMERS || '1800'),
      },
    },
    security: {
      jwtSecret: process.env.JWT_SECRET!,
      encryptionKey: process.env.ENCRYPTION_KEY!,
    },
    features: {
      reconciliationEnabled: process.env.FEATURE_RECONCILIATION_ENABLED === 'true',
      advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
      multiCurrency: process.env.FEATURE_MULTI_CURRENCY === 'true',
    },
  }

  // Environment-specific overrides
  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        // Development-specific config
      }
    
    case 'staging':
      return {
        ...baseConfig,
        // Staging-specific config
      }
    
    case 'production':
      return {
        ...baseConfig,
        // Production-specific config
      }
    
    default:
      return baseConfig
  }
}

export const config = createConfig()
```

## Build y Deployment

### Scripts de Package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "playwright test",
    "build:analyze": "ANALYZE=true next build",
    "build:staging": "NODE_ENV=staging next build",
    "build:production": "NODE_ENV=production next build",
    "deploy:staging": "npm run build:staging && vercel --prod --target staging",
    "deploy:production": "npm run build:production && vercel --prod",
    "postbuild": "next-sitemap && npm run security-scan",
    "security-scan": "audit-ci --config audit-ci.json",
    "validate-env": "node -r esbuild-register scripts/validate-env.ts",
    "db:migrate": "node scripts/migrate.js",
    "health-check": "curl -f http://localhost:3000/api/health || exit 1"
  }
}
```

### Build Process

```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "🚀 Starting Multipaga build process..."

# 1. Environment validation
echo "📋 Validating environment..."
npm run validate-env

# 2. Type checking
echo "🔍 Running type checks..."
npm run type-check

# 3. Linting
echo "🔧 Linting code..."
npm run lint

# 4. Testing
echo "🧪 Running tests..."
npm run test

# 5. Security audit
echo "🔒 Running security audit..."
npm audit --audit-level moderate

# 6. Build application
echo "📦 Building application..."
npm run build

# 7. Bundle analysis (optional)
if [ "$ANALYZE_BUNDLE" = "true" ]; then
  echo "📊 Analyzing bundle..."
  npm run build:analyze
fi

echo "✅ Build completed successfully!"
```

### Pre-deployment Checks

```typescript
// scripts/pre-deployment-checks.ts
import { execSync } from 'child_process'
import { validateEnvironment } from '../src/infrastructure/config/EnvironmentValidator'

interface HealthCheck {
  name: string
  check: () => Promise<boolean>
  critical: boolean
}

const healthChecks: HealthCheck[] = [
  {
    name: 'Environment Variables',
    check: async () => {
      try {
        validateEnvironment()
        return true
      } catch {
        return false
      }
    },
    critical: true,
  },
  {
    name: 'Hyperswitch API Connectivity',
    check: async () => {
      try {
        const response = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/health`)
        return response.ok
      } catch {
        return false
      }
    },
    critical: true,
  },
  {
    name: 'Redis Connectivity',
    check: async () => {
      if (!process.env.REDIS_URL) return true // Optional in development
      // Add Redis connectivity check
      return true
    },
    critical: false,
  },
]

async function runPreDeploymentChecks() {
  console.log('🔍 Running pre-deployment checks...\n')
  
  let criticalFailures = 0
  
  for (const check of healthChecks) {
    process.stdout.write(`${check.name}... `)
    
    try {
      const result = await check.check()
      
      if (result) {
        console.log('✅ PASS')
      } else {
        console.log('❌ FAIL')
        if (check.critical) {
          criticalFailures++
        }
      }
    } catch (error) {
      console.log('❌ ERROR')
      if (check.critical) {
        criticalFailures++
      }
    }
  }
  
  if (criticalFailures > 0) {
    console.log(`\n❌ ${criticalFailures} critical checks failed. Deployment aborted.`)
    process.exit(1)
  } else {
    console.log('\n✅ All critical checks passed. Ready for deployment.')
  }
}

runPreDeploymentChecks()
```

## Vercel Deployment

### Configuración de Vercel

```json
// vercel.json
{
  "version": 2,
  "name": "multipaga",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/hyperswitch/(.*)",
      "dest": "/api/hyperswitch/$1"
    },
    {
      "src": "/api/webhooks/(.*)",
      "dest": "/api/webhooks/$1"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1", "sfo1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/health"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Deployment Commands

```bash
# Desarrollo - Preview deployment
vercel

# Staging - Preview con alias personalizado
vercel --target staging

# Producción - Production deployment
vercel --prod

# Con configuración específica
vercel --prod --env NODE_ENV=production

# Rollback a versión anterior
vercel rollback [deployment-url]

# Logs en tiempo real
vercel logs multipaga.vercel.app
```

### Variables de Entorno en Vercel

```bash
# Configurar variables de entorno via CLI
vercel env add HYPERSWITCH_API_KEY production
vercel env add HYPERSWITCH_API_KEY staging
vercel env add HYPERSWITCH_API_KEY development

# Listar variables
vercel env ls

# Remover variable
vercel env rm VARIABLE_NAME production
```

### Dominios Personalizados

```bash
# Agregar dominio personalizado
vercel domains add multipaga.com

# Configurar DNS
vercel dns add multipaga.com A 76.76.19.19
vercel dns add multipaga.com CNAME cname.vercel-dns.com

# Verificar dominio
vercel domains verify multipaga.com
```

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  multipaga:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - HYPERSWITCH_BASE_URL=${HYPERSWITCH_BASE_URL}
      - HYPERSWITCH_API_KEY=${HYPERSWITCH_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - multipaga-network
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - multipaga-network
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - multipaga
    networks:
      - multipaga-network
    restart: unless-stopped

volumes:
  redis-data:

networks:
  multipaga-network:
    driver: bridge
```

### Deployment con Docker

```bash
# Build y deploy local
docker-compose up --build

# Deploy en producción
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f multipaga

# Scaling
docker-compose up --scale multipaga=3

# Health check
docker-compose exec multipaga curl -f http://localhost:3000/api/health
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run security audit
        run: npm audit --audit-level high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm i -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Staging
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm i -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Production
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment-url=$url" >> $GITHUB_OUTPUT

      - name: Run smoke tests
        run: |
          sleep 30  # Wait for deployment to be ready
          curl -f ${{ steps.deploy.outputs.deployment-url }}/api/health

      - name: Notify Slack
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '🚀 Multipaga deployed successfully to production!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install

      - name: Run E2E tests
        run: npm run e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://multipaga-staging.vercel.app

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pipeline de Calidad

```yaml
# .github/workflows/quality.yml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Check code coverage threshold
        run: |
          coverage=$(npm run test:coverage -- --silent | grep -o 'Lines.*%' | grep -o '[0-9.]*')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "❌ Code coverage is below 80%: $coverage%"
            exit 1
          fi
          echo "✅ Code coverage is above 80%: $coverage%"

      - name: Bundle size check
        run: |
          npm run build
          size=$(du -sh .next | cut -f1)
          echo "Bundle size: $size"
          # Add size threshold check if needed
```

## Configuración de Base de Datos

### Redis Configuration

```yaml
# redis.conf
bind 0.0.0.0
port 6379
protected-mode yes
requirepass your_redis_password

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### Redis Cluster (Producción)

```bash
# scripts/setup-redis-cluster.sh
#!/bin/bash

# Crear instancias de Redis
for port in 7000 7001 7002 7003 7004 7005; do
  mkdir -p cluster/${port}
  cat > cluster/${port}/redis.conf <<EOF
port ${port}
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
bind 0.0.0.0
EOF
done

# Iniciar nodos
for port in 7000 7001 7002 7003 7004 7005; do
  redis-server cluster/${port}/redis.conf &
done

# Crear cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 \
127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
--cluster-replicas 1
```

## Monitoreo y Logging

### Configuración de Sentry

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
  
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['api-key']
    }
    return event
  },
  
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/multipaga\.com/,
        /^https:\/\/.*\.vercel\.app/,
      ],
    }),
  ],
})
```

### Winston Logger Setup

```typescript
// src/infrastructure/logging/WinstonLogger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'multipaga',
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { logger } from '@/infrastructure/logging/WinstonLogger'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    hyperswitch: 'up' | 'down'
    redis: 'up' | 'down'
    database: 'up' | 'down'
  }
  metrics: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check external services
    const hyperswitchStatus = await checkHyperswitchHealth()
    const redisStatus = await checkRedisHealth()
    
    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    const health: HealthStatus = {
      status: hyperswitchStatus === 'up' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        hyperswitch: hyperswitchStatus,
        redis: redisStatus,
        database: 'up', // No database in this architecture
      },
      metrics: {
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        cpu: {
          usage: process.cpuUsage().user / 1000000, // Convert to seconds
        },
      },
    }
    
    const responseTime = Date.now() - startTime
    
    logger.info('Health check completed', {
      status: health.status,
      responseTime,
      services: health.services,
    })
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
  } catch (error) {
    logger.error('Health check failed', { error })
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}

async function checkHyperswitchHealth(): Promise<'up' | 'down'> {
  try {
    const response = await fetch(`${process.env.HYPERSWITCH_BASE_URL}/health`, {
      timeout: 5000,
    })
    return response.ok ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

async function checkRedisHealth(): Promise<'up' | 'down'> {
  if (!process.env.REDIS_URL) return 'up' // Redis is optional
  
  try {
    // Add Redis connectivity check
    return 'up'
  } catch {
    return 'down'
  }
}
```

## Seguridad

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self' *.hyperswitch.io *.vercel.app",
    ].join('; ')
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

### SSL/TLS Configuration

```nginx
# nginx-ssl.conf
server {
    listen 443 ssl http2;
    server_name multipaga.com;

    ssl_certificate /etc/nginx/ssl/multipaga.com.crt;
    ssl_certificate_key /etc/nginx/ssl/multipaga.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://multipaga:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name multipaga.com;
    return 301 https://$server_name$request_uri;
}
```

## Performance Optimization

### Next.js Configuration

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // Image optimization
  images: {
    domains: ['multipaga.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
        },
      }
    }
    return config
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/payments',
        permanent: true,
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
```

### Caching Strategy

```typescript
// src/infrastructure/cache/CacheManager.ts
export class CacheManager {
  private static readonly CACHE_STRATEGIES = {
    // Short-lived cache for dynamic data
    DYNAMIC: { ttl: 60, tags: ['dynamic'] },
    
    // Medium cache for semi-static data
    SEMI_STATIC: { ttl: 300, tags: ['semi-static'] },
    
    // Long cache for static data
    STATIC: { ttl: 3600, tags: ['static'] },
    
    // User-specific cache
    USER: { ttl: 900, tags: ['user'] },
  }

  static async cacheWithStrategy<T>(
    key: string,
    fetcher: () => Promise<T>,
    strategy: keyof typeof CacheManager.CACHE_STRATEGIES
  ): Promise<T> {
    const config = this.CACHE_STRATEGIES[strategy]
    
    // Try to get from cache
    const cached = await cache.get(key)
    if (cached) {
      return cached
    }
    
    // Fetch and cache
    const data = await fetcher()
    await cache.set(key, data, config.ttl, config.tags)
    
    return data
  }
}
```

## Backup y Recovery

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/multipaga"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔄 Starting backup process..."

# 1. Backup environment variables
echo "📋 Backing up environment variables..."
vercel env ls > "$BACKUP_DIR/env_vars_$DATE.txt"

# 2. Backup deployment configuration
echo "⚙️ Backing up configuration..."
cp vercel.json "$BACKUP_DIR/vercel_$DATE.json"
cp package.json "$BACKUP_DIR/package_$DATE.json"

# 3. Backup Redis data (if using)
if [ -n "$REDIS_URL" ]; then
  echo "💾 Backing up Redis data..."
  redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"
fi

# 4. Create archive
echo "📦 Creating backup archive..."
tar -czf "$BACKUP_DIR/multipaga_backup_$DATE.tar.gz" \
  -C "$BACKUP_DIR" \
  env_vars_$DATE.txt \
  vercel_$DATE.json \
  package_$DATE.json \
  redis_$DATE.rdb

# 5. Upload to cloud storage
echo "☁️ Uploading to cloud storage..."
aws s3 cp "$BACKUP_DIR/multipaga_backup_$DATE.tar.gz" \
  s3://multipaga-backups/

# 6. Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed successfully!"
```

### Disaster Recovery Plan

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

echo "🚨 Starting disaster recovery process..."

# 1. Restore from latest backup
LATEST_BACKUP=$(aws s3 ls s3://multipaga-backups/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://multipaga-backups/$LATEST_BACKUP" ./restore/

# 2. Extract backup
tar -xzf "./restore/$LATEST_BACKUP"

# 3. Restore environment variables
echo "📋 Restoring environment variables..."
while IFS= read -r line; do
  if [[ $line =~ ^(.+)=(.+)$ ]]; then
    vercel env add "${BASH_REMATCH[1]}" production "${BASH_REMATCH[2]}"
  fi
done < "env_vars_*.txt"

# 4. Deploy application
echo "🚀 Redeploying application..."
vercel --prod

# 5. Run health checks
echo "🔍 Running health checks..."
sleep 30
curl -f https://multipaga.com/api/health || exit 1

echo "✅ Disaster recovery completed successfully!"
```

## Troubleshooting

### Common Deployment Issues

```bash
# scripts/troubleshoot.sh

echo "🔍 Running deployment troubleshooting..."

# Check environment variables
echo "📋 Checking environment variables..."
if [ -z "$HYPERSWITCH_API_KEY" ]; then
  echo "❌ HYPERSWITCH_API_KEY is not set"
  exit 1
fi

# Check API connectivity
echo "🌐 Checking API connectivity..."
if ! curl -f "$HYPERSWITCH_BASE_URL/health" > /dev/null 2>&1; then
  echo "❌ Cannot connect to Hyperswitch API"
  exit 1
fi

# Check build process
echo "🔨 Testing build process..."
npm run build || exit 1

# Check bundle size
echo "📦 Checking bundle size..."
BUNDLE_SIZE=$(du -sh .next | cut -f1)
echo "Bundle size: $BUNDLE_SIZE"

echo "✅ All checks passed!"
```

### Monitoring Script

```typescript
// scripts/monitor.ts
import { logger } from '../src/infrastructure/logging/WinstonLogger'

interface MonitoringMetrics {
  responseTime: number
  errorRate: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
}

class ApplicationMonitor {
  private metrics: MonitoringMetrics = {
    responseTime: 0,
    errorRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0,
  }

  async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const memUsage = process.memoryUsage()
      this.metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100

      // Test API response time
      const start = Date.now()
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`)
      this.metrics.responseTime = Date.now() - start

      logger.info('Metrics collected', this.metrics)

      // Alert if thresholds exceeded
      this.checkThresholds()
    } catch (error) {
      logger.error('Failed to collect metrics', { error })
    }
  }

  private checkThresholds(): void {
    const thresholds = {
      responseTime: 2000, // 2 seconds
      memoryUsage: 90,    // 90%
      errorRate: 5,       // 5%
    }

    if (this.metrics.responseTime > thresholds.responseTime) {
      this.sendAlert('High response time detected', this.metrics)
    }

    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      this.sendAlert('High memory usage detected', this.metrics)
    }
  }

  private sendAlert(message: string, metrics: MonitoringMetrics): void {
    logger.error(message, { metrics })
    // Send to alerting system (Slack, PagerDuty, etc.)
  }
}

// Run monitoring
const monitor = new ApplicationMonitor()
setInterval(() => monitor.collectMetrics(), 60000) // Every minute
```

---

Esta guía de deployment proporciona una cobertura completa para desplegar Multipaga en diferentes entornos, desde desarrollo hasta producción, con énfasis en seguridad, rendimiento y monitoreo.