# 12 - Search

## Overview

You are responsible for implementing the full-text search functionality using PostgreSQL's built-in search capabilities.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Post management implemented (Agent 05)
- Reader experience implemented (Agent 06)

---

## PostgreSQL Full-Text Search

We'll use PostgreSQL's `tsvector` and `tsquery` for efficient full-text search without external services.

---

## Step 1: Add Search Vector to Schema

Update `prisma/schema.prisma` to add a search vector column (handled via raw SQL):

```prisma
model Post {
  // ... existing fields ...

  // Note: searchVector is managed via SQL trigger
  // See migration for setup
}
```

---

## Step 2: Create Search Migration

Create a SQL migration for search vector:

```sql
-- prisma/migrations/add_search_vector.sql

-- Add search vector column
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for fast search
CREATE INDEX IF NOT EXISTS post_search_idx ON "Post" USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS post_search_update ON "Post";
CREATE TRIGGER post_search_update
  BEFORE INSERT OR UPDATE OF title, subtitle, excerpt
  ON "Post"
  FOR EACH ROW
  EXECUTE FUNCTION update_post_search_vector();

-- Update existing posts
UPDATE "Post" SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'C');
```

Run this migration:

```bash
npx prisma db execute --file prisma/migrations/add_search_vector.sql
```

---

## Step 3: Create Search API

Create `app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const category = searchParams.get("category")
  const tag = searchParams.get("tag")

  if (!query || query.length < 2) {
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    })
  }

  // Sanitize query for tsquery
  const sanitizedQuery = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word}:*`)
    .join(" & ")

  try {
    // Use raw query for full-text search
    const posts = await prisma.$queryRaw<any[]>`
      SELECT
        p.id,
        p.slug,
        p.title,
        p.subtitle,
        p.excerpt,
        p."coverImage",
        p."publishedAt",
        p."readingTime",
        p."isPremium",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar
        ) as author,
        ts_rank(p.search_vector, to_tsquery('english', ${sanitizedQuery})) as rank
      FROM "Post" p
      JOIN "User" u ON p."authorId" = u.id
      WHERE p.status = 'PUBLISHED'
        AND p."publishedAt" <= NOW()
        AND p.search_vector @@ to_tsquery('english', ${sanitizedQuery})
      ORDER BY rank DESC, p."publishedAt" DESC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Post" p
      WHERE p.status = 'PUBLISHED'
        AND p."publishedAt" <= NOW()
        AND p.search_vector @@ to_tsquery('english', ${sanitizedQuery})
    `

    const total = Number(countResult[0].count)

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Search error:", error)

    // Fallback to simple ILIKE search if tsquery fails
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { subtitle: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.post.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { subtitle: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
        ],
      },
    })

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  }
}
```

---

## Step 4: Create Search Suggestions API

Create `app/api/search/suggestions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  // Get matching post titles
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      title: { contains: query, mode: "insensitive" },
    },
    select: {
      title: true,
      slug: true,
    },
    take: 5,
    orderBy: { publishedAt: "desc" },
  })

  // Get matching tags
  const tags = await prisma.tag.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    select: {
      name: true,
      slug: true,
    },
    take: 3,
  })

  // Get matching categories
  const categories = await prisma.category.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    select: {
      name: true,
      slug: true,
    },
    take: 3,
  })

  return NextResponse.json({
    posts: posts.map((p) => ({ type: "post", ...p })),
    tags: tags.map((t) => ({ type: "tag", ...t })),
    categories: categories.map((c) => ({ type: "category", ...c })),
  })
}
```

---

## Step 5: Create Search Page

Create `app/(main)/search/page.tsx`:

```typescript
import { Suspense } from "react"
import { SearchForm } from "@/components/search/search-form"
import { SearchResults } from "@/components/search/search-results"
import { Skeleton } from "@/components/ui/skeleton"

interface SearchPageProps {
  searchParams: { q?: string; page?: string }
}

export const metadata = {
  title: "Search",
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ""
  const page = parseInt(searchParams.page || "1")

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-bold font-serif text-center mb-8">
          Search
        </h1>
        <SearchForm initialQuery={query} />
      </div>

      {query && (
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} page={page} />
        </Suspense>
      )}
    </div>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-48 h-32 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Step 6: Create Search Form Component

Create `components/search/search-form.tsx`:

```typescript
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search, X, Loader2 } from "lucide-react"
import Link from "next/link"

interface SearchFormProps {
  initialQuery?: string
}

interface Suggestion {
  type: "post" | "tag" | "category"
  name?: string
  title?: string
  slug: string
}

export function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<{
    posts: Suggestion[]
    tags: Suggestion[]
    categories: Suggestion[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setSuggestions(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query)}`
        )
        if (res.ok) {
          setSuggestions(await res.json())
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleClear = () => {
    setQuery("")
    setSuggestions(null)
    inputRef.current?.focus()
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasSuggestions =
    suggestions &&
    (suggestions.posts.length > 0 ||
      suggestions.tags.length > 0 ||
      suggestions.categories.length > 0)

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search articles, tags, categories..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          className="pl-12 pr-12 h-14 text-lg"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-lg overflow-hidden">
          {suggestions.posts.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Articles
              </p>
              {suggestions.posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/${post.slug}`}
                  className="block px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setShowSuggestions(false)}
                >
                  {post.title}
                </Link>
              ))}
            </div>
          )}

          {suggestions.tags.length > 0 && (
            <div className="p-2 border-t">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Tags
              </p>
              {suggestions.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="block px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setShowSuggestions(false)}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {suggestions.categories.length > 0 && (
            <div className="p-2 border-t">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Categories
              </p>
              {suggestions.categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="block px-3 py-2 hover:bg-muted rounded-md"
                  onClick={() => setShowSuggestions(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
```

---

## Step 7: Create Search Results Component

Create `components/search/search-results.tsx`:

```typescript
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

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { subtitle: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
      ],
    },
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
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { subtitle: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
      ],
    },
  })

  const totalPages = Math.ceil(total / limit)

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No results found for "{query}"
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
        Found {total} {total === 1 ? "result" : "results"} for "{query}"
      </p>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/${post.slug}`}
            className="flex gap-6 group"
          >
            {/* Thumbnail */}
            <div className="relative w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="192px"
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <span className="text-2xl font-serif text-muted-foreground">
                    {post.title[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              {post.categories.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {post.categories[0].name}
                </Badge>
              )}

              <h2 className="text-xl font-bold font-serif group-hover:text-primary transition-colors">
                {post.title}
              </h2>

              {post.excerpt && (
                <p className="text-muted-foreground line-clamp-2">
                  {post.excerpt}
                </p>
              )}

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author.avatar || ""} />
                  <AvatarFallback>
                    {post.author.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{post.author.name}</span>
                <span>·</span>
                <span>{formatDate(post.publishedAt!)}</span>
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
              <Link href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Verification Checklist

- [ ] Search migration runs successfully
- [ ] GET /api/search returns results
- [ ] GET /api/search/suggestions works
- [ ] Search page loads
- [ ] Search form with autocomplete works
- [ ] Results display correctly
- [ ] Pagination works
- [ ] Empty state shows for no results
- [ ] Full-text search ranking works

---

## Files Created

```
prisma/migrations/
└── add_search_vector.sql
app/api/search/
├── route.ts
└── suggestions/route.ts
app/(main)/search/page.tsx
components/search/
├── search-form.tsx
└── search-results.tsx
```
