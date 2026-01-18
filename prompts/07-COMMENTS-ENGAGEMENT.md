# 07 - Comments & Engagement

## Overview

You are responsible for implementing the complete comments system, including nested replies, comment likes, moderation, and all engagement features.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Reader experience implemented (Agent 06)

---

## Features to Implement

1. Comment creation and editing
2. Nested replies (2 levels)
3. Comment likes
4. Comment moderation
5. Edit/delete own comments
6. Real-time updates (optional)

---

## Step 1: Create Comments API Routes

Create `app/api/posts/[id]/comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/posts/[id]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  const comments = await prisma.comment.findMany({
    where: {
      postId: params.id,
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
    where: { postId: params.id, parentId: null },
  })

  // Get likes for current user
  const session = await getServerSession(authOptions)
  let likedCommentIds: string[] = []

  if (session?.user?.id) {
    const likes = await prisma.commentLike.findMany({
      where: {
        userId: session.user.id,
        commentId: {
          in: [
            ...comments.map((c) => c.id),
            ...comments.flatMap((c) => c.replies.map((r) => r.id)),
          ],
        },
      },
      select: { commentId: true },
    })
    likedCommentIds = likes.map((l) => l.commentId)
  }

  // Add isLiked to comments
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
}

// POST /api/posts/[id]/comments
const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  parentId: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, parentId } = createCommentSchema.parse(body)

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // If replying, verify parent exists and is not already a reply
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      })

      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        )
      }

      // Only allow 2 levels of nesting
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Cannot reply to a reply" },
          { status: 400 }
        )
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId: params.id,
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
      { data: { ...comment, isLiked: false } },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Create comment error:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}
```

Create `app/api/comments/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/comments/[id]
const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
  })

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 })
  }

  // Only author can edit (within 15 minutes)
  const isAuthor = comment.authorId === session.user.id
  const isWithinEditWindow =
    Date.now() - comment.createdAt.getTime() < 15 * 60 * 1000

  if (!isAuthor || !isWithinEditWindow) {
    return NextResponse.json(
      { error: "Cannot edit this comment" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { content } = updateCommentSchema.parse(body)

    const updatedComment = await prisma.comment.update({
      where: { id: params.id },
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

    return NextResponse.json({ data: updatedComment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    )
  }
}

// DELETE /api/comments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    include: {
      post: { select: { authorId: true } },
    },
  })

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 })
  }

  // Can delete if: author, post author, or moderator
  const isAuthor = comment.authorId === session.user.id
  const isPostAuthor = comment.post.authorId === session.user.id
  const isModerator = hasRole(session.user.role, "EDITOR")

  if (!isAuthor && !isPostAuthor && !isModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.comment.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ message: "Comment deleted" })
}
```

---

## Step 2: Create Comment Like API

Create `app/api/comments/[id]/like/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.commentLike.create({
      data: {
        userId: session.user.id,
        commentId: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Already liked" }, { status: 400 })
    }
    throw error
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.commentLike.deleteMany({
    where: {
      userId: session.user.id,
      commentId: params.id,
    },
  })

  return NextResponse.json({ success: true })
}
```

---

## Step 3: Create Comments Hook

Create `hooks/use-comments.ts`:

```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface Comment {
  id: string
  content: string
  createdAt: string
  isEdited: boolean
  isLiked: boolean
  author: {
    id: string
    name: string
    avatar?: string | null
  }
  _count: {
    likes: number
  }
  replies?: Comment[]
}

interface CommentsResponse {
  data: Comment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useComments(postId: string, page = 1) {
  return useQuery<CommentsResponse>({
    queryKey: ["comments", postId, page],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments?page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch comments")
      return res.json()
    },
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentId,
    }: {
      postId: string
      content: string
      parentId?: string
    }) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create comment")
      }
      return res.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      toast.success("Comment posted")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string
      content: string
      postId: string
    }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update comment")
      }
      return res.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      toast.success("Comment updated")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string
      postId: string
    }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete comment")
      }
      return res.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] })
      toast.success("Comment deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useLikeComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      isLiked,
    }: {
      commentId: string
      isLiked: boolean
      postId: string
    }) => {
      const method = isLiked ? "DELETE" : "POST"
      const res = await fetch(`/api/comments/${commentId}/like`, { method })
      if (!res.ok) throw new Error("Failed to like comment")
      return res.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}
```

---

## Step 4: Create Comments Section Component

Create `components/comments/comments-section.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useComments } from "@/hooks/use-comments"
import { CommentForm } from "./comment-form"
import { CommentList } from "./comment-list"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import Link from "next/link"

interface CommentsSectionProps {
  postId: string
  commentsCount: number
}

export function CommentsSection({ postId, commentsCount }: CommentsSectionProps) {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useComments(postId, page)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="text-xl font-bold">
          {commentsCount} {commentsCount === 1 ? "Comment" : "Comments"}
        </h2>
      </div>

      {/* Comment Form */}
      {session ? (
        <CommentForm postId={postId} />
      ) : (
        <div className="bg-muted rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to join the discussion
          </p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      )}

      {/* Comments List */}
      <CommentList
        postId={postId}
        comments={data?.data || []}
        isLoading={isLoading}
        currentUserId={session?.user?.id}
      />

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
    </div>
  )
}
```

