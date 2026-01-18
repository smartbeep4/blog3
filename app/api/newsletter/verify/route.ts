import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(absoluteUrl("/subscribe?error=invalid-token"))
  }

  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { verifyToken: token },
    })

    if (!subscriber) {
      return NextResponse.redirect(
        absoluteUrl("/subscribe?error=invalid-token")
      )
    }

    // Already verified
    if (subscriber.isVerified) {
      return NextResponse.redirect(absoluteUrl("/subscribe?verified=true"))
    }

    // Verify the subscription
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isVerified: true,
        verifyToken: null,
      },
    })

    return NextResponse.redirect(absoluteUrl("/subscribe?verified=true"))
  } catch (error) {
    console.error("Newsletter verify error:", error)
    return NextResponse.redirect(
      absoluteUrl("/subscribe?error=verification-failed")
    )
  }
}
