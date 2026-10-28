import type { Prisma } from "@prisma/client"

import {
  assetOperationModes,
  getBulkMoveVerdict,
  getCheckinVerdict,
  getCheckoutParentVerdict,
  getCheckoutVerdict,
  getTransferVerdict,
  type AssetOperationFacts,
  type AssetOperationMode,
  type AssetOperationVerdict,
} from "./asset-operation-eligibility.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"

// The rules of the transaction pages' bounded asset search (server search spec 6.1-6.3): the query, the where clauses,
// the ranking, the row and the รับคืน groups. Client-safe: the picker imports the constants, the href and the types.
// The verdicts are Task 1's (asset-operation-eligibility.ts), so the picker, the asset page and the save routes agree.

export const assetOperationSearchMinChars = 2
/** The longest text the search takes, counted as code points (final review M-6); bounds the LIKE work. */
export const assetOperationSearchMaxChars = 100
export const assetOperationSearchLimit = 20
export const assetOperationSearchPath = "/api/asset-operations/search"

/** At least 2 characters after trimming, counted as code points (as isAuditSearchReady). */
export function isAssetOperationSearchReady(text: string): boolean {
  return Array.from(text.trim()).length >= assetOperationSearchMinChars
}

/** Longer than assetOperationSearchMaxChars after trimming, counted as code points. */
export function isAssetOperationSearchTooLong(text: string): boolean {
  return Array.from(text.trim()).length > assetOperationSearchMaxChars
}

export type AssetOperationSearchInput = {
  mode: AssetOperationMode
  q: string
  id: string | null
  assignCustodian: boolean
  handedOverAssetId: string | null
}

const invalidSearch = { error: "Invalid search" } as const

function isAssetOperationMode(value: string | null): value is AssetOperationMode {
  return value !== null && (assetOperationModes as readonly string[]).includes(value)
}

export function parseAssetOperationSearch(params: URLSearchParams): AssetOperationSearchInput | { error: "Invalid search" } {
  const mode = params.get("mode")
  if (!isAssetOperationMode(mode)) return { ...invalidSearch }
  const id = params.get("id")?.trim() || null
  const q = params.get("q")?.trim() ?? ""
  if (!id && !isAssetOperationSearchReady(q)) return { ...invalidSearch }
  if (isAssetOperationSearchTooLong(q)) return { ...invalidSearch }
  return {
    mode,
    q,
    id,
    assignCustodian: params.get("assignCustodian") === "1",
    handedOverAssetId: mode === "checkoutParent" ? params.get("handedOverAssetId")?.trim() || null : null,
  }
}

/** Every client search URL is built here, with the names the route's parse reads (S-R21). */
export function buildAssetOperationSearchHref(input: {
  mode: AssetOperationMode
  q?: string
  id?: string
  assignCustodian?: boolean
  handedOverAssetId?: string | null
}): string {
  const params = new URLSearchParams()
  params.append("mode", input.mode)
  if (input.q) params.append("q", input.q)
  if (input.id) params.append("id", input.id)
  if (input.assignCustodian) params.append("assignCustodian", "1")
  if (input.handedOverAssetId) params.append("handedOverAssetId", input.handedOverAssetId)
  return `${assetOperationSearchPath}?${params.toString()}`
}

export const openCheckoutWhere = { isReturned: false, transactionStatus: "active" } satisfies Prisma.AssetCheckoutWhereInput

/** 6 of the register's own conditions (asset-list-query.ts assetSearchConditions): the codes, the name and the holder. */
export function assetOperationTextConditions(q: string): Prisma.AssetWhereInput[] {
  return [
    { assetTag: { contains: q } },
    { name: { contains: q } },
    { serialNumber: { contains: q } },
    { fixedAssetCode: { contains: q } },
    { custodian: { code: { contains: q } } },
    { custodian: { fullNameTh: { contains: q } } },
  ]
}

function baseWhere(input: AssetOperationSearchInput): Prisma.AssetWhereInput {
  return input.handedOverAssetId ? { isActive: true, NOT: { id: input.handedOverAssetId } } : { isActive: true }
}

export function buildAssetOperationSearchWheres(input: AssetOperationSearchInput): {
  text: Prisma.AssetWhereInput
  exact: Prisma.AssetWhereInput
  prefix: Prisma.AssetWhereInput
  /** รับคืน only: the text on assets with an open handover or a custodian (S-R45). */
  held?: Prisma.AssetWhereInput
} {
  const { q } = input
  const base = baseWhere(input)
  const text = assetOperationTextConditions(q)
  const codes = {
    exact: { ...base, OR: [{ assetTag: q }, { serialNumber: q }, { fixedAssetCode: q }] },
    prefix: { ...base, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }, { fixedAssetCode: { startsWith: q } }] },
  }
  if (input.mode !== "checkin") return { text: { ...base, OR: text }, ...codes }

  text.push(
    {
      checkouts: {
        some: {
          ...openCheckoutWhere,
          OR: [{ documentNo: { contains: q } }, { custodian: { code: { contains: q } } }, { custodian: { fullNameTh: { contains: q } } }],
        },
      },
    },
    // S-R47: the room an asset sits in finds it too.
    { currentLocation: { code: { contains: q } } },
    { currentLocation: { name: { contains: q } } },
  )
  return {
    text: { ...base, OR: text },
    ...codes,
    held: { ...base, AND: [{ OR: text }, { OR: [{ checkouts: { some: openCheckoutWhere } }, { custodianId: { not: null } }] }] },
  }
}

