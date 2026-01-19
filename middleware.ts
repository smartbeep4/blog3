import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

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

// Create edge-compatible auth instance
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isApiRoute = nextUrl.pathname.startsWith("/api")

  // Allow API routes to handle their own auth but still add security headers
  if (isApiRoute) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Auth redirects are handled by the authorized callback in auth.config.ts
  // Just add security headers to all responses
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
