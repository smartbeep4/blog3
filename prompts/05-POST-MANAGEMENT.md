# 05 - Post Management

## Overview

You are responsible for implementing the complete post management system, including creating, editing, publishing, scheduling, and deleting posts, along with the dashboard UI for authors.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Rich text editor implemented (Agent 04)
- File storage configured (Agent 13)

---

## Features to Implement

1. Post CRUD operations (Create, Read, Update, Delete)
2. Publishing workflow (Draft → Published)
3. Scheduling posts for future publication
4. Categories and tags management
5. SEO metadata editing
6. Post list with filtering and search
7. Author dashboard

---

## Step 1: Create Post API Routes

Create `app/api/posts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify, calculateReadingTime } from "@/lib/utils"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"

// Extensions for HTML generation
const extensions = [
  StarterKit,
  Link,
  Image,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  TaskList,
  TaskItem,
]

// GET /api/posts - List posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const status = searchParams.get("status")
  const authorId = searchParams.get("authorId")
  const category = searchParams.get("category")
  const tag = searchParams.get("tag")
  const search = searchParams.get("search")

  const where: any = {}

  // Public access only sees published posts
  const session = await getServerSession(authOptions)
  if (!session?.user || !hasRole(session.user.role, "AUTHOR")) {
    where.status = "PUBLISHED"
    where.publishedAt = { lte: new Date() }
  } else if (status) {
    where.status = status
  }

  // Filter by author
  if (authorId) {
    where.authorId = authorId
  } else if (session?.user && !hasRole(session.user.role, "EDITOR")) {
    // Authors can only see their own posts
    where.authorId = session.user.id
  }

  // Filter by category
  if (category) {
    where.categories = { some: { slug: category } }
  }

  // Filter by tag
  if (tag) {
    where.tags = { some: { slug: tag } }
  }

  // Search
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { subtitle: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ]
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        categories: true,
        _count: {
          select: { comments: true, likes: true, views: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// POST /api/posts - Create post
const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(300).optional(),
  content: z.any(),
  coverImage: z.string().url().optional().nullable(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasRole(session.user.role, "AUTHOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createPostSchema.parse(body)

    // Generate slug
    let slug = slugify(data.title)
    const existingPost = await prisma.post.findUnique({ where: { slug } })
    if (existingPost) {
      slug = `${slug}-${Date.now()}`
    }

    // Generate HTML from content
    let contentHtml = ""
    let excerpt = ""
    let readingTime = 1

    if (data.content) {
      contentHtml = generateHTML(data.content, extensions)

      // Extract text for excerpt and reading time
      const textContent = contentHtml.replace(/<[^>]*>/g, " ").trim()
      excerpt = textContent.slice(0, 300) + (textContent.length > 300 ? "..." : "")
      readingTime = calculateReadingTime(textContent)
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        slug,
        content: data.content || {},
        contentHtml,
        excerpt,
        coverImage: data.coverImage,
        isPremium: data.isPremium || false,
        readingTime,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        status: "DRAFT",
        authorId: session.user.id,
        categories: data.categories?.length
          ? { connect: data.categories.map((id) => ({ id })) }
          : undefined,
        tags: data.tags?.length
          ? {
              connectOrCreate: data.tags.map((name) => ({
                where: { slug: slugify(name) },
                create: { name, slug: slugify(name) },
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        categories: true,
        tags: true,
      },
    })

    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Create post error:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
```

