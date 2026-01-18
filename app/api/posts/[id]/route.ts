import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import slugify from "slugify"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import type { JSONContent } from "@tiptap/react"
import { PostStatus } from "@prisma/client"

const lowlight = createLowlight(common)

// Extensions for generating HTML from Tiptap JSON
const extensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  Link,
  Image,
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Highlight,
  CodeBlockLowlight.configure({
    lowlight,
  }),
]

// Helper to generate HTML from Tiptap JSON
function generateContentHtml(content: JSONContent): string {
  try {
    return generateHTML(content, extensions)
  } catch {
    return ""
  }
}

// Helper to calculate reading time
function calculateReadingTime(content: JSONContent | null): number {
  if (!content) return 1

  let text = ""

  function extractText(node: JSONContent): void {
    if (node.text) {
      text += node.text + " "
    }
    if (node.content) {
      node.content.forEach(extractText)
    }
  }

  extractText(content)

  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length

  return Math.max(1, Math.ceil(wordCount / 200))
}

// Helper to generate excerpt
function generateExcerpt(content: JSONContent | null, maxLength = 160): string {
  if (!content) return ""

  let text = ""

  function extractText(node: JSONContent): void {
    if (text.length >= maxLength) return
    if (node.text) {
      text += node.text + " "
    }
    if (node.content) {
      node.content.forEach(extractText)
    }
  }

  extractText(content)

  text = text.trim()
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "..."
  }

  return text
}

// Helper to generate unique slug
async function generateUniqueSlug(
  title: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true })

  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.post.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (!existing) break

    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

// Update post schema
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).nullable().optional(),
  content: z.any().optional(),
  coverImage: z.string().url().nullable().optional(),
  isPremium: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  status: z.nativeEnum(PostStatus).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/posts/[id] - Get a single post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
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

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check access permissions
    const isAuthor = session?.user?.id === post.authorId
    const isEditorOrAdmin =
      session?.user?.role === "EDITOR" || session?.user?.role === "ADMIN"

    if (post.status !== "PUBLISHED" && !isAuthor && !isEditorOrAdmin) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({ data: post })
  } catch (error) {
    console.error("Error fetching post:", error)
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 })
  }
}

// PATCH /api/posts/[id] - Update a post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true, title: true },
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
        { error: "You don't have permission to edit this post" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updatePostSchema.parse(body)

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) {
      updateData.title = data.title
      // Update slug if title changed
      if (data.title !== post.title) {
        updateData.slug = await generateUniqueSlug(data.title, id)
      }
    }

    if (data.subtitle !== undefined) {
      updateData.subtitle = data.subtitle
    }

    if (data.content !== undefined) {
      const contentJson = data.content as JSONContent | null
      updateData.content = contentJson || {}
      updateData.contentHtml = contentJson
        ? generateContentHtml(contentJson)
        : ""
      updateData.readingTime = calculateReadingTime(contentJson)

      // Update excerpt if not manually set
      if (data.metaDescription === undefined) {
        updateData.excerpt = generateExcerpt(contentJson)
      }
    }

    if (data.coverImage !== undefined) {
      updateData.coverImage = data.coverImage
    }

    if (data.isPremium !== undefined) {
      updateData.isPremium = data.isPremium
    }

    if (data.metaTitle !== undefined) {
      updateData.metaTitle = data.metaTitle
    }

    if (data.metaDescription !== undefined) {
      updateData.metaDescription = data.metaDescription
      updateData.excerpt = data.metaDescription || generateExcerpt(data.content)
    }

    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === "PUBLISHED") {
        updateData.publishedAt = new Date()
      }
    }

    if (data.scheduledFor !== undefined) {
      updateData.scheduledFor = data.scheduledFor
        ? new Date(data.scheduledFor)
        : null
    }

    // Handle categories
    if (data.categories !== undefined) {
      await prisma.post.update({
        where: { id },
        data: {
          categories: {
            set: [], // Clear existing
          },
        },
      })

      if (data.categories.length > 0) {
        updateData.categories = {
          connect: data.categories.map((catId) => ({ id: catId })),
        }
      }
    }

    // Handle tags
    if (data.tags !== undefined) {
      await prisma.post.update({
        where: { id },
        data: {
          tags: {
            set: [], // Clear existing
          },
        },
      })

      if (data.tags.length > 0) {
        const tagOperations = await Promise.all(
          data.tags.map(async (tagName) => {
            const tagSlug = slugify(tagName, { lower: true, strict: true })
            const tag = await prisma.tag.upsert({
              where: { slug: tagSlug },
              update: {},
              create: { name: tagName, slug: tagSlug },
            })
            return { id: tag.id }
          })
        )
        updateData.tags = { connect: tagOperations }
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

    return NextResponse.json({ data: updatedPost })
  } catch (error) {
    console.error("Error updating post:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid post data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check permissions
    const isAuthor = session.user.id === post.authorId
    const isAdmin = session.user.role === "ADMIN"

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this post" },
        { status: 403 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Post deleted successfully" })
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    )
  }
}
