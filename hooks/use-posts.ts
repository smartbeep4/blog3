"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { Post, Category, Tag, PostStatus } from "@prisma/client"
import type { JSONContent } from "@tiptap/react"

// Types
interface UserPublic {
  id: string
  name: string
  avatar: string | null
  bio?: string | null
}

interface PostWithDetails extends Post {
  author: UserPublic
  categories: Category[]
  tags: Tag[]
  _count: {
    comments: number
    likes: number
    views: number
  }
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface PostsQueryParams {
  page?: number
  limit?: number
  status?: PostStatus
  authorId?: string
  categoryId?: string
  search?: string
  sortBy?: "createdAt" | "publishedAt" | "title"
  sortOrder?: "asc" | "desc"
}

interface CreatePostData {
  title: string
  subtitle?: string
  content?: JSONContent | null
  coverImage?: string | null
  isPremium?: boolean
  categories?: string[]
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  status?: PostStatus
  scheduledFor?: string | null
}

interface UpdatePostData {
  title?: string
  subtitle?: string | null
  content?: JSONContent | null
  coverImage?: string | null
  isPremium?: boolean
  categories?: string[]
  tags?: string[]
  metaTitle?: string | null
  metaDescription?: string | null
  status?: PostStatus
  scheduledFor?: string | null
}

interface PublishData {
  scheduledFor?: string | null
}

// API functions
async function fetchPosts(
  params: PostsQueryParams = {}
): Promise<PaginatedResponse<PostWithDetails>> {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set("page", params.page.toString())
  if (params.limit) searchParams.set("limit", params.limit.toString())
  if (params.status) searchParams.set("status", params.status)
  if (params.authorId) searchParams.set("authorId", params.authorId)
  if (params.categoryId) searchParams.set("categoryId", params.categoryId)
  if (params.search) searchParams.set("search", params.search)
  if (params.sortBy) searchParams.set("sortBy", params.sortBy)
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder)

  const response = await fetch(`/api/posts?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch posts")
  }

  return response.json()
}

async function fetchPost(id: string): Promise<{ data: PostWithDetails }> {
  const response = await fetch(`/api/posts/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch post")
  }

  return response.json()
}

async function createPost(
  data: CreatePostData
): Promise<{ data: PostWithDetails }> {
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
}

async function updatePost(
  id: string,
  data: UpdatePostData
): Promise<{ data: PostWithDetails }> {
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
}

async function deletePost(id: string): Promise<{ message: string }> {
  const response = await fetch(`/api/posts/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to delete post")
  }

  return response.json()
}

async function publishPost(
  id: string,
  data?: PublishData
): Promise<{ data: PostWithDetails; message: string }> {
  const response = await fetch(`/api/posts/${id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to publish post")
  }

  return response.json()
}

async function unpublishPost(
  id: string
): Promise<{ data: PostWithDetails; message: string }> {
  const response = await fetch(`/api/posts/${id}/publish`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to unpublish post")
  }

  return response.json()
}

// Query keys
export const postKeys = {
  all: ["posts"] as const,
  lists: () => [...postKeys.all, "list"] as const,
  list: (params: PostsQueryParams) => [...postKeys.lists(), params] as const,
  details: () => [...postKeys.all, "detail"] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
}

// Hooks
export function usePosts(
  params: PostsQueryParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<PostWithDetails>>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => fetchPosts(params),
    ...options,
  })
}

export function usePost(
  id: string,
  options?: Omit<
    UseQueryOptions<{ data: PostWithDetails }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => fetchPost(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostData }) =>
      updatePost(id, data),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
      queryClient.setQueryData(postKeys.detail(id), result)
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

export function usePublishPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: PublishData }) =>
      publishPost(id, data),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
      queryClient.setQueryData(postKeys.detail(id), { data: result.data })
    },
  })
}

export function useUnpublishPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unpublishPost,
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
      queryClient.setQueryData(postKeys.detail(id), { data: result.data })
    },
  })
}

// Categories hooks
interface CategoryWithCount extends Category {
  _count: {
    posts: number
  }
}

async function fetchCategories(): Promise<{ data: CategoryWithCount[] }> {
  const response = await fetch("/api/categories")

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch categories")
  }

  return response.json()
}

async function createCategory(data: {
  name: string
  description?: string
  color?: string
}): Promise<{ data: CategoryWithCount }> {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create category")
  }

  return response.json()
}

export const categoryKeys = {
  all: ["categories"] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// Tags hooks
interface TagWithCount extends Tag {
  _count: {
    posts: number
  }
}

async function fetchTags(
  search?: string,
  limit?: number
): Promise<{ data: TagWithCount[] }> {
  const searchParams = new URLSearchParams()
  if (search) searchParams.set("search", search)
  if (limit) searchParams.set("limit", limit.toString())

  const response = await fetch(`/api/tags?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch tags")
  }

  return response.json()
}

export const tagKeys = {
  all: ["tags"] as const,
  search: (query: string) => [...tagKeys.all, "search", query] as const,
}

export function useTags(search?: string, limit?: number) {
  return useQuery({
    queryKey: search ? tagKeys.search(search) : tagKeys.all,
    queryFn: () => fetchTags(search, limit),
  })
}
