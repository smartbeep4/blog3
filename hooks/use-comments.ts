"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query"
import { toast } from "sonner"

// Types
interface CommentAuthor {
  id: string
  name: string
  avatar: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isLiked: boolean
  authorId: string
  postId: string
  parentId: string | null
  author: CommentAuthor
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

// Query keys
export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (postId: string) => [...commentKeys.lists(), postId] as const,
  listPage: (postId: string, page: number) =>
    [...commentKeys.list(postId), page] as const,
}

// API functions
async function fetchComments(
  postId: string,
  page = 1
): Promise<CommentsResponse> {
  const res = await fetch(`/api/posts/${postId}/comments?page=${page}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to fetch comments")
  }
  return res.json()
}

async function createComment(data: {
  postId: string
  content: string
  parentId?: string
}): Promise<{ data: Comment }> {
  const res = await fetch(`/api/posts/${data.postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: data.content,
      parentId: data.parentId,
    }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create comment")
  }
  return res.json()
}

async function updateComment(data: {
  commentId: string
  content: string
}): Promise<{ data: Comment }> {
  const res = await fetch(`/api/comments/${data.commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: data.content }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update comment")
  }
  return res.json()
}

async function deleteComment(commentId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete comment")
  }
  return res.json()
}

async function likeComment(
  commentId: string
): Promise<{ success: boolean; likeCount: number }> {
  const res = await fetch(`/api/comments/${commentId}/like`, {
    method: "POST",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to like comment")
  }
  return res.json()
}

async function unlikeComment(
  commentId: string
): Promise<{ success: boolean; likeCount: number }> {
  const res = await fetch(`/api/comments/${commentId}/like`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to unlike comment")
  }
  return res.json()
}

// Hooks

/**
 * Fetch comments for a post with pagination
 */
export function useComments(postId: string, page = 1) {
  return useQuery({
    queryKey: commentKeys.listPage(postId, page),
    queryFn: () => fetchComments(postId, page),
    enabled: !!postId,
  })
}

/**
 * Fetch comments with infinite scroll support
 */
export function useInfiniteComments(postId: string) {
  return useInfiniteQuery({
    queryKey: commentKeys.list(postId),
    queryFn: ({ pageParam = 1 }) => fetchComments(postId, pageParam),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
    enabled: !!postId,
  })
}

/**
 * Create a new comment or reply
 */
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_, variables) => {
      // Invalidate the comments list for this post
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(variables.postId),
      })
      toast.success(variables.parentId ? "Reply posted" : "Comment posted")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Update an existing comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string
      content: string
      postId: string
    }) => updateComment({ commentId, content }),
    onSuccess: (_, variables) => {
      // Invalidate the comments list for this post
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(variables.postId),
      })
      toast.success("Comment updated")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string }) =>
      deleteComment(commentId),
    onSuccess: (_, variables) => {
      // Invalidate the comments list for this post
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(variables.postId),
      })
      toast.success("Comment deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Like or unlike a comment with optimistic updates
 */
export function useLikeComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      isLiked,
    }: {
      commentId: string
      isLiked: boolean
      postId: string
    }) => (isLiked ? unlikeComment(commentId) : likeComment(commentId)),

    // Optimistic update
    onMutate: async ({ commentId, isLiked, postId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentKeys.list(postId) })

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: commentKeys.list(postId),
      })

      // Optimistically update the comment
      queryClient.setQueriesData(
        { queryKey: commentKeys.list(postId) },
        (old: CommentsResponse | undefined) => {
          if (!old) return old

          return {
            ...old,
            data: old.data.map((comment) => {
              // Check if this is the comment being liked
              if (comment.id === commentId) {
                return {
                  ...comment,
                  isLiked: !isLiked,
                  _count: {
                    ...comment._count,
                    likes: comment._count.likes + (isLiked ? -1 : 1),
                  },
                }
              }

              // Check replies
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map((reply) => {
                    if (reply.id === commentId) {
                      return {
                        ...reply,
                        isLiked: !isLiked,
                        _count: {
                          ...reply._count,
                          likes: reply._count.likes + (isLiked ? -1 : 1),
                        },
                      }
                    }
                    return reply
                  }),
                }
              }

              return comment
            }),
          }
        }
      )

      return { previousData }
    },

    onError: (error, variables, context) => {
      // Roll back on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to update like"
      )
    },

    onSettled: (_, __, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: commentKeys.list(variables.postId),
      })
    },
  })
}

// Export types
export type { Comment, CommentAuthor, CommentsResponse }
