import { prisma } from "@/lib/prisma"
import { sendEmail, getNewPostNotificationHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

/**
 * Send notification emails to subscribers when a new post is published
 * @param postId - The ID of the published post
 * @param onlyPaidSubscribers - If true, only send to paid subscribers
 * @returns The number of subscribers notified
 */
export async function sendNewPostNotification(
  postId: string,
  onlyPaidSubscribers = false
): Promise<number> {
  // Get the post with author info
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { name: true } },
    },
  })

  if (!post || post.status !== "PUBLISHED") {
    throw new Error("Post not found or not published")
  }

  // Get subscribers based on type
  let subscribers: { email: string; unsubscribeToken: string | null }[]

  if (onlyPaidSubscribers) {
    // Get users with paid subscriptions
    const paidUsers = await prisma.subscription.findMany({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
      include: {
        user: { select: { email: true, id: true } },
      },
    })

    subscribers = paidUsers.map((s) => ({
      email: s.user.email,
      unsubscribeToken: s.userId, // Use user ID as token for account-based unsub
    }))
  } else {
    // Get all verified newsletter subscribers
    subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isVerified: true },
      select: { email: true, unsubscribeToken: true },
    })
  }

  if (subscribers.length === 0) {
    return 0
  }

  const postUrl = absoluteUrl(`/${post.slug}`)

  // Send in batches to avoid rate limits
  const BATCH_SIZE = 50
  let successCount = 0

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          const unsubscribeUrl = absoluteUrl(
            `/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`
          )

          await sendEmail({
            to: subscriber.email,
            subject: `New: ${post.title}`,
            html: getNewPostNotificationHtml(
              post.title,
              postUrl,
              post.author.name,
              post.excerpt || "",
              unsubscribeUrl
            ),
          })

          successCount++
        } catch (error) {
          console.error(`Failed to notify ${subscriber.email}:`, error)
        }
      })
    )

    // Add delay between batches to respect rate limits
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return successCount
}

/**
 * Get subscriber count for display purposes
 */
export async function getSubscriberCount(): Promise<{
  newsletter: number
  paid: number
  total: number
}> {
  const [newsletterCount, paidCount] = await Promise.all([
    prisma.newsletterSubscriber.count({
      where: { isVerified: true },
    }),
    prisma.subscription.count({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),
  ])

  return {
    newsletter: newsletterCount,
    paid: paidCount,
    total: newsletterCount + paidCount,
  }
}
