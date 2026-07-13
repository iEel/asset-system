import { prisma } from "@/lib/db"

let disposalBatchSchemaReadiness: Promise<boolean> | undefined

export function isDisposalBatchSchemaReady() {
  disposalBatchSchemaReadiness ??= checkDisposalBatchSchema()
  return disposalBatchSchemaReadiness
}

async function checkDisposalBatchSchema() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ ready: number }>>(`
      SELECT CASE
        WHEN OBJECT_ID(N'dbo.disposal_batches', N'U') IS NOT NULL
         AND COL_LENGTH(N'dbo.disposal_requests', N'batchId') IS NOT NULL
        THEN 1 ELSE 0
      END AS ready
    `)
    return Number(rows[0]?.ready ?? 0) === 1
  } catch {
    return false
  }
}
