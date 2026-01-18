import { PrismaClient, Role, PostStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { hash } from "bcryptjs"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Starting seed...")

  // Clean existing data (in development only)
  if (process.env.NODE_ENV !== "production") {
    await prisma.postView.deleteMany()
    await prisma.commentLike.deleteMany()
    await prisma.like.deleteMany()
    await prisma.bookmark.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.post.deleteMany()
    await prisma.category.deleteMany()
    await prisma.tag.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSettings.deleteMany()
    await prisma.newsletterSubscriber.deleteMany()
    console.log("Cleaned existing data")
  }

  // Create site settings
  const siteSettings = await prisma.siteSettings.create({
    data: {
      id: "default",
      siteName: "BlogPlatform",
      siteDescription: "A modern blogging platform for writers and readers",
      primaryColor: "#6366f1",
      accentColor: "#8b5cf6",
      monthlyPrice: 500,
      yearlyPrice: 5000,
      commentsEnabled: true,
      likesEnabled: true,
    },
  })
  console.log("Created site settings")

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Technology",
        slug: "technology",
        description:
          "Posts about technology, programming, and digital innovation",
        color: "#3b82f6",
      },
    }),
    prisma.category.create({
      data: {
        name: "Design",
        slug: "design",
        description: "Posts about design, UX, and visual aesthetics",
        color: "#8b5cf6",
      },
    }),
    prisma.category.create({
      data: {
        name: "Business",
        slug: "business",
        description: "Posts about business, startups, and entrepreneurship",
        color: "#10b981",
      },
    }),
    prisma.category.create({
      data: {
        name: "Culture",
        slug: "culture",
        description: "Posts about culture, society, and lifestyle",
        color: "#f59e0b",
      },
    }),
  ])
  console.log(`Created ${categories.length} categories`)

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "JavaScript", slug: "javascript" } }),
    prisma.tag.create({ data: { name: "React", slug: "react" } }),
    prisma.tag.create({ data: { name: "Next.js", slug: "nextjs" } }),
    prisma.tag.create({ data: { name: "TypeScript", slug: "typescript" } }),
    prisma.tag.create({ data: { name: "CSS", slug: "css" } }),
    prisma.tag.create({ data: { name: "Tutorial", slug: "tutorial" } }),
    prisma.tag.create({ data: { name: "Opinion", slug: "opinion" } }),
    prisma.tag.create({ data: { name: "News", slug: "news" } }),
  ])
  console.log(`Created ${tags.length} tags`)

  // Create users
  const passwordHash = await hash("password123", 12)

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash,
      name: "Admin User",
      bio: "Platform administrator and content curator.",
      role: Role.ADMIN,
      emailVerified: new Date(),
      subscription: {
        create: {
          tier: "PAID",
        },
      },
    },
  })

  const authorUser = await prisma.user.create({
    data: {
      email: "author@example.com",
      passwordHash,
      name: "Jane Author",
      bio: "Tech writer and software engineer. Writing about the future of web development.",
      role: Role.AUTHOR,
      emailVerified: new Date(),
      subscription: {
        create: {
          tier: "PAID",
        },
      },
    },
  })

  const readerUser = await prisma.user.create({
    data: {
      email: "reader@example.com",
      passwordHash,
      name: "John Reader",
      bio: "Avid reader and technology enthusiast.",
      role: Role.READER,
      emailVerified: new Date(),
      subscription: {
        create: {
          tier: "FREE",
        },
      },
    },
  })

  console.log("Created users: admin, author, reader")

  // Create sample posts
  const sampleContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a sample blog post. It demonstrates the rich text capabilities of our editor.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Getting Started" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Welcome to our blogging platform. Here you can write beautiful articles with our powerful editor.",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Rich text formatting" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Image uploads and embeds" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Code blocks with syntax highlighting",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Start writing today and share your ideas with the world!",
          },
        ],
      },
    ],
  }

  const sampleHtml = `
    <p>This is a sample blog post. It demonstrates the rich text capabilities of our editor.</p>
    <h2>Getting Started</h2>
    <p>Welcome to our blogging platform. Here you can write beautiful articles with our powerful editor.</p>
    <ul>
      <li>Rich text formatting</li>
      <li>Image uploads and embeds</li>
      <li>Code blocks with syntax highlighting</li>
    </ul>
    <p>Start writing today and share your ideas with the world!</p>
  `

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: "Welcome to BlogPlatform",
        slug: "welcome-to-blogplatform",
        subtitle: "Discover a new way to share your ideas",
        content: sampleContent,
        contentHtml: sampleHtml,
        excerpt:
          "This is a sample blog post demonstrating the rich text capabilities of our editor.",
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        readingTime: 3,
        authorId: adminUser.id,
        categories: {
          connect: [{ id: categories[0].id }],
        },
        tags: {
          connect: [{ id: tags[5].id }],
        },
      },
    }),
    prisma.post.create({
      data: {
        title: "Building Modern Web Applications with Next.js",
        slug: "building-modern-web-apps-nextjs",
        subtitle: "A comprehensive guide to Next.js 14",
        content: sampleContent,
        contentHtml: sampleHtml,
        excerpt:
          "Learn how to build fast, scalable web applications using Next.js and React.",
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(Date.now() - 86400000), // 1 day ago
        readingTime: 8,
        authorId: authorUser.id,
        categories: {
          connect: [{ id: categories[0].id }],
        },
        tags: {
          connect: [{ id: tags[2].id }, { id: tags[3].id }],
        },
      },
    }),
    prisma.post.create({
      data: {
        title: "Premium Content: Advanced React Patterns",
        slug: "advanced-react-patterns",
        subtitle: "Exclusive insights for paid subscribers",
        content: sampleContent,
        contentHtml: sampleHtml,
        excerpt:
          "Discover advanced React patterns used by top engineering teams.",
        status: PostStatus.PUBLISHED,
        isPremium: true,
        publishedAt: new Date(Date.now() - 172800000), // 2 days ago
        readingTime: 12,
        authorId: authorUser.id,
        categories: {
          connect: [{ id: categories[0].id }],
        },
        tags: {
          connect: [{ id: tags[1].id }, { id: tags[3].id }],
        },
      },
    }),
    prisma.post.create({
      data: {
        title: "Draft: Upcoming Feature Announcement",
        slug: "upcoming-feature-announcement",
        content: sampleContent,
        contentHtml: sampleHtml,
        status: PostStatus.DRAFT,
        authorId: adminUser.id,
      },
    }),
  ])
  console.log(`Created ${posts.length} posts`)

  // Create sample comments
  const comment1 = await prisma.comment.create({
    data: {
      content: "Great article! Really helpful for getting started.",
      authorId: readerUser.id,
      postId: posts[0].id,
    },
  })

  await prisma.comment.create({
    data: {
      content: "Thanks for reading! Let me know if you have any questions.",
      authorId: adminUser.id,
      postId: posts[0].id,
      parentId: comment1.id,
    },
  })

  console.log("Created sample comments")

  // Create sample likes
  await prisma.like.create({
    data: {
      userId: readerUser.id,
      postId: posts[0].id,
    },
  })

  await prisma.like.create({
    data: {
      userId: readerUser.id,
      postId: posts[1].id,
    },
  })

  console.log("Created sample likes")

  // Create sample bookmarks
  await prisma.bookmark.create({
    data: {
      userId: readerUser.id,
      postId: posts[1].id,
    },
  })

  console.log("Created sample bookmarks")

  // Create sample views
  await Promise.all([
    prisma.postView.create({
      data: {
        postId: posts[0].id,
        userId: readerUser.id,
      },
    }),
    prisma.postView.create({
      data: {
        postId: posts[0].id,
        ipHash: "anonymous-hash-1",
      },
    }),
    prisma.postView.create({
      data: {
        postId: posts[1].id,
        ipHash: "anonymous-hash-2",
      },
    }),
  ])

  console.log("Created sample views")

  console.log("Seed completed successfully!")
  console.log("\nTest accounts:")
  console.log("  Admin: admin@example.com / password123")
  console.log("  Author: author@example.com / password123")
  console.log("  Reader: reader@example.com / password123")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
