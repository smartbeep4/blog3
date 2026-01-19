import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import type { Provider } from "next-auth/providers"

// Local Role type matching Prisma enum for Edge compatibility
// (Cannot import from @prisma/client in Edge runtime)
type Role = "READER" | "AUTHOR" | "EDITOR" | "ADMIN"

// Build providers array dynamically based on env vars
// Note: Credentials provider authorize callback is handled in auth.ts (server-side only)
function getProviders(): Provider[] {
  const providers: Provider[] = [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Authorize is handled in the full auth.ts config
      authorize: () => null,
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

// Edge-compatible auth configuration (no Prisma, no Node.js-specific modules)
// This config is used by middleware which runs on Edge runtime
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: getProviders(),
  callbacks: {
    // JWT callback without database access for edge compatibility
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
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

    // Authorized callback for middleware
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedRoutes = ["/dashboard", "/admin", "/settings", "/bookmarks"]
      const adminRoutes = ["/admin"]
      const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"]

      const isProtectedRoute = protectedRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )
      const isAdminRoute = adminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )
      const isAuthRoute = authRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      // Redirect logged-in users away from auth pages
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Redirect non-logged-in users to login for protected routes
      if (isProtectedRoute && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl)
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
        return Response.redirect(loginUrl)
      }

      // Check admin routes
      if (isAdminRoute) {
        const userRole = auth?.user?.role
        if (userRole !== "ADMIN") {
          if (isLoggedIn) {
            return Response.redirect(new URL("/dashboard", nextUrl))
          }
          const loginUrl = new URL("/login", nextUrl)
          loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
          return Response.redirect(loginUrl)
        }
      }

      return true
    },
  },
}
