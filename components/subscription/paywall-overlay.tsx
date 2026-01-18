"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lock, Star } from "lucide-react"

interface PaywallOverlayProps {
  previewContent?: string
}

export function PaywallOverlay({ previewContent }: PaywallOverlayProps) {
  return (
    <div className="relative">
      {/* Preview content with fade */}
      {previewContent && (
        <div className="relative">
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
          <div className="from-background absolute right-0 bottom-0 left-0 h-48 bg-gradient-to-t to-transparent" />
        </div>
      )}

      {/* Paywall overlay */}
      <div className="bg-background relative -mt-24 pt-24">
        <div className="rounded-xl border p-8 text-center md:p-12">
          <div className="bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full">
            <Lock className="text-primary h-8 w-8" />
          </div>

          <h2 className="mb-4 font-serif text-2xl font-bold md:text-3xl">
            This is a premium article
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-md text-lg">
            Subscribe to get access to this article and all premium content.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/subscribe">
                  <Star className="mr-2 h-5 w-5" />
                  Subscribe Now
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Already a subscriber? Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Benefits list */}
          <div className="mt-8 border-t pt-8">
            <h3 className="mb-4 font-semibold">
              What you get with a subscription:
            </h3>
            <ul className="text-muted-foreground mx-auto grid max-w-md gap-3 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Access to all premium articles
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Weekly newsletter
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Comment on articles
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Support independent writing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
