"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  FileText,
  Eye,
  MessageSquare,
  TrendingUp,
  CreditCard,
  Mail,
  UserPlus,
} from "lucide-react"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"

interface AdminAnalytics {
  users: {
    total: number
    new: number
    subscribers: number
    paidSubscribers: number
  }
  content: {
    totalPosts: number
    publishedPosts: number
    totalViews: number
    totalComments: number
  }
  userGrowth: { date: string; count: number }[]
  viewsByDay: { date: string; count: number }[]
  topAuthors: {
    id: string
    name: string
    avatar: string | null
    postCount: number
    totalViews: number
    totalLikes: number
  }[]
  topPosts: {
    id: string
    title: string
    slug: string
    author: { id: string; name: string; avatar: string | null }
    views: number
    likes: number
    comments: number
  }[]
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState("30")

  const { data, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ["admin", "analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${days}`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json()
    },
  })

  if (isLoading) {
    return <AnalyticsSkeleton />
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    )
  }

  const stats = [
    {
      title: "Total Users",
      value: data.users.total,
      icon: Users,
      description: `+${data.users.new} in last ${days} days`,
    },
    {
      title: "Newsletter Subscribers",
      value: data.users.subscribers,
      icon: Mail,
      description: "Verified emails",
    },
    {
      title: "Paid Subscribers",
      value: data.users.paidSubscribers,
      icon: CreditCard,
      description: "Active subscriptions",
    },
    {
      title: "New Users",
      value: data.users.new,
      icon: UserPlus,
      description: `Last ${days} days`,
    },
    {
      title: "Published Posts",
      value: data.content.publishedPosts,
      icon: FileText,
      description: `${data.content.totalPosts} total`,
    },
    {
      title: "Total Views",
      value: data.content.totalViews.toLocaleString(),
      icon: Eye,
      description: "All time",
    },
    {
      title: "Total Comments",
      value: data.content.totalComments,
      icon: MessageSquare,
      description: "Across all posts",
    },
    {
      title: "Avg Views/Post",
      value:
        data.content.publishedPosts > 0
          ? Math.round(data.content.totalViews / data.content.publishedPosts)
          : 0,
      icon: TrendingUp,
      description: "Per published post",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Analytics</h1>
          <p className="text-muted-foreground">
            Overview of your site performance
          </p>
        </div>
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.viewsByDay.length > 0 ? (
              <AnalyticsChart data={data.viewsByDay} />
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {data.userGrowth.length > 0 ? (
              <AnalyticsChart data={data.userGrowth} />
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Authors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Posts</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topAuthors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground text-center"
                    >
                      No authors yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topAuthors.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell>
                        <Link
                          href={`/author/${author.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={author.avatar || ""} />
                            <AvatarFallback className="text-xs">
                              {author.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{author.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {author.postCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {author.totalViews.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {author.totalLikes}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPosts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground text-center"
                    >
                      No posts yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topPosts.slice(0, 10).map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Link
                          href={`/${post.slug}`}
                          className="line-clamp-1 text-sm hover:underline"
                        >
                          {post.title}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          by {post.author.name}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {post.views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{post.likes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
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
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
