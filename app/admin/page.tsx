import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  FileText,
  MessageSquare,
  CreditCard,
  Mail,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin Overview",
}

export default async function AdminPage() {
  const [
    users,
    posts,
    comments,
    paidSubscribers,
    newsletterSubscribers,
    totalViews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.comment.count(),
    prisma.subscription.count({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),
    prisma.newsletterSubscriber.count({
      where: { isVerified: true },
    }),
    prisma.postView.count(),
  ])

  const stats = [
    {
      title: "Total Users",
      value: users,
      icon: Users,
      href: "/admin/users",
      description: "Registered accounts",
    },
    {
      title: "Published Posts",
      value: posts,
      icon: FileText,
      href: "/admin/posts",
      description: "Live articles",
    },
    {
      title: "Comments",
      value: comments,
      icon: MessageSquare,
      href: "/admin/comments",
      description: "Total discussions",
    },
    {
      title: "Paid Subscribers",
      value: paidSubscribers,
      icon: CreditCard,
      href: "/admin/subscribers",
      description: "Active subscriptions",
    },
    {
      title: "Newsletter Subscribers",
      value: newsletterSubscribers,
      icon: Mail,
      href: "/admin/subscribers",
      description: "Verified emails",
    },
    {
      title: "Total Views",
      value: totalViews.toLocaleString(),
      icon: TrendingUp,
      href: "/admin/analytics",
      description: "All-time page views",
    },
  ]

  // Get recent activity
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  })

  const recentPosts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      author: {
        select: { name: true },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          Welcome to the admin dashboard. Manage your site from here.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary cursor-pointer transition-colors">
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
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {user.email}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-muted-foreground text-sm">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <p className="text-muted-foreground text-xs">
                      by {post.author.name}
                    </p>
                  </div>
                  <p className="text-muted-foreground ml-4 text-xs">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : "Draft"}
                  </p>
                </div>
              ))}
              {recentPosts.length === 0 && (
                <p className="text-muted-foreground text-sm">No posts yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link
              href="/admin/users"
              className="hover:bg-muted flex items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <Users className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Manage Users</span>
            </Link>
            <Link
              href="/admin/posts"
              className="hover:bg-muted flex items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <FileText className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Moderate Posts</span>
            </Link>
            <Link
              href="/admin/newsletter/new"
              className="hover:bg-muted flex items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <Mail className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Send Newsletter</span>
            </Link>
            <Link
              href="/admin/settings"
              className="hover:bg-muted flex items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <CreditCard className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Site Settings</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
