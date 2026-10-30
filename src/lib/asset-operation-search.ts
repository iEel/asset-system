import {
  assetOperationComponentLinkSelect,
  assetOperationSearchAssetSelect,
  assetOperationSearchCheckoutSelect,
  assetOperationSearchDetailAssetSelect,
  buildAssetOperationComponentLinkWhere,
  assetOperationSearchLimit,
  buildAssetOperationByIdWhere,
  buildAssetOperationRowDetail,
  buildAssetOperationSearchRow,
  buildAssetOperationSearchWheres,
  groupAssetOperationCheckinRows,
  openCheckoutWhere,
  rankAssetOperationMatches,
  type AssetOperationComponentLink,
  type AssetOperationDestinationLabels,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchAsset,
  type AssetOperationSearchCheckoutRecord,
  type AssetOperationSearchDetailAsset,
  type AssetOperationSearchInput,
} from "./asset-operation-search-rules.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// The reads of the transaction pages' asset search (server search spec 6.1-6.4). Bounded: at most 5 asset reads,
// 1 count, 2 fact reads and 2 label reads per answer, every `in` list at most 20 ids; with detail=1 (by id only): one
// read of the parent's installed links and one of their open handovers. The db is injected, as
// searchMaintenanceOptions, so the pages call it for the preselect and the tests fake it.

// Method syntax, so fakes may narrow args; the route passes `prisma as unknown as AssetOperationSearchDb`.
export type AssetOperationSearchDb = {
  asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  assetCheckout: { findMany(args: object): Promise<unknown[]> }
  assetComponent: { findMany(args: object): Promise<unknown[]> }
  maintenanceTicket: { findMany(args: object): Promise<unknown[]> }
  department: { findMany(args: object): Promise<unknown[]> }
  location: { findMany(args: object): Promise<unknown[]> }
}

type CodeName = { id: string; code: string; name: string }
type TagName = { id: string; assetTag: string; name: string }

async function readMatches(
  db: AssetOperationSearchDb,
  input: AssetOperationSearchInput,
): Promise<{ assets: AssetOperationSearchAsset[]; total: number }> {
  if (input.id) {
    const assets = await db.asset.findMany({
      where: buildAssetOperationByIdWhere(input),
      select: input.detail ? assetOperationSearchDetailAssetSelect : assetOperationSearchAssetSelect,
      take: 1,
    }) as AssetOperationSearchAsset[]
    return { assets, total: assets.length }
  }

  const wheres = buildAssetOperationSearchWheres(input)
  const list = (where: object) => db.asset.findMany({
    where,
    select: assetOperationSearchAssetSelect,
    orderBy: { assetTag: "asc" },
    take: assetOperationSearchLimit,
  }) as Promise<AssetOperationSearchAsset[]>
  // รับคืน reads one more tier, the held rows (S-R45); the count stays every text match.
  const [exact, held, prefix, contains, total] = await Promise.all([
    list(wheres.exact),
    wheres.held ? list(wheres.held) : Promise.resolve([]),
    list(wheres.prefix),
    list(wheres.text),
    db.asset.count({ where: wheres.text }),
  ])
  return { assets: rankAssetOperationMatches({ exact, held, prefix, contains }), total }
}

