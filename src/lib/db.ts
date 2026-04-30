import { PrismaClient } from "@prisma/client"
import { createMssqlAdapter } from "@/lib/db-config"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createMssqlAdapter(),
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
