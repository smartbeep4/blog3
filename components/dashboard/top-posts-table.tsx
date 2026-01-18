"use client"

import Link from "next/link"
import { Eye, Heart, MessageSquare } from "lucide-react"

interface TopPost {
  id: string
  title: string
  slug: string
  views: number
  likes: number
  comments: number
}

interface TopPostsTableProps {
  posts: TopPost[]
}

export function TopPostsTable({ posts }: TopPostsTableProps) {
  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No published posts yet. Start writing to see your analytics here.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <div key={post.id} className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-muted-foreground w-5 flex-shrink-0 text-sm font-medium">
              {index + 1}.
            </span>
            <Link
              href={`/dashboard/posts/${post.id}/edit`}
              className="truncate font-medium hover:underline"
              title={post.title}
            >
              {post.title}
            </Link>
          </div>
          <div className="text-muted-foreground flex flex-shrink-0 items-center gap-4 text-sm">
            <span
              className="flex items-center gap-1"
              title={`${post.views} views`}
            >
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(post.views)}
            </span>
            <span
              className="flex items-center gap-1"
              title={`${post.likes} likes`}
            >
              <Heart className="h-3.5 w-3.5" />
              {formatNumber(post.likes)}
            </span>
            <span
              className="flex items-center gap-1"
              title={`${post.comments} comments`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {formatNumber(post.comments)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}
