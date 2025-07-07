// app/loading.tsx
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <Loader2 className="absolute inset-0 m-auto h-12 w-12 animate-spin text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Loading Multipaga...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  )
}