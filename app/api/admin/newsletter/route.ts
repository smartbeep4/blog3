import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"

// TipTap extensions for HTML generation
const extensions = [StarterKit, Link.configure({ openOnClick: false }), Image]

// GET /api/admin/newsletter - List newsletters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") // "sent" | "draft" | "all"

    const where =
      status === "sent"
        ? { sentAt: { not: null } }
        : status === "draft"
          ? { sentAt: null }
          : {}

    const [newsletters, total] = await Promise.all([
      prisma.newsletter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          subject: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true,
          recipientCount: true,
          openCount: true,
          clickCount: true,
        },
      }),
      prisma.newsletter.count({ where }),
    ])

    return NextResponse.json({
      data: newsletters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("List newsletters error:", error)
    return NextResponse.json(
      { error: "Failed to fetch newsletters" },
      { status: 500 }
    )
  }
}

// POST /api/admin/newsletter - Create newsletter
const createNewsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  content: z.any(), // TipTap JSON content
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { subject, content } = createNewsletterSchema.parse(body)

    // Generate HTML from TipTap content
    let contentHtml = ""
    try {
      contentHtml = generateHTML(content, extensions)
    } catch (e) {
      console.error("Failed to generate HTML:", e)
      contentHtml = "<p>Content generation failed</p>"
    }

    const newsletter = await prisma.newsletter.create({
      data: {
        subject,
        content,
        contentHtml,
      },
    })

    return NextResponse.json({ data: newsletter }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Create newsletter error:", error)
    return NextResponse.json(
      { error: "Failed to create newsletter" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/newsletter - Update newsletter
const updateNewsletterSchema = z.object({
  id: z.string(),
  subject: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { id, subject, content } = updateNewsletterSchema.parse(body)

    // Check if newsletter exists and hasn't been sent
    const existing = await prisma.newsletter.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      )
    }

    if (existing.sentAt) {
      return NextResponse.json(
        { error: "Cannot edit a newsletter that has been sent" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (subject !== undefined) {
      updateData.subject = subject
    }

    if (content !== undefined) {
      updateData.content = content
      try {
        updateData.contentHtml = generateHTML(content, extensions)
      } catch (e) {
        console.error("Failed to generate HTML:", e)
      }
    }

    const newsletter = await prisma.newsletter.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: newsletter })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Update newsletter error:", error)
    return NextResponse.json(
      { error: "Failed to update newsletter" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/newsletter - Delete newsletter
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Newsletter ID is required" },
        { status: 400 }
      )
    }

    const existing = await prisma.newsletter.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      )
    }

    await prisma.newsletter.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete newsletter error:", error)
    return NextResponse.json(
      { error: "Failed to delete newsletter" },
      { status: 500 }
    )
  }
}
