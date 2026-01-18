# 10 - Analytics

## Overview

You are responsible for implementing the analytics system, including view tracking, engagement metrics, and the analytics dashboard for authors and admins.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Post management implemented (Agent 05)

---

## Features

1. Post view tracking
2. View analytics per post
3. Author analytics dashboard
4. Admin site-wide analytics
5. Engagement metrics (likes, comments, shares)

---

## Step 1: Create View Tracking API

Create `app/api/posts/[id]/view/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  // Get IP hash for anonymous tracking (privacy-preserving)
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "unknown"
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)

  const userAgent = request.headers.get("user-agent") || undefined
  const referer = request.headers.get("referer") || undefined

  // Check for duplicate views (same user/IP in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const existingView = await prisma.postView.findFirst({
    where: {
      postId: params.id,
      createdAt: { gte: oneHourAgo },
      OR: [
        { userId: session?.user?.id },
        { ipHash: session?.user ? undefined : ipHash },
      ].filter(Boolean),
    },
  })

  if (existingView) {
    return NextResponse.json({ tracked: false })
  }

  // Create view record
  await prisma.postView.create({
    data: {
      postId: params.id,
      userId: session?.user?.id,
      ipHash: session?.user ? undefined : ipHash,
      userAgent: userAgent?.slice(0, 500),
      referer: referer?.slice(0, 500),
    },
  })

  return NextResponse.json({ tracked: true })
}
```

---

## Step 2: Create Analytics API

Create `app/api/analytics/posts/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { authorId: true },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Only author or editors can view analytics
  const isAuthor = post.authorId === session.user.id
  const isEditor = hasRole(session.user.role, "EDITOR")

  if (!isAuthor && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "30")
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get views by day
  const viewsByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "PostView"
    WHERE post_id = ${params.id}
    AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  // Get total views
  const totalViews = await prisma.postView.count({
    where: { postId: params.id },
  })

  // Get unique views
  const uniqueViews = await prisma.postView.groupBy({
    by: ["userId", "ipHash"],
    where: { postId: params.id },
  })

  // Get top referrers
  const topReferrers = await prisma.postView.groupBy({
    by: ["referer"],
    where: {
      postId: params.id,
      referer: { not: null },
    },
    _count: true,
    orderBy: { _count: { referer: "desc" } },
    take: 10,
  })

  // Get engagement stats
  const [likes, comments, bookmarks] = await Promise.all([
    prisma.like.count({ where: { postId: params.id } }),
    prisma.comment.count({ where: { postId: params.id } }),
    prisma.bookmark.count({ where: { postId: params.id } }),
  ])

  return NextResponse.json({
    totalViews,
    uniqueViews: uniqueViews.length,
    viewsByDay: viewsByDay.map((v) => ({
      date: v.date.toISOString().split("T")[0],
      count: Number(v.count),
    })),
    topReferrers: topReferrers.map((r) => ({
      referer: r.referer || "Direct",
      count: r._count,
    })),
    engagement: {
      likes,
      comments,
      bookmarks,
    },
  })
}
```

---

## Step 3: Create Dashboard Analytics API

Create `app/api/analytics/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "AUTHOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "30")
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get author's posts or all posts for admins
  const postFilter = hasRole(session.user.role, "ADMIN")
    ? {}
    : { authorId: session.user.id }

  // Get total stats
  const [totalPosts, totalViews, totalLikes, totalComments] = await Promise.all([
    prisma.post.count({
      where: { ...postFilter, status: "PUBLISHED" },
    }),
    prisma.postView.count({
      where: { post: postFilter },
    }),
    prisma.like.count({
      where: { post: postFilter },
    }),
    prisma.comment.count({
      where: { post: postFilter },
    }),
  ])

  // Get views by day
  const viewsByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(pv.created_at) as date, COUNT(*) as count
    FROM "PostView" pv
    JOIN "Post" p ON pv.post_id = p.id
    WHERE pv.created_at >= ${startDate}
    ${!hasRole(session.user.role, "ADMIN") ? prisma.$queryRaw`AND p.author_id = ${session.user.id}` : prisma.$queryRaw``}
    GROUP BY DATE(pv.created_at)
    ORDER BY date ASC
  `

  // Get top posts
  const topPosts = await prisma.post.findMany({
    where: {
      ...postFilter,
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: { views: true, likes: true, comments: true },
      },
    },
    orderBy: {
      views: { _count: "desc" },
    },
    take: 5,
  })

  // Get recent activity
  const recentComments = await prisma.comment.findMany({
    where: { post: postFilter },
    include: {
      author: { select: { name: true, avatar: true } },
      post: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return NextResponse.json({
    overview: {
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
    },
    viewsByDay: viewsByDay.map((v) => ({
      date: v.date.toISOString().split("T")[0],
      count: Number(v.count),
    })),
    topPosts: topPosts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      views: p._count.views,
      likes: p._count.likes,
      comments: p._count.comments,
    })),
    recentComments: recentComments.map((c) => ({
      id: c.id,
      content: c.content.slice(0, 100),
      author: c.author,
      post: c.post,
      createdAt: c.createdAt,
    })),
  })
}
```

---

## Step 4: Create Admin Analytics API

Create `app/api/admin/analytics/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "30")
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get user stats
  const [totalUsers, newUsers, totalSubscribers, paidSubscribers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.newsletterSubscriber.count({
      where: { isVerified: true },
    }),
    prisma.subscription.count({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),
  ])

  // Get content stats
  const [totalPosts, publishedPosts, totalViews, totalComments] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.postView.count(),
    prisma.comment.count(),
  ])

  // Get user growth by day
  const userGrowth = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "User"
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  // Get views by day
  const viewsByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "PostView"
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  // Get top authors
  const topAuthors = await prisma.user.findMany({
    where: { role: { in: ["AUTHOR", "EDITOR", "ADMIN"] } },
    include: {
      posts: {
        where: { status: "PUBLISHED" },
        include: {
          _count: { select: { views: true, likes: true } },
        },
      },
      _count: {
        select: { posts: { where: { status: "PUBLISHED" } } },
      },
    },
    take: 10,
  })

  const topAuthorsWithStats = topAuthors
    .map((author) => ({
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      postCount: author._count.posts,
      totalViews: author.posts.reduce((sum, p) => sum + p._count.views, 0),
      totalLikes: author.posts.reduce((sum, p) => sum + p._count.likes, 0),
    }))
    .sort((a, b) => b.totalViews - a.totalViews)

  return NextResponse.json({
    users: {
      total: totalUsers,
      new: newUsers,
      subscribers: totalSubscribers,
      paidSubscribers,
    },
    content: {
      totalPosts,
      publishedPosts,
      totalViews,
      totalComments,
    },
    userGrowth: userGrowth.map((u) => ({
      date: u.date.toISOString().split("T")[0],
      count: Number(u.count),
    })),
    viewsByDay: viewsByDay.map((v) => ({
      date: v.date.toISOString().split("T")[0],
      count: Number(v.count),
    })),
    topAuthors: topAuthorsWithStats,
  })
}
```

---

## Step 5: Create Analytics Dashboard Page

Create `app/dashboard/analytics/page.tsx`:

```typescript
import { Suspense } from "react"
import { requireAuthor } from "@/lib/guards"
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Analytics",
}

