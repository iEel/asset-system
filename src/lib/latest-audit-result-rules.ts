// The asset's latest audit result (group 1 asset detail R54; group 2 plan 2 P2-R32): its latest audit item with a
// result, in a round that is active and not cancelled, by the latest scan, then the latest change; the date is the
// scan, or the change for a not-found record with no scan. The asset page's frame reads it for one asset; the pending
// list reads it for one page of assets in one query. Pure: `import type` and relative `.ts` imports only.
import type { Prisma } from "@prisma/client"
import { auditRoundCoverageWhere } from "./audit-round-status.ts"

export const latestAuditResultWhere: Prisma.AuditItemWhereInput = { auditResult: { not: null }, auditRound: { isActive: true, status: auditRoundCoverageWhere } }

export const latestAuditResultOrderBy: Prisma.AuditItemOrderByWithRelationInput[] = [{ lastScanAt: "desc" }, { updatedAt: "desc" }]

export const latestAuditResultSelect = {
  assetId: true,
  auditResult: true,
  lastScanAt: true,
  updatedAt: true,
  auditRound: { select: { isActive: true, status: true } },
} satisfies Prisma.AuditItemSelect

export type LatestAuditResultRow = { assetId: string; auditResult: string | null; lastScanAt: Date | null; updatedAt: Date; auditRound: { isActive: boolean; status: string } }

export function latestAuditResultAt(item: { lastScanAt: Date | null; updatedAt: Date }): Date {
  return item.lastScanAt ?? item.updatedAt
}

// The where's rule applied by value too, so the pick does not rest on the rows' order: lastScanAt desc with a null
// last (SQL Server's desc, the asset page's findFirst), then updatedAt desc.
export function pickLatestAuditResultAt(rows: readonly LatestAuditResultRow[]): Map<string, Date> {
  const latest = new Map<string, LatestAuditResultRow>()
  for (const row of rows) {
    if (row.auditResult === null || !row.auditRound.isActive || row.auditRound.status === auditRoundCoverageWhere.not) continue
    const current = latest.get(row.assetId)
    if (!current || isLaterAuditResult(row, current)) latest.set(row.assetId, row)
  }
  return new Map([...latest].map(([assetId, row]) => [assetId, latestAuditResultAt(row)]))
}

function isLaterAuditResult(left: LatestAuditResultRow, right: LatestAuditResultRow): boolean {
  if (left.lastScanAt && right.lastScanAt && left.lastScanAt.getTime() !== right.lastScanAt.getTime()) return left.lastScanAt > right.lastScanAt
  if (left.lastScanAt && !right.lastScanAt) return true
  if (!left.lastScanAt && right.lastScanAt) return false
  return left.updatedAt > right.updatedAt
}
