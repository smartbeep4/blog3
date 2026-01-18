# 08 - Subscription & Paywall

## Overview

You are responsible for implementing the complete subscription system using Stripe, including the paywall for premium content, subscription management, and the Stripe customer portal.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Stripe account set up with test mode

---

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from Dashboard > Developers > API keys
3. Create two Products/Prices:
   - Monthly subscription (e.g., $5/month)
   - Yearly subscription (e.g., $50/year)
4. Set up webhook endpoint

---

## Step 1: Install Stripe Packages

```bash
npm install stripe @stripe/stripe-js
```

---

## Step 2: Create Stripe Client

Create `lib/stripe.ts`:

```typescript
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
})

export const getStripeJs = async () => {
  const { loadStripe } = await import("@stripe/stripe-js")
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}
```

---

## Step 3: Create Checkout API

Create `app/api/subscriptions/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

const checkoutSchema = z.object({
  priceId: z.string(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { priceId } = checkoutSchema.parse(body)

    // Get or create Stripe customer
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    let customerId = subscription?.stripeCustomerId

    if (!customerId) {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      })

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user!.email,
        name: user!.name,
        metadata: {
          userId: session.user.id,
        },
      })

      customerId = customer.id

      // Save customer ID
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Check if user already has active subscription
    if (subscription?.stripeSubscriptionId) {
      // Redirect to portal instead
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: absoluteUrl("/settings"),
      })

      return NextResponse.json({ url: portalSession.url })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: absoluteUrl("/subscribe/success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: absoluteUrl("/subscribe"),
      metadata: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: Create Stripe Webhook

Create `app/api/subscriptions/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          await prisma.subscription.update({
            where: { stripeCustomerId: session.customer as string },
            data: {
              tier: "PAID",
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ),
            },
          })
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(
                subscription.current_period_end * 1000
              ),
            },
          })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        // Could send email notification here
        console.log(
          "Payment failed for customer:",
          invoice.customer
        )
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
```

---

## Step 5: Create Portal API

Create `app/api/subscriptions/portal/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 400 }
    )
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: absoluteUrl("/settings"),
  })

  return NextResponse.json({ url: portalSession.url })
}
```

---

## Step 6: Create Subscription Status API

Create `app/api/subscriptions/status/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  if (!subscription) {
    return NextResponse.json({
      tier: "FREE",
      isActive: false,
    })
  }

  const isActive =
    subscription.tier === "PAID" &&
    subscription.stripeCurrentPeriodEnd &&
    subscription.stripeCurrentPeriodEnd > new Date()

  return NextResponse.json({
    tier: subscription.tier,
    isActive,
    expiresAt: subscription.stripeCurrentPeriodEnd,
  })
}
```

---

## Step 7: Create Subscribe Page

Create `app/(main)/subscribe/page.tsx`:

```typescript
import { Metadata } from "next"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PricingCards } from "@/components/subscription/pricing-cards"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Get access to premium content",
}

