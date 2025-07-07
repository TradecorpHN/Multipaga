import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/presentation/lib/env-config'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: {
    api: {
      status: 'pass' | 'fail'
      responseTime?: number
      error?: string
    }
    hyperswitch: {
      status: 'pass' | 'fail'
      responseTime?: number
      error?: string
    }
    database?: {
      status: 'pass' | 'fail'
      responseTime?: number
      error?: string
    }
  }
}

// Check Hyperswitch API connectivity
async function checkHyperswitchAPI(): Promise<{
  status: 'pass' | 'fail'
  responseTime?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${env.HYPERSWITCH_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.HYPERSWITCH_API_KEY}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        status: 'pass',
        responseTime,
      }
    } else {
      return {
        status: 'fail',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Perform health checks
  const hyperswitchCheck = await checkHyperswitchAPI()

  // Determine overall health status
  const isHealthy = hyperswitchCheck.status === 'pass'
  const status: HealthStatus['status'] = isHealthy ? 'healthy' : 'unhealthy'

  const healthStatus: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      api: {
        status: 'pass',
        responseTime: Date.now() - startTime,
      },
      hyperswitch: hyperswitchCheck,
    },
  }

  // Return appropriate status code
  const statusCode = isHealthy ? 200 : 503

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Version': '1.0',
    },
  })
}

// Simple HEAD request support for monitoring tools
export async function HEAD(request: NextRequest) {
  // Quick check without detailed diagnostics
  try {
    const response = await fetch(`${env.HYPERSWITCH_BASE_URL}/health`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${env.HYPERSWITCH_API_KEY}`,
      },
      signal: AbortSignal.timeout(3000),
    })

    return new NextResponse(null, {
      status: response.ok ? 200 : 503,
      headers: {
        'X-Health-Status': response.ok ? 'healthy' : 'unhealthy',
      },
    })
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
      },
    })
  }
}