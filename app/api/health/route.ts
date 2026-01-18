import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded"
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: "ok" | "error"
      latency?: number
      error?: string
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    checks: {
      database: {
        status: "ok",
      },
    },
  }

  try {
    // Check database connection with timeout
    const dbStartTime = Date.now()
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 5000)
      ),
    ])
    const dbLatency = Date.now() - dbStartTime
    healthStatus.checks.database.latency = dbLatency

    // If database latency is high, mark as degraded
    if (dbLatency > 1000) {
      healthStatus.status = "degraded"
    }

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    })
  } catch (error) {
    console.error("Health check failed:", error)

    healthStatus.status = "unhealthy"
    healthStatus.checks.database = {
      status: "error",
      error:
        error instanceof Error ? error.message : "Database connection failed",
    }

    return NextResponse.json(healthStatus, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    })
  }
}
