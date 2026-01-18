import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query || query.length < 2) {
    return NextResponse.json({
      posts: [],
      tags: [],
      categories: [],
    })
  }

  try {
    // Get matching post titles
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        title: { contains: query, mode: "insensitive" },
      },
      select: {
        title: true,
        slug: true,
      },
      take: 5,
      orderBy: { publishedAt: "desc" },
    })

    // Get matching tags
    const tags = await prisma.tag.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        name: true,
        slug: true,
      },
      take: 3,
    })

    // Get matching categories
    const categories = await prisma.category.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        name: true,
        slug: true,
      },
      take: 3,
    })

    return NextResponse.json({
      posts: posts.map((p) => ({ type: "post" as const, ...p })),
      tags: tags.map((t) => ({ type: "tag" as const, ...t })),
      categories: categories.map((c) => ({ type: "category" as const, ...c })),
    })
  } catch (error) {
    console.error("Search suggestions error:", error)
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    )
  }
}