export default async function AnalyticsPage() {
  await requireAuthor()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your content performance
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
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}
```

---

## Step 6: Create Analytics Dashboard Component

Create `components/dashboard/analytics-dashboard.tsx`:

```typescript
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
  viewsByDay: { date: string; count: number }[]
  topPosts: any[]
  recentComments: any[]
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState("30")

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["analytics", "dashboard", days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/dashboard?days=${days}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json()
    },
  })

  if (isLoading || !data) {
    return <div>Loading...</div>
  }

  const stats = [
    {
      title: "Total Posts",
      value: data.overview.totalPosts,
      icon: FileText,
    },
    {
      title: "Total Views",
      value: data.overview.totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      title: "Total Likes",
      value: data.overview.totalLikes.toLocaleString(),
      icon: Heart,
    },
    {
      title: "Total Comments",
      value: data.overview.totalComments.toLocaleString(),
      icon: MessageSquare,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
```

---

## Step 7: Create Analytics Chart Component

Create `components/dashboard/analytics-chart.tsx`:

```typescript
"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { format, parseISO } from "date-fns"

interface AnalyticsChartProps {
  data: { date: string; count: number }[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(value) => format(parseISO(value), "MMM d")}
          tickLine={false}
          axisLine={false}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-xs"
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(payload[0].payload.date), "MMMM d, yyyy")}
                </p>
                <p className="text-lg font-bold">
                  {payload[0].value?.toLocaleString()} views
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          fill="url(#colorViews)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

Install recharts:

```bash
npm install recharts
```

---

## Step 8: Create Top Posts Table

Create `components/dashboard/top-posts-table.tsx`:

```typescript
import Link from "next/link"
import { Eye, Heart, MessageSquare } from "lucide-react"

interface TopPost {
  id: string
  title: string
  slug: string
  views: number
  likes: number
  comments: number
}

interface TopPostsTableProps {
  posts: TopPost[]
}

export function TopPostsTable({ posts }: TopPostsTableProps) {
  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No published posts yet
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="flex items-center justify-between">
          <Link
            href={`/dashboard/posts/${post.id}/edit`}
            className="font-medium hover:underline truncate max-w-[200px]"
          >
            {post.title}
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.comments}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Step 9: Create Recent Activity Component

Create `components/dashboard/recent-activity.tsx`:

```typescript
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    name: string
    avatar?: string | null
  }
  post: {
    title: string
    slug: string
  }
}

interface RecentActivityProps {
  comments: Comment[]
}

export function RecentActivity({ comments }: RecentActivityProps) {
  if (comments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No recent comments
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatar || ""} />
            <AvatarFallback>
              {comment.author.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{comment.author.name}</span>
              {" commented on "}
              <Link
                href={`/${comment.post.slug}`}
                className="font-medium hover:underline"
              >
                {comment.post.title}
              </Link>
            </p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {comment.content}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Verification Checklist

- [ ] POST /api/posts/[id]/view tracks views
- [ ] Duplicate views are filtered (1 per hour)
- [ ] GET /api/analytics/posts/[id] returns post analytics
- [ ] GET /api/analytics/dashboard returns author stats
- [ ] GET /api/admin/analytics returns site-wide stats
- [ ] Analytics dashboard loads
- [ ] Chart displays correctly
- [ ] Top posts table shows
- [ ] Recent activity shows
- [ ] Time range filter works

---

## Files Created

```
app/api/
├── posts/[id]/view/route.ts
├── analytics/
│   ├── posts/[id]/route.ts
│   └── dashboard/route.ts
└── admin/analytics/route.ts
app/dashboard/analytics/page.tsx
components/dashboard/
├── analytics-dashboard.tsx
├── analytics-chart.tsx
├── top-posts-table.tsx
└── recent-activity.tsx
```
