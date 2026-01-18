"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, Heart, MessageSquare, FileText } from "lucide-react"
import { AnalyticsChart } from "./analytics-chart"
import { TopPostsTable } from "./top-posts-table"
import { RecentActivity } from "./recent-activity"

interface DashboardData {
  overview: {
    totalPosts: number
    totalViews: number
    totalLikes: number
    totalComments: number
  }
  rangeStats: {
    views: number
    likes: number
    comments: number
  }
  viewsByDay: { date: string; count: number }[]
  topPosts: {
    id: string
    title: string
    slug: string
    views: number
    likes: number
    comments: number
  }[]
  recentComments: {
    id: string
    content: string
    author: {
      id: string
      name: string
      avatar: string | null
    }
    post: {
      id: string
      title: string
      slug: string
    }
    createdAt: string
  }[]
}

async function fetchDashboardAnalytics(days: number): Promise<DashboardData> {
  const res = await fetch(`/api/analytics/dashboard?days=${days}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to fetch analytics")
  }
  return res.json()
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState("30")

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "dashboard", days],
    queryFn: () => fetchDashboardAnalytics(parseInt(days)),
  })

  if (isLoading) {
    return <AnalyticsDashboardSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Failed to load analytics"}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const stats = [
    {
      title: "Total Posts",
      value: data.overview.totalPosts,
      icon: FileText,
      description: "Published posts",
    },
    {
      title: "Total Views",
      value: data.overview.totalViews.toLocaleString(),
      icon: Eye,
      description: `${data.rangeStats.views.toLocaleString()} in last ${days} days`,
    },
    {
      title: "Total Likes",
      value: data.overview.totalLikes.toLocaleString(),
      icon: Heart,
      description: `${data.rangeStats.likes.toLocaleString()} in last ${days} days`,
    },
    {
      title: "Total Comments",
      value: data.overview.totalComments.toLocaleString(),
      icon: MessageSquare,
      description: `${data.rangeStats.comments.toLocaleString()} in last ${days} days`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart data={data.viewsByDay} />
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPostsTable posts={data.topPosts} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity comments={data.recentComments} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Time selector skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>

      {/* Bottom grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
