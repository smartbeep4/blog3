import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(absoluteUrl("/?error=invalid-token"))
  }

  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    })

    if (!subscriber) {
      // Token not found - might be already unsubscribed
      return NextResponse.redirect(absoluteUrl("/?unsubscribed=true"))
    }

    // Delete the subscription
    await prisma.newsletterSubscriber.delete({
      where: { id: subscriber.id },
    })

    return NextResponse.redirect(absoluteUrl("/?unsubscribed=true"))
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error)
    return NextResponse.redirect(absoluteUrl("/?error=unsubscribe-failed"))
  }
}

// Also support POST for programmatic unsubscribe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email } = body

    let subscriber

    if (token) {
      subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token },
      })
    } else if (email) {
      subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { email: email.toLowerCase() },
      })
    }

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    await prisma.newsletterSubscriber.delete({
      where: { id: subscriber.id },
    })

    return NextResponse.json({
      message: "Successfully unsubscribed",
      success: true,
    })
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}
