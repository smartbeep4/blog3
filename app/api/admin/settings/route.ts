import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })

    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings = await prisma.siteSettings.create({
        data: { id: "default" },
      })
      return NextResponse.json({ data: defaultSettings })
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  twitterHandle: z.string().max(50).optional().nullable(),
  facebookUrl: z.string().url().optional().nullable().or(z.literal("")),
  instagramUrl: z.string().url().optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  monthlyPrice: z.number().int().min(0).optional(),
  yearlyPrice: z.number().int().min(0).optional(),
  commentsEnabled: z.boolean().optional(),
  likesEnabled: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const data = updateSettingsSchema.parse(body)

    // Clean up empty strings to null for URL fields
    const cleanedData = {
      ...data,
      facebookUrl: data.facebookUrl || null,
      instagramUrl: data.instagramUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      twitterHandle: data.twitterHandle || null,
      siteDescription: data.siteDescription || null,
      logo: data.logo || null,
      favicon: data.favicon || null,
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...cleanedData },
      update: cleanedData,
    })

    return NextResponse.json({ data: settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
