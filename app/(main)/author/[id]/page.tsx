import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Container } from "@/components/layout/container"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostGrid } from "@/components/posts/post-grid"

export const dynamic = "force-dynamic"

interface AuthorPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { id } = await params
  const author = await prisma.user.findUnique({
    where: { id },
    select: { name: true, bio: true },
  })

  if (!author) return { title: "Author Not Found" }

  return {
    title: author.name || "Author",
    description: author.bio || `Articles by ${author.name}`,
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params

  const author = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      _count: {
        select: {
          posts: {
            where: {
              status: "PUBLISHED",
              publishedAt: { lte: new Date() },
            },
          },
        },
      },
    },
  })

  if (!author) {
    notFound()
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: author.id,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      categories: true,
      _count: { select: { likes: true } },
    },
    orderBy: { publishedAt: "desc" },
  })

  return (
    <Container className="py-12">
      {/* Author Header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <Avatar className="mx-auto mb-6 h-24 w-24">
          <AvatarImage src={author.avatar || ""} />
          <AvatarFallback className="text-2xl">
            {author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h1 className="mb-2 font-serif text-3xl font-bold">{author.name}</h1>

        {author.bio && (
          <p className="text-muted-foreground mb-4 text-lg">{author.bio}</p>
        )}

        <p className="text-muted-foreground">
          {author._count.posts}{" "}
          {author._count.posts === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <PostGrid posts={posts} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No articles published yet.</p>
        </div>
      )}
    </Container>
  )
}
