// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/presentation/lib/env-config'

export async function GET(request: NextRequest) {
  try {
    // Check Hyperswitch API connectivity
    let hyperswitchStatus = 'unknown'
    let hyperswitchLatency = 0
    
    try {
      const startTime = Date.now()
      const response = await fetch(`${env.HYPERSWITCH_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      
      hyperswitchLatency = Date.now() - startTime
      hyperswitchStatus = response.ok ? 'healthy' : 'unhealthy'
    } catch (error) {
      hyperswitchStatus = 'unreachable'
    }

    const healthData = {
      status: hyperswitchStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime(),
        },
        hyperswitch: {
          status: hyperswitchStatus,
          latency: hyperswitchLatency,
          baseUrl: env.HYPERSWITCH_BASE_URL,
        },
      },
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        node: {
          version: process.version,
        },
      },
    }

    return NextResponse.json(healthData, {
      status: healthData.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Internal health check failed',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}