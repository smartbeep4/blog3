import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion, Home, Search, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* 404 Illustration */}
        <div className="bg-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <FileQuestion className="text-muted-foreground h-10 w-10" />
        </div>

        {/* Error Code */}
        <h1 className="text-primary mb-4 text-7xl font-bold">404</h1>

        {/* Error Message */}
        <h2 className="mb-2 text-2xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we could not find the page you are looking for. It might have
          been moved, deleted, or never existed.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/search">
              <Search className="h-4 w-4" />
              Search
            </Link>
          </Button>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="javascript:history.back()"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to previous page
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 border-t pt-8">
          <p className="text-muted-foreground mb-4 text-sm">
            Here are some helpful links:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/" className="text-primary hover:underline">
              Home
            </Link>
            <Link href="/search" className="text-primary hover:underline">
              Search
            </Link>
            <Link href="/subscribe" className="text-primary hover:underline">
              Subscribe
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
