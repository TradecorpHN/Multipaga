'use client'

import useSWR from 'swr'

interface SidebarStats {
  pendingPayments: number
  pendingRefunds: number
  activeDisputes: number
  pendingReconciliation: number
  totalTransactions: number
  todayRevenue: number
}

interface UseSidebarStatsReturn {
  stats: SidebarStats | null
  isLoading: boolean
  error: any
  refresh: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch sidebar stats')
  }
  
  return response.json()
}

export function useSidebarStats(): UseSidebarStatsReturn {
  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR<SidebarStats>('/api/dashboard/stats', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000, // Refresh every minute
  })

  const refresh = async () => {
    await mutate()
  }

  return {
    stats: data || null,
    isLoading,
    error,
    refresh,
  }
}