import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Container } from "@/components/layout/container"
import { PostGrid } from "@/components/posts/post-grid"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })

  if (!category) return { title: "Category Not Found" }

  return {
    title: category.name,
    description: category.description || `Articles in ${category.name}`,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  const category = await prisma.category.findUnique({
    where: { slug },
  })

  if (!category) {
    notFound()
  }

  const posts = await prisma.post.findMany({
    where: {
      categories: { some: { slug } },
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
      {/* Category Header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 px-4 py-2 text-lg"
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

        {category.description && (
          <p className="text-muted-foreground text-lg">
            {category.description}
          </p>
        )}

        <p className="text-muted-foreground mt-4">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* Posts */}
      {posts.length > 0 ? (
        <PostGrid posts={posts} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No articles in this category yet.
          </p>
        </div>
      )}
    </Container>
  )
}
