"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PricingCardsProps {
  monthlyPrice: number // In cents
  yearlyPrice: number // In cents
}

export function PricingCards({ monthlyPrice, yearlyPrice }: PricingCardsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null)

  const monthlyPriceFormatted = (monthlyPrice / 100).toFixed(2)
  const yearlyPriceFormatted = (yearlyPrice / 100).toFixed(2)
  const yearlyMonthly = (yearlyPrice / 12 / 100).toFixed(2)
  const savings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)

  const handleSubscribe = async (type: "monthly" | "yearly") => {
    if (!session) {
      router.push("/login?callbackUrl=/subscribe")
      return
    }

    setLoading(type)

    try {
      const priceId =
        type === "monthly"
          ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
          : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY

      if (!priceId) {
        throw new Error("Price ID not configured")
      }

      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      )
    } finally {
      setLoading(null)
    }
  }

  const features = [
    "Unlimited premium articles",
    "Exclusive newsletter",
    "Early access to new content",
    "Comment on all posts",
    "Support independent writers",
    "Ad-free experience",
  ]

  return (
    <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
      {/* Monthly Plan */}
      <Card className="relative">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Monthly</CardTitle>
          <p className="text-muted-foreground text-sm">
            Flexible month-to-month billing
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <span className="text-4xl font-bold">${monthlyPriceFormatted}</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleSubscribe("monthly")}
            disabled={loading !== null}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {loading === "monthly" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Subscribe Monthly
          </Button>
        </CardContent>
      </Card>

      {/* Yearly Plan */}
      <Card
        className={cn(
          "border-primary relative",
          "ring-primary/20 shadow-lg ring-2"
        )}
      >
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Save {savings}%
        </Badge>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Yearly</CardTitle>
          <p className="text-muted-foreground text-sm">
            Best value with annual billing
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <span className="text-4xl font-bold">${yearlyPriceFormatted}</span>
            <span className="text-muted-foreground">/year</span>
            <p className="text-muted-foreground mt-1 text-sm">
              ${yearlyMonthly}/month, billed annually
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleSubscribe("yearly")}
            disabled={loading !== null}
            className="w-full"
            size="lg"
          >
            {loading === "yearly" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Subscribe Yearly
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
