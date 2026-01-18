"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Search, X, Loader2, FileText, Hash, FolderOpen } from "lucide-react"

interface SearchFormProps {
  initialQuery?: string
  autoFocus?: boolean
}

interface Suggestion {
  type: "post" | "tag" | "category"
  name?: string
  title?: string
  slug: string
}

interface SuggestionsResponse {
  posts: Suggestion[]
  tags: Suggestion[]
  categories: Suggestion[]
}

export function SearchForm({
  initialQuery = "",
  autoFocus = false,
}: SearchFormProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

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
          const data = await res.json()
          setSuggestions(data)
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
        <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
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
          className="h-14 pr-12 pl-12 text-lg"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2"
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
        <div className="bg-background absolute z-50 mt-2 w-full overflow-hidden rounded-lg border shadow-lg">
          {suggestions.posts.length > 0 && (
            <div className="p-2">
              <p className="text-muted-foreground px-3 py-1 text-xs font-medium tracking-wider uppercase">
                Articles
              </p>
              {suggestions.posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/${post.slug}`}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                  onClick={() => setShowSuggestions(false)}
                >
                  <FileText className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{post.title}</span>
                </Link>
              ))}
            </div>
          )}

          {suggestions.tags.length > 0 && (
            <div className="border-t p-2">
              <p className="text-muted-foreground px-3 py-1 text-xs font-medium tracking-wider uppercase">
                Tags
              </p>
              {suggestions.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                  onClick={() => setShowSuggestions(false)}
                >
                  <Hash className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <span>#{tag.name}</span>
                </Link>
              ))}
            </div>
          )}

          {suggestions.categories.length > 0 && (
            <div className="border-t p-2">
              <p className="text-muted-foreground px-3 py-1 text-xs font-medium tracking-wider uppercase">
                Categories
              </p>
              {suggestions.categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                  onClick={() => setShowSuggestions(false)}
                >
                  <FolderOpen className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
