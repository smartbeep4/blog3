"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import {
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
} from "@/hooks/use-comments"
import type { Comment as CommentType } from "@/hooks/use-comments"
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
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommentProps {
  comment: CommentType
  postId: string
  currentUserId?: string
  postAuthorId?: string
  isReply?: boolean
}

export function Comment({
  comment,
  postId,
  currentUserId,
  postAuthorId,
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
  const isPostAuthor = currentUserId === postAuthorId

  // Can delete if: comment author, post author, or moderator
  const canDelete = isAuthor || isPostAuthor

  // Calculate edit window status
  // Use state to store the computed values to avoid impure render issues
  const [editState, setEditState] = useState({
    canEdit: false,
    minutesRemaining: 0,
  })

  useEffect(() => {
    const fifteenMinutesInMs = 15 * 60 * 1000
    const createdTime = new Date(comment.createdAt).getTime()

    const calculateEditState = () => {
      const timeSinceCreation = Date.now() - createdTime
      const editTimeRemaining = fifteenMinutesInMs - timeSinceCreation

      setEditState({
        canEdit: isAuthor && timeSinceCreation < fifteenMinutesInMs,
        minutesRemaining: Math.max(0, Math.ceil(editTimeRemaining / 60000)),
      })
    }

    // Calculate immediately
    calculateEditState()

    // Update every minute while within edit window
    const interval = setInterval(calculateEditState, 60000)

    return () => clearInterval(interval)
  }, [comment.createdAt, isAuthor])

  const canEdit = editState.canEdit
  const editMinutesRemaining = editState.minutesRemaining

  const handleUpdate = async () => {
    if (!editContent.trim()) return

    try {
      await updateComment.mutateAsync({
        commentId: comment.id,
        content: editContent.trim(),
        postId,
      })
      setIsEditing(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleDelete = async () => {
    try {
      await deleteComment.mutateAsync({
        commentId: comment.id,
        postId,
      })
      setShowDeleteDialog(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleLike = () => {
    if (!currentUserId) return

    likeComment.mutate({
      commentId: comment.id,
      isLiked: comment.isLiked,
      postId,
    })
  }

  return (
    <div className={cn("flex gap-4", isReply && "mt-4 ml-14")}>
      <Link href={`/author/${comment.author.id}`} className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.author.avatar || ""} />
          <AvatarFallback>
            {comment.author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/author/${comment.author.id}`}
              className="font-medium hover:underline"
            >
              {comment.author.name}
            </Link>
            {comment.author.id === postAuthorId && (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                Author
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-muted-foreground text-xs">(edited)</span>
            )}
          </div>

          {/* Actions Menu */}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit ({editMinutesRemaining}m left)
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={updateComment.isPending}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={
                  !editContent.trim() ||
                  editContent === comment.content ||
                  updateComment.isPending
                }
              >
                {updateComment.isPending && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
                disabled={updateComment.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm break-words whitespace-pre-wrap">
            {comment.content}
          </p>
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!currentUserId || likeComment.isPending}
              className={cn(
                "h-8 gap-1.5 px-2",
                comment.isLiked && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart
                className={cn("h-4 w-4", comment.isLiked && "fill-current")}
              />
              <span className="text-xs">{comment._count.likes}</span>
            </Button>

            {!isReply && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="h-8 gap-1.5 px-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Reply</span>
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
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUserId={currentUserId}
                postAuthorId={postAuthorId}
                isReply
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              comment
              {comment.replies && comment.replies.length > 0
                ? " and all its replies"
                : ""}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteComment.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteComment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteComment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
