# 02 - Database Schema

## Overview

You are responsible for implementing the complete Prisma database schema, setting up the database connection, creating migrations, and implementing seed data for development.

---

## Prerequisites

- Project setup complete (Agent 01)
- PostgreSQL database available (Render free tier or local)
- `prisma` package installed

---

## Database Provider

**Production**: Render PostgreSQL (free tier - 90 days, then migrate or pay)
**Development**: Local PostgreSQL or use Render directly

Connection string format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

---

## Step 1: Configure Prisma Schema

Create/update `prisma/schema.prisma`:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum Role {
  READER
  AUTHOR
  EDITOR
  ADMIN
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

enum SubscriptionTier {
  FREE
  PAID
}

// ============================================
// USER & AUTHENTICATION
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String
  bio           String?   @db.Text
  avatar        String?
  role          Role      @default(READER)
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  posts         Post[]
  comments      Comment[]
  subscription  Subscription?
  likes         Like[]
  bookmarks     Bookmark[]
  sessions      Session[]
  accounts      Account[]

  @@index([email])
  @@index([role])
}

// NextAuth Account (OAuth providers)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

// NextAuth Session
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// NextAuth Verification Token
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Password Reset Token
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expires   DateTime
  createdAt DateTime @default(now())

  @@index([token])
  @@index([userId])
}

// ============================================
// CONTENT
// ============================================

model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  subtitle    String?
  content     Json       // Tiptap JSON document
  contentHtml String     @db.Text // Pre-rendered HTML
  excerpt     String?    @db.Text
  coverImage  String?
  status      PostStatus @default(DRAFT)
  isPremium   Boolean    @default(false)
  publishedAt DateTime?
  scheduledFor DateTime?
  readingTime Int?       // Minutes
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // SEO fields
  metaTitle       String?
  metaDescription String? @db.Text
  canonicalUrl    String?

  // Relations
  author     User       @relation(fields: [authorId], references: [id])
  authorId   String
  categories Category[] @relation("PostCategories")
  tags       Tag[]      @relation("PostTags")
  comments   Comment[]
  likes      Like[]
  bookmarks  Bookmark[]
  views      PostView[]

  @@index([authorId])
  @@index([status, publishedAt(sort: Desc)])
  @@index([slug])
  @@index([createdAt(sort: Desc)])
}

model Category {
  id          String  @id @default(cuid())
  name        String  @unique
  slug        String  @unique
  description String?
  color       String? // Hex color for UI badges

  posts Post[] @relation("PostCategories")

  @@index([slug])
}

model Tag {
  id   String @id @default(cuid())
  name String @unique
  slug String @unique

  posts Post[] @relation("PostTags")

  @@index([slug])
}

// ============================================
// ENGAGEMENT
// ============================================

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  isEdited  Boolean  @default(false)

  // Relations
  author   User    @relation(fields: [authorId], references: [id])
  authorId String
  post     Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId   String

  // Nested comments (2 levels max)
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  parentId String?
  replies  Comment[] @relation("CommentReplies")

  likes CommentLike[]

  @@index([postId])
  @@index([authorId])
  @@index([parentId])
  @@index([createdAt(sort: Desc)])
}

model Like {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId String

  @@unique([userId, postId])
  @@index([postId])
}

model CommentLike {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  userId    String
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  commentId String

  @@unique([userId, commentId])
  @@index([commentId])
}

model Bookmark {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId String

  @@unique([userId, postId])
  @@index([userId])
}

// ============================================
// ANALYTICS
// ============================================

