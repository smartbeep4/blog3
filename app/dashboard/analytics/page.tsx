import { Suspense } from "react"
import { requireAuthor } from "@/lib/guards"
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Analytics | Dashboard",
  description: "Track your content performance and engagement",
}

export default async function AnalyticsPage() {
  await requireAuthor()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your content performance and engagement
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>

      {/* Chart skeleton */}
      <Skeleton className="h-80 rounded-xl" />

      {/* Bottom grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
