# 09 - Newsletter System

## Overview

You are responsible for implementing the newsletter system, including email collection, double opt-in, newsletter composition, and sending emails via Resend.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- Resend account set up

---

## Resend Free Tier Limits

- **100 emails/day**
- **3,000 emails/month**
- Plan accordingly for newsletter frequency

---

## Step 1: Install Resend

```bash
npm install resend
```

---

## Step 2: Create Email Client

Create `lib/email.ts`:

```typescript
import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@example.com"
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BlogPlatform"

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error("Email send error:", error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error("Email send failed:", error)
    throw error
  }
}

// Email Templates

export function getVerifyEmailHtml(name: string, verifyUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Confirm your subscription</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thanks for subscribing to ${APP_NAME}! Please confirm your email address by clicking the button below:</p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Confirm Subscription
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't subscribe, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getPasswordResetHtml(name: string, resetUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Reset your password</h1>
        <p>Hi ${name || "there"},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getNewPostNotificationHtml(
  postTitle: string,
  postUrl: string,
  authorName: string,
  excerpt: string,
  unsubscribeUrl: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="color: #666; font-size: 14px;">New post from ${APP_NAME}</p>
        <h1 style="color: #1a1a1a; margin-top: 8px;">${postTitle}</h1>
        <p style="color: #666;">by ${authorName}</p>
        <p>${excerpt}</p>
        <p style="margin: 30px 0;">
          <a href="${postUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Read More
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          You're receiving this because you subscribed to ${APP_NAME}.
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </p>
      </body>
    </html>
  `
}

export function getNewsletterHtml(
  subject: string,
  contentHtml: string,
  unsubscribeUrl: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          a { color: #6366f1; }
          img { max-width: 100%; height: auto; }
          pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
          blockquote { border-left: 4px solid #6366f1; padding-left: 16px; margin-left: 0; font-style: italic; }
        </style>
      </head>
      <body>
        ${contentHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0 20px;">
        <p style="color: #999; font-size: 12px; font-family: sans-serif;">
          You're receiving this because you subscribed to ${APP_NAME}.
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </p>
      </body>
    </html>
  `
}
```

---

## Step 3: Create Newsletter Subscribe API

Create `app/api/newsletter/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
import { sendEmail, getVerifyEmailHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = subscribeSchema.parse(body)

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      if (existing.isVerified) {
        return NextResponse.json({
          message: "You're already subscribed!",
        })
      }

      // Resend verification email
      const verifyToken = nanoid(32)
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { verifyToken },
      })

      const verifyUrl = absoluteUrl(`/api/newsletter/verify?token=${verifyToken}`)
      await sendEmail({
        to: email,
        subject: "Confirm your subscription",
        html: getVerifyEmailHtml(name || "", verifyUrl),
      })

      return NextResponse.json({
        message: "Verification email sent! Please check your inbox.",
      })
    }

    // Create new subscriber
    const verifyToken = nanoid(32)
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        verifyToken,
      },
    })

    // Send verification email
    const verifyUrl = absoluteUrl(`/api/newsletter/verify?token=${verifyToken}`)
    await sendEmail({
      to: email,
      subject: "Confirm your subscription",
      html: getVerifyEmailHtml(name || "", verifyUrl),
    })

    return NextResponse.json({
      message: "Thanks for subscribing! Please check your email to confirm.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Newsletter subscribe error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: Create Verify Subscription API

Create `app/api/newsletter/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(absoluteUrl("/subscribe?error=invalid-token"))
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { verifyToken: token },
  })

  if (!subscriber) {
    return NextResponse.redirect(absoluteUrl("/subscribe?error=invalid-token"))
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isVerified: true,
      verifyToken: null,
    },
  })

  return NextResponse.redirect(absoluteUrl("/subscribe?verified=true"))
}
```

---

## Step 5: Create Unsubscribe API

Create `app/api/newsletter/unsubscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { absoluteUrl } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(absoluteUrl("/?error=invalid-token"))
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
  })

  if (!subscriber) {
    return NextResponse.redirect(absoluteUrl("/?error=invalid-token"))
  }

  await prisma.newsletterSubscriber.delete({
    where: { id: subscriber.id },
  })

  return NextResponse.redirect(absoluteUrl("/?unsubscribed=true"))
}
```

---

## Step 6: Create Newsletter Send API (Admin)

Create `app/api/admin/newsletter/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getNewsletterHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

