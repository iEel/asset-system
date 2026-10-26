// What a round counts (group 2 spec §5). An out-of-scope scan creates an AuditItem in the round with
// auditResult "out_of_scope" (api/audit-rounds/[id]/scan/route.ts). The round's own items are its items without that
// result: only they count in a total, a progress bar, "ตรวจแล้ว x / y" and the dashboard's round numbers. The
// out-of-scope finds are counted apart, from the same rows. A re-scan of an out-of-scope find goes through the in-round
// path and overwrites its result (found / wrong_* / need_review), so it becomes an own item; the phone walk's register
// lookup fixes that in plan 3. Pure and client-safe: `import type` only, so node --test and the phone walk import it.
import type { Prisma } from "@prisma/client"

export const AUDIT_OUT_OF_SCOPE_RESULT = "out_of_scope"

export function isAuditRoundOwnItem(item: { auditResult: string | null }): boolean {
  return item.auditResult !== AUDIT_OUT_OF_SCOPE_RESULT
}

// auditResult is nullable, and a pending item's is null. Prisma's `not` compiles to `[auditResult] <> @p`, which drops
// NULL rows, so the null branch is spelled out.
export const auditRoundOwnItemWhere: Prisma.AuditItemWhereInput = {
  OR: [{ auditResult: null }, { auditResult: { not: AUDIT_OUT_OF_SCOPE_RESULT } }],
}

export const auditRoundOutOfScopeItemWhere: Prisma.AuditItemWhereInput = { auditResult: AUDIT_OUT_OF_SCOPE_RESULT }

// AND, so a caller's own OR (the search in buildAuditRoundItemWhere) survives.
export function withAuditRoundOwnItems(where: Prisma.AuditItemWhereInput): Prisma.AuditItemWhereInput {
  return { AND: [where, auditRoundOwnItemWhere] }
}

export type AuditRoundCountRow = { auditRoundId: string; auditStatus: string; auditResult: string | null; count: number }

export type AuditRoundCounts = { total: number; pending: number; checked: number; outOfScope: number }

export const emptyAuditRoundCounts: Readonly<AuditRoundCounts> = Object.freeze({ total: 0, pending: 0, checked: 0, outOfScope: 0 })

// Out-of-scope rows go to outOfScope only. `checked` comes from the status, not the result, because a reviewed item can
// have a null result. A round with no row is absent.
export function foldAuditRoundCounts(rows: readonly AuditRoundCountRow[]): Map<string, AuditRoundCounts> {
  const counts = new Map<string, AuditRoundCounts>()
  for (const row of rows) {
    let round = counts.get(row.auditRoundId)
    if (!round) {
      round = { ...emptyAuditRoundCounts }
      counts.set(row.auditRoundId, round)
    }
    if (!isAuditRoundOwnItem(row)) {
      round.outOfScope += row.count
      continue
    }
    round.total += row.count
    if (row.auditStatus === "pending") round.pending += row.count
    else round.checked += row.count
  }
  return counts
}

// SQL Server takes at most 2,100 parameters, so an id list that can grow with the register goes in chunks of 2,000.
export const AUDIT_ID_CHUNK_SIZE = 2000

export function chunkAuditIds<T>(ids: readonly T[], size: number = AUDIT_ID_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < ids.length; start += size) chunks.push(ids.slice(start, start + size))
  return chunks
}