export default async function SubscribePage() {
  const session = await getSession()

  // Check if already subscribed
  if (session?.user?.id) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (
      subscription?.tier === "PAID" &&
      subscription.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd > new Date()
    ) {
      redirect("/dashboard")
    }
  }

  // Get pricing from settings
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  })

  return (
    <div className="container max-w-4xl py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-serif mb-4">
          Unlock Premium Content
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get unlimited access to all premium articles, exclusive newsletters,
          and support independent journalism.
        </p>
      </div>

      <PricingCards
        monthlyPrice={settings?.monthlyPrice || 500}
        yearlyPrice={settings?.yearlyPrice || 5000}
      />

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold font-serif mb-8">
          What you get with a subscription
        </h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-lg bg-muted/50">
            <h3 className="font-bold mb-2">Premium Articles</h3>
            <p className="text-muted-foreground text-sm">
              Access to all in-depth articles and exclusive content from our authors.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-muted/50">
            <h3 className="font-bold mb-2">Weekly Newsletter</h3>
            <p className="text-muted-foreground text-sm">
              Exclusive newsletter with curated content and early access to new articles.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-muted/50">
            <h3 className="font-bold mb-2">Support Writers</h3>
            <p className="text-muted-foreground text-sm">
              Your subscription directly supports our writers and helps keep journalism independent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 8: Create Pricing Cards Component

Create `components/subscription/pricing-cards.tsx`:

```typescript
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

      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
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
    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      {/* Monthly */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <span className="text-4xl font-bold">${monthlyPriceFormatted}</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleSubscribe("monthly")}
            disabled={loading !== null}
            className="w-full"
            variant="outline"
          >
            {loading === "monthly" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Subscribe Monthly
          </Button>
        </CardContent>
      </Card>

      {/* Yearly */}
      <Card className="border-primary relative">
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Save {savings}%
        </Badge>
        <CardHeader>
          <CardTitle>Yearly</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <span className="text-4xl font-bold">${yearlyPriceFormatted}</span>
            <span className="text-muted-foreground">/year</span>
            <p className="text-sm text-muted-foreground mt-1">
              ${yearlyMonthly}/month, billed annually
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleSubscribe("yearly")}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === "yearly" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Subscribe Yearly
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Step 9: Create Paywall Overlay

Create `components/subscription/paywall-overlay.tsx`:

```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

interface PaywallOverlayProps {
  previewContent?: string
}

export function PaywallOverlay({ previewContent }: PaywallOverlayProps) {
  return (
    <div className="relative">
      {/* Preview content (blurred) */}
      {previewContent && (
        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      )}

      {/* Overlay */}
      <div className="relative mt-8">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent -top-32" />

        <div className="relative bg-muted/50 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <h3 className="text-2xl font-bold font-serif mb-2">
            This is a premium article
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Subscribe to get unlimited access to all premium content and support
            independent writers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/subscribe">Subscribe Now</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Already subscribed? Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 10: Create Subscribe CTA Component

Create `components/subscription/subscribe-cta.tsx`:

```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SubscribeCTA() {
  return (
    <div className="bg-primary text-primary-foreground rounded-xl p-8 md:p-12 text-center">
      <h2 className="text-3xl font-bold font-serif mb-4">
        Stay ahead of the curve
      </h2>
      <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
        Subscribe to get unlimited access to premium articles, exclusive
        newsletters, and support independent writers.
      </p>
      <Button
        size="lg"
        variant="secondary"
        asChild
      >
        <Link href="/subscribe">Get Started</Link>
      </Button>
    </div>
  )
}
```

---

## Step 11: Create Success Page

Create `app/(main)/subscribe/success/page.tsx`:

```typescript
import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Subscription Successful",
}

export default function SubscriptionSuccessPage() {
  return (
    <div className="container max-w-lg py-24 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>

      <h1 className="text-3xl font-bold font-serif mb-4">
        Welcome aboard!
      </h1>

      <p className="text-lg text-muted-foreground mb-8">
        Your subscription is now active. You have unlimited access to all
        premium content.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link href="/">Start Reading</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings">Manage Subscription</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 12: Create Subscription Hook

Create `hooks/use-subscription.ts`:

```typescript
"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

interface SubscriptionStatus {
  tier: "FREE" | "PAID"
  isActive: boolean
  expiresAt: string | null
}

export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/status")
      if (!res.ok) throw new Error("Failed to fetch subscription")
      return res.json()
    },
  })
}

export function useManageSubscription() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscriptions/portal", {
        method: "POST",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to open billing portal")
      }
      return res.json()
    },
    onSuccess: ({ url }) => {
      if (url) {
        window.location.href = url
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
```

---

## Step 13: Add Environment Variables

Add to `.env.example`:

```env
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_YEARLY="price_..."
```

---

## Step 14: Configure Webhook in Stripe

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Local Webhook Testing

For local development, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/subscriptions/webhook

# This will give you a webhook signing secret for local testing
```

---

## Verification Checklist

- [ ] Stripe API keys configured
- [ ] Products and prices created in Stripe
- [ ] POST /api/subscriptions/checkout creates checkout session
- [ ] Webhook handles checkout.session.completed
- [ ] Webhook handles subscription updates
- [ ] Webhook handles cancellation
- [ ] Subscribe page shows pricing
- [ ] Checkout flow works in test mode
- [ ] Customer portal accessible for subscribers
- [ ] Paywall shows on premium posts
- [ ] Subscription status API works
- [ ] Success page shows after checkout

---

## Files Created

```
lib/
└── stripe.ts
app/api/subscriptions/
├── checkout/route.ts
├── webhook/route.ts
├── portal/route.ts
└── status/route.ts
app/(main)/subscribe/
├── page.tsx
└── success/page.tsx
components/subscription/
├── pricing-cards.tsx
├── paywall-overlay.tsx
└── subscribe-cta.tsx
hooks/
└── use-subscription.ts
```
