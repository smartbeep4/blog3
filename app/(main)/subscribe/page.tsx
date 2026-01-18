import { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PricingCards } from "@/components/subscription/pricing-cards"
import { Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Get access to premium content with a subscription",
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>
}) {
  const params = await searchParams
  const session = await auth()

  // Check if user is already subscribed
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

  const features = [
    "Unlimited access to all premium articles",
    "Exclusive weekly newsletter",
    "Early access to new content",
    "Comment on all posts",
    "Support independent writers",
    "Ad-free reading experience",
  ]

  return (
    <div className="container max-w-5xl py-16">
      {/* Newsletter verification message */}
      {params.verified === "true" && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          <Check className="mr-2 inline-block h-5 w-5" />
          Your email has been verified! You are now subscribed to our
          newsletter.
        </div>
      )}

      {params.error === "invalid-token" && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          Invalid or expired verification link. Please try subscribing again.
        </div>
      )}

      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
          Unlock Premium Content
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
          Get unlimited access to all premium articles, exclusive newsletters,
          and support independent journalism.
        </p>
      </div>

      {/* Pricing Cards */}
      <PricingCards
        monthlyPrice={settings?.monthlyPrice || 500}
        yearlyPrice={settings?.yearlyPrice || 5000}
      />

      {/* Features Section */}
      <div className="mt-16 text-center">
        <h2 className="mb-8 font-serif text-2xl font-bold">
          What you get with a subscription
        </h2>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-lg p-4 text-left"
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="mb-8 text-center font-serif text-2xl font-bold">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Can I cancel anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes! You can cancel your subscription at any time. You will
              continue to have access until the end of your billing period.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">
              What payment methods do you accept?
            </h3>
            <p className="text-muted-foreground text-sm">
              We accept all major credit cards including Visa, Mastercard,
              American Express, and Discover through our secure payment partner
              Stripe.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 font-semibold">Is there a free trial?</h3>
            <p className="text-muted-foreground text-sm">
              We offer free articles that you can read without a subscription.
              Subscribe to unlock our premium content and support our writers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
