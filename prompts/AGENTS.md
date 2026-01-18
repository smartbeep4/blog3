# AGENTS.md - Master Coordination Guide

## Project Overview

You are building **BlogPlatform**, a Substack-style blogging platform where multiple authors can publish content and readers can subscribe, engage, and optionally pay for premium content. This is a single-domain publishing platform with a focus on beautiful typography, reading experience, and content-first design.

**Target Deployment**: Render.com Free Tier

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Public    │ │  Dashboard  │ │    Admin    │               │
│  │   Pages     │ │   (Authors) │ │   (Admins)  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│                     API LAYER (Next.js API Routes)              │
│  Auth │ Posts │ Comments │ Subscriptions │ Upload │ Search      │
├─────────────────────────────────────────────────────────────────┤
│                        SERVICES                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Prisma  │ │ NextAuth │ │  Stripe  │ │  Resend  │           │
│  │   ORM    │ │  (Auth)  │ │(Payments)│ │ (Email)  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   PostgreSQL     │  │   Cloudinary     │                    │
│  │   (Render DB)    │  │   (Images/Media) │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Free Tier Services & Limits

### Render.com (Hosting)
- **Web Service**: Free tier (spins down after 15 min inactivity, 512MB RAM)
- **PostgreSQL**: Free tier (90 days, then $7/mo or migrate)
- **Limitations**: Cold starts ~30 seconds, limited compute

### Cloudinary (Image/Media Storage)
- **Free Tier**: 25GB storage, 25GB bandwidth/month
- **Transformations**: 25,000 monthly transformations
- **Use For**: All post images, avatars, cover images

### Resend (Email)
- **Free Tier**: 100 emails/day, 3,000/month
- **Use For**: Auth emails, notifications, newsletters (limited)

### Stripe (Payments)
- **No monthly fee**: Only transaction fees (2.9% + $0.30)
- **Test mode**: Unlimited for development

---

## Agent Responsibilities

Each agent is responsible for a specific domain. Read your assigned prompt file completely before starting work.

| Agent ID | Prompt File | Responsibility |
|----------|-------------|----------------|
| 01 | `01-PROJECT-SETUP.md` | Project scaffolding, dependencies, config |
| 02 | `02-DATABASE-SCHEMA.md` | Prisma schema, migrations, seeding |
| 03 | `03-AUTHENTICATION.md` | NextAuth, OAuth, sessions, roles |
| 04 | `04-RICH-TEXT-EDITOR.md` | Tiptap editor with extensions |
| 05 | `05-POST-MANAGEMENT.md` | Post CRUD, publishing workflow |
| 06 | `06-READER-EXPERIENCE.md` | Public pages, reading UI |
| 07 | `07-COMMENTS-ENGAGEMENT.md` | Comments, likes, bookmarks |
| 08 | `08-SUBSCRIPTION-PAYWALL.md` | Stripe, subscriptions, paywall |
| 09 | `09-NEWSLETTER.md` | Email collection, newsletters |
| 10 | `10-ANALYTICS.md` | View tracking, dashboards |
| 11 | `11-ADMIN-DASHBOARD.md` | Admin UI and functionality |
| 12 | `12-SEARCH.md` | Full-text search |
| 13 | `13-FILE-STORAGE.md` | Cloudinary integration |
| 14 | `14-DEPLOYMENT.md` | Render deployment |
| 15 | `15-UI-COMPONENTS.md` | Shared component library |

---

## Execution Order & Dependencies

```
Phase 1: Foundation (Must complete first)
├── 01-PROJECT-SETUP.md (Start here)
├── 02-DATABASE-SCHEMA.md (Requires: 01)
├── 03-AUTHENTICATION.md (Requires: 01, 02)
└── 15-UI-COMPONENTS.md (Requires: 01, can parallel with 02-03)

Phase 2: Core Features (Requires Phase 1)
├── 13-FILE-STORAGE.md (Can start early)
├── 04-RICH-TEXT-EDITOR.md (Requires: 15)
├── 05-POST-MANAGEMENT.md (Requires: 02, 03, 04, 13)
└── 06-READER-EXPERIENCE.md (Requires: 05, 15)

Phase 3: Engagement (Requires Phase 2)
├── 07-COMMENTS-ENGAGEMENT.md (Requires: 02, 03, 06)
├── 12-SEARCH.md (Requires: 05)
└── 10-ANALYTICS.md (Requires: 02, 05)

Phase 4: Monetization (Requires Phase 2)
├── 08-SUBSCRIPTION-PAYWALL.md (Requires: 02, 03)
└── 09-NEWSLETTER.md (Requires: 02, 03)

Phase 5: Administration (Requires Phase 3, 4)
└── 11-ADMIN-DASHBOARD.md (Requires: all above)

Phase 6: Deployment (Final)
└── 14-DEPLOYMENT.md (After all features complete)
```

