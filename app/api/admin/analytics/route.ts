import { NextRequest, NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/analytics - Get site-wide admin analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Require ADMIN role
    if (!hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get user stats
    const [totalUsers, newUsers, totalSubscribers, paidSubscribers] =
      await Promise.all([
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
    const [totalPosts, publishedPosts, totalViews, totalComments] =
      await Promise.all([
        prisma.post.count(),
        prisma.post.count({ where: { status: "PUBLISHED" } }),
        prisma.postView.count(),
        prisma.comment.count(),
      ])

    // Get user growth data
    const usersRaw = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const userGrowthMap = new Map<string, number>()
    usersRaw.forEach((user) => {
      const dateKey = user.createdAt.toISOString().split("T")[0]
      userGrowthMap.set(dateKey, (userGrowthMap.get(dateKey) || 0) + 1)
    })

    const userGrowth = Array.from(userGrowthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get views by day
    const viewsRaw = await prisma.postView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const viewsByDayMap = new Map<string, number>()
    viewsRaw.forEach((view) => {
      const dateKey = view.createdAt.toISOString().split("T")[0]
      viewsByDayMap.set(dateKey, (viewsByDayMap.get(dateKey) || 0) + 1)
    })

    const viewsByDay = Array.from(viewsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get top authors with their stats
    const authors = await prisma.user.findMany({
      where: {
        role: { in: ["AUTHOR", "EDITOR", "ADMIN"] },
      },
      include: {
        posts: {
          where: { status: "PUBLISHED" },
          include: {
            _count: { select: { views: true, likes: true } },
          },
        },
        _count: {
          select: {
            posts: { where: { status: "PUBLISHED" } },
          },
        },
      },
      take: 10,
    })

    const topAuthors = authors
      .map((author) => ({
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        postCount: author._count.posts,
        totalViews: author.posts.reduce((sum, p) => sum + p._count.views, 0),
        totalLikes: author.posts.reduce((sum, p) => sum + p._count.likes, 0),
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10)

    // Get top posts
    const topPosts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { views: true, likes: true, comments: true } },
      },
      orderBy: { views: { _count: "desc" } },
      take: 10,
    })

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
      userGrowth,
      viewsByDay,
      topAuthors,
      topPosts: topPosts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        author: p.author,
        views: p._count.views,
        likes: p._count.likes,
        comments: p._count.comments,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
