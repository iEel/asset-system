import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import {
  getCheckinVerdict,
  getCheckoutVerdict,
  getTransferVerdict,
  type AssetOperationFacts,
  type AssetOperationVerdict,
} from "./asset-operation-eligibility.ts"
import { buildAssetRegisterTransactionHref } from "./asset-operation-policy.ts"
import type { AssetOwnershipType } from "./asset-ownership.ts"
import { appendReturnTo } from "./asset-return-navigation.ts"
import { getRepairRecordCreateEffect } from "./repair-record-policy.ts"

// The one action rule of the register's rows and the asset page (group 1 spec §7.1): which step is next, which other
// transactions the ownership type has, their words and why one cannot run now. Pure: callers pass the open checkout,
// repair and disposal from dedicated queries, and the rule offers an action only when its API accepts it.

export type AssetOwnershipKind = AssetOwnershipType

export const assetActionKeys = [
  "checkout",
  "checkin",
  "transfer",
  "viewRepair",
  "recordRepair",
  "viewDisposal",
  "manageComponents",
  "bindLicense",
  "renewLicense",
] as const
export type AssetActionKey = (typeof assetActionKeys)[number]

/** `labelKey` and `reasonKey` are full message keys, read through the root translator. */
export type AssetAction = {
  key: AssetActionKey
  labelKey: string
  href: string | null
  enabled: boolean
  reasonKey: string | null
}

/** A primary is always an action that can run now. */
export type AssetPrimaryAction = AssetAction & { enabled: true; href: string; reasonKey: null }

export type AssetActionSet = { primary: AssetPrimaryAction | null; transactions: AssetAction[] }

export type AssetActionInput = {
  locale: string
  assetId: string
  /** The status's `name` ("Ready", "In Use", …). */
  statusName: string
  ownership: AssetOwnershipKind
  custodianId: string | null
  /** The open checkout (`isReturned: false, transactionStatus: "active"`), from a dedicated query. */
  openCheckoutId: string | null
  openCheckoutHandoverMode: string | null
  /** The open repair record (`openRepairRecordWhere`), from a dedicated query. */
  openRepairId: string | null
  /** The open disposal request (`openDisposalRequestWhere`), from a dedicated query. */
  openDisposalId: string | null
  returnTo: string
  can: { assetEdit: boolean; maintenanceCreate: boolean; maintenanceView: boolean; disposalView: boolean }
}

// The open request the disposal API refuses a second of (api/disposal-requests/route.ts). Typed with a mutable array
// so it can be spread into Prisma where-clauses.
export const openDisposalRequestWhere: { isActive: true; requestStatus: { in: string[] } } = {
  isActive: true,
  requestStatus: { in: ["pending", "approved"] },
}

/** The first row per asset wins; callers order newest first. */
export function firstIdByAssetId(rows: ReadonlyArray<{ id: string; assetId: string }>): Map<string, string> {
  const ids = new Map<string, string>()
  for (const row of rows) {
    if (!ids.has(row.assetId)) ids.set(row.assetId, row.id)
  }
  return ids
}

