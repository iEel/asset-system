import { PrismaClient } from "@prisma/client"
import { createMssqlAdapter } from "@/lib/db-config"
import { isPrismaClientCacheUsable } from "@/lib/prisma-client-cache"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const cachedPrisma = globalForPrisma.prisma

export const prisma =
  cachedPrisma && isPrismaClientCacheUsable(cachedPrisma)
    ? cachedPrisma
    : new PrismaClient({
        adapter: createMssqlAdapter(),
      })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
