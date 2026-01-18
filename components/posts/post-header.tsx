import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PostHeaderProps {
  post: {
    title: string
    subtitle?: string | null
    publishedAt: Date | null
    readingTime?: number | null
    isPremium: boolean
    author: {
      id: string
      name: string
      avatar?: string | null
    }
    categories: {
      name: string
      slug: string
      color?: string | null
    }[]
  }
  className?: string
}

export function PostHeader({ post, className }: PostHeaderProps) {
  return (
    <header className={cn("space-y-6", className)}>
      {/* Categories */}
      {(post.categories.length > 0 || post.isPremium) && (
        <div className="flex flex-wrap gap-2">
          {post.categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`}>
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80"
                style={
                  category.color
                    ? {
                        backgroundColor: `${category.color}20`,
                        color: category.color,
                      }
                    : undefined
                }
              >
                {category.name}
              </Badge>
            </Link>
          ))}
          {post.isPremium && <Badge variant="default">Premium</Badge>}
        </div>
      )}

      {/* Title */}
      <h1 className="font-serif text-4xl leading-tight font-bold md:text-5xl">
        {post.title}
      </h1>

      {/* Subtitle */}
      {post.subtitle && (
        <p className="text-muted-foreground text-xl md:text-2xl">
          {post.subtitle}
        </p>
      )}

      {/* Author & Meta */}
      <div className="flex items-center gap-4 pt-4">
        <Link href={`/author/${post.author.id}`}>
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.author.avatar || ""} />
            <AvatarFallback>
              {post.author.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link
            href={`/author/${post.author.id}`}
            className="font-medium hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="text-muted-foreground text-sm">
            {post.publishedAt && formatDate(post.publishedAt)}
            {post.readingTime && ` - ${post.readingTime} min read`}
          </p>
        </div>
      </div>
    </header>
  )
}