async function readDestinationLabels(
  db: AssetOperationSearchDb,
  checkouts: Iterable<AssetOperationSearchCheckoutRecord>,
): Promise<AssetOperationDestinationLabels> {
  const departmentIds = new Set<string>()
  const locationIds = new Set<string>()
  const assetIds = new Set<string>()
  for (const checkout of checkouts) {
    if (checkout.checkoutType === "department" && checkout.departmentId) departmentIds.add(checkout.departmentId)
    if (checkout.checkoutType === "location" && checkout.locationId) locationIds.add(checkout.locationId)
    if (checkout.checkoutType === "asset" && checkout.parentAssetId) assetIds.add(checkout.parentAssetId)
  }
  // No isActive filter: a handover may point at a since-closed department or location.
  const [departments, locations, assets] = await Promise.all([
    departmentIds.size
      ? db.department.findMany({ where: { id: { in: [...departmentIds] } }, select: { id: true, code: true, name: true } }) as Promise<CodeName[]>
      : Promise.resolve([]),
    locationIds.size
      ? db.location.findMany({ where: { id: { in: [...locationIds] } }, select: { id: true, code: true, name: true } }) as Promise<CodeName[]>
      : Promise.resolve([]),
    assetIds.size
      ? db.asset.findMany({ where: { id: { in: [...assetIds] } }, select: { id: true, assetTag: true, name: true } }) as Promise<TagName[]>
      : Promise.resolve([]),
  ])
  return {
    departments: new Map(departments.map((row) => [row.id, `${row.code} - ${row.name}`])),
    locations: new Map(locations.map((row) => [row.id, `${row.code} - ${row.name}`])),
    assets: new Map(assets.map((row) => [row.id, `${row.assetTag} - ${row.name}`])),
  }
}

// The chosen asset's detail (group 3 spec §7.1): its installed links, then the open handovers of those components.
async function readChosenDetail(db: AssetOperationSearchDb, asset: AssetOperationSearchDetailAsset) {
  const links = await db.assetComponent.findMany({
    where: buildAssetOperationComponentLinkWhere(asset.id),
    select: assetOperationComponentLinkSelect,
  }) as AssetOperationComponentLink[]
  const componentIds = [...new Set(links.map((link) => link.componentAssetId))]
  const handedOver = componentIds.length
    ? await db.assetCheckout.findMany({
        where: { assetId: { in: componentIds }, ...openCheckoutWhere },
        select: { assetId: true },
      }) as Array<{ assetId: string }>
    : []
  return buildAssetOperationRowDetail(asset, links, new Set(handedOver.map((checkout) => checkout.assetId)))
}

export async function searchAssetOperationOptions(
  db: AssetOperationSearchDb,
  input: AssetOperationSearchInput,
): Promise<AssetOperationSearchAnswer> {
  const { mode } = input
  const { assets, total } = await readMatches(db, input)
  if (assets.length === 0) return mode === "checkin" ? { mode, total, rows: [], groups: [] } : { mode, total, rows: [] }

  const ids = assets.map((asset) => asset.id)
  const [checkouts, repairs] = await Promise.all([
    db.assetCheckout.findMany({
      where: { assetId: { in: ids }, ...openCheckoutWhere },
      select: assetOperationSearchCheckoutSelect,
      orderBy: { checkoutDate: "desc" },
    }) as Promise<AssetOperationSearchCheckoutRecord[]>,
    db.maintenanceTicket.findMany({
      where: { ...openRepairRecordWhere, assetId: { in: ids } },
      select: { assetId: true },
    }) as Promise<Array<{ assetId: string }>>,
  ])
  // The latest open handover per asset wins, as firstIdByAssetId (asset-actions.ts).
  const openCheckoutByAssetId = new Map<string, AssetOperationSearchCheckoutRecord>()
  for (const checkout of checkouts) {
    if (!openCheckoutByAssetId.has(checkout.assetId)) openCheckoutByAssetId.set(checkout.assetId, checkout)
  }
  const repairAssetIds = new Set(repairs.map((repair) => repair.assetId))
  const labels = mode === "checkin" ? await readDestinationLabels(db, openCheckoutByAssetId.values()) : undefined

  const rows = assets.map((asset) => buildAssetOperationSearchRow(input, asset, {
    openCheckout: openCheckoutByAssetId.get(asset.id) ?? null,
    hasOpenRepair: repairAssetIds.has(asset.id),
    ...(labels ? { labels } : {}),
  }))
  if (input.detail) rows[0].detail = await readChosenDetail(db, assets[0] as AssetOperationSearchDetailAsset)
  return mode === "checkin" ? { mode, total, ...groupAssetOperationCheckinRows(rows) } : { mode, total, rows }
}
