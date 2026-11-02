import {
  firstIdByAssetId,
  getAssetActions,
  getAssetRecordRepairAction,
  openDisposalRequestWhere,
  outstandingFactByAssetId,
  type AssetActionInput,
} from "./asset-actions.ts"
import { outstandingLinkWhere } from "./asset-component-outstanding.ts"
import { openCheckoutWhere, splitAssetOperationSearchWords } from "./asset-operation-search-rules.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"
import { getRegisterHolderLine } from "./asset-register-row-rules.ts"
import {
  assetScanComponentNamesShown,
  assetScanSearchLimit,
  assetScanSearchSelect,
  buildAssetScanSearchWheres,
  getAssetScanMatch,
  isAssetScanExactMatch,
  rankAssetScanMatches,
  type AssetScanRow,
  type AssetScanSearchAnswer,
  type AssetScanSearchAsset,
  type AssetScanSearchInput,
} from "./asset-scan-search-rules.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// The reads of the scan page's search (group 4 plan 4 Task 4, spec §14). Bounded: 3 asset reads of at most 8 and 1
// count, then, when something matched, 5 fact reads in one batch (open handovers, open repairs, open disposals,
// outstanding links, installed components), each `in` list at most 8 ids: 9 reads, none per row. The db is injected, as
// searchAssetOperationOptions, so the tests fake it.

// Method syntax, so fakes may narrow args; the route passes `prisma as unknown as AssetScanSearchDb`.
export type AssetScanSearchDb = {
  asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  assetCheckout: { findMany(args: object): Promise<unknown[]> }
  maintenanceTicket: { findMany(args: object): Promise<unknown[]> }
  disposalRequest: { findMany(args: object): Promise<unknown[]> }
  assetComponent: { findMany(args: object): Promise<unknown[]> }
}

type IdByAsset = { id: string; assetId: string }

/** The scan page's own path: the transaction pages come back here (the asset page compares it with ===). */
function scanReturnTo(locale: string): string {
  return `/${locale}/asset-management/scan`
}