Create `app/api/posts/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify, calculateReadingTime } from "@/lib/utils"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"

const extensions = [
  StarterKit,
  Link,
  Image,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  TaskList,
  TaskItem,
]

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: {
        select: { id: true, name: true, avatar: true, bio: true },
      },
      categories: true,
      tags: true,
      _count: {
        select: { comments: true, likes: true, views: true },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Check access permissions
  const session = await getServerSession(authOptions)

  if (post.status !== "PUBLISHED") {
    if (!session?.user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Only author or editors can see unpublished posts
    const isAuthor = post.authorId === session.user.id
    const isEditor = hasRole(session.user.role, "EDITOR")

    if (!isAuthor && !isEditor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  return NextResponse.json({ data: post })
}

// PATCH /api/posts/[id] - Update post
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.any().optional(),
  coverImage: z.string().url().optional().nullable(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Check permissions
  const isAuthor = post.authorId === session.user.id
  const isEditor = hasRole(session.user.role, "EDITOR")

  if (!isAuthor && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updatePostSchema.parse(body)

    // Prepare update data
    const updateData: any = {}

    if (data.title !== undefined) {
      updateData.title = data.title
      // Update slug if title changes and post is draft
      if (post.status === "DRAFT") {
        let newSlug = slugify(data.title)
        const existing = await prisma.post.findFirst({
          where: { slug: newSlug, id: { not: post.id } },
        })
        if (existing) {
          newSlug = `${newSlug}-${Date.now()}`
        }
        updateData.slug = newSlug
      }
    }

    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage
    if (data.isPremium !== undefined) updateData.isPremium = data.isPremium
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription

    // Handle content update
    if (data.content !== undefined) {
      updateData.content = data.content
      updateData.contentHtml = generateHTML(data.content, extensions)

      const textContent = updateData.contentHtml.replace(/<[^>]*>/g, " ").trim()
      updateData.excerpt = textContent.slice(0, 300) + (textContent.length > 300 ? "..." : "")
      updateData.readingTime = calculateReadingTime(textContent)
    }

    // Handle status change
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === "PUBLISHED" && !post.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }

    // Handle scheduling
    if (data.scheduledFor !== undefined) {
      updateData.scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null
      if (data.scheduledFor) {
        updateData.status = "SCHEDULED"
      }
    }

    // Handle categories
    if (data.categories !== undefined) {
      updateData.categories = {
        set: [], // Clear existing
        connect: data.categories.map((id) => ({ id })),
      }
    }

    // Handle tags
    if (data.tags !== undefined) {
      updateData.tags = {
        set: [], // Clear existing
        connectOrCreate: data.tags.map((name) => ({
          where: { slug: slugify(name) },
          create: { name, slug: slugify(name) },
        })),
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        categories: true,
        tags: true,
      },
    })

    return NextResponse.json({ data: updatedPost })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Update post error:", error)
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Check permissions
  const isAuthor = post.authorId === session.user.id
  const isAdmin = hasRole(session.user.role, "ADMIN")

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.post.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ message: "Post deleted" })
}
```

---

## Step 2: Create Publish API

Create `app/api/posts/[id]/publish/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
  })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Check permissions
  const isAuthor = post.authorId === session.user.id
  const isEditor = hasRole(session.user.role, "EDITOR")

  if (!isAuthor && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Validate post has required content
  if (!post.title || !post.content) {
    return NextResponse.json(
      { error: "Post must have a title and content" },
      { status: 400 }
    )
  }

  const updatedPost = await prisma.post.update({
    where: { id: params.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      scheduledFor: null,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  })

  return NextResponse.json({ data: updatedPost })
}
```

---

## Step 3: Create Categories API

Create `app/api/categories/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"

// GET /api/categories
export async function GET() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ data: categories })
}

// POST /api/categories (Editor+)
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createCategorySchema.parse(body)

    const slug = slugify(data.name)

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        color: data.color,
      },
    })

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: Create Tags API

Create `app/api/tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/tags
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")

  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {}

  const tags = await prisma.tag.findMany({
    where,
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  })

  return NextResponse.json({ data: tags })
}
```

---

## Step 5: Create Post Hooks for Data Fetching

Create `hooks/use-posts.ts`:

```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { PostWithDetails, PostCard } from "@/types"

interface PostsParams {
  page?: number
  limit?: number
  status?: string
  category?: string
  search?: string
}

