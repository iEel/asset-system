import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { chunkAuditIds, foldTopCategories } from "@/lib/audit-round-counts-rules"
import {
  AUDIT_ROUND_OTHER_CATEGORY,
  buildAuditRoundItemWhere,
  parseAuditRoundListFilters,
  type AuditRoundItemWhereInput,
  type AuditRoundListFilters,
} from "@/lib/audit-round-result-filters"

// The round page's filter lookups (group 2 spec §8): what a pure where cannot know. AuditItem.expectedLocationId has
// no relation, so a room search first finds the round's rooms by code or name (P2-R5); "อื่น ๆ" needs the six
// categories the chip row shows (P2-R11). The page and the three exports call the same functions, so a list and its
// export hold the same rows. It never writes.
export async function findAuditRoundSearchLocationIds(roundId: string, search: string): Promise<string[]> {
  return (await findAuditRoundSearchLocations(roundId, search)).matchedRoomIds
}

// The round's own rooms and those the search names (P2-R5, P2-R25): the round page and the exports pass both, so the
// room branch sends the smaller of in / notIn (auditRoundSearchWhere, final review M3).
export async function findAuditRoundSearchLocations(roundId: string, search: string): Promise<{ roomIds: string[]; matchedRoomIds: string[] }> {
  const text = search.trim()
  if (!text) return { roomIds: [], matchedRoomIds: [] }
  // Only the round's own rooms, so the id list stays the size of the round's rooms, not the register's.
  const rooms = await prisma.auditItem.groupBy({
    by: ["expectedLocationId"],
    where: { auditRoundId: roundId },
  })
  const roomIds = rooms.map((room) => room.expectedLocationId)
  const matches = await Promise.all(
    chunkAuditIds(roomIds).map((chunk) =>
      prisma.location.findMany({ where: { id: { in: chunk }, OR: [{ code: { contains: text } }, { name: { contains: text } }] }, select: { id: true } }),
    ),
  )
  return { roomIds, matchedRoomIds: matches.flat().map((location) => location.id) }
}

// Exact: an asset has one item per round (@@unique([auditRoundId, assetId])) and every item where pins the round. No
// isActive filter: a deactivated asset's item still counts. In id order, so a fold of equal counts picks the same six on
// every request, here and on the round page (Task 3's auditRoundTopCategoryIds sorts the same way).
export async function countAuditRoundItemCategories(itemWhere: Prisma.AuditItemWhereInput): Promise<Array<{ categoryId: string; count: number }>> {
  const rows = await prisma.asset.groupBy({
    by: ["categoryId"],
    where: { auditItems: { some: itemWhere } },
    _count: { _all: true },
  })
  return rows
    .map((row) => ({ categoryId: row.categoryId, count: row._count._all }))
    .sort((left, right) => (left.categoryId < right.categoryId ? -1 : left.categoryId > right.categoryId ? 1 : 0))
}

export async function resolveAuditRoundListWhereInput(roundId: string, filters: AuditRoundListFilters): Promise<AuditRoundItemWhereInput> {
  const rooms = await findAuditRoundSearchLocations(roundId, filters.search)
  const input: AuditRoundItemWhereInput = { ...filters, roundId, expectedLocationIds: rooms.matchedRoomIds, roundLocationIds: rooms.roomIds }
  if (filters.categoryId !== AUDIT_ROUND_OTHER_CATEGORY) return input
  // Ranked over every result (P2-R11): the six stay put when the result tab changes, and every other filter counts.
  const base: AuditRoundItemWhereInput = { ...input, result: "all" }
  const rows = await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...base, categoryId: null }))
  return { ...input, shownCategoryIds: foldTopCategories(rows).top.map((row) => row.categoryId) }
}

// The three exports' filters: the page's params parsed the page's way. An unknown company, branch or category exports
// as if absent, as the page's redirect shows (R13); "อื่น ๆ" names itself "other".
export async function resolveAuditRoundExportFilters(roundId: string, searchParams: URLSearchParams) {
  const parsed = parseAuditRoundListFilters(Object.fromEntries(searchParams))
  const isOtherCategory = parsed.categoryId === AUDIT_ROUND_OTHER_CATEGORY
  const [company, branch, categoryRow] = await Promise.all([
    parsed.companyId ? prisma.company.findUnique({ where: { id: parsed.companyId }, select: { code: true } }) : Promise.resolve(null),
    parsed.branchId
      ? prisma.branch.findUnique({ where: { id: parsed.branchId }, select: { code: true, company: { select: { code: true } } } })
      : Promise.resolve(null),
    parsed.categoryId && !isOtherCategory
      ? prisma.assetCategory.findUnique({ where: { id: parsed.categoryId }, select: { code: true } })
      : Promise.resolve(null),
  ])
  const filters: AuditRoundListFilters = {
    ...parsed,
    companyId: company ? parsed.companyId : null,
    branchId: branch ? parsed.branchId : null,
    categoryId: isOtherCategory || categoryRow ? parsed.categoryId : null,
  }
  const whereInput = await resolveAuditRoundListWhereInput(roundId, filters)
  const category: { code: string } | null = isOtherCategory ? { code: AUDIT_ROUND_OTHER_CATEGORY } : categoryRow
  return { filters, whereInput, company, branch, category }
}
