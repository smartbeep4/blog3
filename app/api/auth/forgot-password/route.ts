import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
// import { sendPasswordResetEmail } from "@/lib/email" // Agent 09

const schema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = schema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists with this email, a reset link has been sent",
      })
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    // Create new reset token
    const token = nanoid(32)
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires,
      },
    })

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    // await sendPasswordResetEmail(email, resetUrl)

    // Log token in development for testing
    if (process.env.NODE_ENV === "development") {
      console.log(`Password reset token for ${email}: ${token}`)
      console.log(
        `Reset URL: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`
      )
    }

    return NextResponse.json({
      message:
        "If an account exists with this email, a reset link has been sent",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
