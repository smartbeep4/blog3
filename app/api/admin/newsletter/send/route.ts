import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getNewsletterHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

const sendNewsletterSchema = z.object({
  newsletterId: z.string(),
  testEmail: z.string().email().optional(), // For sending test emails
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { newsletterId, testEmail } = sendNewsletterSchema.parse(body)

    // Get newsletter
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
    })

    if (!newsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      )
    }

    // If test email is provided, send only to that email
    if (testEmail) {
      const unsubscribeUrl = absoluteUrl(
        "/api/newsletter/unsubscribe?token=test"
      )

      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${newsletter.subject}`,
        html: getNewsletterHtml(
          newsletter.subject,
          newsletter.contentHtml,
          unsubscribeUrl
        ),
      })

      return NextResponse.json({
        message: `Test email sent to ${testEmail}`,
        testSent: true,
      })
    }

    // Check if already sent
    if (newsletter.sentAt) {
      return NextResponse.json(
        { error: "Newsletter has already been sent" },
        { status: 400 }
      )
    }

    // Get verified subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isVerified: true },
      select: { email: true, unsubscribeToken: true },
    })

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No verified subscribers to send to" },
        { status: 400 }
      )
    }

    // Send emails in batches
    const BATCH_SIZE = 50
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async (subscriber) => {
          const unsubscribeUrl = absoluteUrl(
            `/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`
          )

          await sendEmail({
            to: subscriber.email,
            subject: newsletter.subject,
            html: getNewsletterHtml(
              newsletter.subject,
              newsletter.contentHtml,
              unsubscribeUrl
            ),
          })

          return subscriber.email
        })
      )

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          successCount++
        } else {
          errorCount++
          errors.push(result.reason?.message || "Unknown error")
        }
      })

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Update newsletter record
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        sentAt: new Date(),
        recipientCount: successCount,
      },
    })

    return NextResponse.json({
      message: `Newsletter sent to ${successCount} subscribers`,
      successCount,
      errorCount,
      totalSubscribers: subscribers.length,
      errors: errorCount > 0 ? errors.slice(0, 5) : undefined, // Return first 5 errors
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Newsletter send error:", error)
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    )
  }
}

// GET endpoint to get subscriber stats
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [totalSubscribers, verifiedSubscribers, recentSubscribers] =
      await Promise.all([
        prisma.newsletterSubscriber.count(),
        prisma.newsletterSubscriber.count({ where: { isVerified: true } }),
        prisma.newsletterSubscriber.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ])

    return NextResponse.json({
      totalSubscribers,
      verifiedSubscribers,
      unverifiedSubscribers: totalSubscribers - verifiedSubscribers,
      recentSubscribers,
    })
  } catch (error) {
    console.error("Get subscriber stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriber stats" },
      { status: 500 }
    )
  }
}
