import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com"

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]

  try {
    // Get all published posts
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    })

    const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }))

    // Get all categories
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
      },
    })

    const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    }))

    // Get all tags
    const tags = await prisma.tag.findMany({
      select: {
        slug: true,
      },
    })

    const tagUrls: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${baseUrl}/tag/${tag.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    }))

    // Get all authors who have published posts
    const authors = await prisma.user.findMany({
      where: {
        posts: {
          some: {
            status: "PUBLISHED",
            publishedAt: { lte: new Date() },
          },
        },
      },
      select: {
        id: true,
      },
    })

    const authorUrls: MetadataRoute.Sitemap = authors.map((author) => ({
      url: `${baseUrl}/author/${author.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }))

    return [
      ...staticPages,
      ...postUrls,
      ...categoryUrls,
      ...tagUrls,
      ...authorUrls,
    ]
  } catch (error) {
    // If database is not available, return only static pages
    console.error("Error generating sitemap:", error)
    return staticPages
  }
}
