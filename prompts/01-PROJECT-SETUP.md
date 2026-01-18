# 01 - Project Setup

## Overview

You are responsible for scaffolding the entire Next.js project, installing dependencies, configuring Tailwind CSS, setting up shadcn/ui, and establishing the foundational project structure.

---

## Prerequisites

- Node.js 18.17+ installed
- npm or pnpm package manager
- Git initialized in repository

---

## Step 1: Create Next.js Project

Initialize a new Next.js 14+ project with the following configuration:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No (use root `app/` directory)
- App Router: Yes
- Import alias: `@/*`

---

## Step 2: Install Core Dependencies

### Production Dependencies

```bash
npm install @prisma/client next-auth@beta @auth/prisma-adapter
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-image @tiptap/extension-code-block-lowlight @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-highlight @tiptap/extension-typography
npm install lowlight
npm install stripe @stripe/stripe-js
npm install resend
npm install cloudinary
npm install date-fns
npm install slugify
npm install nanoid
npm install clsx tailwind-merge
npm install class-variance-authority
npm install lucide-react
npm install next-themes
```

### Development Dependencies

```bash
npm install -D prisma
npm install -D @types/node @types/react @types/react-dom
npm install -D prettier prettier-plugin-tailwindcss
npm install -D eslint-config-prettier
```

---

## Step 3: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Configuration options:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: tailwind.config.ts
- Components: @/components/ui
- Utils: @/lib/utils

### Install Required shadcn Components

```bash
npx shadcn@latest add button input textarea label
npx shadcn@latest add card avatar badge
npx shadcn@latest add dialog sheet popover dropdown-menu
npx shadcn@latest add select checkbox switch
npx shadcn@latest add tabs accordion
npx shadcn@latest add toast sonner
npx shadcn@latest add skeleton separator
npx shadcn@latest add form
npx shadcn@latest add alert
npx shadcn@latest add aspect-ratio
```

---

## Step 4: Configure Tailwind CSS

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '680px',
            lineHeight: '1.7',
            fontSize: '1.125rem',
          },
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config

export default config
```

Install typography plugin:

```bash
npm install -D @tailwindcss/typography tailwindcss-animate
```

---

## Step 5: Configure Global Styles

Update `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Typography for blog content */
.prose-blog {
  @apply prose prose-lg prose-slate dark:prose-invert max-w-none;
}

.prose-blog p {
  @apply text-lg leading-relaxed;
}

.prose-blog h1 {
  @apply text-4xl font-bold font-serif tracking-tight;
}

.prose-blog h2 {
  @apply text-3xl font-bold font-serif tracking-tight mt-12 mb-4;
}

.prose-blog h3 {
  @apply text-2xl font-semibold font-serif mt-8 mb-3;
}

.prose-blog blockquote {
  @apply border-l-4 border-primary pl-6 italic my-8;
}

.prose-blog img {
  @apply rounded-lg my-8;
}

.prose-blog pre {
  @apply rounded-lg my-6 p-4 overflow-x-auto;
}

.prose-blog code {
  @apply text-sm;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Selection color */
::selection {
  @apply bg-primary/20;
}

/* Focus visible styles */
*:focus-visible {
  @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
}
```

---

## Step 6: Set Up Fonts

Update `app/layout.tsx`:

```typescript
import type { Metadata } from "next"
import { Inter, Lora } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
})

export const metadata: Metadata = {
  title: {
    default: "BlogPlatform",
    template: "%s | BlogPlatform",
  },
  description: "A modern blogging platform for writers and readers",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Create `components/theme-provider.tsx`:

```typescript
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

---

## Step 7: Create Directory Structure

Create the following directories:

```bash
mkdir -p app/(auth)/login
mkdir -p app/(auth)/register
mkdir -p app/(auth)/forgot-password
mkdir -p app/(main)
mkdir -p app/dashboard/posts
mkdir -p app/dashboard/settings
mkdir -p app/admin
mkdir -p app/api/auth
mkdir -p app/api/posts
mkdir -p app/api/comments
mkdir -p app/api/upload
mkdir -p app/api/subscriptions
mkdir -p components/layout
mkdir -p components/posts
mkdir -p components/editor
mkdir -p components/comments
mkdir -p components/auth
mkdir -p components/subscription
mkdir -p lib
mkdir -p hooks
mkdir -p stores
mkdir -p types
mkdir -p prisma
```

---

## Step 8: Create Utility Files

Create `lib/utils.ts` (should be created by shadcn, but verify):

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim()
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + "..."
}

export function absoluteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}
```

---

## Step 9: Create Types File

Create `types/index.ts`:

```typescript
import type { User, Post, Comment, Category, Tag } from "@prisma/client"

// Extended types with relations
export type PostWithAuthor = Post & {
  author: Pick<User, "id" | "name" | "avatar">
}

export type PostWithDetails = Post & {
  author: Pick<User, "id" | "name" | "avatar" | "bio">
  categories: Category[]
  tags: Tag[]
  _count: {
    comments: number
    likes: number
  }
}

export type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "name" | "avatar">
  _count: {
    likes: number
  }
}

export type CommentWithReplies = CommentWithAuthor & {
  replies: CommentWithAuthor[]
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface PostFormData {
  title: string
  subtitle?: string
  content: any // Tiptap JSON
  coverImage?: string
  categories: string[]
  tags: string[]
  isPremium: boolean
  metaTitle?: string
  metaDescription?: string
}

// Editor types
export interface EditorState {
  content: any
  title: string
  subtitle: string
  coverImage: string | null
  isSaving: boolean
  lastSaved: Date | null
}

// Subscription types
export type SubscriptionTier = "FREE" | "PAID"

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isActive: boolean
  expiresAt: Date | null
}
```

---

## Step 10: Create Environment File Template

Create `.env.example`:

```env
# Database (Render PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl"

# OAuth Providers (optional)
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
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="BlogPlatform"
```

---

## Step 11: Configure ESLint

Update `.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "prefer-const": "warn"
  }
}
```

---

## Step 12: Create Prettier Config

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## Step 13: Update package.json Scripts

Ensure these scripts exist in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

---

## Step 14: Create Initial App Page

Create a placeholder `app/(main)/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold font-serif">BlogPlatform</h1>
      <p className="mt-4 text-muted-foreground">
        A modern blogging platform for writers and readers
      </p>
    </main>
  )
}
```

---

## Step 15: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Schema file (to be configured by Agent 02)
- `.env` - Environment file (update with your database URL)

---

## Verification Checklist

After completing setup, verify:

- [ ] `npm run dev` starts without errors
- [ ] Page loads at http://localhost:3000
- [ ] Tailwind styles are applied
- [ ] Dark mode toggle works (if theme provider is set up)
- [ ] All directories exist as specified
- [ ] TypeScript compiles without errors
- [ ] ESLint runs without errors

---

## Files Created

```
/
├── app/
│   ├── (auth)/
│   ├── (main)/
│   │   └── page.tsx
│   ├── dashboard/
│   ├── admin/
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn components
│   ├── theme-provider.tsx
│   └── [other directories]
├── lib/
│   └── utils.ts
├── types/
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Next Steps

After this setup is complete, the following agents can begin their work:
- **Agent 02**: Database schema setup
- **Agent 15**: UI component library
