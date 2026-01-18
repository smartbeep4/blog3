"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface RecentComment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    avatar: string | null
  }
  post: {
    id: string
    title: string
    slug: string
  }
}

interface RecentActivityProps {
  comments: RecentComment[]
}

export function RecentActivity({ comments }: RecentActivityProps) {
  if (comments.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No recent comments. Engage with your readers to see activity here.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Link href={`/author/${comment.author.id}`}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={comment.author.avatar || ""} />
              <AvatarFallback className="text-xs">
                {comment.author.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm">
              <Link
                href={`/author/${comment.author.id}`}
                className="font-medium hover:underline"
              >
                {comment.author.name}
              </Link>
              <span className="text-muted-foreground"> commented on </span>
              <Link
                href={`/${comment.post.slug}`}
                className="font-medium hover:underline"
              >
                {comment.post.title}
              </Link>
            </p>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {comment.content}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