export function buildAssetOperationByIdWhere(input: AssetOperationSearchInput): Prisma.AssetWhereInput {
  return { ...baseWhere(input), id: input.id ?? undefined }
}

export const assetOperationSearchAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  ownershipType: true,
  custodianId: true,
  currentLocationId: true,
  conditionId: true,
  status: { select: { name: true, nameTh: true } },
  currentLocation: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.AssetSelect
export type AssetOperationSearchAsset = Prisma.AssetGetPayload<{ select: typeof assetOperationSearchAssetSelect }>

export const assetOperationSearchCheckoutSelect = {
  id: true,
  assetId: true,
  documentNo: true,
  checkoutType: true,
  handoverMode: true,
  checkoutDate: true,
  expectedReturnDate: true,
  conditionBefore: true,
  remark: true,
  custodianId: true,
  departmentId: true,
  locationId: true,
  parentAssetId: true,
  custodian: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.AssetCheckoutSelect
export type AssetOperationSearchCheckoutRecord = Prisma.AssetCheckoutGetPayload<{ select: typeof assetOperationSearchCheckoutSelect }>

export type AssetOperationDestinationLabels = {
  departments: ReadonlyMap<string, string>
  locations: ReadonlyMap<string, string>
  assets: ReadonlyMap<string, string>
}
export type AssetOperationCheckinHolder = { key: string; label: string | null; employeeId: string | null }
export type AssetOperationSearchCheckout = {
  id: string
  documentNo: string | null
  checkoutType: string
  handoverMode: string | null
  checkoutDate: string
  expectedReturnDate: string | null
  conditionBefore: string
  remark: string | null
  destinationLabel: string
}
export type AssetOperationSearchRow = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  /** status.nameTh */
  statusLabel: string
  /** Held: the holder's "code - fullNameTh"; else the location's "code - name". */
  placeLabel: string
  /** The current location's "code - name", "-" when it cannot be read (S-R47). */
  locationLabel: string
  currentLocationId: string
  conditionId: string
  eligible: boolean
  /** A full message key (root translator), null when eligible. */
  reasonKey: string | null
  // รับคืน only (the keys are absent in the other modes):
  /** The open handover (the custody panel's fields). */
  checkout?: AssetOperationSearchCheckout
  /** A holder and no handover: ข้อมูลเก่า. */
  legacy?: true
  /** The group; who returns it (the return-by prefill). */
  holderKey?: string
  holderLabel?: string | null
  holderEmployeeId?: string | null
  /** An open repair: the return goes into ส่งซ่อม under it (S-R43). Absent when there is none. */
  openRepair?: true
}
export type AssetOperationSearchGroup = { key: string; label: string | null; count: number }
export type AssetOperationSearchAnswer = {
  mode: AssetOperationMode
  total: number
  rows: AssetOperationSearchRow[]
  /** รับคืน only. */
  groups?: AssetOperationSearchGroup[]
}

/**
 * Exact codes first, then (รับคืน) the held rows, then codes that start with the text, then the rest; each asset at its
 * first appearance, at most 20. Each list is ordered by tag with take 20, so the first 20 of each contain the first 20
 * of the merge (S-R3, S-R45).
 */
export function rankAssetOperationMatches<T extends { id: string }>(lists: {
  exact: readonly T[]
  held?: readonly T[]
  prefix: readonly T[]
  contains: readonly T[]
}): T[] {
  const seen = new Set<string>()
  const ranked: T[] = []
  for (const row of [...lists.exact, ...(lists.held ?? []), ...lists.prefix, ...lists.contains]) {
    if (ranked.length >= assetOperationSearchLimit) break
    if (seen.has(row.id)) continue
    seen.add(row.id)
    ranked.push(row)
  }
  return ranked
}

export function getAssetOperationSearchVerdict(
  input: AssetOperationSearchInput,
  assetId: string,
  facts: AssetOperationFacts,
): AssetOperationVerdict {
  const pick = (verdict: AssetOperationVerdict): AssetOperationVerdict =>
    verdict.eligible ? { eligible: true, reasonKey: null } : { eligible: false, reasonKey: verdict.reasonKey }
  switch (input.mode) {
    case "checkout":
      return pick(getCheckoutVerdict(facts))
    case "checkoutParent":
      return pick(getCheckoutParentVerdict(facts, { handedOverAssetId: input.handedOverAssetId, assetId }))
    case "checkin":
      return pick(getCheckinVerdict(facts))
    case "transfer":
      return pick(getTransferVerdict(facts, { assignCustodian: input.assignCustodian }))
    case "bulkMove":
      return pick(getBulkMoveVerdict(facts))
  }
}

// A label that cannot be read is "-", never an id (S-R4, S-R23).
function readableLabel(label: string | null | undefined): string {
  return label || "-"
}

