import type { Prisma } from "@prisma/client"

import { outstandingLinkWhere } from "./asset-component-outstanding.ts"
import type { AssetOperationOutstandingFact } from "./asset-operation-eligibility.ts"
import { openCheckoutWhere } from "./asset-operation-search-rules.ts"
import {
  buildBulkMoveListRow,
  buildBulkMoveListWhere,
  bulkMoveListAssetSelect,
  bulkMoveListOrderBy,
  bulkMoveListPageSize,
  type BulkMoveCategoryOption,
  type BulkMoveListAsset,
  type BulkMoveListInput,
  type BulkMoveListPage,
  type BulkMoveListRowFacts,
  type BulkMoveRoomOption,
  type BulkMoveTravellingComponent,
} from "./bulk-move-list-rules.ts"

// The bulk-move table's reads (group 3 spec §10.1, §10.3; plan 4 P4-R2, P4-R11, P4-R12): page.tsx renders the first
// page through readBulkMoveListPage and GET /api/asset-operations/bulk-move-list answers every later one. Bounded: one
// count, one page of 25 rows, then four fact reads whose `in` lists hold the page's ids only. A row's components are
// those syncInstalledComponentsWithParent would move (installed, not removed, active, no open handover of their own).
// The db is injected, as AssetOperationSearchDb, so the page passes prisma and the tests fake it.

// Method syntax, so fakes may narrow args; callers pass `prisma as unknown as BulkMoveListDb`.
export type BulkMoveListDb = {
  asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  assetCheckout: { findMany(args: object): Promise<unknown[]> }
  assetComponent: { findMany(args: object): Promise<unknown[]> }
  location: { findMany(args: object): Promise<unknown[]> }
  assetCategory: { findMany(args: object): Promise<unknown[]> }
}

const bulkMoveListCheckoutSelect = { id: true, assetId: true, handoverMode: true } satisfies Prisma.AssetCheckoutSelect
type BulkMoveListCheckoutRecord = Prisma.AssetCheckoutGetPayload<{ select: typeof bulkMoveListCheckoutSelect }>

const bulkMoveListOutstandingSelect = { id: true, componentAssetId: true, referenceId: true } satisfies Prisma.AssetComponentSelect
type BulkMoveListOutstandingRecord = Prisma.AssetComponentGetPayload<{ select: typeof bulkMoveListOutstandingSelect }>

/** An installed link the parent's sync would move, with the component's own open handovers counted (Decision 2). */
const bulkMoveListInstalledLinkSelect = {
  parentAssetId: true,
  componentAssetId: true,
  componentAsset: { select: { currentLocationId: true, _count: { select: { checkouts: { where: openCheckoutWhere } } } } },
} satisfies Prisma.AssetComponentSelect
type BulkMoveListInstalledLinkRecord = Prisma.AssetComponentGetPayload<{ select: typeof bulkMoveListInstalledLinkSelect }>

/** The installed link naming a page component's parent (P4-R1). */
const bulkMoveListParentLinkSelect = {
  componentAssetId: true,
  parentAssetId: true,
  parentAsset: { select: { assetTag: true } },
} satisfies Prisma.AssetComponentSelect
type BulkMoveListParentLinkRecord = Prisma.AssetComponentGetPayload<{ select: typeof bulkMoveListParentLinkSelect }>

/** Newest first, then id, so the first link per component wins (Decision 5). */
const newestLinkFirst = [{ updatedAt: "desc" }, { id: "asc" }] satisfies Prisma.AssetComponentOrderByWithRelationInput[]

function firstByKey<T, V>(rows: T[], key: (row: T) => string, value: (row: T) => V): Map<string, V> {
  const map = new Map<string, V>()
  for (const row of rows) if (!map.has(key(row))) map.set(key(row), value(row))
  return map
}

