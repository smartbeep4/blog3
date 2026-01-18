"use client"

import { SubscribeForm } from "./subscribe-form"
import { cn } from "@/lib/utils"
import { Mail } from "lucide-react"

interface InlineSubscribeProps {
  className?: string
  title?: string
  description?: string
  variant?: "default" | "minimal" | "card"
}

export function InlineSubscribe({
  className,
  title = "Subscribe to our newsletter",
  description = "Get the latest articles delivered straight to your inbox.",
  variant = "default",
}: InlineSubscribeProps) {
  if (variant === "minimal") {
    return (
      <div className={cn("my-8", className)}>
        <SubscribeForm variant="inline" />
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "from-primary/5 to-primary/10 my-8 rounded-xl border bg-gradient-to-br p-8",
          className
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Mail className="text-primary h-6 w-6" />
          </div>
          <h3 className="mb-2 font-serif text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            {description}
          </p>
          <SubscribeForm variant="inline" className="w-full max-w-md" />
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("bg-muted/50 my-8 rounded-lg border p-6", className)}>
      <h3 className="mb-2 font-bold">{title}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>
      <SubscribeForm variant="inline" />
    </div>
  )
}
