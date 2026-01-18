import { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { Container } from "@/components/layout/container"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Your saved articles",
}

export default async function BookmarksPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/bookmarks")
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    include: {
      post: {
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
          categories: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Bookmark className="h-8 w-8" />
          <h1 className="font-serif text-3xl font-bold">Bookmarks</h1>
        </div>

        {bookmarks.length === 0 ? (
          <div className="bg-muted/30 rounded-lg border py-12 text-center">
            <Bookmark className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground mb-4 text-lg">
              No bookmarks yet
            </p>
            <p className="text-muted-foreground mb-6">
              Save articles to read later by clicking the bookmark icon
            </p>
            <Button asChild>
              <Link href="/search">Explore Articles</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookmarks.map(({ post, createdAt }) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="group flex gap-6"
              >
                {/* Thumbnail */}
                <div className="bg-muted relative h-28 w-40 flex-shrink-0 overflow-hidden rounded-lg">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="160px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-muted-foreground font-serif text-xl">
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

                  <h2 className="group-hover:text-primary line-clamp-1 font-serif text-lg font-bold transition-colors">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="text-muted-foreground flex items-center gap-3 text-sm">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={post.author.avatar || ""} />
                      <AvatarFallback className="text-xs">
                        {post.author.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{post.author.name}</span>
                    <span>-</span>
                    <span>Saved {formatDate(createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
