import path from "node:path"
import type { PrismaConfig } from "prisma/config"

export default {
  schema: path.join("prisma", "schema.prisma"),
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
} satisfies PrismaConfig
