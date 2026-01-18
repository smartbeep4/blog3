import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

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
        isPaid: false,
        expiresAt: null,
      })
    }

    const isActive =
      subscription.tier === "PAID" &&
      subscription.stripeCurrentPeriodEnd !== null &&
      subscription.stripeCurrentPeriodEnd > new Date()

    return NextResponse.json({
      tier: subscription.tier,
      isActive,
      isPaid: subscription.tier === "PAID",
      expiresAt: subscription.stripeCurrentPeriodEnd?.toISOString() || null,
      hasStripeCustomer: !!subscription.stripeCustomerId,
    })
  } catch (error) {
    console.error("Subscription status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    )
  }
}
