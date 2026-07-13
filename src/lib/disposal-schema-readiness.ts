import { prisma } from "@/lib/db"

export type DisposalBatchSchemaReadiness = "ready" | "absent" | "unknown"

let disposalBatchSchemaReadiness: Promise<DisposalBatchSchemaReadiness> | undefined

export async function getDisposalBatchSchemaReadiness() {
  const currentCheck = disposalBatchSchemaReadiness ??= checkDisposalBatchSchema()
  const readiness = await currentCheck
  if (readiness === "unknown" && disposalBatchSchemaReadiness === currentCheck) {
    disposalBatchSchemaReadiness = undefined
  }
  return readiness
}

export async function isDisposalBatchSchemaReady() {
  return (await getDisposalBatchSchemaReadiness()) === "ready"
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
    return Number(rows[0]?.ready ?? 0) === 1 ? "ready" : "absent"
  } catch {
    return "unknown"
  }
}
