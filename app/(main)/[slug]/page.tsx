import { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getSession, canAccessPremium } from "@/lib/auth"
import { Container } from "@/components/layout/container"
import { PostContent } from "@/components/posts/post-content"
import { PostHeader } from "@/components/posts/post-header"
import { PostFooter } from "@/components/posts/post-footer"
import { AuthorCard } from "@/components/posts/author-card"
import { RelatedPosts } from "@/components/posts/related-posts"
import { PaywallOverlay } from "@/components/subscription/paywall-overlay"
import { CommentsSection } from "@/components/comments/comments-section"
import { ViewTracker } from "@/components/posts/view-tracker"

export const dynamic = "force-dynamic"

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      title: true,
      metaTitle: true,
      metaDescription: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
    },
  })

  if (!post) return { title: "Post Not Found" }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage ? [post.coverImage] : [],
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params

  const post = await prisma.post.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true, bio: true },
      },
      categories: true,
      tags: true,
      _count: {
        select: { comments: true, likes: true },
      },
    },
  })

  if (!post) {
    notFound()
  }

  // Check premium access
  const session = await getSession()
  let hasAccess = !post.isPremium

  if (post.isPremium && session?.user?.id) {
    hasAccess = await canAccessPremium(session.user.id)
  }

  // View tracking is now handled client-side by ViewTracker component

  // Check if user liked/bookmarked
  let isLiked = false
  let isBookmarked = false

  if (session?.user?.id) {
    const [like, bookmark] = await Promise.all([
      prisma.like.findUnique({
        where: {
          userId_postId: { userId: session.user.id, postId: post.id },
        },
      }),
      prisma.bookmark.findUnique({
        where: {
          userId_postId: { userId: session.user.id, postId: post.id },
        },
      }),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  // Fetch related posts based on category or author
  const relatedPosts = await prisma.post.findMany({
    where: {
      id: { not: post.id },
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [
        {
          categories: {
            some: { id: { in: post.categories.map((c) => c.id) } },
          },
        },
        { authorId: post.authorId },
      ],
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      categories: true,
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
  })

  return (
    <article className="pb-16">
      {/* View Tracking */}
      <ViewTracker postId={post.id} />

      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative h-[50vh] max-h-[600px] min-h-[400px] w-full">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="from-background via-background/20 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>
      )}

      <Container className="max-w-3xl">
        {/* Header */}
        <PostHeader
          post={post}
          className={post.coverImage ? "relative z-10 -mt-32" : "mt-8"}
        />

        {/* Content */}
        <div className="relative mt-8">
          {post.isPremium && !hasAccess ? (
            <PaywallOverlay previewContent={post.contentHtml.slice(0, 1000)} />
          ) : (
            <PostContent html={post.contentHtml} />
          )}
        </div>

        {/* Footer (likes, share) */}
        <PostFooter
          postId={post.id}
          slug={post.slug}
          likesCount={post._count.likes}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          isAuthenticated={!!session}
        />

        {/* Author */}
        <div className="mt-12 border-t pt-8">
          <AuthorCard author={post.author} />
        </div>

        {/* Comments */}
        {hasAccess && (
          <div className="mt-12 border-t pt-8">
            <CommentsSection
              postId={post.id}
              commentsCount={post._count.comments}
              postAuthorId={post.author.id}
            />
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="mb-8 font-serif text-2xl font-bold">
              Related Articles
            </h2>
            <RelatedPosts posts={relatedPosts} />
          </div>
        )}
      </Container>
    </article>
  )
}
