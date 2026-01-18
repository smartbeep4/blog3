import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

// Disable body parsing, we need the raw body for webhook verification
export const runtime = "nodejs"

// Helper to extract current period end from subscription
// In Stripe SDK v20+, this is on the subscription items
function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date {
  const item = subscription.items.data[0]
  // Use the item's current_period_end (in seconds)
  return new Date(item.current_period_end * 1000)
}

// Helper to get subscription ID from invoice
// In Stripe SDK v20+, subscription is under parent.subscription_details
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subscriptionDetails = invoice.parent?.subscription_details
  if (subscriptionDetails?.subscription) {
    return typeof subscriptionDetails.subscription === "string"
      ? subscriptionDetails.subscription
      : subscriptionDetails.subscription.id
  }
  return null
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    )
  }

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    console.error("Missing stripe-signature header")
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Webhook signature verification failed:", message)
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

          // Find subscription by customer ID or create/update
          const existingSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: session.customer as string },
          })

          const subscriptionData = {
            tier: "PAID" as const,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: getCurrentPeriodEnd(subscription),
          }

          if (existingSubscription) {
            await prisma.subscription.update({
              where: { id: existingSubscription.id },
              data: subscriptionData,
            })
          } else if (session.metadata?.userId) {
            // Create or update by userId from metadata
            await prisma.subscription.upsert({
              where: { userId: session.metadata.userId },
              create: {
                userId: session.metadata.userId,
                stripeCustomerId: session.customer as string,
                ...subscriptionData,
              },
              update: {
                stripeCustomerId: session.customer as string,
                ...subscriptionData,
              },
            })
          }
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getSubscriptionIdFromInvoice(invoice)

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId)

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: getCurrentPeriodEnd(subscription),
            },
          })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        console.log(
          "Payment failed for customer:",
          invoice.customer,
          "Invoice:",
          invoice.id
        )

        // Optionally send notification email to user
        // This would require looking up the user and sending an email
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const tier =
          subscription.status === "active" || subscription.status === "trialing"
            ? "PAID"
            : "FREE"

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: getCurrentPeriodEnd(subscription),
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

      default:
        console.log(`Unhandled event type: ${event.type}`)
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
