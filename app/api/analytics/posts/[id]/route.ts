import { NextRequest, NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/analytics/posts/[id] - Get analytics for a single post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, title: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only author or editors can view analytics
    const isAuthor = post.authorId === session.user.id
    const isEditor = hasRole(session.user.role, "EDITOR")

    if (!isAuthor && !isEditor) {
      return NextResponse.json(
        { error: "You don't have permission to view this post's analytics" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get views by day using raw SQL for date grouping
    const viewsByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "PostView"
      WHERE "postId" = ${postId}
      AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `

    // Get total views
    const totalViews = await prisma.postView.count({
      where: { postId },
    })

    // Get views in date range
    const viewsInRange = await prisma.postView.count({
      where: {
        postId,
        createdAt: { gte: startDate },
      },
    })

    // Get unique views (by userId or ipHash)
    const uniqueUserViews = await prisma.postView.groupBy({
      by: ["userId"],
      where: {
        postId,
        userId: { not: null },
      },
    })

    const uniqueAnonViews = await prisma.postView.groupBy({
      by: ["ipHash"],
      where: {
        postId,
        ipHash: { not: null },
      },
    })

    const uniqueViews = uniqueUserViews.length + uniqueAnonViews.length

    // Get top referrers
    const topReferrers = await prisma.postView.groupBy({
      by: ["referer"],
      where: {
        postId,
        referer: { not: null },
      },
      _count: { referer: true },
      orderBy: { _count: { referer: "desc" } },
      take: 10,
    })

    // Get engagement stats
    const [likes, comments, bookmarks] = await Promise.all([
      prisma.like.count({ where: { postId } }),
      prisma.comment.count({ where: { postId } }),
      prisma.bookmark.count({ where: { postId } }),
    ])

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
      },
      totalViews,
      viewsInRange,
      uniqueViews,
      viewsByDay: viewsByDay.map((v) => ({
        date: v.date.toISOString().split("T")[0],
        count: Number(v.count),
      })),
      topReferrers: topReferrers.map((r) => ({
        referer: r.referer || "Direct",
        count: r._count.referer,
      })),
      engagement: {
        likes,
        comments,
        bookmarks,
      },
    })
  } catch (error) {
    console.error("Error fetching post analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