model PostView {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // Analytics data (privacy-conscious)
  ipHash    String?  // Hashed IP for uniqueness, not tracking
  userAgent String?  @db.Text
  referer   String?
  country   String?

  post   Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId String
  userId String? // Null for anonymous views

  @@index([postId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
}

// ============================================
// SUBSCRIPTIONS
// ============================================

model Subscription {
  id        String           @id @default(cuid())
  tier      SubscriptionTier @default(FREE)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  // Stripe data
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?   @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String @unique

  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}

// ============================================
// NEWSLETTER
// ============================================

model Newsletter {
  id          String    @id @default(cuid())
  subject     String
  content     Json      // Tiptap JSON
  contentHtml String    @db.Text
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Stats (updated after send)
  recipientCount Int @default(0)
  openCount      Int @default(0)
  clickCount     Int @default(0)

  @@index([createdAt(sort: Desc)])
}

model NewsletterSubscriber {
  id            String    @id @default(cuid())
  email         String    @unique
  isVerified    Boolean   @default(false)
  verifyToken   String?   @unique
  unsubscribeToken String @unique @default(cuid())
  createdAt     DateTime  @default(now())

  // Link to user if they have an account
  userId String?

  @@index([email])
  @@index([verifyToken])
}

// ============================================
// SITE SETTINGS
// ============================================

model SiteSettings {
  id              String  @id @default("default")
  siteName        String  @default("BlogPlatform")
  siteDescription String? @db.Text
  logo            String?
  favicon         String?

  // Branding colors
  primaryColor String @default("#6366f1")
  accentColor  String @default("#8b5cf6")

  // Social links
  twitterHandle String?
  facebookUrl   String?
  instagramUrl  String?
  linkedinUrl   String?

  // Subscription pricing (in cents)
  monthlyPrice Int @default(500)
  yearlyPrice  Int @default(5000)

  // Feature flags
  commentsEnabled Boolean @default(true)
  likesEnabled    Boolean @default(true)

  updatedAt DateTime @updatedAt
}
```

---

## Step 2: Create Prisma Client

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
```

---

## Step 3: Create Database Seed

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, Role, PostStatus } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

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
    console.log("🧹 Cleaned existing data")
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
  console.log("⚙️ Created site settings")

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Technology",
        slug: "technology",
        description: "Posts about technology, programming, and digital innovation",
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
  console.log(`📁 Created ${categories.length} categories`)

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
  console.log(`🏷️ Created ${tags.length} tags`)

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

  console.log("👥 Created users: admin, author, reader")

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
                content: [{ type: "text", text: "Code blocks with syntax highlighting" }],
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
        excerpt: "This is a sample blog post demonstrating the rich text capabilities of our editor.",
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
        excerpt: "Learn how to build fast, scalable web applications using Next.js and React.",
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
        excerpt: "Discover advanced React patterns used by top engineering teams.",
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
  console.log(`📝 Created ${posts.length} posts`)

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

  console.log("💬 Created sample comments")

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

  console.log("❤️ Created sample likes")

  // Create sample bookmarks
  await prisma.bookmark.create({
    data: {
      userId: readerUser.id,
      postId: posts[1].id,
    },
  })

  console.log("🔖 Created sample bookmarks")

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

  console.log("👁️ Created sample views")

  console.log("✅ Seed completed successfully!")
  console.log("\nTest accounts:")
  console.log("  Admin: admin@example.com / password123")
  console.log("  Author: author@example.com / password123")
  console.log("  Reader: reader@example.com / password123")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Step 4: Configure Seed in package.json

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Install tsx for running TypeScript:

```bash
npm install -D tsx bcryptjs @types/bcryptjs
```

---

## Step 5: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or create migration (production)
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed
```

---

## Step 6: Create Type Exports

Update `types/index.ts` to include Prisma types:

```typescript
// Re-export Prisma types for convenience
export type {
  User,
  Post,
  Comment,
  Category,
  Tag,
  Like,
  Bookmark,
  Subscription,
  PostView,
  Newsletter,
  SiteSettings,
} from "@prisma/client"

export { Role, PostStatus, SubscriptionTier } from "@prisma/client"

// Extended types with relations
import type {
  User,
  Post,
  Comment,
  Category,
  Tag,
} from "@prisma/client"

export type UserPublic = Pick<User, "id" | "name" | "avatar" | "bio">

export type PostWithAuthor = Post & {
  author: UserPublic
}

export type PostWithDetails = Post & {
  author: UserPublic
  categories: Category[]
  tags: Tag[]
  _count: {
    comments: number
    likes: number
    views: number
  }
}

export type PostCard = Pick<
  Post,
  "id" | "slug" | "title" | "subtitle" | "excerpt" | "coverImage" | "publishedAt" | "readingTime" | "isPremium"
> & {
  author: UserPublic
  _count: {
    likes: number
  }
}

export type CommentWithAuthor = Comment & {
  author: UserPublic
  _count: {
    likes: number
  }
}

export type CommentWithReplies = CommentWithAuthor & {
  replies: CommentWithAuthor[]
}
```

---

## Database Queries Reference

Common queries for other agents to use:

### Get Published Posts (Paginated)

```typescript
const posts = await prisma.post.findMany({
  where: {
    status: "PUBLISHED",
    publishedAt: { lte: new Date() },
  },
  include: {
    author: {
      select: { id: true, name: true, avatar: true },
    },
    categories: true,
    _count: {
      select: { comments: true, likes: true },
    },
  },
  orderBy: { publishedAt: "desc" },
  take: 10,
  skip: 0,
})
```

### Get Single Post by Slug

```typescript
const post = await prisma.post.findUnique({
  where: { slug },
  include: {
    author: {
      select: { id: true, name: true, avatar: true, bio: true },
    },
    categories: true,
    tags: true,
    _count: {
      select: { comments: true, likes: true, views: true },
    },
  },
})
```

### Get Comments for Post

```typescript
const comments = await prisma.comment.findMany({
  where: {
    postId,
    parentId: null, // Only top-level comments
  },
  include: {
    author: {
      select: { id: true, name: true, avatar: true },
    },
    replies: {
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        _count: { select: { likes: true } },
      },
    },
    _count: { select: { likes: true } },
  },
  orderBy: { createdAt: "desc" },
})
```

### Check if User Liked Post

```typescript
const like = await prisma.like.findUnique({
  where: {
    userId_postId: { userId, postId },
  },
})
const hasLiked = !!like
```

### Get User's Bookmarked Posts

```typescript
const bookmarks = await prisma.bookmark.findMany({
  where: { userId },
  include: {
    post: {
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    },
  },
  orderBy: { createdAt: "desc" },
})
```

---

## Verification Checklist

- [ ] `prisma/schema.prisma` is valid (run `npx prisma validate`)
- [ ] `npx prisma generate` succeeds
- [ ] Database connection works (`npx prisma db push`)
- [ ] Seed runs successfully (`npx prisma db seed`)
- [ ] Prisma Studio shows data (`npx prisma studio`)
- [ ] All indexes are created
- [ ] Relations work correctly

---

## Files Created/Modified

```
prisma/
├── schema.prisma    # Database schema
└── seed.ts          # Seed data
lib/
└── prisma.ts        # Prisma client singleton
types/
└── index.ts         # Updated with Prisma types
package.json         # Added seed configuration
```

---

## Next Steps

With the database schema in place, the following agents can proceed:
- **Agent 03**: Authentication (uses User, Account, Session models)
- **Agent 05**: Post Management (uses Post, Category, Tag models)
- **Agent 07**: Comments (uses Comment model)
- **Agent 08**: Subscriptions (uses Subscription model)
