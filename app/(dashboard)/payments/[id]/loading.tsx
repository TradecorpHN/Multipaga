// app/(dashboard)/payments/[id]/loading.tsx
export default function PaymentDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-dark-surface rounded-lg" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-dark-surface rounded" />
            <div className="h-4 w-64 bg-dark-surface rounded" />
          </div>
        </div>
      </div>

      {/* Status Card Skeleton */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-dark-hover rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-16 bg-dark-hover rounded" />
                <div className="h-6 w-24 bg-dark-hover rounded" />
              </div>
            </div>
            
            <div className="border-l border-dark-border pl-6">
              <div className="h-4 w-12 bg-dark-hover rounded mb-2" />
              <div className="h-8 w-32 bg-dark-hover rounded" />
            </div>

            <div className="border-l border-dark-border pl-6">
              <div className="h-4 w-16 bg-dark-hover rounded mb-2" />
              <div className="h-6 w-20 bg-dark-hover rounded" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-10 w-32 bg-dark-hover rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-dark-surface border border-dark-border rounded-xl">
        <div className="border-b border-dark-border">
          <div className="flex gap-6 px-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-4">
                <div className="h-5 w-20 bg-dark-hover rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Content Skeleton */}
          <div>
            <div className="h-6 w-48 bg-dark-hover rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-dark-hover rounded" />
                  <div className="h-5 w-full bg-dark-hover rounded" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="h-6 w-48 bg-dark-hover rounded mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-dark-hover rounded-lg">
                  <div className="h-16 w-full bg-dark-border rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}