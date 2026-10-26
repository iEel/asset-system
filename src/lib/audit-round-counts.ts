import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { chunkAuditIds, emptyAuditRoundCounts, foldAuditRoundCounts, type AuditRoundCounts } from "@/lib/audit-round-counts-rules"

// One count for any set of rounds (group 2 spec §5): the round's own total, pending and checked, and the out-of-scope
// finds apart, from one groupBy per 2,000 rounds. `where` narrows the items (plan 2: company, branch, category,
// search). Every requested round is in the map, with zeros when it has no items. It never writes.
export async function getAuditRoundCounts(roundIds: readonly string[], where?: Prisma.AuditItemWhereInput): Promise<Map<string, AuditRoundCounts>> {
  const ids = [...new Set(roundIds)]
  const groups = await Promise.all(
    chunkAuditIds(ids).map((chunk) =>
      prisma.auditItem.groupBy({
        by: ["auditRoundId", "auditStatus", "auditResult"],
        where: where ? { AND: [{ auditRoundId: { in: chunk } }, where] } : { auditRoundId: { in: chunk } },
        _count: { _all: true },
      }),
    ),
  )
  const counts = foldAuditRoundCounts(
    groups.flat().map((group) => ({ auditRoundId: group.auditRoundId, auditStatus: group.auditStatus, auditResult: group.auditResult, count: group._count._all })),
  )
  for (const id of ids) if (!counts.has(id)) counts.set(id, { ...emptyAuditRoundCounts })
  return counts
}
