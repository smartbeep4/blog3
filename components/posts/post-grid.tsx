import { PostCard } from "./post-card"

interface Post {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  excerpt?: string | null
  coverImage?: string | null
  publishedAt: Date | string | null
  readingTime?: number | null
  isPremium: boolean
  author: {
    name: string
    avatar?: string | null
  }
  categories?: {
    name: string
    slug: string
    color?: string | null
  }[]
  _count?: {
    likes: number
  }
}

interface PostGridProps {
  posts: Post[]
  columns?: 2 | 3 | 4
}

export function PostGrid({ posts, columns = 3 }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    )
  }

  const gridClass = {
    2: "grid md:grid-cols-2 gap-8",
    3: "grid md:grid-cols-2 lg:grid-cols-3 gap-8",
    4: "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8",
  }

  return (
    <div className={gridClass[columns]}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={{
            ...post,
            publishedAt: post.publishedAt
              ? new Date(post.publishedAt)
              : new Date(),
          }}
        />
      ))}
    </div>
  )
}