---

## Core Design Principles

### 1. Typography First
- Body text: Georgia or Lora (serif) at 18px
- UI text: Inter (sans-serif)
- Line height: 1.7 for body content
- Max content width: 680px for optimal reading

### 2. Minimal & Clean
- Abundant whitespace
- No sidebar clutter on reading pages
- Progressive disclosure - hide until needed
- Content is king

### 3. Performance Conscious
- Server components by default
- Client components only when necessary
- Image optimization via Cloudinary
- Minimize JavaScript bundle

### 4. Mobile First
- Responsive design throughout
- Touch-friendly interactions
- Readable on all screen sizes

---

## Tech Stack Quick Reference

```json
{
  "framework": "Next.js 14+ (App Router)",
  "styling": "Tailwind CSS 3.4+",
  "components": "shadcn/ui",
  "database": "PostgreSQL via Prisma",
  "auth": "NextAuth.js (Auth.js v5)",
  "editor": "Tiptap (ProseMirror)",
  "state": "Zustand (client), TanStack Query (server)",
  "forms": "React Hook Form + Zod",
  "payments": "Stripe",
  "email": "Resend",
  "storage": "Cloudinary",
  "hosting": "Render.com"
}
```

---

## File Structure Overview

```
/
├── app/
│   ├── (auth)/           # Auth pages (login, register, etc.)
│   ├── (main)/           # Public pages (home, posts, profiles)
│   ├── dashboard/        # Author dashboard
│   ├── admin/            # Admin pages
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # Header, Footer, Sidebar
│   ├── posts/            # Post-related components
│   ├── editor/           # Rich text editor
│   ├── comments/         # Comment components
│   ├── auth/             # Auth forms
│   └── subscription/     # Paywall, pricing
├── lib/
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # Auth config
│   ├── stripe.ts         # Stripe client
│   ├── email.ts          # Email service
│   ├── cloudinary.ts     # Upload service
│   └── utils.ts          # Utilities
├── hooks/                # Custom React hooks
├── stores/               # Zustand stores
├── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── public/               # Static assets
```

---

## Environment Variables

All agents should assume these environment variables exist:

```env
# Database (Render PostgreSQL)
DATABASE_URL="postgresql://..."

# Auth (NextAuth)
NEXTAUTH_URL="https://your-app.onrender.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers (optional, can be added later)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_YEARLY="price_..."

# Resend (Email)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# App
NEXT_PUBLIC_APP_URL="https://your-app.onrender.com"
NEXT_PUBLIC_APP_NAME="BlogPlatform"
```

---

## Common Patterns

### API Route Pattern
```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // ... implementation
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... implementation
}
```

### Server Component Pattern
```typescript
// app/(main)/[slug]/page.tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug, status: 'PUBLISHED' },
    include: { author: true }
  })

  if (!post) notFound()

  return <PostContent post={post} />
}
```

### Client Component Pattern
```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'

export function LikeButton({ postId }: { postId: string }) {
  // Client-side interactivity
}
```

---

## Quality Checklist

Every agent should ensure their work meets these standards:

### Code Quality
- [ ] TypeScript strict mode compliant
- [ ] No `any` types (use proper typing)
- [ ] Zod validation on all inputs
- [ ] Error handling with proper error messages
- [ ] Loading states for async operations

### Performance
- [ ] Server components where possible
- [ ] Images use Cloudinary transformations
- [ ] No unnecessary client-side JavaScript
- [ ] Proper caching headers

### Accessibility
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

### Security
- [ ] Input sanitization
- [ ] Auth checks on protected routes
- [ ] CSRF protection (NextAuth handles)
- [ ] No secrets in client code

---

## Communication Between Agents

When your work depends on another agent's output:

1. **Check the dependency's prompt file** for interface specifications
2. **Use the defined types** from `/types/index.ts`
3. **Follow the API contracts** specified in each prompt
4. **Document any deviations** if absolutely necessary

When your work will be consumed by other agents:

1. **Export clean interfaces** in `/types/index.ts`
2. **Document your API endpoints** in your implementation
3. **Provide example usage** in comments
4. **Keep breaking changes minimal**

---

## Getting Started (For Any Agent)

1. Read this AGENTS.md file completely
2. Read your assigned prompt file completely
3. Check dependencies - ensure prerequisite work is done
4. Implement according to specifications
5. Test your implementation
6. Document any assumptions or deviations

---

## Final Notes

- **Simplicity over complexity**: Don't over-engineer
- **Working code over perfect code**: Ship it, then iterate
- **User experience first**: Every decision should improve UX
- **Free tier conscious**: Respect resource limits
- **Mobile matters**: Test responsive design

The goal is a beautiful, functional blogging platform that readers love to read and writers love to write on.
