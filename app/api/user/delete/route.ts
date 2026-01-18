import { NextResponse } from "next/server"
import { z } from "zod"
import { compare } from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmation: z.literal("DELETE MY ACCOUNT"),
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = deleteAccountSchema.parse(body)

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user has a password, verify it
    if (user.passwordHash && validatedData.password) {
      const isValidPassword = await compare(
        validatedData.password,
        user.passwordHash
      )

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Password is incorrect" },
          { status: 400 }
        )
      }
    } else if (user.passwordHash && !validatedData.password) {
      return NextResponse.json(
        { error: "Password is required to delete account" },
        { status: 400 }
      )
    }

    // If user has an active subscription, cancel it first
    if (user.subscription?.stripeSubscriptionId) {
      try {
        const stripe = await import("stripe").then(
          (m) => new m.default(process.env.STRIPE_SECRET_KEY!)
        )
        await stripe.subscriptions.cancel(
          user.subscription.stripeSubscriptionId
        )
      } catch (stripeError) {
        console.error("Error canceling Stripe subscription:", stripeError)
        // Continue with deletion even if Stripe fails
      }
    }

    // Delete user (cascades to related records due to schema configuration)
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
