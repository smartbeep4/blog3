"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Mail, Check } from "lucide-react"

interface SubscribeCTAProps {
  variant?: "default" | "compact" | "centered"
}

export function SubscribeCTA({ variant = "default" }: SubscribeCTAProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to subscribe")
      }

      setIsSubscribed(true)
      setEmail("")
      toast.success(
        "Thanks for subscribing! Please check your email to confirm."
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to subscribe"
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={isLoading || !email}>
          {isLoading ? "..." : "Subscribe"}
        </Button>
      </div>
    )
  }

  if (variant === "centered") {
    return (
      <div className="px-4 py-12 text-center">
        <Mail className="text-primary mx-auto mb-4 h-12 w-12" />
        <h2 className="mb-2 font-serif text-2xl font-bold">
          Subscribe to our newsletter
        </h2>
        <p className="text-muted-foreground mx-auto mb-6 max-w-md">
          Get the latest articles delivered to your inbox. No spam, unsubscribe
          anytime.
        </p>

        {isSubscribed ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span>Check your email to confirm!</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className="bg-muted/30 rounded-xl border p-8 md:p-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full">
          <Mail className="text-primary h-8 w-8" />
        </div>

        <h2 className="mb-4 font-serif text-3xl font-bold">
          Never miss a story
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Subscribe to get notified when we publish new articles. Join our
          community of readers.
        </p>

        {isSubscribed ? (
          <div className="flex items-center justify-center gap-2 text-lg text-green-600">
            <Check className="h-6 w-6" />
            <span>
              Thank you! Check your email to confirm your subscription.
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-lg flex-col gap-4 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 flex-1"
            />
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
