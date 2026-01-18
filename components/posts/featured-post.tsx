import Link from "next/link"
import Image from "next/image"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface FeaturedPostProps {
  post: {
    slug: string
    title: string
    subtitle?: string | null
    excerpt?: string | null
    coverImage?: string | null
    publishedAt: Date | null
    readingTime?: number | null
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
}

export function FeaturedPost({ post }: FeaturedPostProps) {
  return (
    <Link href={`/${post.slug}`} className="group block">
      <article className="grid items-center gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="bg-muted absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground font-serif text-4xl">
                {post.title[0]}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Categories */}
          {post.categories.length > 0 && (
            <div className="flex gap-2">
              {post.categories.map((category) => (
                <Badge
                  key={category.slug}
                  variant="secondary"
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
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="group-hover:text-primary font-serif text-3xl leading-tight font-bold transition-colors md:text-4xl">
            {post.title}
          </h1>

          {/* Subtitle */}
          {post.subtitle && (
            <p className="text-muted-foreground text-xl">{post.subtitle}</p>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 pt-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar || ""} />
              <AvatarFallback>
                {post.author.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.author.name}</p>
              <p className="text-muted-foreground text-sm">
                {post.publishedAt && formatDate(post.publishedAt)}
                {post.readingTime && ` - ${post.readingTime} min read`}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
