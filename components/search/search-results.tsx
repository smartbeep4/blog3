import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SearchResultsProps {
  query: string
  page: number
}

export async function SearchResults({ query, page }: SearchResultsProps) {
  const limit = 10

  const whereClause = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: new Date() },
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { subtitle: { contains: query, mode: "insensitive" as const } },
      { excerpt: { contains: query, mode: "insensitive" as const } },
    ],
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
      categories: true,
    },
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  })

  const total = await prisma.post.count({
    where: whereClause,
  })

  const totalPages = Math.ceil(total / limit)

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-lg">
          No results found for &quot;{query}&quot;
        </p>
        <p className="text-muted-foreground mt-2">
          Try different keywords or check your spelling
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Found {total} {total === 1 ? "result" : "results"} for &quot;{query}
        &quot;
      </p>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${post.slug}`}
            className="group flex gap-6"
          >
            {/* Thumbnail */}
            <div className="bg-muted relative h-32 w-48 flex-shrink-0 overflow-hidden rounded-lg">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="192px"
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
            <div className="min-w-0 flex-1 space-y-2">
              {post.categories.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {post.categories[0].name}
                </Badge>
              )}

              <h2 className="group-hover:text-primary line-clamp-1 font-serif text-xl font-bold transition-colors">
                {post.title}
              </h2>

              {post.excerpt && (
                <p className="text-muted-foreground line-clamp-2">
                  {post.excerpt}
                </p>
              )}

              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <Avatar className="h-6 w-6">
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
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-8">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
              >
                Previous
              </Link>
            </Button>
          )}
          <span className="text-muted-foreground flex items-center px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link
                href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
              >
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
