import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const publishSchema = z.object({
  scheduledFor: z.string().datetime().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/posts/[id]/publish - Publish or schedule a post
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        status: true,
        title: true,
        content: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check permissions
    const isAuthor = session.user.id === post.authorId
    const isEditorOrAdmin =
      session.user.role === "EDITOR" || session.user.role === "ADMIN"

    if (!isAuthor && !isEditorOrAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to publish this post" },
        { status: 403 }
      )
    }

    // Validate post has required fields
    if (!post.title || post.title.trim() === "") {
      return NextResponse.json(
        { error: "Post must have a title before publishing" },
        { status: 400 }
      )
    }

    // Check if content is empty
    const content = post.content as { content?: unknown[] } | null
    if (!content || !content.content || content.content.length === 0) {
      return NextResponse.json(
        { error: "Post must have content before publishing" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const data = publishSchema.parse(body)

    let updateData: Record<string, unknown>

    if (data.scheduledFor) {
      // Schedule the post
      const scheduledDate = new Date(data.scheduledFor)

      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: "Scheduled date must be in the future" },
          { status: 400 }
        )
      }

      updateData = {
        status: "SCHEDULED",
        scheduledFor: scheduledDate,
        publishedAt: null,
      }
    } else {
      // Publish immediately
      updateData = {
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledFor: null,
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        categories: true,
        tags: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: updatedPost,
      message: data.scheduledFor
        ? "Post scheduled successfully"
        : "Post published successfully",
    })
  } catch (error) {
    console.error("Error publishing post:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id]/publish - Unpublish a post (move to draft)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check permissions
    const isAuthor = session.user.id === post.authorId
    const isEditorOrAdmin =
      session.user.role === "EDITOR" || session.user.role === "ADMIN"

    if (!isAuthor && !isEditorOrAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to unpublish this post" },
        { status: 403 }
      )
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: "DRAFT",
        publishedAt: null,
        scheduledFor: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        categories: true,
        tags: true,
      },
    })

    return NextResponse.json({
      data: updatedPost,
      message: "Post unpublished successfully",
    })
  } catch (error) {
    console.error("Error unpublishing post:", error)
    return NextResponse.json(
      { error: "Failed to unpublish post" },
      { status: 500 }
    )
  }
}
