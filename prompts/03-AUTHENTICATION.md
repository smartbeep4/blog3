# 03 - Authentication

## Overview

You are responsible for implementing the complete authentication system using NextAuth.js (Auth.js v5), including email/password authentication, OAuth providers, session management, and role-based access control.

---

## Prerequisites

- Project setup complete (Agent 01)
- Database schema implemented (Agent 02)
- Environment variables configured for auth

---

## Authentication Strategy

1. **Primary**: Email/Password with bcrypt hashing
2. **OAuth**: Google and GitHub (optional, configurable)
3. **Sessions**: JWT-based (works with serverless)
4. **Role-based**: READER, AUTHOR, EDITOR, ADMIN

---

## Step 1: Install Auth Dependencies

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

---

## Step 2: Configure NextAuth

Create `lib/auth.ts`:

```typescript
import { NextAuthOptions, getServerSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { Role } from "@prisma/client"

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: Role
    }
  }

  interface User {
    id: string
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signUp: "/register",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password")
        }

        const isValid = await compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        }
      },
    }),

    // Optional OAuth providers (only enabled if env vars exist)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }

      // Handle session update
      if (trigger === "update" && session) {
        token.name = session.name
        token.picture = session.image
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },

    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure user has correct defaults
      if (account?.provider !== "credentials") {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { subscription: true },
        })

        // Create subscription if not exists
        if (existingUser && !existingUser.subscription) {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              tier: "FREE",
            },
          })
        }
      }

      return true
    },
  },

  events: {
    async createUser({ user }) {
      // Create default subscription for new users
      await prisma.subscription.create({
        data: {
          userId: user.id,
          tier: "FREE",
        },
      })
    },
  },
}

// Helper to get session in server components
export async function getSession() {
  return getServerSession(authOptions)
}

// Helper to get current user
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      role: true,
      subscription: {
        select: {
          tier: true,
          stripeCurrentPeriodEnd: true,
        },
      },
    },
  })
}

// Check if user has required role
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Role[] = ["READER", "AUTHOR", "EDITOR", "ADMIN"]
  const userRoleIndex = roleHierarchy.indexOf(userRole)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  return userRoleIndex >= requiredRoleIndex
}

// Check if user can access premium content
export async function canAccessPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (!subscription) return false
  if (subscription.tier === "FREE") return false

  // Check if subscription is still active
  if (subscription.stripeCurrentPeriodEnd) {
    return subscription.stripeCurrentPeriodEnd > new Date()
  }

  return true
}
```

---

## Step 3: Create Auth API Route

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

---

## Step 4: Create Registration API

Create `app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "READER",
        subscription: {
          create: {
            tier: "FREE",
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // TODO: Send verification email (Agent 09)

    return NextResponse.json({
      message: "Account created successfully",
      user,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
```

---

## Step 5: Create Password Reset APIs

Create `app/api/auth/forgot-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
// import { sendPasswordResetEmail } from "@/lib/email" // Agent 09

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a reset link has been sent",
      })
    }

    // Delete any existing tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    // Create new token
    const token = nanoid(32)
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(email, token)

    console.log(`Password reset token for ${email}: ${token}`) // Dev only

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
```

Create `app/api/auth/reset-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = schema.parse(body)

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Update password
    const passwordHash = await hash(password, 12)
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })

    // Delete token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    })

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
```

---

## Step 6: Create Auth Components

Create `components/auth/login-form.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          {...register("password")}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          disabled={isLoading}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          disabled={isLoading}
        >
          GitHub
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
```

Create `components/auth/register-form.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Registration failed")
        return
      }

      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        router.push("/login")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Your name"
          {...register("name")}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

---

## Step 7: Create Auth Pages

Create `app/(auth)/login/page.tsx`:

```typescript
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign In",
}

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
```

Create `app/(auth)/register/page.tsx`:

```typescript
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Create Account",
}

export default async function RegisterPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-2">
            Join our community of writers and readers
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
```

Create `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      {children}
    </div>
  )
}
```

---

## Step 8: Create Auth Hook

Create `hooks/use-auth.ts`:

```typescript
"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const user = session?.user

  const hasRole = (role: Role): boolean => {
    if (!user?.role) return false
    const roleHierarchy: Role[] = ["READER", "AUTHOR", "EDITOR", "ADMIN"]
    const userRoleIndex = roleHierarchy.indexOf(user.role)
    const requiredRoleIndex = roleHierarchy.indexOf(role)
    return userRoleIndex >= requiredRoleIndex
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push("/")
    router.refresh()
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    logout,
  }
}
```

---

## Step 9: Create Session Provider

Create `components/providers/session-provider.tsx`:

```typescript
"use client"

import { SessionProvider } from "next-auth/react"

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>
}
```

Update `app/layout.tsx` to include the session provider:

```typescript
import { AuthSessionProvider } from "@/components/providers/session-provider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={...}>
        <AuthSessionProvider>
          <ThemeProvider ...>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
```

---

## Step 10: Create Protected Route Middleware

Create `middleware.ts` in the project root:

```typescript
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin routes require ADMIN role
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    // Dashboard routes require at least READER role
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/reset-password") ||
          pathname.startsWith("/api/auth")
        ) {
          return true
        }

        // Protected routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/posts/:path*",
    "/api/comments/:path*",
    "/api/upload/:path*",
  ],
}
```

---

## Step 11: Create Role Guards

Create `lib/guards.ts`:

```typescript
import { redirect } from "next/navigation"
import { getSession, hasRole as checkRole } from "@/lib/auth"
import { Role } from "@prisma/client"

export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    redirect("/login")
  }

  return session.user
}

export async function requireRole(role: Role) {
  const session = await getSession()

  if (!session?.user) {
    redirect("/login")
  }

  if (!checkRole(session.user.role, role)) {
    redirect("/dashboard")
  }

  return session.user
}

export async function requireAuthor() {
  return requireRole("AUTHOR")
}

export async function requireEditor() {
  return requireRole("EDITOR")
}

export async function requireAdmin() {
  return requireRole("ADMIN")
}
```

---

## API Usage Examples

### Protecting API Routes

```typescript
// app/api/posts/route.ts
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasRole(session.user.role, "AUTHOR")) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Create post...
}
```

### Protecting Server Components

```typescript
// app/dashboard/page.tsx
import { requireAuth } from "@/lib/guards"

export default async function DashboardPage() {
  const user = await requireAuth()

  return <div>Welcome, {user.name}</div>
}
```

---

## Verification Checklist

- [ ] Registration creates user with hashed password
- [ ] Login validates credentials and creates session
- [ ] JWT token contains user id and role
- [ ] Protected routes redirect to login
- [ ] Admin routes require ADMIN role
- [ ] OAuth sign-in creates user and subscription
- [ ] Password reset flow works
- [ ] Session persists across page navigations
- [ ] Logout clears session

---

## Files Created

```
lib/
├── auth.ts              # Auth configuration
└── guards.ts            # Route guards
app/
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts
│       ├── register/route.ts
│       ├── forgot-password/route.ts
│       └── reset-password/route.ts
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── register/page.tsx
components/
├── auth/
│   ├── login-form.tsx
│   └── register-form.tsx
├── providers/
│   └── session-provider.tsx
hooks/
└── use-auth.ts
middleware.ts
```

---

## Next Steps

With authentication in place, the following agents can proceed:
- **Agent 05**: Post Management (authenticated routes)
- **Agent 07**: Comments (user identification)
- **Agent 08**: Subscriptions (user billing)
