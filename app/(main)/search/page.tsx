import { Suspense } from "react"
import { Metadata } from "next"
import { Container } from "@/components/layout/container"
import { SearchForm } from "@/components/search/search-form"
import { SearchResults } from "@/components/search/search-results"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export const metadata: Metadata = {
  title: "Search",
  description: "Search for articles, tags, and categories",
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ""
  const page = parseInt(params.page || "1")

  return (
    <Container className="py-8">
      <div className="mx-auto mb-12 max-w-2xl">
        <h1 className="mb-8 text-center font-serif text-3xl font-bold">
          Search
        </h1>
        <SearchForm initialQuery={query} autoFocus={!query} />
      </div>

      {query && (
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults query={query} page={page} />
        </Suspense>
      )}

      {!query && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            Enter a search term to find articles
          </p>
        </div>
      )}
    </Container>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="h-32 w-48 flex-shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
