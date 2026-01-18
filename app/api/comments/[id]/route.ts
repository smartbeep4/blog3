import { NextRequest, NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Update comment schema
const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
})

// PATCH /api/comments/[id] - Edit a comment (within 15 minutes)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        createdAt: true,
        postId: true,
      },
    })

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Only the author can edit their comment
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      )
    }

    // Check if within 15-minute edit window
    const fifteenMinutesInMs = 15 * 60 * 1000
    const timeSinceCreation = Date.now() - comment.createdAt.getTime()

    if (timeSinceCreation > fifteenMinutesInMs) {
      return NextResponse.json(
        { error: "Comments can only be edited within 15 minutes of posting" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content } = updateCommentSchema.parse(body)

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
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

    // Check if user has liked this comment
    const like = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: session.user.id,
          commentId,
        },
      },
    })

    return NextResponse.json({
      data: { ...updatedComment, isLiked: !!like },
    })
  } catch (error) {
    console.error("Error updating comment:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    )
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { authorId: true } },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Can delete if: comment author, post author, or moderator (EDITOR/ADMIN)
    const isCommentAuthor = comment.authorId === session.user.id
    const isPostAuthor = comment.post.authorId === session.user.id
    const isModerator = hasRole(session.user.role, "EDITOR")

    if (!isCommentAuthor && !isPostAuthor && !isModerator) {
      return NextResponse.json(
        { error: "You don't have permission to delete this comment" },
        { status: 403 }
      )
    }

    // Delete the comment (cascade will delete replies and likes)
    await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}
