// The round's pending list (group 2 spec §9). The rows, the search and the room chips read the item's expected room
// and custodian (bug 13), snapshotted when the round opened: the key the scan page groups its rooms by
// (audit-scan-session.ts buildRoomOptions). AuditItem has no relation to Location or Employee, so the search matches
// rooms and people by code or name through id lookups (the rooms through the round page's lookup, P2-R25), and the
// where carries the matched ids of the round's own pending items (P2-R10). Every filter goes into one AND list. Pure:
// `import type` and relative `.ts` imports only.
import type { Prisma } from "@prisma/client"
import { foldTopCategories } from "./audit-round-counts-rules.ts"
import { appendOperationalReturnTo } from "./operational-return-navigation.ts"

export const AUDIT_PENDING_ROOM_ALL = "all"
export const AUDIT_PENDING_ROOM_OTHER = "other"
export const AUDIT_PENDING_TOP_ROOMS = 6

// A pending item is always the round's own: an out-of-scope find is created "reviewed" (scan route), and a pending
// item's result is null.
export function auditPendingBaseWhere(roundId: string): Prisma.AuditItemWhereInput {
  return { auditRoundId: roundId, auditStatus: "pending" }
}

// The smaller list goes into the where: the matched ids, or notIn the round's other ids. Both lists come from the
// round's own pending items, so neither passes half of them, and a broad word ("นาย") that matches most custodians
// stays under SQL Server's 2,100 parameters. Prisma reads notIn [] as every row. SQL's NOT IN never matches NULL; the
// null branch is spelled out so the meaning does not rest on that.
export function auditPendingIdMatchWhere(field: "expectedLocationId" | "expectedCustodianId", all: readonly string[], matched: readonly string[]): Prisma.AuditItemWhereInput | null {
  if (matched.length === 0) return null
  const hit = new Set(matched)
  const rest = all.filter((id) => !hit.has(id))
  if (matched.length <= rest.length) return field === "expectedLocationId" ? { expectedLocationId: { in: [...matched] } } : { expectedCustodianId: { in: [...matched] } }
  return field === "expectedLocationId"
    ? { expectedLocationId: { notIn: rest } }
    : { AND: [{ expectedCustodianId: { not: null } }, { expectedCustodianId: { notIn: rest } }] }
}

export type AuditPendingSearchLookups = { roomIds: readonly string[]; matchedRoomIds: readonly string[]; custodianIds: readonly string[]; matchedCustodianIds: readonly string[] }

// The asset's code and name, and the item's expected room and custodian through their ids (bug 13). The two id
// branches are left out when nothing matched.
export function buildAuditPendingSearchWhere(searchText: string, lookups: AuditPendingSearchLookups): Prisma.AuditItemWhereInput | null {
  if (!searchText) return null
  const room = auditPendingIdMatchWhere("expectedLocationId", lookups.roomIds, lookups.matchedRoomIds)
  const custodian = auditPendingIdMatchWhere("expectedCustodianId", lookups.custodianIds, lookups.matchedCustodianIds)
  return {
    OR: [{ asset: { assetTag: { contains: searchText } } }, { asset: { name: { contains: searchText } } }, ...(room ? [room] : []), ...(custodian ? [custodian] : [])],
  }
}

// An unknown room id matches nothing; its chip names it "ไม่ทราบห้อง" (bug 16). "อื่น ๆ" is every room but the six
// shown (P2-R11).
export function auditPendingRoomWhere(locationFilter: string, topRoomIds: readonly string[]): Prisma.AuditItemWhereInput | null {
  if (!locationFilter) return null
  if (locationFilter === AUDIT_PENDING_ROOM_OTHER) return { expectedLocationId: { notIn: [...topRoomIds] } }
  return { expectedLocationId: locationFilter }
}

export function buildAuditPendingListWhere({ roundId, search, room }: { roundId: string; search: Prisma.AuditItemWhereInput | null; room: Prisma.AuditItemWhereInput | null }): Prisma.AuditItemWhereInput {
  return { AND: [auditPendingBaseWhere(roundId), ...(search ? [search] : []), ...(room ? [room] : [])] }
}

export type AuditPendingRoomGroup = { locationId: string; count: number }

