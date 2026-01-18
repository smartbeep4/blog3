# 15 - UI Components & Design System

## Overview

You are responsible for implementing the shared UI component library, design tokens, and layout components that ensure visual consistency across the application.

---

## Prerequisites

- Project setup complete (Agent 01)
- shadcn/ui components installed

---

## Design Philosophy

1. **Typography First**: Content readability is paramount
2. **Minimal Chrome**: Hide non-essential UI until needed
3. **Generous Whitespace**: Let content breathe
4. **Mobile First**: Design for mobile, enhance for desktop
5. **Dark Mode**: Full support, system preference respected

---

## Step 1: Design Tokens

Create `lib/design-tokens.ts`:

```typescript
export const tokens = {
  // Typography
  fonts: {
    sans: "var(--font-inter), system-ui, sans-serif",
    serif: "var(--font-lora), Georgia, serif",
  },

  // Spacing scale
  spacing: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "1rem",      // 16px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
    "2xl": "3rem",   // 48px
    "3xl": "4rem",   // 64px
  },

  // Content widths
  contentWidth: {
    narrow: "680px",   // Blog content
    default: "1024px", // General content
    wide: "1280px",    // Full-width sections
  },

  // Reading optimizations
  reading: {
    lineHeight: "1.7",
    fontSize: "1.125rem", // 18px
    maxWidth: "680px",
  },

  // Transitions
  transitions: {
    fast: "150ms ease",
    default: "200ms ease",
    slow: "300ms ease",
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },

  // Border radius
  radius: {
    sm: "0.25rem",
    default: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  },
}
```

---

## Step 2: Layout Components

### Container Component

Create `components/layout/container.tsx`:

```typescript
import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: "narrow" | "default" | "wide" | "full"
}

const sizeClasses = {
  narrow: "max-w-[680px]",
  default: "max-w-[1024px]",
  wide: "max-w-[1280px]",
  full: "max-w-full",
}

export function Container({
  children,
  className,
  size = "default",
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  )
}
```

### Header Component

Create `components/layout/header.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Container } from "./container"
import { Search, Menu, X, PenSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Explore" },
  ]

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "bg-background/95 backdrop-blur border-b shadow-sm"
          : "bg-transparent"
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold font-serif">
              {process.env.NEXT_PUBLIC_APP_NAME || "Blog"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/search">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            </Link>

            <ThemeToggle />

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback>
                        {session.user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/posts/new">
                      <PenSquare className="h-4 w-4 mr-2" />
                      New Post
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  {session.user.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/api/auth/signout">Sign out</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild className="hidden sm:flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!session && (
                <Link
                  href="/login"
                  className="text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        )}
      </Container>
    </header>
  )
}
```

### Footer Component

Create `components/layout/footer.tsx`:

```typescript
import Link from "next/link"
import { Container } from "./container"
import { SubscribeForm } from "@/components/newsletter/subscribe-form"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const links = {
    product: [
      { href: "/", label: "Home" },
      { href: "/search", label: "Explore" },
      { href: "/subscribe", label: "Subscribe" },
    ],
    company: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  }

  return (
    <footer className="border-t bg-muted/30">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold font-serif">
              {process.env.NEXT_PUBLIC_APP_NAME || "Blog"}
            </Link>
            <p className="mt-4 text-muted-foreground max-w-sm">
              A modern blogging platform for writers and readers. Share your
              stories with the world.
            </p>
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Subscribe to updates</p>
              <SubscribeForm className="max-w-sm" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-medium mb-4">Product</h3>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Company</h3>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} {process.env.NEXT_PUBLIC_APP_NAME || "Blog"}. All
            rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  )
}
```

### Theme Toggle

Create `components/theme-toggle.tsx`:

