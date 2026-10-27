import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getAuditRoundCounts } from "@/lib/audit-round-counts"
import { chunkAuditIds, emptyAuditRoundCounts, type AuditRoundCounts } from "@/lib/audit-round-counts-rules"
import { findAuditRoundSearchLocationIds } from "@/lib/audit-round-list-lookups"
import { latestAuditResultOrderBy, latestAuditResultSelect, latestAuditResultWhere, pickLatestAuditResultAt } from "@/lib/latest-audit-result-rules"
import { listPageWindow, type ListPageState } from "@/lib/list-pagination"
import {
  auditPendingBaseWhere,
  auditPendingRoomWhere,
  buildAuditPendingListWhere,
  buildAuditPendingSearchWhere,
  foldAuditPendingRoomChips,
  type AuditPendingPlace,
  type AuditPendingRoomChip,
} from "@/lib/audit-pending-list-rules"

const pendingItemInclude = {
  asset: { select: { id: true, assetTag: true, name: true } },
} satisfies Prisma.AuditItemInclude

export type AuditPendingListItem = Prisma.AuditItemGetPayload<{ include: typeof pendingItemInclude }>

export type AuditPendingListData = {
  counts: AuditRoundCounts
  roomChips: { chips: AuditPendingRoomChip[]; current: string }
  items: AuditPendingListItem[]
  total: number
  places: Map<string, AuditPendingPlace>
  people: Map<string, AuditPendingPlace>
  lastAuditAt: Map<string, Date>
}

// The pending list's data (group 2 spec §9): the round-wide counts (the title and "ตรวจแล้ว x / y"), the room chips
// within the search, one page of rows, the names of the chips' rooms and the rows' rooms and custodians, and each
// row's ตรวจล่าสุด. Every count comes from the rows' own where (spec §5). It never writes.
export async function getAuditPendingListData({ roundId, searchText, locationFilter, listPage }: { roundId: string; searchText: string; locationFilter: string; listPage: ListPageState }): Promise<AuditPendingListData> {
  const [countsById, search] = await Promise.all([getAuditRoundCounts([roundId]), loadAuditPendingSearchWhere(roundId, searchText)])
  const roomGroups = await prisma.auditItem.groupBy({ by: ["expectedLocationId"], where: buildAuditPendingListWhere({ roundId, search, room: null }), _count: { _all: true } })
  const roomChips = foldAuditPendingRoomChips(roomGroups.map((group) => ({ locationId: group.expectedLocationId, count: group._count._all })), locationFilter)
  const where = buildAuditPendingListWhere({ roundId, search, room: auditPendingRoomWhere(locationFilter, roomChips.topRoomIds) })
  const { skip, take } = listPageWindow(listPage)
  const [items, total] = await Promise.all([
    prisma.auditItem.findMany({ where, include: pendingItemInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip, take }),
    prisma.auditItem.count({ where }),
  ])
  // Names by id, active or not: a room closed during the round keeps its name. At most 7 chip rooms and one page of rows.
  const placeIds = [...new Set([...roomChips.chips.flatMap((chip) => (chip.kind === "room" ? [chip.locationId] : [])), ...items.map((item) => item.expectedLocationId)])]
  const personIds = [...new Set(items.flatMap((item) => (item.expectedCustodianId ? [item.expectedCustodianId] : [])))]
  const assetIds = [...new Set(items.map((item) => item.asset.id))]
  const [locations, employees, auditRows] = await Promise.all([
    placeIds.length > 0 ? prisma.location.findMany({ where: { id: { in: placeIds } }, select: { id: true, code: true, name: true } }) : [],
    personIds.length > 0 ? prisma.employee.findMany({ where: { id: { in: personIds } }, select: { id: true, code: true, fullNameTh: true } }) : [],
    // ตรวจล่าสุด (P2-R13, P2-R32): the asset page's rule from the audit items, in one read for the page's assets (at most
    // 100 ids, the largest page size, so no chunks). A found-in-place scan writes no movement, so the items say it.
    assetIds.length > 0 ? prisma.auditItem.findMany({ where: { assetId: { in: assetIds }, ...latestAuditResultWhere }, orderBy: latestAuditResultOrderBy, select: latestAuditResultSelect }) : [],
  ])
  return {
    counts: countsById.get(roundId) ?? { ...emptyAuditRoundCounts },
    roomChips: { chips: roomChips.chips, current: roomChips.current },
    items,
    total,
    places: new Map(locations.map((location) => [location.id, { code: location.code, name: location.name }])),
    people: new Map(employees.map((employee) => [employee.id, { code: employee.code, name: employee.fullNameTh }])),
    lastAuditAt: pickLatestAuditResultAt(auditRows),
  }
}

// The search's rooms and people (P2-R10), so the where carries ids of this round only. The rooms are the round page's
// lookup (Task 2's findAuditRoundSearchLocationIds, P2-R25: the round's rooms by code or name, in chunks of 2,000),
// kept to the rooms that still have pending items; the people are the round's own pending custodians, matched by code
// or name in chunks of 2,000.
async function loadAuditPendingSearchWhere(roundId: string, searchText: string): Promise<Prisma.AuditItemWhereInput | null> {
  if (!searchText) return null
  const base = auditPendingBaseWhere(roundId)
  const [roomGroups, custodianGroups, roundRoomMatches] = await Promise.all([
    prisma.auditItem.groupBy({ by: ["expectedLocationId"], where: base }),
    prisma.auditItem.groupBy({ by: ["expectedCustodianId"], where: { AND: [base, { expectedCustodianId: { not: null } }] } }),
    findAuditRoundSearchLocationIds(roundId, searchText),
  ])
  const roomIds = roomGroups.map((group) => group.expectedLocationId)
  const pendingRoomIds = new Set(roomIds)
  const custodianIds = custodianGroups.flatMap((group) => (group.expectedCustodianId ? [group.expectedCustodianId] : []))
  const matchedPeople = await Promise.all(
    chunkAuditIds(custodianIds).map((chunk) => prisma.employee.findMany({ where: { id: { in: chunk }, OR: [{ code: { contains: searchText } }, { fullNameTh: { contains: searchText } }] }, select: { id: true } })),
  )
  return buildAuditPendingSearchWhere(searchText, {
    roomIds,
    // Only the pending rooms, so the in / notIn list stays within them (auditPendingIdMatchWhere).
    matchedRoomIds: roundRoomMatches.filter((id) => pendingRoomIds.has(id)),
    custodianIds,
    matchedCustodianIds: matchedPeople.flat().map((match) => match.id),
  })
}
