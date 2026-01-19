import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { Role } from "@prisma/client"
import type { Provider } from "next-auth/providers"
import { authConfig } from "./auth.config"

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: Role
    }
  }

  interface User {
    id: string
    role: Role
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: Role
  }
}

// Build providers array with full authorize callback (server-side only)
function getProviders(): Provider[] {
  const providers: Provider[] = [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password")
        }

        const isValid = await compare(password, user.passwordHash)

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
  ]

  // Add Google provider if configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    )
  }

  // Add GitHub provider if configured
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    )
  }

  return providers
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  providers: getProviders(),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role as Role
      }

      // Handle session update (e.g., when user updates profile)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name
        if (session.image !== undefined) token.picture = session.image
      }

      // Fetch fresh role from database on each request (for role updates)
      if (token.id && typeof token.id === "string") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        })
        if (dbUser) {
          token.role = dbUser.role
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },

    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure user has correct defaults
      if (account?.provider !== "credentials") {
        // Check if this is an existing user or new user
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { subscription: true },
        })

        // Create subscription if user exists but doesn't have one
        if (existingUser && !existingUser.subscription) {
          await prisma.subscription.create({
            data: {
              userId: user.id as string,
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
      // Create default FREE subscription for new OAuth users
      await prisma.subscription.create({
        data: {
          userId: user.id as string,
          tier: "FREE",
        },
      })
    },
  },
})

// Helper to get session in server components and API routes
export async function getSession() {
  return auth()
}

// Helper to get current user with full details
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
      createdAt: true,
      subscription: {
        select: {
          tier: true,
          stripeCurrentPeriodEnd: true,
        },
      },
    },
  })
}

// Check if user has required role (role hierarchy)
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

// Check if user is author or higher
export function isAuthor(role: Role): boolean {
  return hasRole(role, "AUTHOR")
}

// Check if user is editor or higher
export function isEditor(role: Role): boolean {
  return hasRole(role, "EDITOR")
}

// Check if user is admin
export function isAdmin(role: Role): boolean {
  return role === "ADMIN"
}
