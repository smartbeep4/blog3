import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Container } from "@/components/layout/container"
import { PostGrid } from "@/components/posts/post-grid"
import { Hash } from "lucide-react"

export const dynamic = "force-dynamic"

interface TagPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { name: true },
  })

  if (!tag) return { title: "Tag Not Found" }

  return {
    title: `#${tag.name}`,
    description: `Articles tagged with ${tag.name}`,
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params

  const tag = await prisma.tag.findUnique({
    where: { slug },
  })

  if (!tag) {
    notFound()
  }

  const posts = await prisma.post.findMany({
    where: {
      tags: { some: { slug } },
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
      {/* Tag Header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <div className="bg-muted mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full">
          <Hash className="text-muted-foreground h-8 w-8" />
        </div>

        <h1 className="mb-2 font-serif text-3xl font-bold">#{tag.name}</h1>

        <p className="text-muted-foreground">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <PostGrid posts={posts} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No articles with this tag yet.
          </p>
        </div>
      )}
    </Container>
  )
}
