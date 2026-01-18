import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
})

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      )
    }

    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { priceId } = checkoutSchema.parse(body)

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    // Create subscription record if it doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          tier: "FREE",
        },
      })
    }

    let customerId = subscription.stripeCustomerId

    // Create Stripe customer if not exists
    if (!customerId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
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

    // Check if user already has an active subscription
    if (subscription.stripeSubscriptionId) {
      // Check if the subscription is still active
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      )

      if (
        stripeSubscription.status === "active" ||
        stripeSubscription.status === "trialing"
      ) {
        // Redirect to customer portal instead
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: absoluteUrl("/dashboard/settings"),
        })

        return NextResponse.json({ url: portalSession.url })
      }
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
      success_url: absoluteUrl(
        "/subscribe/success?session_id={CHECKOUT_SESSION_ID}"
      ),
      cancel_url: absoluteUrl("/subscribe"),
      metadata: {
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
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
