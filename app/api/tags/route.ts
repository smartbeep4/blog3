import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

// GET /api/tags - List tags with optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query = querySchema.parse({
      search: searchParams.get("search"),
      limit: searchParams.get("limit"),
    })

    const where: Record<string, unknown> = {}

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: "insensitive",
      }
    }

    const tags = await prisma.tag.findMany({
      where,
      take: query.limit,
      orderBy: [
        {
          posts: {
            _count: "desc",
          },
        },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    })

    return NextResponse.json({ data: tags })
  } catch (error) {
    console.error("Error listing tags:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to list tags" }, { status: 500 })
  }
}
