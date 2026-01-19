import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { timingSafeEqual } from "crypto"

/**
 * Protected Admin Setup Endpoint
 *
 * This endpoint allows creating an initial admin user without shell access.
 * It requires a secret setup key passed in the Authorization header.
 *
 * Security features:
 * - Requires ADMIN_SETUP_KEY environment variable
 * - Uses timing-safe comparison to prevent timing attacks
 * - Idempotent: won't create duplicate users
 * - Strong password requirements
 *
 * Usage:
 *   POST /api/admin/setup
 *   Headers: Authorization: Bearer <ADMIN_SETUP_KEY>
 *   Body: { "email": "admin@example.com", "password": "SecurePass123", "name": "Admin" }
 *
 * Generate a secure key with:
 *   openssl rand -base64 32
 *   # or
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const setupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
})

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8")
    const bufB = Buffer.from(b, "utf8")

    // Ensure constant-time comparison even for different lengths
    if (bufA.length !== bufB.length) {
      // Still do a comparison to maintain constant time
      timingSafeEqual(bufA, bufA)
      return false
    }

    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if setup key is configured
    const setupKey = process.env.ADMIN_SETUP_KEY
    if (!setupKey || setupKey.length < 32) {
      console.error("ADMIN_SETUP_KEY not configured or too short")
      return NextResponse.json(
        { error: "Setup endpoint not configured" },
        { status: 503 }
      )
    }

    // Validate authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const providedKey = authHeader.slice(7) // Remove "Bearer " prefix

    // Timing-safe comparison
    if (!safeCompare(providedKey, setupKey)) {
      // Log failed attempts (but not the key itself)
      console.warn(
        `Failed admin setup attempt from ${request.headers.get("x-forwarded-for") || "unknown"}`
      )
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = setupSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((i) => i.message)
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 })
    }

    const { email, password, name } = validationResult.data
    const normalizedEmail = email.toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true },
    })

    if (existingUser) {
      // If user exists and is already admin, return success (idempotent)
      if (existingUser.role === "ADMIN") {
        return NextResponse.json({
          message: "Admin user already exists",
          created: false,
        })
      }

      // User exists but isn't admin - don't upgrade silently
      return NextResponse.json(
        {
          error:
            "A user with this email already exists but is not an admin. Use a different email or upgrade the user through the admin dashboard.",
        },
        { status: 409 }
      )
    }

    // Hash password with strong cost factor
    const passwordHash = await hash(password, 12)

    // Create admin user with subscription in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
          emailVerified: new Date(), // Admin is pre-verified
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })

      // Create PAID subscription for admin
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          tier: "PAID",
        },
      })

      return newUser
    })

    console.log(`Admin user created: ${user.email}`)

    return NextResponse.json({
      message: "Admin user created successfully",
      created: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Admin setup error:", error)
    return NextResponse.json(
      { error: "An error occurred during setup" },
      { status: 500 }
    )
  }
}

// Disallow other methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
