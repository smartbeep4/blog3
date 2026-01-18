"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow, format } from "date-fns"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Send,
  Archive,
  FileText,
} from "lucide-react"
import {
  usePosts,
  useDeletePost,
  usePublishPost,
  useUnpublishPost,
} from "@/hooks/use-posts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { PostStatus } from "@prisma/client"

interface PostsTableProps {
  authorId?: string
}

const statusColors: Record<PostStatus, string> = {
  DRAFT:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PUBLISHED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function PostsTable({ authorId }: PostsTableProps) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PostStatus | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)

  const { data, isLoading, error } = usePosts({
    page,
    limit: 10,
    authorId,
    status: status !== "ALL" ? status : undefined,
    search: search || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  const deletePost = useDeletePost()
  const publishPost = usePublishPost()
  const unpublishPost = useUnpublishPost()

  const handleDelete = async () => {
    if (!postToDelete) return

    try {
      await deletePost.mutateAsync(postToDelete)
      toast.success("Post deleted successfully")
      setDeleteDialogOpen(false)
      setPostToDelete(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete post"
      )
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await publishPost.mutateAsync({ id })
      toast.success("Post published successfully")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post"
      )
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishPost.mutateAsync(id)
      toast.success("Post moved to drafts")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unpublish post"
      )
    }
  }

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-center">
        <p className="text-destructive">Failed to load posts</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="sm:w-64"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as PostStatus | "ALL")
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Post
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium md:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium lg:table-cell">
                  Stats
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium sm:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-16 rounded" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="ml-auto h-8 w-8" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <FileText className="text-muted-foreground/50 mx-auto h-12 w-12" />
                    <p className="mt-4 text-lg font-medium">No posts found</p>
                    <p className="text-muted-foreground text-sm">
                      {search
                        ? "Try adjusting your search"
                        : "Create your first post to get started"}
                    </p>
                    {!search && (
                      <Button asChild className="mt-4">
                        <Link href="/dashboard/posts/new">Create Post</Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                data?.data.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {post.coverImage ? (
                          <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded">
                            <Image
                              src={post.coverImage}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="bg-muted flex h-12 w-16 flex-shrink-0 items-center justify-center rounded">
                            <FileText className="text-muted-foreground h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/posts/${post.id}/edit`}
                            className="line-clamp-1 font-medium hover:underline"
                          >
                            {post.title || "Untitled"}
                          </Link>
                          <p className="text-muted-foreground line-clamp-1 text-sm">
                            {post.subtitle || post.excerpt || "No description"}
                          </p>
                          <div className="mt-1 flex items-center gap-2 md:hidden">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                statusColors[post.status]
                              )}
                            >
                              {post.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", statusColors[post.status])}
                      >
                        {post.status}
                      </Badge>
                      {post.isPremium && (
                        <Badge variant="default" className="ml-2 text-xs">
                          Premium
                        </Badge>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="text-muted-foreground text-sm">
                        <span>{post._count.views} views</span>
                        <span className="mx-1">&middot;</span>
                        <span>{post._count.likes} likes</span>
                        <span className="mx-1">&middot;</span>
                        <span>{post._count.comments} comments</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="text-sm">
                        {post.publishedAt ? (
                          <span
                            title={format(new Date(post.publishedAt), "PPP")}
                          >
                            {formatDistanceToNow(new Date(post.publishedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/posts/${post.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {post.status === "PUBLISHED" && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/posts/${post.slug}`}
                                target="_blank"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {post.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => handlePublish(post.id)}
                              disabled={publishPost.isPending}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {post.status === "PUBLISHED" && (
                            <DropdownMenuItem
                              onClick={() => handleUnpublish(post.id)}
                              disabled={unpublishPost.isPending}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setPostToDelete(post.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(page - 1) * 10 + 1} to{" "}
            {Math.min(page * 10, data.pagination.total)} of{" "}
            {data.pagination.total} posts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(data.pagination.totalPages, p + 1))
              }
              disabled={page === data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePost.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
