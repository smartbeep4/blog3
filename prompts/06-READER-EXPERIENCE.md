# 06 - Reader Experience

## Overview

You are responsible for implementing the public-facing reading experience, including the homepage, post pages, author profiles, category/tag archives, and all UI that readers interact with.

---

## Prerequisites

- Project setup complete (Agent 01)
- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Post management implemented (Agent 05)
- UI components available (Agent 15)

---

## Design Principles

1. **Typography First**: Beautiful, readable text is the priority
2. **Content Width**: Max 680px for optimal reading
3. **Generous Whitespace**: Let content breathe
4. **Minimal Chrome**: Hide non-essential UI on reading pages
5. **Fast Loading**: Server components, optimized images

---

## Step 1: Create Main Layout

Create `app/(main)/layout.tsx`:

```typescript
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

---

## Step 2: Create Header Component

Create `components/layout/header.tsx`:

```typescript
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/layout/user-nav"
import { Search } from "lucide-react"

export async function Header() {
  const session = await getSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center gap-6">
          <Link href="/" className="font-serif text-xl font-bold">
            BlogPlatform
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/category/technology"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Technology
            </Link>
            <Link
              href="/category/design"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Design
            </Link>
            <Link
              href="/category/business"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Business
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          <ThemeToggle />

          {session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

Create `components/layout/user-nav.tsx`:

```typescript
"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  User,
  Settings,
  LayoutDashboard,
  Bookmark,
  LogOut,
} from "lucide-react"

interface UserNavProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
  }
}

export function UserNav({ user }: UserNavProps) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const canAccessDashboard = ["AUTHOR", "EDITOR", "ADMIN"].includes(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canAccessDashboard && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/bookmarks">
            <Bookmark className="mr-2 h-4 w-4" />
            Bookmarks
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Step 3: Create Footer Component

Create `components/layout/footer.tsx`:

```typescript
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export async function Footer() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  })

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="font-serif text-xl font-bold">
              {settings?.siteName || "BlogPlatform"}
            </Link>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {settings?.siteDescription ||
                "A modern blogging platform for writers and readers."}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/category/technology" className="hover:text-foreground">
                  Technology
                </Link>
              </li>
              <li>
                <Link href="/category/design" className="hover:text-foreground">
                  Design
                </Link>
              </li>
              <li>
                <Link href="/category/business" className="hover:text-foreground">
                  Business
                </Link>
              </li>
              <li>
                <Link href="/category/culture" className="hover:text-foreground">
                  Culture
                </Link>
              </li>
            </ul>
          </div>

          {/* More Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="hover:text-foreground">
                  Subscribe
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {settings?.siteName || "BlogPlatform"}.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

---

## Step 4: Create Homepage

Create `app/(main)/page.tsx`:

```typescript
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { FeaturedPost } from "@/components/posts/featured-post"
import { PostGrid } from "@/components/posts/post-grid"
import { SubscribeCTA } from "@/components/subscription/subscribe-cta"
import { Skeleton } from "@/components/ui/skeleton"

export default async function HomePage() {
  // Fetch featured post (most recent published)
  const featuredPost = await prisma.post.findFirst({
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

  // Fetch recent posts (excluding featured)
  const recentPosts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: featuredPost ? { not: featuredPost.id } : undefined,
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

  return (
    <div className="container py-8">
      {/* Featured Post */}
      {featuredPost && (
        <section className="mb-16">
          <FeaturedPost post={featuredPost} />
        </section>
      )}

      {/* Recent Posts */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-serif mb-8">Latest Articles</h2>
        <Suspense fallback={<PostGridSkeleton />}>
          <PostGrid posts={recentPosts} />
        </Suspense>
      </section>

      {/* Subscribe CTA */}
      <section className="mb-16">
        <SubscribeCTA />
      </section>
    </div>
  )
}

function PostGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
```

---

## Step 5: Create Post Card Components

Create `components/posts/featured-post.tsx`:

```typescript
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
      <article className="grid md:grid-cols-2 gap-8 items-center">
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
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <span className="text-4xl font-serif text-muted-foreground">
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
                  style={category.color ? { backgroundColor: `${category.color}20`, color: category.color } : undefined}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight group-hover:text-primary transition-colors">
            {post.title}
          </h1>

          {/* Subtitle */}
          {post.subtitle && (
            <p className="text-xl text-muted-foreground">{post.subtitle}</p>
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
              <p className="text-sm text-muted-foreground">
                {post.publishedAt && formatDate(post.publishedAt)}
                {post.readingTime && ` · ${post.readingTime} min read`}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
```

Create `components/posts/post-card.tsx`:

```typescript
import Link from "next/link"
import Image from "next/image"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Lock } from "lucide-react"

interface PostCardProps {
  post: {
    slug: string
    title: string
    subtitle?: string | null
    excerpt?: string | null
    coverImage?: string | null
    publishedAt: Date | null
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
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/${post.slug}`} className="group block">
      <article className="space-y-4">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <span className="text-2xl font-serif text-muted-foreground">
                {post.title[0]}
              </span>
            </div>
          )}

          {/* Premium badge */}
          {post.isPremium && (
            <div className="absolute top-3 right-3">
              <Badge variant="default" className="gap-1">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            </div>
          )}
        </div>

        {/* Category */}
        {post.categories && post.categories.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {post.categories[0].name}
          </Badge>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold font-serif leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.author.avatar || ""} />
            <AvatarFallback className="text-xs">
              {post.author.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{post.author.name}</span>
          <span>·</span>
          <span>{post.publishedAt && formatDate(post.publishedAt)}</span>
        </div>
      </article>
    </Link>
  )
}
```

Create `components/posts/post-grid.tsx`:

```typescript
import { PostCard } from "./post-card"

interface PostGridProps {
  posts: any[]
}

export function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

---

## Step 6: Create Single Post Page

Create `app/(main)/[slug]/page.tsx`:

```typescript
import { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getSession, canAccessPremium } from "@/lib/auth"
import { formatDate } from "@/lib/utils"
import { PostContent } from "@/components/posts/post-content"
import { PostHeader } from "@/components/posts/post-header"
import { PostFooter } from "@/components/posts/post-footer"
import { AuthorCard } from "@/components/posts/author-card"
import { RelatedPosts } from "@/components/posts/related-posts"
import { PaywallOverlay } from "@/components/subscription/paywall-overlay"
import { CommentsSection } from "@/components/comments/comments-section"

interface PostPageProps {
  params: { slug: string }
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
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
  const post = await prisma.post.findUnique({
    where: {
      slug: params.slug,
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

  // Track view
  await prisma.postView.create({
    data: {
      postId: post.id,
      userId: session?.user?.id,
    },
  }).catch(() => {}) // Ignore errors

  // Check if user liked/bookmarked
  let isLiked = false
  let isBookmarked = false

  if (session?.user?.id) {
    const [like, bookmark] = await Promise.all([
      prisma.like.findUnique({
        where: { userId_postId: { userId: session.user.id, postId: post.id } },
      }),
      prisma.bookmark.findUnique({
        where: { userId_postId: { userId: session.user.id, postId: post.id } },
      }),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  // Fetch related posts
  const relatedPosts = await prisma.post.findMany({
    where: {
      id: { not: post.id },
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [
        { categories: { some: { id: { in: post.categories.map((c) => c.id) } } } },
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
      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative w-full h-[50vh] min-h-[400px] max-h-[600px]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <div className="container max-w-3xl">
        {/* Header */}
        <PostHeader
          post={post}
          className={post.coverImage ? "-mt-32 relative z-10" : "mt-8"}
        />

        {/* Content */}
        <div className="mt-8 relative">
          {post.isPremium && !hasAccess ? (
            <PaywallOverlay
              previewContent={post.contentHtml.slice(0, 1000)}
            />
          ) : (
            <PostContent content={post.content} />
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
        <div className="mt-12 pt-8 border-t">
          <AuthorCard author={post.author} />
        </div>

        {/* Comments */}
        {hasAccess && (
          <div className="mt-12 pt-8 border-t">
            <CommentsSection
              postId={post.id}
              commentsCount={post._count.comments}
            />
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold font-serif mb-8">
              Related Articles
            </h2>
            <RelatedPosts posts={relatedPosts} />
          </div>
        )}
      </div>
    </article>
  )
}
```

---

## Step 7: Create Post Header Component

Create `components/posts/post-header.tsx`:

```typescript
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PostHeaderProps {
  post: {
    title: string
    subtitle?: string | null
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
  className?: string
}

export function PostHeader({ post, className }: PostHeaderProps) {
  return (
    <header className={cn("space-y-6", className)}>
      {/* Categories */}
      {post.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`}>
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80"
                style={
                  category.color
                    ? { backgroundColor: `${category.color}20`, color: category.color }
                    : undefined
                }
              >
                {category.name}
              </Badge>
            </Link>
          ))}
          {post.isPremium && (
            <Badge variant="default">Premium</Badge>
          )}
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight">
        {post.title}
      </h1>

      {/* Subtitle */}
      {post.subtitle && (
        <p className="text-xl md:text-2xl text-muted-foreground">
          {post.subtitle}
        </p>
      )}

      {/* Author & Meta */}
      <div className="flex items-center gap-4 pt-4">
        <Link href={`/author/${post.author.id}`}>
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.author.avatar || ""} />
            <AvatarFallback>
              {post.author.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link
            href={`/author/${post.author.id}`}
            className="font-medium hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {post.publishedAt && formatDate(post.publishedAt)}
            {post.readingTime && ` · ${post.readingTime} min read`}
          </p>
        </div>
      </div>
    </header>
  )
}
```

---

## Step 8: Create Post Footer Component

Create `components/posts/post-footer.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Heart,
  Bookmark,
  Share2,
  Twitter,
  Facebook,
  Link as LinkIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface PostFooterProps {
  postId: string
  slug: string
  likesCount: number
  isLiked: boolean
  isBookmarked: boolean
  isAuthenticated: boolean
}

export function PostFooter({
  postId,
  slug,
  likesCount,
  isLiked: initialIsLiked,
  isBookmarked: initialIsBookmarked,
  isAuthenticated,
}: PostFooterProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [likes, setLikes] = useState(likesCount)

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    try {
      const method = isLiked ? "DELETE" : "POST"
      await fetch(`/api/posts/${postId}/like`, { method })

      setIsLiked(!isLiked)
      setLikes((prev) => (isLiked ? prev - 1 : prev + 1))
    } catch {
      toast.error("Failed to like post")
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    try {
      const method = isBookmarked ? "DELETE" : "POST"
      await fetch(`/api/posts/${postId}/bookmark`, { method })

      setIsBookmarked(!isBookmarked)
      toast.success(isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks")
    } catch {
      toast.error("Failed to bookmark post")
    }
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link copied to clipboard")
  }

  return (
    <div className="flex items-center justify-between py-8 mt-8 border-t border-b">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn(isLiked && "text-red-500")}
        >
          <Heart className={cn("h-4 w-4 mr-2", isLiked && "fill-current")} />
          {likes}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBookmark}
          className={cn(isBookmarked && "text-primary")}
        >
          <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
                  "_blank"
                )
              }
            >
              <Twitter className="h-4 w-4 mr-2" />
              Share on Twitter
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                  "_blank"
                )
              }
            >
              <Facebook className="h-4 w-4 mr-2" />
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

---

## Step 9: Create Author Card

Create `components/posts/author-card.tsx`:

```typescript
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface AuthorCardProps {
  author: {
    id: string
    name: string
    avatar?: string | null
    bio?: string | null
  }
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <Link href={`/author/${author.id}`}>
        <Avatar className="h-16 w-16">
          <AvatarImage src={author.avatar || ""} />
          <AvatarFallback className="text-lg">
            {author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">Written by</p>
        <Link
          href={`/author/${author.id}`}
          className="text-xl font-bold hover:underline"
        >
          {author.name}
        </Link>
        {author.bio && (
          <p className="mt-2 text-muted-foreground">{author.bio}</p>
        )}
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/author/${author.id}`}>View Profile</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 10: Create Author Profile Page

Create `app/(main)/author/[id]/page.tsx`:

```typescript
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostGrid } from "@/components/posts/post-grid"

interface AuthorPageProps {
  params: { id: string }
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const author = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true },
  })

  return {
    title: author?.name || "Author",
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const author = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      _count: {
        select: { posts: { where: { status: "PUBLISHED" } } },
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
    <div className="container py-12">
      {/* Author Header */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <Avatar className="h-24 w-24 mx-auto mb-6">
          <AvatarImage src={author.avatar || ""} />
          <AvatarFallback className="text-2xl">
            {author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-3xl font-bold font-serif mb-2">{author.name}</h1>

        {author.bio && (
          <p className="text-lg text-muted-foreground mb-4">{author.bio}</p>
        )}

        <p className="text-muted-foreground">
          {author._count.posts} {author._count.posts === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* Posts */}
      <PostGrid posts={posts} />
    </div>
  )
}
```

---

## Step 11: Create Category Archive Page

Create `app/(main)/category/[slug]/page.tsx`:

```typescript
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PostGrid } from "@/components/posts/post-grid"
import { Badge } from "@/components/ui/badge"

interface CategoryPageProps {
  params: { slug: string }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  })

  return {
    title: category?.name || "Category",
    description: category?.description,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  })

  if (!category) {
    notFound()
  }

  const posts = await prisma.post.findMany({
    where: {
      categories: { some: { slug: params.slug } },
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
    <div className="container py-12">
      {/* Category Header */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <Badge
          variant="secondary"
          className="mb-4 text-lg px-4 py-2"
          style={
            category.color
              ? { backgroundColor: `${category.color}20`, color: category.color }
              : undefined
          }
        >
          {category.name}
        </Badge>

        {category.description && (
          <p className="text-lg text-muted-foreground">{category.description}</p>
        )}

        <p className="mt-4 text-muted-foreground">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* Posts */}
      <PostGrid posts={posts} />
    </div>
  )
}
```

---

## Step 12: Create Like/Bookmark API Routes

Create `app/api/posts/[id]/like/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.like.create({
      data: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Already liked" }, { status: 400 })
    }
    throw error
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.like.delete({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId: params.id,
      },
    },
  })

  return NextResponse.json({ success: true })
}
```

Create `app/api/posts/[id]/bookmark/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.bookmark.create({
      data: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Already bookmarked" }, { status: 400 })
    }
    throw error
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.bookmark.delete({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId: params.id,
      },
    },
  })

  return NextResponse.json({ success: true })
}
```

---

## Verification Checklist

- [ ] Homepage loads with featured and recent posts
- [ ] Post cards display correctly
- [ ] Single post page renders content
- [ ] Cover images display properly
- [ ] Author information shows
- [ ] Like button works
- [ ] Bookmark button works
- [ ] Share dropdown works
- [ ] Author profile page loads
- [ ] Category archive page loads
- [ ] Related posts show
- [ ] Premium badge shows on premium posts
- [ ] Header and footer render correctly
- [ ] Dark mode works throughout

---

## Files Created

```
app/(main)/
├── layout.tsx
├── page.tsx
├── [slug]/page.tsx
├── author/[id]/page.tsx
└── category/[slug]/page.tsx
app/api/posts/[id]/
├── like/route.ts
└── bookmark/route.ts
components/layout/
├── header.tsx
├── footer.tsx
└── user-nav.tsx
components/posts/
├── featured-post.tsx
├── post-card.tsx
├── post-grid.tsx
├── post-header.tsx
├── post-footer.tsx
├── post-content.tsx
├── author-card.tsx
└── related-posts.tsx
```