---

## Step 5: Create Comment Form Component

Create `components/comments/comment-form.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useCreateComment } from "@/hooks/use-comments"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

interface CommentFormProps {
  postId: string
  parentId?: string
  onCancel?: () => void
  onSuccess?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function CommentForm({
  postId,
  parentId,
  onCancel,
  onSuccess,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentFormProps) {
  const { data: session } = useSession()
  const [content, setContent] = useState("")
  const createComment = useCreateComment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) return

    await createComment.mutateAsync({
      postId,
      content: content.trim(),
      parentId,
    })

    setContent("")
    onSuccess?.()
  }

  if (!session?.user) return null

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={session.user.image || ""} />
        <AvatarFallback>
          {session.user.name?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!content.trim() || createComment.isPending}
          >
            {createComment.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  )
}
```

---

## Step 6: Create Comment List Component

Create `components/comments/comment-list.tsx`:

```typescript
"use client"

import { Comment } from "./comment"
import { Skeleton } from "@/components/ui/skeleton"

interface CommentData {
  id: string
  content: string
  createdAt: string
  isEdited: boolean
  isLiked: boolean
  author: {
    id: string
    name: string
    avatar?: string | null
  }
  _count: {
    likes: number
  }
  replies?: CommentData[]
}

interface CommentListProps {
  postId: string
  comments: CommentData[]
  isLoading: boolean
  currentUserId?: string
}

export function CommentList({
  postId,
  comments,
  isLoading,
  currentUserId,
}: CommentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comments yet. Be the first to share your thoughts!
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          postId={postId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
```

---

## Step 7: Create Single Comment Component

Create `components/comments/comment.tsx`:

```typescript
"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
} from "@/hooks/use-comments"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { CommentForm } from "./comment-form"
import {
  Heart,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CommentData {
  id: string
  content: string
  createdAt: string
  isEdited: boolean
  isLiked: boolean
  author: {
    id: string
    name: string
    avatar?: string | null
  }
  _count: {
    likes: number
  }
  replies?: CommentData[]
}

interface CommentProps {
  comment: CommentData
  postId: string
  currentUserId?: string
  isReply?: boolean
}

export function Comment({
  comment,
  postId,
  currentUserId,
  isReply = false,
}: CommentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const likeComment = useLikeComment()

  const isAuthor = currentUserId === comment.author.id
  const canEdit =
    isAuthor &&
    Date.now() - new Date(comment.createdAt).getTime() < 15 * 60 * 1000

  const handleUpdate = async () => {
    if (!editContent.trim()) return

    await updateComment.mutateAsync({
      commentId: comment.id,
      content: editContent.trim(),
      postId,
    })

    setIsEditing(false)
  }

  const handleDelete = async () => {
    await deleteComment.mutateAsync({
      commentId: comment.id,
      postId,
    })
    setShowDeleteDialog(false)
  }

  const handleLike = () => {
    likeComment.mutate({
      commentId: comment.id,
      isLiked: comment.isLiked,
      postId,
    })
  }

  return (
    <div className={cn("flex gap-4", isReply && "ml-14 mt-4")}>
      <Link href={`/author/${comment.author.id}`}>
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={comment.author.avatar || ""} />
          <AvatarFallback>
            {comment.author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/author/${comment.author.id}`}
              className="font-medium hover:underline"
            >
              {comment.author.name}
            </Link>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={updateComment.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(comment.isLiked && "text-red-500")}
            >
              <Heart
                className={cn("h-4 w-4 mr-1", comment.isLiked && "fill-current")}
              />
              {comment._count.likes}
            </Button>

            {!isReply && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Reply
              </Button>
            )}
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-4">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.author.name}...`}
              autoFocus
              onCancel={() => setIsReplying(false)}
              onSuccess={() => setIsReplying(false)}
            />
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUserId={currentUserId}
                isReply
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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

## Step 8: Export Comment Components

Create `components/comments/index.ts`:

```typescript
export { CommentsSection } from "./comments-section"
export { CommentForm } from "./comment-form"
export { CommentList } from "./comment-list"
export { Comment } from "./comment"
```

---

## Verification Checklist

- [ ] GET /api/posts/[id]/comments returns paginated comments
- [ ] POST /api/posts/[id]/comments creates comment
- [ ] PATCH /api/comments/[id] updates comment (within 15 min)
- [ ] DELETE /api/comments/[id] deletes comment
- [ ] POST /api/comments/[id]/like likes comment
- [ ] DELETE /api/comments/[id]/like unlikes comment
- [ ] Comments section displays on post page
- [ ] New comments can be created
- [ ] Replies work (2 levels max)
- [ ] Edit works within time window
- [ ] Delete works
- [ ] Like/unlike works
- [ ] Pagination works
- [ ] Auth required for commenting
- [ ] isLiked state shows correctly

---

## Files Created

```
app/api/
├── posts/[id]/comments/route.ts
└── comments/[id]/
    ├── route.ts
    └── like/route.ts
components/comments/
├── comments-section.tsx
├── comment-form.tsx
├── comment-list.tsx
├── comment.tsx
└── index.ts
hooks/
└── use-comments.ts
```
