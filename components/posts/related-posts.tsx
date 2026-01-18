import Link from "next/link"
import Image from "next/image"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface RelatedPost {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  coverImage?: string | null
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

interface RelatedPostsProps {
  posts: RelatedPost[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {posts.map((post) => (
        <Link key={post.id} href={`/${post.slug}`} className="group block">
          <article className="space-y-3">
            {/* Cover Image */}
            <div className="bg-muted relative aspect-[16/10] overflow-hidden rounded-lg">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground font-serif text-2xl">
                    {post.title[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              {post.categories.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {post.categories[0].name}
                </Badge>
              )}

              <h3 className="group-hover:text-primary line-clamp-2 font-serif font-bold transition-colors">
                {post.title}
              </h3>

              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.author.avatar || ""} />
                  <AvatarFallback className="text-xs">
                    {post.author.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{post.author.name}</span>
                <span>-</span>
                <span>{post.publishedAt && formatDate(post.publishedAt)}</span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}
