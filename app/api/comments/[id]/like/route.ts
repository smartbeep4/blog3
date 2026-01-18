import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/comments/[id]/like - Like a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    })

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: session.user.id,
          commentId,
        },
      },
    })

    if (existingLike) {
      return NextResponse.json(
        { error: "You have already liked this comment" },
        { status: 400 }
      )
    }

    // Create the like
    await prisma.commentLike.create({
      data: {
        userId: session.user.id,
        commentId,
      },
    })

    // Get updated like count
    const likeCount = await prisma.commentLike.count({
      where: { commentId },
    })

    return NextResponse.json({
      success: true,
      likeCount,
    })
  } catch (error) {
    console.error("Error liking comment:", error)
    return NextResponse.json(
      { error: "Failed to like comment" },
      { status: 500 }
    )
  }
}

// DELETE /api/comments/[id]/like - Unlike a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the like if it exists
    const deleted = await prisma.commentLike.deleteMany({
      where: {
        userId: session.user.id,
        commentId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "You have not liked this comment" },
        { status: 400 }
      )
    }

    // Get updated like count
    const likeCount = await prisma.commentLike.count({
      where: { commentId },
    })

    return NextResponse.json({
      success: true,
      likeCount,
    })
  } catch (error) {
    console.error("Error unliking comment:", error)
    return NextResponse.json(
      { error: "Failed to unlike comment" },
      { status: 500 }
    )
  }
}
