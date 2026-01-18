"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useComments } from "@/hooks/use-comments"
import { CommentForm } from "./comment-form"
import { CommentList } from "./comment-list"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"

interface CommentsSectionProps {
  postId: string
  commentsCount: number
  postAuthorId?: string
}

export function CommentsSection({
  postId,
  commentsCount,
  postAuthorId,
}: CommentsSectionProps) {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useComments(postId, page)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h2 className="font-serif text-xl font-bold">
          {commentsCount} {commentsCount === 1 ? "Comment" : "Comments"}
        </h2>
      </div>

      {/* Comment Form */}
      {session?.user ? (
        <CommentForm postId={postId} />
      ) : (
        <div className="bg-muted/30 rounded-lg border py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Sign in to join the conversation
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
        postAuthorId={postAuthorId}
      />

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
          >
            Previous
          </Button>
          <span className="text-muted-foreground px-4 text-sm">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages || isFetching}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