export async function readBulkMoveListPage(db: BulkMoveListDb, input: BulkMoveListInput): Promise<BulkMoveListPage> {
  const where = buildBulkMoveListWhere(input)
  const readRows = (page: number) => db.asset.findMany({
    where,
    select: bulkMoveListAssetSelect,
    orderBy: bulkMoveListOrderBy,
    skip: (page - 1) * bulkMoveListPageSize,
    take: bulkMoveListPageSize,
  }) as Promise<BulkMoveListAsset[]>

  let total: number
  let page: number
  let assets: BulkMoveListAsset[]
  if (input.page === 1) {
    page = 1
    ;[total, assets] = await Promise.all([db.asset.count({ where }), readRows(1)])
  } else {
    // The count first, so a stale or crafted page never sends a skip past the end (Decision 1).
    total = await db.asset.count({ where })
    page = Math.min(input.page, Math.max(1, Math.ceil(total / bulkMoveListPageSize)))
    assets = await readRows(page)
  }
  if (assets.length === 0) return { total, page, pageSize: bulkMoveListPageSize, rows: [] }

  const ids = assets.map((asset) => asset.id)
  const [checkouts, outstanding, installed, parents] = await Promise.all([
    db.assetCheckout.findMany({
      where: { assetId: { in: ids }, ...openCheckoutWhere },
      select: bulkMoveListCheckoutSelect,
      orderBy: { checkoutDate: "desc" },
    }) as Promise<BulkMoveListCheckoutRecord[]>,
    db.assetComponent.findMany({
      where: { componentAssetId: { in: ids }, ...outstandingLinkWhere },
      select: bulkMoveListOutstandingSelect,
      orderBy: newestLinkFirst,
    }) as Promise<BulkMoveListOutstandingRecord[]>,
    // syncInstalledComponentsWithParent's own filter (asset-component-sync.ts:115-122), for the page's parents.
    db.assetComponent.findMany({
      where: { parentAssetId: { in: ids }, status: "installed", removedAt: null, componentAsset: { isActive: true } },
      select: bulkMoveListInstalledLinkSelect,
    }) as Promise<BulkMoveListInstalledLinkRecord[]>,
    // An active parent only: a deactivated one can never be moved, so naming it would mislead (Decision 4).
    db.assetComponent.findMany({
      where: { componentAssetId: { in: ids }, status: "installed", removedAt: null, parentAsset: { isActive: true } },
      select: bulkMoveListParentLinkSelect,
      orderBy: newestLinkFirst,
    }) as Promise<BulkMoveListParentLinkRecord[]>,
  ])

  const openCheckoutByAssetId = firstByKey(checkouts, (checkout) => checkout.assetId,
    (checkout) => ({ id: checkout.id, handoverMode: checkout.handoverMode }))
  const outstandingByComponentId = firstByKey(outstanding, (link) => link.componentAssetId,
    (link): AssetOperationOutstandingFact => ({ linkId: link.id, checkinId: link.referenceId }))
  const parentByComponentId = firstByKey(parents, (link) => link.componentAssetId,
    (link) => ({ parentId: link.parentAssetId, parentTag: link.parentAsset.assetTag }))

  const travellingByParentId = new Map<string, BulkMoveTravellingComponent[]>()
  for (const link of installed) {
    if (link.componentAsset._count.checkouts > 0) continue // the sync skips it (asset-component-sync.ts:159-162)
    const list = travellingByParentId.get(link.parentAssetId) ?? []
    if (!list.some((component) => component.id === link.componentAssetId)) list.push({ id: link.componentAssetId, currentLocationId: link.componentAsset.currentLocationId })
    travellingByParentId.set(link.parentAssetId, list)
  }

  return {
    total,
    page,
    pageSize: bulkMoveListPageSize,
    rows: assets.map((asset) => {
      const facts: BulkMoveListRowFacts = {
        openCheckout: openCheckoutByAssetId.get(asset.id) ?? null,
        outstanding: outstandingByComponentId.get(asset.id) ?? null,
        // As read: buildBulkMoveListRow empties a refused row's list (Z14).
        travellingComponents: travellingByParentId.get(asset.id) ?? [],
        componentOf: parentByComponentId.get(asset.id) ?? null,
      }
      return buildBulkMoveListRow(asset, facts)
    }),
  }
}

type BulkMoveRoomRecord = { id: string; code: string; name: string; branchId: string }
type BulkMoveCategoryRecord = { id: string; code: string; name: string }

/** The page's room and category filters: active only, "code - name", by code (P4-R14, P4-R21). */
export async function readBulkMovePageOptions(db: BulkMoveListDb): Promise<{ rooms: BulkMoveRoomOption[]; categories: BulkMoveCategoryOption[] }> {
  const [rooms, categories] = await Promise.all([
    db.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, branchId: true },
      orderBy: { code: "asc" },
    }) as Promise<BulkMoveRoomRecord[]>,
    db.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }) as Promise<BulkMoveCategoryRecord[]>,
  ])
  return {
    rooms: rooms.map((room) => ({ id: room.id, label: `${room.code} - ${room.name}`, branchId: room.branchId })),
    categories: categories.map((category) => ({ id: category.id, label: `${category.code} - ${category.name}` })),
  }
}