const sendNewsletterSchema = z.object({
  newsletterId: z.string(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { newsletterId } = sendNewsletterSchema.parse(body)

    // Get newsletter
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
    })

    if (!newsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      )
    }

    if (newsletter.sentAt) {
      return NextResponse.json(
        { error: "Newsletter already sent" },
        { status: 400 }
      )
    }

    // Get verified subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isVerified: true },
      select: { email: true, unsubscribeToken: true },
    })

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No subscribers to send to" },
        { status: 400 }
      )
    }

    // Send emails in batches (Resend limit: 100/day on free tier)
    const BATCH_SIZE = 50
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const unsubscribeUrl = absoluteUrl(
              `/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`
            )

            await sendEmail({
              to: subscriber.email,
              subject: newsletter.subject,
              html: getNewsletterHtml(
                newsletter.subject,
                newsletter.contentHtml,
                unsubscribeUrl
              ),
            })

            successCount++
          } catch (error) {
            console.error(`Failed to send to ${subscriber.email}:`, error)
            errorCount++
          }
        })
      )

      // Small delay between batches
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Update newsletter
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        sentAt: new Date(),
        recipientCount: successCount,
      },
    })

    return NextResponse.json({
      message: `Newsletter sent to ${successCount} subscribers`,
      successCount,
      errorCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Newsletter send error:", error)
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    )
  }
}
```

---

## Step 7: Create Newsletter CRUD API

Create `app/api/admin/newsletter/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"

const extensions = [StarterKit]

// GET /api/admin/newsletter - List newsletters
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")

  const [newsletters, total] = await Promise.all([
    prisma.newsletter.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsletter.count(),
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
}

// POST /api/admin/newsletter - Create newsletter
const createNewsletterSchema = z.object({
  subject: z.string().min(1).max(200),
  content: z.any(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { subject, content } = createNewsletterSchema.parse(body)

    const contentHtml = generateHTML(content, extensions)

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
        { error: error.errors[0].message },
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
```

---

## Step 8: Create Subscribe Form Component

Create `components/newsletter/subscribe-form.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle } from "lucide-react"

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
})

type SubscribeFormData = z.infer<typeof subscribeSchema>

interface SubscribeFormProps {
  className?: string
}

export function SubscribeForm({ className }: SubscribeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeSchema),
  })

  const onSubmit = async (data: SubscribeFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to subscribe")
      }

      setIsSuccess(true)
      reset()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span>Check your email to confirm!</span>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={className}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            {...register("email")}
            placeholder="Enter your email"
            type="email"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Subscribe
        </Button>
      </div>
      {errors.email && (
        <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
      )}
    </form>
  )
}
```

---

## Step 9: Create Inline Subscribe Widget

Create `components/newsletter/inline-subscribe.tsx`:

```typescript
import { SubscribeForm } from "./subscribe-form"

export function InlineSubscribe() {
  return (
    <div className="bg-muted/50 rounded-lg p-6 my-8">
      <h3 className="font-bold mb-2">Subscribe to our newsletter</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Get the latest articles delivered straight to your inbox.
      </p>
      <SubscribeForm />
    </div>
  )
}
```

---

## Step 10: Send Post Notification (Example Usage)

Create a utility function to send new post notifications:

```typescript
// lib/notifications.ts
import { prisma } from "@/lib/prisma"
import { sendEmail, getNewPostNotificationHtml } from "@/lib/email"
import { absoluteUrl } from "@/lib/utils"

export async function sendNewPostNotification(
  postId: string,
  onlyPaidSubscribers = false
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { name: true } },
    },
  })

  if (!post || post.status !== "PUBLISHED") {
    throw new Error("Post not found or not published")
  }

  // Get subscribers
  let subscribers
  if (onlyPaidSubscribers) {
    // Get users with paid subscriptions
    const paidUsers = await prisma.subscription.findMany({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
      include: {
        user: { select: { email: true } },
      },
    })
    subscribers = paidUsers.map((s) => ({
      email: s.user.email,
      unsubscribeToken: s.userId, // Use user ID as token for account-based unsub
    }))
  } else {
    subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isVerified: true },
      select: { email: true, unsubscribeToken: true },
    })
  }

  const postUrl = absoluteUrl(`/${post.slug}`)

  // Send in batches
  const BATCH_SIZE = 50
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          const unsubscribeUrl = absoluteUrl(
            `/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`
          )

          await sendEmail({
            to: subscriber.email,
            subject: `New: ${post.title}`,
            html: getNewPostNotificationHtml(
              post.title,
              postUrl,
              post.author.name,
              post.excerpt || "",
              unsubscribeUrl
            ),
          })
        } catch (error) {
          console.error(`Failed to notify ${subscriber.email}:`, error)
        }
      })
    )

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return subscribers.length
}
```

---

## Verification Checklist

- [ ] POST /api/newsletter/subscribe creates subscriber
- [ ] Verification email is sent
- [ ] GET /api/newsletter/verify confirms subscription
- [ ] GET /api/newsletter/unsubscribe removes subscriber
- [ ] Admin can create newsletters
- [ ] Admin can send newsletters
- [ ] Subscribe form works
- [ ] Double opt-in flow works
- [ ] Unsubscribe link works
- [ ] Email templates render correctly

---

## Files Created

```
lib/
├── email.ts
└── notifications.ts
app/api/newsletter/
├── subscribe/route.ts
├── verify/route.ts
└── unsubscribe/route.ts
app/api/admin/newsletter/
├── route.ts
└── send/route.ts
components/newsletter/
├── subscribe-form.tsx
└── inline-subscribe.tsx
```
