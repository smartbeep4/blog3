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

// Query params schema for GET
// Note: Using .nullish() for optional fields because searchParams.get() returns null for missing params
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.nativeEnum(PostStatus).nullish(),
  authorId: z.string().nullish(),
  categoryId: z.string().nullish(),
  search: z.string().nullish(),
  sortBy: z.enum(["createdAt", "publishedAt", "title"]).nullish().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).nullish().default("desc"),
})

// Create post schema
const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(500).optional(),
  content: z.any().optional(),
  coverImage: z.string().url().nullable().optional(),
  isPremium: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  status: z.nativeEnum(PostStatus).default("DRAFT"),
  scheduledFor: z.string().datetime().nullable().optional(),
})

// GET /api/posts - List posts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)

    const query = listQuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      authorId: searchParams.get("authorId"),
      categoryId: searchParams.get("categoryId"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    })

    const where: Record<string, unknown> = {}

    // Non-authenticated users can only see published posts
    if (!session?.user) {
      where.status = "PUBLISHED"
      where.publishedAt = { lte: new Date() }
    } else if (session.user.role === "READER") {
      // Readers can only see published posts
      where.status = "PUBLISHED"
      where.publishedAt = { lte: new Date() }
    } else if (session.user.role === "AUTHOR") {
      // Authors can see their own posts (any status) or published posts
      if (query.authorId === session.user.id) {
        // Viewing own posts - no status filter
      } else {
        where.status = "PUBLISHED"
        where.publishedAt = { lte: new Date() }
      }
    }
    // EDITOR and ADMIN can see all posts

    // Apply filters
    if (
      query.status &&
      (session?.user?.role === "EDITOR" || session?.user?.role === "ADMIN")
    ) {
      where.status = query.status
    }

    if (query.authorId) {
      where.authorId = query.authorId
    }

    if (query.categoryId) {
      where.categories = {
        some: { id: query.categoryId },
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { subtitle: { contains: query.search, mode: "insensitive" } },
      ]
    }

    const skip = (query.page - 1) * query.limit

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
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
      }),
      prisma.post.count({ where }),
    ])

    return NextResponse.json({
      data: posts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch (error) {
    console.error("Error listing posts:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 })
  }
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user can create posts (AUTHOR, EDITOR, or ADMIN)
    if (!["AUTHOR", "EDITOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "You don't have permission to create posts" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createPostSchema.parse(body)

    // Generate slug from title
    const slug = await generateUniqueSlug(data.title)

    // Generate HTML and other computed fields
    const contentJson = data.content as JSONContent | null
    const contentHtml = contentJson ? generateContentHtml(contentJson) : ""
    const excerpt = data.metaDescription || generateExcerpt(contentJson)
    const readingTime = calculateReadingTime(contentJson)

    // Handle categories
    const categoryConnections =
      data.categories.length > 0
        ? {
            connect: data.categories.map((id) => ({ id })),
          }
        : undefined

    // Handle tags - create if they don't exist
    let tagConnections: { connect: { id: string }[] } | undefined

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
      tagConnections = { connect: tagOperations }
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        slug,
        content: contentJson || {},
        contentHtml,
        excerpt,
        coverImage: data.coverImage,
        isPremium: data.isPremium,
        status: data.status,
        readingTime,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        author: {
          connect: { id: session.user.id },
        },
        categories: categoryConnections,
        tags: tagConnections,
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

    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid post data", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
