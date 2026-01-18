"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
})

type SubscribeFormData = z.infer<typeof subscribeSchema>

interface SubscribeFormProps {
  className?: string
  variant?: "default" | "compact" | "inline"
  placeholder?: string
  buttonText?: string
}

export function SubscribeForm({
  className,
  variant = "default",
  placeholder = "Enter your email",
  buttonText = "Subscribe",
}: SubscribeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeSchema),
  })

  const onSubmit = async (data: SubscribeFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to subscribe")
      }

      setIsSuccess(true)
      reset()
      toast.success(result.message)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to subscribe"
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-green-600 dark:text-green-400",
          className
        )}
      >
        <CheckCircle className="h-5 w-5" />
        <span>Check your email to confirm!</span>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn("flex gap-2", className)}
      >
        <Input
          {...register("email")}
          placeholder={placeholder}
          type="email"
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} size="sm">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </form>
    )
  }

  if (variant === "inline") {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-2 sm:flex-row", className)}
      >
        <div className="relative flex-1">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            {...register("email")}
            placeholder={placeholder}
            type="email"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        )}
      </form>
    )
  }

  // Default variant
  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            {...register("email")}
            placeholder={placeholder}
            type="email"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </div>
      {errors.email && (
        <p className="text-destructive mt-1 text-sm">{errors.email.message}</p>
      )}
    </form>
  )
}
