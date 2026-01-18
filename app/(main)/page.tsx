import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { Container } from "@/components/layout/container"
import { FeaturedPost } from "@/components/posts/featured-post"
import { PostGrid } from "@/components/posts/post-grid"
import { SubscribeCTA } from "@/components/subscription/subscribe-cta"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic" // Always run on request
export const revalidate = 60 // Revalidate every minute

async function getFeaturedPost() {
  return prisma.post.findFirst({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
      categories: true,
    },
    orderBy: { publishedAt: "desc" },
  })
}

async function getRecentPosts(excludeId?: string) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: excludeId ? { not: excludeId } : undefined,
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
      categories: true,
      _count: {
        select: { likes: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 9,
  })
}

export default async function HomePage() {
  const featuredPost = await getFeaturedPost()
  const recentPosts = await getRecentPosts(featuredPost?.id)

  return (
    <Container className="py-8">
      {/* Hero Section - Featured Post */}
      {featuredPost ? (
        <section className="mb-16">
          <FeaturedPost post={featuredPost} />
        </section>
      ) : (
        <section className="mb-16">
          <div className="py-16 text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight md:text-6xl">
              {process.env.NEXT_PUBLIC_APP_NAME || "BlogPlatform"}
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-xl">
              A modern blogging platform for writers and readers. Share your
              stories with the world.
            </p>
          </div>
        </section>
      )}

      {/* Recent Posts */}
      <section className="mb-16">
        <h2 className="mb-8 font-serif text-2xl font-bold">Latest Articles</h2>
        <Suspense fallback={<PostGridSkeleton />}>
          {recentPosts.length > 0 ? (
            <PostGrid posts={recentPosts} />
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No articles published yet.
              </p>
              <p className="text-muted-foreground text-sm">
                Check back soon for new content!
              </p>
            </div>
          )}
        </Suspense>
      </section>

      {/* Subscribe CTA */}
      <section className="mb-16">
        <SubscribeCTA />
      </section>
    </Container>
  )
}

function PostGridSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}