function destinationLabel(labels: ReadonlyMap<string, string>, id: string): string {
  return readableLabel(labels.get(id))
}

function personLabel(person: { code: string; fullNameTh: string } | null): string {
  return readableLabel(person && `${person.code} - ${person.fullNameTh}`)
}

function placeCodeLabel(place: { code: string; name: string } | null): string {
  return readableLabel(place && `${place.code} - ${place.name}`)
}

/** Who holds what รับคืน returns: the open handover's destination, else the asset's holder (ข้อมูลเก่า), else none. */
export function getCheckinHolder(
  openCheckout: AssetOperationSearchCheckoutRecord | null,
  asset: Pick<AssetOperationSearchAsset, "custodianId" | "custodian">,
  labels: AssetOperationDestinationLabels,
): AssetOperationCheckinHolder {
  if (openCheckout) {
    const { checkoutType, departmentId, locationId, parentAssetId, custodianId } = openCheckout
    if (checkoutType === "department" && departmentId) {
      return { key: `department:${departmentId}`, label: destinationLabel(labels.departments, departmentId), employeeId: null }
    }
    if (checkoutType === "location" && locationId) {
      return { key: `location:${locationId}`, label: destinationLabel(labels.locations, locationId), employeeId: null }
    }
    if (checkoutType === "asset" && parentAssetId) {
      return { key: `asset:${parentAssetId}`, label: destinationLabel(labels.assets, parentAssetId), employeeId: null }
    }
    if (custodianId) return { key: `employee:${custodianId}`, label: personLabel(openCheckout.custodian), employeeId: custodianId }
  }
  if (asset.custodianId) return { key: `employee:${asset.custodianId}`, label: personLabel(asset.custodian), employeeId: asset.custodianId }
  return { key: "none", label: null, employeeId: null }
}

const noLabels: AssetOperationDestinationLabels = { departments: new Map(), locations: new Map(), assets: new Map() }

export function buildAssetOperationSearchRow(
  input: AssetOperationSearchInput,
  asset: AssetOperationSearchAsset,
  context: {
    openCheckout: AssetOperationSearchCheckoutRecord | null
    hasOpenRepair: boolean
    labels?: AssetOperationDestinationLabels
  },
): AssetOperationSearchRow {
  const { openCheckout, hasOpenRepair } = context
  const facts: AssetOperationFacts = {
    statusName: asset.status.name,
    ownership: normalizeAssetOwnershipType(asset.ownershipType),
    custodianId: asset.custodianId,
    openCheckout: openCheckout && { id: openCheckout.id, handoverMode: openCheckout.handoverMode },
    hasOpenRepair,
  }
  const verdict = getAssetOperationSearchVerdict(input, asset.id, facts)
  const row: AssetOperationSearchRow = {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber,
    statusLabel: asset.status.nameTh,
    placeLabel: asset.custodian
      ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}`
      : `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
    locationLabel: placeCodeLabel(asset.currentLocation),
    currentLocationId: asset.currentLocationId,
    conditionId: asset.conditionId,
    eligible: verdict.eligible,
    reasonKey: verdict.reasonKey,
  }
  if (input.mode !== "checkin") return row

  const holder = getCheckinHolder(openCheckout, asset, context.labels ?? noLabels)
  if (openCheckout) {
    row.checkout = {
      id: openCheckout.id,
      documentNo: openCheckout.documentNo,
      checkoutType: openCheckout.checkoutType,
      handoverMode: openCheckout.handoverMode,
      checkoutDate: openCheckout.checkoutDate.toISOString(),
      expectedReturnDate: openCheckout.expectedReturnDate ? openCheckout.expectedReturnDate.toISOString() : null,
      conditionBefore: openCheckout.conditionBefore,
      remark: openCheckout.remark,
      destinationLabel: holder.label ?? "-",
    }
  } else if (asset.custodianId) {
    row.legacy = true
  }
  row.holderKey = holder.key
  row.holderLabel = holder.label
  row.holderEmployeeId = holder.employeeId
  if (hasOpenRepair) row.openRepair = true
  return row
}

/** รับคืน: groups follow their first row's rank, `none` last; the rows follow group by group (S-R4). */
export function groupAssetOperationCheckinRows(rows: readonly AssetOperationSearchRow[]): {
  rows: AssetOperationSearchRow[]
  groups: AssetOperationSearchGroup[]
} {
  const byKey = new Map<string, { group: AssetOperationSearchGroup; rows: AssetOperationSearchRow[] }>()
  for (const row of rows) {
    const key = row.holderKey ?? "none"
    const entry = byKey.get(key) ?? { group: { key, label: key === "none" ? null : row.holderLabel ?? null, count: 0 }, rows: [] }
    entry.group.count += 1
    entry.rows.push(row)
    byKey.set(key, entry)
  }
  const ordered = [...byKey.values()].sort((a, b) => Number(a.group.key === "none") - Number(b.group.key === "none"))
  return { rows: ordered.flatMap((entry) => entry.rows), groups: ordered.map((entry) => entry.group) }
}
