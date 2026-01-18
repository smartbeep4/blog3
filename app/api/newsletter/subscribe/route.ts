import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
import { sendEmail, getVerifyEmailHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = subscribeSchema.parse(body)

    const normalizedEmail = email.toLowerCase().trim()

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      if (existing.isVerified) {
        return NextResponse.json({
          message: "You're already subscribed!",
          alreadySubscribed: true,
        })
      }

      // Resend verification email
      const verifyToken = nanoid(32)
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { verifyToken },
      })

      const verifyUrl = absoluteUrl(
        `/api/newsletter/verify?token=${verifyToken}`
      )

      await sendEmail({
        to: normalizedEmail,
        subject: "Confirm your subscription",
        html: getVerifyEmailHtml(name || "", verifyUrl),
      })

      return NextResponse.json({
        message: "Verification email sent! Please check your inbox.",
        verificationSent: true,
      })
    }

    // Create new subscriber
    const verifyToken = nanoid(32)
    const unsubscribeToken = nanoid(32)

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        verifyToken,
        unsubscribeToken,
      },
    })

    // Send verification email
    const verifyUrl = absoluteUrl(`/api/newsletter/verify?token=${verifyToken}`)

    await sendEmail({
      to: normalizedEmail,
      subject: "Confirm your subscription",
      html: getVerifyEmailHtml(name || "", verifyUrl),
    })

    return NextResponse.json({
      message: "Thanks for subscribing! Please check your email to confirm.",
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Newsletter subscribe error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again later." },
      { status: 500 }
    )
  }
}
