import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin", "/settings", "/bookmarks"]

// Routes that require admin role
const adminRoutes = ["/admin"]

// Routes that are only accessible when NOT authenticated
const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]

// Security headers to add to all responses
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

// Helper function to add security headers to response
function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAdminRoute = adminRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isApiRoute = nextUrl.pathname.startsWith("/api")

  // Allow API routes to handle their own auth but still add security headers
  if (isApiRoute) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    const response = NextResponse.redirect(new URL("/dashboard", nextUrl))
    return addSecurityHeaders(response)
  }

  // Redirect non-logged-in users to login for protected routes
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    const response = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(response)
  }

  // Check admin routes
  if (isAdminRoute && userRole !== "ADMIN") {
    // If logged in but not admin, redirect to dashboard
    if (isLoggedIn) {
      const response = NextResponse.redirect(new URL("/dashboard", nextUrl))
      return addSecurityHeaders(response)
    }
    // If not logged in, redirect to login
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    const response = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(response)
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  return addSecurityHeaders(response)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
