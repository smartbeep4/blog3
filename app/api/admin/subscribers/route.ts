import { NextRequest, NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "paid" // "paid" or "newsletter"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    if (type === "paid") {
      // Fetch paid subscribers (users with active paid subscriptions)
      const [subscribers, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            subscription: {
              tier: "PAID",
              stripeCurrentPeriodEnd: { gt: new Date() },
            },
          },
          include: {
            subscription: {
              select: {
                tier: true,
                stripeCurrentPeriodEnd: true,
                createdAt: true,
              },
            },
          },
          orderBy: { subscription: { createdAt: "desc" } },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.subscription.count({
          where: {
            tier: "PAID",
            stripeCurrentPeriodEnd: { gt: new Date() },
          },
        }),
      ])

      return NextResponse.json({
        data: subscribers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          subscription: user.subscription,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } else {
      // Fetch newsletter subscribers
      const [subscribers, total] = await Promise.all([
        prisma.newsletterSubscriber.findMany({
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.newsletterSubscriber.count(),
      ])

      return NextResponse.json({
        data: subscribers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }
  } catch (error) {
    console.error("Error fetching subscribers:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    )
  }
}