export async function searchAssetScan(
  db: AssetScanSearchDb,
  input: AssetScanSearchInput,
  can: AssetActionInput["can"],
): Promise<AssetScanSearchAnswer> {
  const wheres = buildAssetScanSearchWheres(input)
  const list = (where: object) => db.asset.findMany({
    where,
    select: assetScanSearchSelect,
    orderBy: { assetTag: "asc" },
    take: assetScanSearchLimit,
  }) as Promise<AssetScanSearchAsset[]>
  // The match count is the text tier's: exact and prefix hits are text hits too.
  const [exact, prefix, contains, total] = await Promise.all([
    list(wheres.exact),
    list(wheres.prefix),
    list(wheres.text),
    db.asset.count({ where: wheres.text }),
  ])
  const assets = rankAssetScanMatches({ exact, prefix, contains })
  if (assets.length === 0) return { total, rows: [] }

  const ids = assets.map((asset) => asset.id)
  const [checkouts, repairs, disposals, outstandingLinks, installedLinks] = await Promise.all([
    db.assetCheckout.findMany({
      where: { assetId: { in: ids }, ...openCheckoutWhere },
      select: { id: true, assetId: true, handoverMode: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<Array<IdByAsset & { handoverMode: string | null }>>,
    db.maintenanceTicket.findMany({
      where: { ...openRepairRecordWhere, assetId: { in: ids } },
      select: { id: true, assetId: true },
      orderBy: { reportedDate: "desc" },
    }) as Promise<IdByAsset[]>,
    db.disposalRequest.findMany({
      where: { ...openDisposalRequestWhere, assetId: { in: ids } },
      select: { id: true, assetId: true },
      orderBy: { requestDate: "desc" },
    }) as Promise<IdByAsset[]>,
    // The outstanding link holding a found asset (group 3 spec §8.5), newest first.
    db.assetComponent.findMany({
      where: { componentAssetId: { in: ids }, ...outstandingLinkWhere },
      select: { id: true, componentAssetId: true, referenceId: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    }) as Promise<Array<{ id: string; componentAssetId: string; referenceId: string | null }>>,
    // The installed components of a found asset: the filter of buildAssetOperationComponentLinkWhere, over the 8 ids.
    db.assetComponent.findMany({
      where: { parentAssetId: { in: ids }, status: "installed", removedAt: null, componentAsset: { isActive: true } },
      select: { parentAssetId: true, componentAsset: { select: { name: true } } },
      orderBy: [{ installedAt: "asc" }, { id: "asc" }],
    }) as Promise<Array<{ parentAssetId: string; componentAsset: { name: string } }>>,
  ])

  // The latest open handover per asset wins, as the register.
  const openCheckoutByAssetId = new Map<string, IdByAsset & { handoverMode: string | null }>()
  for (const checkout of checkouts) {
    if (!openCheckoutByAssetId.has(checkout.assetId)) openCheckoutByAssetId.set(checkout.assetId, checkout)
  }
  const openRepairIdByAssetId = firstIdByAssetId(repairs)
  const openDisposalIdByAssetId = firstIdByAssetId(disposals)
  const outstandingByAssetId = outstandingFactByAssetId(outstandingLinks)
  const componentNamesByAssetId = new Map<string, string[]>()
  for (const link of installedLinks) {
    const names = componentNamesByAssetId.get(link.parentAssetId) ?? []
    names.push(link.componentAsset.name)
    componentNamesByAssetId.set(link.parentAssetId, names)
  }

  const { locale, q } = input
  const words = splitAssetOperationSearchWords(q)
  const label = (state: { name: string; nameTh: string }) => (locale === "en" ? state.name : state.nameTh)
  const rows = assets.map((asset): AssetScanRow => {
    const ownership = normalizeAssetOwnershipType(asset.ownershipType)
    const openCheckout = openCheckoutByAssetId.get(asset.id) ?? null
    const actionInput: AssetActionInput = {
      locale,
      assetId: asset.id,
      statusName: asset.status.name,
      ownership,
      custodianId: asset.custodianId,
      openCheckoutId: openCheckout?.id ?? null,
      openCheckoutHandoverMode: openCheckout?.handoverMode ?? null,
      openRepairId: openRepairIdByAssetId.get(asset.id) ?? null,
      openDisposalId: openDisposalIdByAssetId.get(asset.id) ?? null,
      conditionName: asset.condition.name,
      outstanding: outstandingByAssetId.get(asset.id) ?? null,
      returnTo: scanReturnTo(locale),
      can,
    }
    const actions = getAssetActions(actionInput)
    const componentNames = componentNamesByAssetId.get(asset.id) ?? []
    return {
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      serialNumber: asset.serialNumber,
      href: `/${locale}/assets/${asset.id}`,
      status: { name: asset.status.name, label: label(asset.status) },
      condition: { name: asset.condition.name, label: label(asset.condition) },
      holder: getRegisterHolderLine({
        ownership,
        custodian: asset.custodian ? { name: asset.custodian.fullNameTh, departmentName: asset.custodian.department?.name ?? null } : null,
      }),
      room: asset.currentLocation ? { name: asset.currentLocation.name, branchName: asset.currentLocation.branch?.name ?? null } : null,
      components: { count: componentNames.length, names: componentNames.slice(0, assetScanComponentNamesShown) },
      match: getAssetScanMatch(asset, q, words),
      exact: isAssetScanExactMatch(asset, q),
      // A phone card leaves out what cannot run now (P4-R7).
      actions: { primary: actions.primary, transactions: actions.transactions.filter((action) => action.enabled && action.href !== null) },
      recordRepair: actions.primary?.key === "recordRepair" ? null : getAssetRecordRepairAction(actionInput),
      printLabelHref: `/${locale}/assets/${asset.id}/label`,
    }
  })
  return { total, rows }
}
