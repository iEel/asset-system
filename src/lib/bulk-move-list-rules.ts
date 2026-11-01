import type { Prisma } from "@prisma/client"

import { getBulkMoveVerdict, type AssetOperationFacts, type AssetOperationOutstandingFact } from "./asset-operation-eligibility.ts"
import {
  assetOperationSearchAssetSelect,
  assetOperationTextConditions,
  isAssetOperationSearchReady,
  isAssetOperationSearchTooLong,
  splitAssetOperationSearchWords,
} from "./asset-operation-search-rules.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"

// The rules of the ย้ายที่ตั้งหลายรายการ list (group 3 spec §10.1, §10.3, §11; group 3 plan 4 P4-R2, P4-R11, P4-R22): the
// query, the href, the where clause, the order, the select and the row. Client-safe and pure: the list reader and endpoint
// (bulk-move-list.ts), the save route's cap and the page import it. A row's verdict is getBulkMoveVerdict's.

export const bulkMoveListPath = "/api/asset-operations/bulk-move-list"
export const bulkMoveListPageSize = 25
/** The most assets one move takes (P4-R10). */
export const bulkMoveMaxAssets = 100
/** The one order of the list (Z4): by tag, then id so equal tags page stably. No `as const`: findMany takes no readonly tuple. */
export const bulkMoveListOrderBy = [{ assetTag: "asc" }, { id: "asc" }] satisfies Prisma.AssetOrderByWithRelationInput[]

/** Ids are uuids (36 characters); anything longer is refused. */
const bulkMoveListIdMaxLength = 64

export type BulkMoveListInput = { q: string; locationId: string | null; categoryId: string | null; page: number }

function parseId(value: string | null): string | null | undefined {
  const id = value?.trim() ?? ""
  if (!id) return null
  return id.length > bulkMoveListIdMaxLength ? undefined : id
}

function parsePage(value: string | null): number | null {
  if (value === null || value === "") return 1
  if (!/^\d+$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page : null
}

/** The list's query; null when any value is refused (1 character, more than 100, a bad page, an over-long id). */
export function parseBulkMoveListQuery(params: URLSearchParams): BulkMoveListInput | null {
  const q = params.get("q")?.trim() ?? ""
  if ((q !== "" && !isAssetOperationSearchReady(q)) || isAssetOperationSearchTooLong(q)) return null
  const locationId = parseId(params.get("locationId"))
  const categoryId = parseId(params.get("categoryId"))
  const page = parsePage(params.get("page"))
  if (locationId === undefined || categoryId === undefined || page === null) return null
  return { q, locationId, categoryId, page }
}

/** q, locationId, categoryId, page, in that order; empty text, no filter and page 1 are left out. */
export function buildBulkMoveListHref(input: BulkMoveListInput): string {
  const params = new URLSearchParams()
  const q = input.q.trim()
  if (q) params.set("q", q)
  if (input.locationId !== null) params.set("locationId", input.locationId)
  if (input.categoryId !== null) params.set("categoryId", input.categoryId)
  if (input.page !== 1) params.set("page", String(input.page))
  const search = params.toString()
  return search ? `${bulkMoveListPath}?${search}` : bulkMoveListPath
}

/** Every active asset, refused ones included; the exact room and category; each word (at most 5) in one of the 8 fields. */
export function buildBulkMoveListWhere(input: Pick<BulkMoveListInput, "q" | "locationId" | "categoryId">): Prisma.AssetWhereInput {
  const words = splitAssetOperationSearchWords(input.q)
  return {
    isActive: true,
    ...(input.locationId ? { currentLocationId: input.locationId } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(words.length > 0 ? { AND: words.map((word) => ({ OR: assetOperationTextConditions(word) })) } : {}),
  }
}

/** A ส่วนควบ that moves with its parent (P4-R2). */
export type BulkMoveTravellingComponent = { id: string; currentLocationId: string | null }

export type BulkMoveListRow = {
  id: string
  assetTag: string
  name: string
  categoryLabel: string | null
  /** The English master name, for the badge's tone. */
  statusName: string
  /** The status's nameTh. */
  statusLabel: string
  locationId: string | null
  /** "code - name" */
  locationLabel: string | null
  /** "code - fullNameTh" */
  holderLabel: string | null
  branchId: string
  eligible: boolean
  reasonKey: string | null
  travellingComponents: BulkMoveTravellingComponent[]
  componentOf: { parentId: string; parentTag: string } | null
}
export type BulkMoveListPage = { total: number; page: number; pageSize: number; rows: BulkMoveListRow[] }
export type BulkMoveRoomOption = { id: string; label: string; branchId: string }
export type BulkMoveCategoryOption = { id: string; label: string }

export const bulkMoveListAssetSelect = {
  ...assetOperationSearchAssetSelect,
  branchId: true,
  category: { select: { code: true, name: true } },
} satisfies Prisma.AssetSelect
export type BulkMoveListAsset = Prisma.AssetGetPayload<{ select: typeof bulkMoveListAssetSelect }>

/** What the reader passes for one asset (Z15). */
export type BulkMoveListRowFacts = {
  openCheckout: { id: string; handoverMode: string | null } | null
  outstanding: AssetOperationOutstandingFact | null
  travellingComponents: BulkMoveTravellingComponent[]
  componentOf: { parentId: string; parentTag: string } | null
}

/** One row: getBulkMoveVerdict's verdict, the labels, and what travels; nothing travels with a refused row (Z14). */
export function buildBulkMoveListRow(asset: BulkMoveListAsset, facts: BulkMoveListRowFacts): BulkMoveListRow {
  const operationFacts: AssetOperationFacts = {
    statusName: asset.status.name,
    ownership: normalizeAssetOwnershipType(asset.ownershipType),
    custodianId: asset.custodianId,
    openCheckout: facts.openCheckout,
    outstanding: facts.outstanding,
    conditionName: asset.condition?.name ?? null,
    hasOpenRepair: false, // not read: the bulk move refuses no repair (spec §10.1), so the list reads none
  }
  const verdict = getBulkMoveVerdict(operationFacts)
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    categoryLabel: `${asset.category.code} - ${asset.category.name}`,
    statusName: asset.status.name,
    statusLabel: asset.status.nameTh,
    locationId: asset.currentLocationId,
    locationLabel: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
    holderLabel: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
    branchId: asset.branchId,
    eligible: verdict.eligible,
    reasonKey: verdict.reasonKey,
    travellingComponents: verdict.eligible ? facts.travellingComponents : [],
    componentOf: facts.componentOf,
  }
}
