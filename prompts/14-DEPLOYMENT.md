# 14 - Deployment (Render.com)

## Overview

You are responsible for deploying the application to Render.com's free tier, including database setup, environment configuration, and production optimizations.

---

## Prerequisites

- All features implemented and tested locally
- Render.com account created
- Cloudinary account set up
- Stripe account set up (test mode)
- Resend account set up

---

## Render Free Tier Limitations

### Web Service (Free)
- **512 MB RAM**
- **0.1 CPU**
- **Spins down after 15 minutes of inactivity**
- **Cold starts: ~30 seconds**
- **750 hours/month** (enough for one service always-on)

### PostgreSQL (Free)
- **256 MB RAM**
- **1 GB storage**
- **90 days, then requires upgrade** or data export

---

## Step 1: Prepare for Production

### Update package.json

Ensure build script includes Prisma generation:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

### Create render.yaml (Blueprint)

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: blog-platform
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXTAUTH_URL
        fromService:
          name: blog-platform
          type: web
          property: host
      - key: DATABASE_URL
        fromDatabase:
          name: blog-db
          property: connectionString
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_PUBLISHABLE_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false

databases:
  - name: blog-db
    plan: free
    databaseName: blog
    user: blog_user
```

---

## Step 2: Create Health Check Endpoint

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 }
    )
  }
}
```

---

## Step 3: Optimize for Cold Starts

### Add Loading States

Create `app/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container py-8">
      <div className="space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Optimize Prisma Connection

Update `lib/prisma.ts`:

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

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect()
})
```

---

## Step 4: Environment Variables Setup

### Required Environment Variables

Set these in Render dashboard:

```env
# Auto-set by Render
NODE_ENV=production
DATABASE_URL=<from Render PostgreSQL>
NEXTAUTH_URL=https://your-app.onrender.com

# Must set manually
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Stripe (use test keys initially)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
NEXT_PUBLIC_APP_NAME=BlogPlatform
```

---

## Step 5: Database Migration Strategy

### Initial Deployment

1. Push to GitHub
2. Create Render services via dashboard or blueprint
3. Wait for database to be ready
4. Deploy will run `prisma migrate deploy`

### Subsequent Migrations

```bash
# Locally, create migration
npx prisma migrate dev --name migration_name

# Commit migration files
git add prisma/migrations
git commit -m "Add migration: migration_name"
git push
```

Render will automatically run migrations on deploy.

---

## Step 6: Manual Deployment Steps

### Option A: Blueprint (Recommended)

1. Go to Render Dashboard
2. Click "New" > "Blueprint"
3. Connect your GitHub repository
4. Select the repo with `render.yaml`
5. Click "Apply"
6. Fill in secret environment variables
7. Deploy

### Option B: Manual Setup

1. **Create PostgreSQL Database**
   - Dashboard > New > PostgreSQL
   - Name: `blog-db`
   - Plan: Free
   - Create

2. **Create Web Service**
   - Dashboard > New > Web Service
   - Connect GitHub repository
   - Name: `blog-platform`
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free
   - Add environment variables
   - Create

---

## Step 7: Set Up Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint:
   - URL: `https://your-app.onrender.com/api/subscriptions/webhook`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy webhook signing secret to Render env vars

---

## Step 8: Configure Custom Domain (Optional)

1. Go to your web service in Render
2. Settings > Custom Domains
3. Add your domain
4. Configure DNS:
   - Add CNAME record pointing to your Render URL
   - Or A record for apex domain

Update environment variables:
```env
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Step 9: Production Optimizations

### Add Security Headers

Create `middleware.ts`:

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
}
```

### Add robots.txt

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://your-app.onrender.com/sitemap.xml
```

### Add Sitemap Generation

Create `app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com"

  // Get all published posts
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
  })

  // Get all categories
  const categories = await prisma.category.findMany({
    select: { slug: true },
  })

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...postUrls,
    ...categoryUrls,
  ]
}
```

---

## Step 10: Monitoring and Logging

### Add Error Boundary

Create `app/error.tsx`:

```typescript
"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to your error tracking service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          We apologize for the inconvenience.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
```

### Add Not Found Page

Create `app/not-found.tsx`:

```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## Step 11: Database Backup Strategy

Since Render's free PostgreSQL has a 90-day limit:

### Export Data Before Expiry

```bash
# Connect to your Render PostgreSQL
# Get connection string from Render dashboard

# Export data
pg_dump "postgresql://user:pass@host:5432/db" > backup.sql

# Or use Prisma
npx prisma db pull  # Updates schema from db
npx prisma db seed  # Re-seed if needed
```

### Migration Options

1. **Upgrade to paid Render PostgreSQL** ($7/month)
2. **Use Supabase free tier** (500MB, no time limit)
3. **Use Neon free tier** (512MB, no time limit)

---

## Step 12: Post-Deployment Checklist

- [ ] Website loads at Render URL
- [ ] Health check passes: `/api/health`
- [ ] Authentication works (register, login, logout)
- [ ] Posts can be created and published
- [ ] Images upload to Cloudinary
- [ ] Comments work
- [ ] Stripe checkout works (test mode)
- [ ] Email sending works
- [ ] Search works
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] SSL certificate active (automatic on Render)

---

## Troubleshooting

### Build Failures

```bash
# Check build logs in Render dashboard
# Common issues:
# - Missing environment variables
# - Prisma generate not running
# - TypeScript errors
```

### Cold Start Issues

- First request after inactivity takes ~30 seconds
- Consider upgrading to paid tier for always-on
- Add loading states for better UX

### Database Connection Issues

```bash
# Ensure DATABASE_URL is correct
# Check if database is awake (free tier sleeps)
# Verify connection string includes ?sslmode=require
```

### Memory Issues

- Free tier has 512MB limit
- Optimize images before upload
- Use streaming for large responses
- Consider paid tier for better performance

---

## Files Created/Modified

```
render.yaml
app/api/health/route.ts
app/loading.tsx
app/error.tsx
app/not-found.tsx
app/sitemap.ts
public/robots.txt
middleware.ts (updated)
lib/prisma.ts (optimized)
package.json (updated scripts)
```

---

## Cost Considerations

### Free Tier Total: $0/month
- Render Web Service: Free
- Render PostgreSQL: Free (90 days)
- Cloudinary: Free
- Resend: Free (100 emails/day)
- Stripe: Free (pay per transaction)

### Recommended Upgrade Path
1. **After 90 days**: Upgrade PostgreSQL ($7/month)
2. **When traffic grows**: Upgrade web service ($7/month)
3. **For production**: Both services upgraded ($14/month)