export type AuditPendingRoomChip =
  | { key: "all"; kind: "all"; count: number }
  | { key: string; kind: "room"; locationId: string; count: number }
  | { key: "other"; kind: "other"; count: number }

// The six rooms with the most pending items, equal counts in id order so the six (and so "อื่น ๆ") do not change
// between two loads; the selected room stays visible outside the six or at 0, and "อื่น ๆ" still counts it, because its
// link opens it too (P2-R11).
export function foldAuditPendingRoomChips(groups: readonly AuditPendingRoomGroup[], locationFilter: string): { chips: AuditPendingRoomChip[]; topRoomIds: string[]; current: string } {
  const byId = [...groups].sort((left, right) => (left.locationId < right.locationId ? -1 : left.locationId > right.locationId ? 1 : 0))
  const { top, other } = foldTopCategories(byId, AUDIT_PENDING_TOP_ROOMS)
  const topRoomIds = top.map((group) => group.locationId)
  const selected = locationFilter && locationFilter !== AUDIT_PENDING_ROOM_OTHER && !topRoomIds.includes(locationFilter) ? locationFilter : null
  const chips: AuditPendingRoomChip[] = [
    { key: AUDIT_PENDING_ROOM_ALL as typeof AUDIT_PENDING_ROOM_ALL, kind: "all", count: groups.reduce((sum, group) => sum + group.count, 0) },
    ...top.map((group) => ({ key: group.locationId, kind: "room" as const, locationId: group.locationId, count: group.count })),
    ...(selected ? [{ key: selected, kind: "room" as const, locationId: selected, count: groups.find((group) => group.locationId === selected)?.count ?? 0 }] : []),
    ...(other.categories > 0 || locationFilter === AUDIT_PENDING_ROOM_OTHER ? [{ key: AUDIT_PENDING_ROOM_OTHER as typeof AUDIT_PENDING_ROOM_OTHER, kind: "other" as const, count: other.count }] : []),
  ]
  return { chips, topRoomIds, current: locationFilter || AUDIT_PENDING_ROOM_ALL }
}

export type AuditPendingPlace = { code: string; name: string }

export type AuditPendingCustodian = { kind: "none" } | { kind: "unknown" } | { kind: "person"; code: string; name: string }

// null for a room the lookup cannot find: the page reads "ไม่ทราบห้อง", never the id (bug 16).
export function describeAuditPendingPlace(locationId: string, places: ReadonlyMap<string, AuditPendingPlace>): AuditPendingPlace | null {
  return places.get(locationId) ?? null
}

export function describeAuditPendingCustodian(custodianId: string | null, people: ReadonlyMap<string, AuditPendingPlace>): AuditPendingCustodian {
  if (custodianId === null) return { kind: "none" }
  const person = people.get(custodianId)
  return person ? { kind: "person", ...person } : { kind: "unknown" }
}

export type AuditPendingRoomChipLabel = { place: AuditPendingPlace | null; showCode: boolean }

type AuditPendingRoomOnlyChip = Extract<AuditPendingRoomChip, { kind: "room" }>

// The room chips' names, by key in chip order; two chips of one name show their codes.
export function labelAuditPendingRoomChips(chips: readonly AuditPendingRoomChip[], places: ReadonlyMap<string, AuditPendingPlace>): Map<string, AuditPendingRoomChipLabel> {
  const rooms = chips
    .filter((chip): chip is AuditPendingRoomOnlyChip => chip.kind === "room")
    .map((chip) => ({ key: chip.key, place: places.get(chip.locationId) ?? null }))
  return new Map(
    rooms.map(({ key, place }): [string, AuditPendingRoomChipLabel] => [
      key,
      { place, showCode: place !== null && rooms.some((room) => room.key !== key && room.place?.name === place.name) },
    ]),
  )
}

// เดินตรวจต่อ (spec §9): back to the scan page the person came from (its URL keeps its own returnTo), or a new walk
// whose back button returns to the round page.
export function buildAuditPendingContinueScanHref({ locale, roundId, returnToHref, scanReturnToHref }: { locale: string; roundId: string; returnToHref: string; scanReturnToHref: string }): string {
  const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
  return returnToHref.split(/[?#]/)[0] === scanPath ? returnToHref : appendOperationalReturnTo(scanPath, scanReturnToHref)
}
