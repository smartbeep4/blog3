import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/posts/[id]/view - Track a post view
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params
    const session = await auth()

    // Verify post exists and is published
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Cannot track views for unpublished posts" },
        { status: 400 }
      )
    }

    // Get IP hash for anonymous tracking (privacy-preserving)
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwarded?.split(",")[0] || realIp || "unknown"

    // Create a privacy-safe hash of the IP (truncated for anonymity)
    const ipHash = crypto
      .createHash("sha256")
      .update(ip + process.env.NEXTAUTH_SECRET || "secret")
      .digest("hex")
      .slice(0, 16)

    const userAgent = request.headers.get("user-agent") || undefined
    const referer = request.headers.get("referer") || undefined

    // Check for duplicate views (same user/IP in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Build the where clause for duplicate check
    const whereCondition: {
      postId: string
      createdAt: { gte: Date }
      OR?: Array<{ userId?: string | null; ipHash?: string | null }>
      userId?: string
      ipHash?: string
    } = {
      postId,
      createdAt: { gte: oneHourAgo },
    }

    if (session?.user?.id) {
      // For logged-in users, check by userId
      whereCondition.userId = session.user.id
    } else {
      // For anonymous users, check by IP hash
      whereCondition.ipHash = ipHash
    }

    const existingView = await prisma.postView.findFirst({
      where: whereCondition,
    })

    if (existingView) {
      return NextResponse.json({
        tracked: false,
        message: "View already tracked within the last hour",
      })
    }

    // Create view record
    await prisma.postView.create({
      data: {
        postId,
        userId: session?.user?.id || null,
        ipHash: session?.user?.id ? null : ipHash, // Only store IP hash for anonymous users
        userAgent: userAgent?.slice(0, 500),
        referer: referer?.slice(0, 500),
      },
    })

    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error("Error tracking view:", error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
