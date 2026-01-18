"use client"

import { Comment } from "./comment"
import { Skeleton } from "@/components/ui/skeleton"
import type { Comment as CommentType } from "@/hooks/use-comments"

interface CommentListProps {
  postId: string
  comments: CommentType[]
  isLoading: boolean
  currentUserId?: string
  postAuthorId?: string
}

export function CommentList({
  postId,
  comments,
  isLoading,
  currentUserId,
  postAuthorId,
}: CommentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <CommentSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No comments yet. Be the first to share your thoughts!
        </p>
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
          postAuthorId={postAuthorId}
        />
      ))}
    </div>
  )
}

function CommentSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}
