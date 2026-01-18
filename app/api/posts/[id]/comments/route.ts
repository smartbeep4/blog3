import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/posts/[id]/comments - Get paginated comments with replies
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get top-level comments with replies
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
            _count: {
              select: { likes: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.comment.count({
      where: { postId, parentId: null },
    })

    // Get likes for current user
    const session = await auth()
    let likedCommentIds: string[] = []

    if (session?.user?.id) {
      const allCommentIds = [
        ...comments.map((c) => c.id),
        ...comments.flatMap((c) => c.replies.map((r) => r.id)),
      ]

      const likes = await prisma.commentLike.findMany({
        where: {
          userId: session.user.id,
          commentId: {
            in: allCommentIds,
          },
        },
        select: { commentId: true },
      })
      likedCommentIds = likes.map((l) => l.commentId)
    }

    // Add isLiked to comments and replies
    const commentsWithLikes = comments.map((comment) => ({
      ...comment,
      isLiked: likedCommentIds.includes(comment.id),
      replies: comment.replies.map((reply) => ({
        ...reply,
        isLiked: likedCommentIds.includes(reply.id),
      })),
    }))

    return NextResponse.json({
      data: commentsWithLikes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id]/comments - Create a comment or reply
const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  parentId: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, parentId } = createCommentSchema.parse(body)

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Only allow comments on published posts
    if (post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Cannot comment on unpublished posts" },
        { status: 400 }
      )
    }

    // If replying, verify parent exists and is not already a reply
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true, postId: true },
      })

      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        )
      }

      // Ensure parent belongs to the same post
      if (parent.postId !== postId) {
        return NextResponse.json(
          { error: "Parent comment does not belong to this post" },
          { status: 400 }
        )
      }

      // Only allow 2 levels of nesting (comment -> reply, not reply -> reply)
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Cannot reply to a reply. Maximum nesting depth is 2." },
          { status: 400 }
        )
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId,
        parentId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    })

    return NextResponse.json(
      { data: { ...comment, isLiked: false, replies: [] } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating comment:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}
