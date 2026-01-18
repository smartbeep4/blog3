import { NextRequest, NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/dashboard - Get author dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Require at least AUTHOR role
    if (!hasRole(session.user.role, "AUTHOR")) {
      return NextResponse.json(
        { error: "You must be an author to view analytics" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Determine if viewing all posts (admin) or just own posts
    const isAdmin = hasRole(session.user.role, "ADMIN")
    const postFilter = isAdmin ? {} : { authorId: session.user.id }

    // Get total stats
    const [totalPosts, totalViews, totalLikes, totalComments] =
      await Promise.all([
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

    // Get stats for the date range
    const [viewsInRange, likesInRange, commentsInRange] = await Promise.all([
      prisma.postView.count({
        where: {
          post: postFilter,
          createdAt: { gte: startDate },
        },
      }),
      prisma.like.count({
        where: {
          post: postFilter,
          createdAt: { gte: startDate },
        },
      }),
      prisma.comment.count({
        where: {
          post: postFilter,
          createdAt: { gte: startDate },
        },
      }),
    ])

    // Get views by day - use a simpler approach with Prisma groupBy
    // Since Prisma doesn't support DATE() in groupBy, we'll fetch and aggregate in JS
    const viewsRaw = await prisma.postView.findMany({
      where: {
        post: postFilter,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Aggregate views by day in JavaScript
    const viewsByDayMap = new Map<string, number>()
    viewsRaw.forEach((view) => {
      const dateKey = view.createdAt.toISOString().split("T")[0]
      viewsByDayMap.set(dateKey, (viewsByDayMap.get(dateKey) || 0) + 1)
    })

    const viewsByDay = Array.from(viewsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

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

    // Get recent comments
    const recentComments = await prisma.comment.findMany({
      where: { post: postFilter },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        post: { select: { id: true, title: true, slug: true } },
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
      rangeStats: {
        views: viewsInRange,
        likes: likesInRange,
        comments: commentsInRange,
      },
      viewsByDay,
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
        content:
          c.content.slice(0, 100) + (c.content.length > 100 ? "..." : ""),
        author: c.author,
        post: c.post,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
