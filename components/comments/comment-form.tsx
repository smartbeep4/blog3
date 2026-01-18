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

    try {
      await createComment.mutateAsync({
        postId,
        content: content.trim(),
        parentId,
      })

      setContent("")
      onSuccess?.()
    } catch {
      // Error is handled by the mutation
    }
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

      <div className="flex-1 space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={parentId ? 2 : 3}
          className="resize-none"
          disabled={createComment.isPending}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={createComment.isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!content.trim() || createComment.isPending}
          >
            {createComment.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  )
}
