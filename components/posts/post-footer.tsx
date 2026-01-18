"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Heart, Bookmark, Share2, Link as LinkIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface PostFooterProps {
  postId: string
  slug: string
  likesCount: number
  isLiked: boolean
  isBookmarked: boolean
  isAuthenticated: boolean
}

export function PostFooter({
  postId,
  slug,
  likesCount,
  isLiked: initialIsLiked,
  isBookmarked: initialIsBookmarked,
  isAuthenticated,
}: PostFooterProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [likes, setLikes] = useState(likesCount)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    setIsLikeLoading(true)
    // Optimistic update
    setIsLiked(!isLiked)
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1))

    try {
      const method = isLiked ? "DELETE" : "POST"
      const response = await fetch(`/api/posts/${postId}/like`, { method })

      if (!response.ok) {
        // Revert on error
        setIsLiked(isLiked)
        setLikes((prev) => (isLiked ? prev + 1 : prev - 1))
        throw new Error("Failed to like post")
      }
    } catch {
      toast.error("Failed to update like")
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    setIsBookmarkLoading(true)
    // Optimistic update
    setIsBookmarked(!isBookmarked)

    try {
      const method = isBookmarked ? "DELETE" : "POST"
      const response = await fetch(`/api/posts/${postId}/bookmark`, { method })

      if (!response.ok) {
        // Revert on error
        setIsBookmarked(isBookmarked)
        throw new Error("Failed to bookmark post")
      }

      toast.success(
        isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks"
      )
    } catch {
      toast.error("Failed to update bookmark")
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/${slug}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleShareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    )
  }

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    )
  }

  return (
    <div className="mt-8 flex items-center justify-between border-t border-b py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLikeLoading}
          className={cn(isLiked && "text-red-500 hover:text-red-600")}
        >
          <Heart className={cn("mr-2 h-5 w-5", isLiked && "fill-current")} />
          <span>{likes}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBookmark}
          disabled={isBookmarkLoading}
          className={cn(isBookmarked && "text-primary")}
        >
          <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current")} />
          <span className="sr-only">
            {isBookmarked ? "Remove bookmark" : "Add bookmark"}
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShareTwitter}>
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareFacebook}>
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
