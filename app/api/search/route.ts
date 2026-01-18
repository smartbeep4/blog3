import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const category = searchParams.get("category")
  const tag = searchParams.get("tag")

  if (!query || query.length < 2) {
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    })
  }

  // Sanitize query for tsquery - convert to prefix matching
  const sanitizedQuery = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word}:*`)
    .join(" & ")

  try {
    // Try full-text search first (requires search_vector column)
    const posts = await prisma.$queryRaw<
      Array<{
        id: string
        slug: string
        title: string
        subtitle: string | null
        excerpt: string | null
        coverImage: string | null
        publishedAt: Date | null
        readingTime: number | null
        isPremium: boolean
        author: {
          id: string
          name: string
          avatar: string | null
        }
        rank: number
      }>
    >`
      SELECT
        p.id,
        p.slug,
        p.title,
        p.subtitle,
        p.excerpt,
        p."coverImage",
        p."publishedAt",
        p."readingTime",
        p."isPremium",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar
        ) as author,
        ts_rank(p.search_vector, to_tsquery('english', ${sanitizedQuery})) as rank
      FROM "Post" p
      JOIN "User" u ON p."authorId" = u.id
      WHERE p.status = 'PUBLISHED'
        AND p."publishedAt" <= NOW()
        AND p.search_vector @@ to_tsquery('english', ${sanitizedQuery})
      ORDER BY rank DESC, p."publishedAt" DESC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Post" p
      WHERE p.status = 'PUBLISHED'
        AND p."publishedAt" <= NOW()
        AND p.search_vector @@ to_tsquery('english', ${sanitizedQuery})
    `

    const total = Number(countResult[0].count)

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Full-text search error, falling back to LIKE:", error)

    // Fallback to simple ILIKE search if full-text search fails
    // (e.g., if search_vector column doesn't exist)
    try {
      const whereClause = {
        status: "PUBLISHED" as const,
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { subtitle: { contains: query, mode: "insensitive" as const } },
          { excerpt: { contains: query, mode: "insensitive" as const } },
        ],
        ...(category && { categories: { some: { slug: category } } }),
        ...(tag && { tags: { some: { slug: tag } } }),
      }

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
          categories: true,
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      })

      const total = await prisma.post.count({
        where: whereClause,
      })

      return NextResponse.json({
        data: posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (fallbackError) {
      console.error("Search fallback error:", fallbackError)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }
  }
}