```typescript
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Step 3: Post Components

### Post Card

Create `components/posts/post-card.tsx`:

```typescript
import Link from "next/link"
import Image from "next/image"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: {
    slug: string
    title: string
    subtitle?: string | null
    excerpt?: string | null
    coverImage?: string | null
    publishedAt: Date | string
    readingTime?: number | null
    isPremium: boolean
    author: {
      name: string
      avatar?: string | null
    }
    categories?: { name: string; slug: string }[]
  }
  variant?: "default" | "compact" | "featured"
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  if (variant === "featured") {
    return (
      <Link href={`/${post.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-xl">
          {/* Cover Image */}
          <div className="relative aspect-[16/9] bg-muted">
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-serif text-muted-foreground/50">
                  {post.title[0]}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            {post.categories?.[0] && (
              <Badge className="mb-3">{post.categories[0].name}</Badge>
            )}

            <h2 className="text-2xl md:text-4xl font-bold font-serif text-white mb-2 group-hover:underline decoration-2 underline-offset-4">
              {post.title}
            </h2>

            {post.subtitle && (
              <p className="text-lg text-white/80 mb-4 line-clamp-2">
                {post.subtitle}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm text-white/70">
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage src={post.author.avatar || ""} />
                <AvatarFallback className="text-xs">
                  {post.author.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{post.author.name}</span>
              <span>·</span>
              <span>{formatDate(post.publishedAt)}</span>
              {post.readingTime && (
                <>
                  <span>·</span>
                  <span>{post.readingTime} min read</span>
                </>
              )}
              {post.isPremium && <Lock className="h-4 w-4 ml-1" />}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  if (variant === "compact") {
    return (
      <Link href={`/${post.slug}`} className="group flex gap-4">
        {post.coverImage && (
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={`/${post.slug}`} className="group block">
      <article className="space-y-4">
        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {post.isPremium && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Premium
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          {post.categories?.[0] && (
            <Badge variant="secondary" className="text-xs">
              {post.categories[0].name}
            </Badge>
          )}

          <h2 className="text-xl font-bold font-serif group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author.avatar || ""} />
              <AvatarFallback className="text-xs">
                {post.author.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{post.author.name}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
```

### Post Content Renderer

Create `components/posts/post-content.tsx`:

```typescript
import { cn } from "@/lib/utils"

interface PostContentProps {
  html: string
  className?: string
}

export function PostContent({ html, className }: PostContentProps) {
  return (
    <div
      className={cn(
        "prose prose-lg prose-slate dark:prose-invert max-w-none",
        // Headings
        "prose-headings:font-serif prose-headings:tracking-tight",
        "prose-h1:text-4xl prose-h1:mb-4",
        "prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4",
        "prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3",
        // Paragraphs
        "prose-p:text-lg prose-p:leading-relaxed prose-p:mb-6",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Lists
        "prose-ul:my-6 prose-ol:my-6",
        "prose-li:text-lg prose-li:leading-relaxed",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-primary",
        "prose-blockquote:pl-6 prose-blockquote:italic",
        "prose-blockquote:not-italic prose-blockquote:font-normal",
        // Code
        "prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-muted prose-pre:border",
        // Images
        "prose-img:rounded-lg prose-img:my-8",
        // Figures
        "prose-figure:my-8",
        "prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground",
        // HR
        "prose-hr:my-12",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

---

## Step 4: Common UI Patterns

### Empty State

Create `components/ui/empty-state.tsx`:

```typescript
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
```

### Loading Spinner

Create `components/ui/spinner.tsx`:

```typescript
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "sm" | "default" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
}

export function Spinner({ size = "default", className }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
    />
  )
}
```

### Page Header

Create `components/ui/page-header.tsx`:

```typescript
interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold font-serif">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
```

---

## Step 5: Dashboard Layout

Create `components/layout/dashboard-layout.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Settings,
  BarChart3,
  Bookmark,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Container } from "./container"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-muted/30">
      <Container className="py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </Container>
    </div>
  )
}
```

---

## Step 6: Export All Components

Create `components/layout/index.ts`:

```typescript
export { Container } from "./container"
export { Header } from "./header"
export { Footer } from "./footer"
export { DashboardLayout } from "./dashboard-layout"
```

Create `components/posts/index.ts`:

```typescript
export { PostCard } from "./post-card"
export { PostContent } from "./post-content"
```

---

## Step 7: Main Layout Usage

Update `app/(main)/layout.tsx`:

```typescript
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

Update `app/dashboard/layout.tsx`:

```typescript
import { Header } from "@/components/layout/header"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  )
}
```

---

## Verification Checklist

- [ ] Container component with size variants works
- [ ] Header with navigation and user menu works
- [ ] Footer with links and subscribe form works
- [ ] Theme toggle switches themes correctly
- [ ] Post card variants display correctly
- [ ] Post content renders HTML properly
- [ ] Dashboard layout with sidebar works
- [ ] Empty state component works
- [ ] All components are responsive
- [ ] Dark mode works throughout

---

## Files Created

```
lib/
└── design-tokens.ts
components/
├── layout/
│   ├── container.tsx
│   ├── header.tsx
│   ├── footer.tsx
│   ├── dashboard-layout.tsx
│   └── index.ts
├── posts/
│   ├── post-card.tsx
│   ├── post-content.tsx
│   └── index.ts
├── ui/
│   ├── empty-state.tsx
│   ├── spinner.tsx
│   └── page-header.tsx
└── theme-toggle.tsx
app/
├── (main)/layout.tsx
└── dashboard/layout.tsx
```