interface PostsResponse {
  data: PostCard[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchPosts(params: PostsParams): Promise<PostsResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", params.page.toString())
  if (params.limit) searchParams.set("limit", params.limit.toString())
  if (params.status) searchParams.set("status", params.status)
  if (params.category) searchParams.set("category", params.category)
  if (params.search) searchParams.set("search", params.search)

  const response = await fetch(`/api/posts?${searchParams}`)
  if (!response.ok) throw new Error("Failed to fetch posts")
  return response.json()
}

async function fetchPost(id: string): Promise<{ data: PostWithDetails }> {
  const response = await fetch(`/api/posts/${id}`)
  if (!response.ok) throw new Error("Failed to fetch post")
  return response.json()
}

export function usePosts(params: PostsParams = {}) {
  return useQuery({
    queryKey: ["posts", params],
    queryFn: () => fetchPosts(params),
  })
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ["post", id],
    queryFn: () => fetchPost(id),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create post")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      toast.success("Post created")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update post")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function usePublishPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/posts/${id}/publish`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to publish post")
      }
      return response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      queryClient.invalidateQueries({ queryKey: ["post", id] })
      toast.success("Post published!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete post")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      toast.success("Post deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
```

---

## Step 6: Create Dashboard Posts List

Create `app/dashboard/posts/page.tsx`:

```typescript
import { Suspense } from "react"
import { requireAuthor } from "@/lib/guards"
import { PostsTable } from "@/components/dashboard/posts-table"
import { PostsTableSkeleton } from "@/components/dashboard/posts-table-skeleton"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Posts",
}

export default async function PostsPage() {
  await requireAuthor()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-muted-foreground">
            Create and manage your blog posts
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/posts/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>

      <Suspense fallback={<PostsTableSkeleton />}>
        <PostsTable />
      </Suspense>
    </div>
  )
}
```

Create `components/dashboard/posts-table.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePosts, useDeletePost } from "@/hooks/use-posts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Trash2, Eye, Search } from "lucide-react"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

const statusColors = {
  DRAFT: "secondary",
  SCHEDULED: "outline",
  PUBLISHED: "default",
  ARCHIVED: "destructive",
} as const

export function PostsTable() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = usePosts({
    page,
    limit: 10,
    status: status === "all" ? undefined : status,
    search: search || undefined,
  })

  const deletePost = useDeletePost()

  const handleDelete = () => {
    if (deleteId) {
      deletePost.mutate(deleteId)
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return <PostsTableSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div>
                    <Link
                      href={`/dashboard/posts/${post.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {post.title}
                    </Link>
                    {post.isPremium && (
                      <Badge variant="secondary" className="ml-2">
                        Premium
                      </Badge>
                    )}
                    {post.subtitle && (
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {post.subtitle}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[post.status as keyof typeof statusColors]}>
                    {post.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {post.publishedAt
                    ? formatDate(post.publishedAt)
                    : formatDate(post.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {post._count?.views || 0}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/posts/${post.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {post.status === "PUBLISHED" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/${post.slug}`} target="_blank">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(post.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">No posts found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post and all its comments will
              be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## Step 7: Create New Post Page

Create `app/dashboard/posts/new/page.tsx`:

```typescript
import { requireAuthor } from "@/lib/guards"
import { NewPostEditor } from "@/components/dashboard/new-post-editor"

export const metadata = {
  title: "New Post",
}

export default async function NewPostPage() {
  await requireAuthor()

  return <NewPostEditor />
}
```

Create `components/dashboard/new-post-editor.tsx`:

```typescript
"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { PostEditor } from "@/components/editor/post-editor"
import { useEditorStore } from "@/stores/editor-store"
import { useCreatePost, useUpdatePost } from "@/hooks/use-posts"
import { EditorHeader } from "./editor-header"

export function NewPostEditor() {
  const router = useRouter()
  const { reset } = useEditorStore()
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  // Reset editor on mount
  useEffect(() => {
    reset()
  }, [reset])

  const handleSave = async (data: {
    title: string
    subtitle: string
    content: any
    coverImage: string | null
  }) => {
    // Create post if not exists
    const result = await createPost.mutateAsync({
      title: data.title || "Untitled",
      subtitle: data.subtitle,
      content: data.content,
      coverImage: data.coverImage,
    })

    // Redirect to edit page
    if (result.data?.id) {
      router.replace(`/dashboard/posts/${result.data.id}/edit`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader isNew />
      <main className="container max-w-4xl py-8">
        <PostEditor onSave={handleSave} />
      </main>
    </div>
  )
}
```

---

## Step 8: Create Edit Post Page

Create `app/dashboard/posts/[id]/edit/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import { requireAuthor } from "@/lib/guards"
import { prisma } from "@/lib/prisma"
import { EditPostEditor } from "@/components/dashboard/edit-post-editor"

export const metadata = {
  title: "Edit Post",
}

export default async function EditPostPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuthor()

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      categories: true,
      tags: true,
    },
  })

  if (!post) {
    notFound()
  }

  // Check ownership (unless editor/admin)
  if (post.authorId !== user.id && user.role === "AUTHOR") {
    notFound()
  }

  return (
    <EditPostEditor
      post={{
        id: post.id,
        title: post.title,
        subtitle: post.subtitle || "",
        content: post.content,
        coverImage: post.coverImage,
        status: post.status,
        isPremium: post.isPremium,
        categories: post.categories.map((c) => c.id),
        tags: post.tags.map((t) => t.name),
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        scheduledFor: post.scheduledFor?.toISOString(),
      }}
    />
  )
}
```

Create `components/dashboard/edit-post-editor.tsx`:

```typescript
"use client"

import { useEffect } from "react"
import { PostEditor } from "@/components/editor/post-editor"
import { useEditorStore } from "@/stores/editor-store"
import { useUpdatePost, usePublishPost } from "@/hooks/use-posts"
import { EditorHeader } from "./editor-header"

interface EditPostEditorProps {
  post: {
    id: string
    title: string
    subtitle: string
    content: any
    coverImage: string | null
    status: string
    isPremium: boolean
    categories: string[]
    tags: string[]
    metaTitle?: string | null
    metaDescription?: string | null
    scheduledFor?: string | null
  }
}

export function EditPostEditor({ post }: EditPostEditorProps) {
  const {
    setTitle,
    setSubtitle,
    setContent,
    setCoverImage,
    setIsPremium,
    setCategories,
    setTags,
    setDirty,
  } = useEditorStore()

  const updatePost = useUpdatePost()
  const publishPost = usePublishPost()

  // Initialize store with post data
  useEffect(() => {
    setTitle(post.title)
    setSubtitle(post.subtitle)
    setContent(post.content)
    setCoverImage(post.coverImage)
    setIsPremium(post.isPremium)
    setCategories(post.categories)
    setTags(post.tags)
    setDirty(false)
  }, [post, setTitle, setSubtitle, setContent, setCoverImage, setIsPremium, setCategories, setTags, setDirty])

  const handleSave = async (data: {
    title: string
    subtitle: string
    content: any
    coverImage: string | null
  }) => {
    await updatePost.mutateAsync({
      id: post.id,
      data: {
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        coverImage: data.coverImage,
      },
    })
  }

  const handlePublish = async () => {
    await publishPost.mutateAsync(post.id)
  }

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader
        postId={post.id}
        status={post.status}
        onPublish={handlePublish}
      />
      <main className="container max-w-4xl py-8">
        <PostEditor
          initialData={{
            title: post.title,
            subtitle: post.subtitle,
            content: post.content,
            coverImage: post.coverImage,
          }}
          onSave={handleSave}
        />
      </main>
    </div>
  )
}
```

---

## Step 9: Create Editor Header

Create `components/dashboard/editor-header.tsx`:

```typescript
"use client"

import { useRouter } from "next/navigation"
import { useEditorStore } from "@/stores/editor-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ArrowLeft, Settings, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { PublishSettings } from "./publish-settings"

interface EditorHeaderProps {
  postId?: string
  status?: string
  isNew?: boolean
  onPublish?: () => Promise<void>
}

export function EditorHeader({
  postId,
  status,
  isNew,
  onPublish,
}: EditorHeaderProps) {
  const router = useRouter()
  const { isSaving, lastSaved, isDirty } = useEditorStore()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/posts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>

          {/* Save status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-3 w-3" />
                Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </>
            ) : isDirty ? (
              "Unsaved changes"
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status && (
            <Badge variant={status === "PUBLISHED" ? "default" : "secondary"}>
              {status.toLowerCase()}
            </Badge>
          )}

          {postId && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Post Settings</SheetTitle>
                </SheetHeader>
                <PublishSettings postId={postId} onPublish={onPublish} />
              </SheetContent>
            </Sheet>
          )}

          {!isNew && status !== "PUBLISHED" && onPublish && (
            <Button onClick={onPublish}>Publish</Button>
          )}
        </div>
      </div>
    </header>
  )
}
```

---

## Step 10: Create Publish Settings Panel

Create `components/dashboard/publish-settings.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useEditorStore } from "@/stores/editor-store"
import { useUpdatePost } from "@/hooks/use-posts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"

interface PublishSettingsProps {
  postId: string
  onPublish?: () => Promise<void>
}

export function PublishSettings({ postId, onPublish }: PublishSettingsProps) {
  const {
    isPremium,
    categories: selectedCategories,
    tags,
    setIsPremium,
    setCategories,
    setTags,
  } = useEditorStore()

  const [tagInput, setTagInput] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")

  const updatePost = useUpdatePost()

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      return res.json()
    },
  })

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setCategories(selectedCategories.filter((id) => id !== categoryId))
    } else {
      setCategories([...selectedCategories, categoryId])
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSaveSettings = async () => {
    await updatePost.mutateAsync({
      id: postId,
      data: {
        isPremium,
        categories: selectedCategories,
        tags,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      },
    })
  }

  return (
    <div className="space-y-6 py-4">
      {/* Premium */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="premium">Premium content</Label>
          <p className="text-sm text-muted-foreground">
            Only paid subscribers can read
          </p>
        </div>
        <Switch
          id="premium"
          checked={isPremium}
          onCheckedChange={setIsPremium}
        />
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categoriesData?.data?.map((category: any) => (
            <Badge
              key={category.id}
              variant={
                selectedCategories.includes(category.id) ? "default" : "outline"
              }
              className="cursor-pointer"
              onClick={() => handleCategoryToggle(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddTag()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* SEO */}
      <div className="space-y-4">
        <Label>SEO Settings</Label>
        <div className="space-y-2">
          <Label htmlFor="metaTitle" className="text-sm font-normal">
            Meta title
          </Label>
          <Input
            id="metaTitle"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="SEO title (max 60 characters)"
            maxLength={60}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metaDescription" className="text-sm font-normal">
            Meta description
          </Label>
          <Textarea
            id="metaDescription"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="SEO description (max 160 characters)"
            maxLength={160}
            rows={3}
          />
        </div>
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button onClick={handleSaveSettings} className="flex-1">
          Save Settings
        </Button>
        {onPublish && (
          <Button onClick={onPublish} variant="default">
            Publish Now
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## Verification Checklist

- [ ] POST /api/posts creates a new draft post
- [ ] GET /api/posts returns paginated posts
- [ ] GET /api/posts/[id] returns single post
- [ ] PATCH /api/posts/[id] updates post
- [ ] DELETE /api/posts/[id] deletes post
- [ ] POST /api/posts/[id]/publish publishes post
- [ ] Posts list shows with filtering
- [ ] New post page creates posts
- [ ] Edit post page loads and saves
- [ ] Categories can be assigned
- [ ] Tags can be created and assigned
- [ ] SEO metadata can be edited
- [ ] Premium toggle works
- [ ] Autosave works

---

## Files Created

```
app/api/
├── posts/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── publish/route.ts
├── categories/route.ts
└── tags/route.ts
app/dashboard/posts/
├── page.tsx
├── new/page.tsx
└── [id]/edit/page.tsx
components/dashboard/
├── posts-table.tsx
├── posts-table-skeleton.tsx
├── new-post-editor.tsx
├── edit-post-editor.tsx
├── editor-header.tsx
└── publish-settings.tsx
hooks/
└── use-posts.ts
```