// Group 1 spec §7.1: the words follow the ownership type, on the register and the asset page alike. Full message keys, read through the root translator.
const ownershipActions: Record<AssetOwnershipKind, ReadonlyArray<readonly [AssetActionKey, string]>> = {
  personal: [["checkout", "asset.rowActionCheckout"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.rowActionTransfer"]],
  stock: [["checkout", "asset.quickIssueFromStock"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.quickMoveStock"]],
  shared: [["checkout", "asset.quickTemporaryHandover"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.quickRelocateShared"]],
  component: [["manageComponents", "asset.manageComponents"], ["transfer", "asset.quickMoveComponent"]],
  software_license: [["bindLicense", "asset.quickAssignLicense"], ["renewLicense", "asset.quickRenewLicense"]],
}

function available(key: AssetActionKey, labelKey: string, href: string): AssetPrimaryAction {
  return { key, labelKey, href, enabled: true, reasonKey: null }
}

function unavailable(key: AssetActionKey, labelKey: string, reasonKey: string): AssetAction {
  return { key, labelKey, href: null, enabled: false, reasonKey }
}

function isRunnable(action: AssetAction | undefined): action is AssetPrimaryAction {
  return Boolean(action?.enabled && action.href !== null)
}

function assetPath(input: AssetActionInput, page: "components" | "edit") {
  return `/${input.locale}/assets/${encodeURIComponent(input.assetId)}/${page}`
}

function factsOf(input: AssetActionInput): AssetOperationFacts {
  return {
    statusName: input.statusName,
    ownership: input.ownership,
    custodianId: input.custodianId,
    openCheckout: input.openCheckoutId ? { id: input.openCheckoutId, handoverMode: input.openCheckoutHandoverMode } : null,
    hasOpenRepair: Boolean(input.openRepairId),
  }
}

function fromVerdict(key: AssetActionKey, labelKey: string, verdict: AssetOperationVerdict, href: () => string): AssetAction {
  return verdict.eligible ? available(key, labelKey, href()) : unavailable(key, labelKey, verdict.reasonKey)
}

// The transaction pages' verdicts (asset-operation-eligibility.ts): one rule for this page, the pickers and the save routes.
function buildTableAction(input: AssetActionInput, key: AssetActionKey, labelKey: string): AssetAction {
  const { locale, assetId, ownership, openCheckoutId, returnTo } = input
  const facts = factsOf(input)

  switch (key) {
    case "checkout":
      return fromVerdict(key, labelKey, getCheckoutVerdict(facts), () => buildAssetRegisterTransactionHref(locale, assetId, "checkout", returnTo))

    // A return opens the open handover itself; a legacy return opens the asset.
    case "checkin": {
      const verdict = getCheckinVerdict(facts)
      return fromVerdict(key, labelKey, verdict, () => buildAssetRegisterTransactionHref(locale, assetId, "checkin", returnTo, verdict.path === "handover" ? openCheckoutId : null))
    }

    // A custodian (personal) is assign_custodian, a move without one is move_scope (user decision 2026-10-21 Y2).
    case "transfer":
      return fromVerdict(key, labelKey, getTransferVerdict(facts, { assignCustodian: ownership === "personal" }), () => buildAssetRegisterTransactionHref(locale, assetId, "transfer", returnTo))

    // Their pages and the edit and components APIs check no status.
    case "manageComponents":
      return available(key, labelKey, appendReturnTo(assetPath(input, "components"), returnTo))
    case "bindLicense":
      return available(key, labelKey, appendReturnTo(assetPath(input, "edit"), returnTo))
    case "renewLicense":
      // The warranty end field of the asset form.
      return available(key, labelKey, `${appendReturnTo(assetPath(input, "edit"), returnTo)}#asset-warranty-end`)

    default:
      throw new Error(`${key} is not an ownership action`)
  }
}

/**
 * "บันทึกซ่อม": the repair rule accepts some record now (unfinished or finished) and the person has maintenance:create.
 * No returnTo: the repair form goes back only to the repair list.
 */
export function getAssetRecordRepairAction(input: AssetActionInput): AssetPrimaryAction | null {
  if (!input.can.maintenanceCreate) return null
  const asset = {
    statusName: input.statusName,
    ownershipType: input.ownership,
    custodianId: input.custodianId,
    hasActiveCheckout: Boolean(input.openCheckoutId),
    hasOpenRecord: Boolean(input.openRepairId),
  }
  const accepted = [false, true].some((done) => getRepairRecordCreateEffect(asset, { done, outcome: "usable" }).error === null)
  if (!accepted) return null
  return available("recordRepair", "asset.quickMaintenance", `/${input.locale}/maintenance/new?assetId=${encodeURIComponent(input.assetId)}`)
}

export function getAssetActions(input: AssetActionInput): AssetActionSet {
  const status = normalizeAssetStateName(input.statusName)
  // An action the person may not take is left out, never shown as unavailable.
  const table = input.can.assetEdit
    ? ownershipActions[input.ownership].map(([key, labelKey]) => buildTableAction(input, key, labelKey))
    : []
  const find = (key: AssetActionKey) => table.find((action) => action.key === key)

  // No returnTo: the repair and disposal pages go back only to their own lists.
  const viewRepair = input.can.maintenanceView && input.openRepairId
    ? available("viewRepair", "asset.actionViewRepair", `/${input.locale}/maintenance/${encodeURIComponent(input.openRepairId)}`)
    : null
  const viewDisposal = input.can.disposalView && input.openDisposalId
    ? available("viewDisposal", "asset.actionViewDisposal", `/${input.locale}/disposal/${encodeURIComponent(input.openDisposalId)}`)
    : null

  const primary = pickPrimary()
  const others = table.filter((action) => action.key !== primary?.key)
  return {
    primary,
    transactions: [...others.filter((action) => action.enabled), ...others.filter((action) => !action.enabled)],
  }

  // The first rule that applies (group 1 spec §7.1, rules 1-7).
  function pickPrimary(): AssetPrimaryAction | null {
    const checkin = find("checkin")
    if (isRunnable(checkin)) return checkin
    const own = find("manageComponents") ?? find("bindLicense")
    if (isRunnable(own)) return own
    if (status === "ready") {
      const ready = input.ownership === "shared" ? find("transfer") : find("checkout")
      if (isRunnable(ready)) return ready
    }
    if ((status === "pending repair" || status === "under maintenance") && viewRepair) return viewRepair
    if (status === "pending repair" && !input.openRepairId) {
      const record = getAssetRecordRepairAction(input)
      if (record) return record
    }
    if (status === "pending disposal" && viewDisposal) return viewDisposal
    return null
  }
}
