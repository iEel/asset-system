import type { Prisma } from "@prisma/client"

import {
  assetOperationModes,
  getBulkMoveVerdict,
  getCheckinVerdict,
  getCheckoutVerdict,
  getTransferVerdict,
  type AssetOperationFacts,
  type AssetOperationMode,
  type AssetOperationOutstandingFact,
  type AssetOperationVerdict,
} from "./asset-operation-eligibility.ts"
import { normalizeAssetOwnershipType, type AssetOwnershipType } from "./asset-ownership.ts"
import type { AssetPhotoPreview } from "./asset-photo-preview.ts"
import { getLateReturnOutcome } from "./component-late-return.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

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

/** The most words a search reads; each must match a field (group 3 spec §11, P1-R6). */
export const assetOperationSearchMaxWords = 5

/** Split on whitespace; duplicates dropped (compared lower-cased, first spelling kept); then the first 5, in typed order. */
export function splitAssetOperationSearchWords(q: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const word of q.split(/\s+/)) {
    if (!word) continue
    const key = word.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    words.push(word)
    if (words.length >= assetOperationSearchMaxWords) break
  }
  return words
}

export type AssetOperationSearchInput = {
  mode: AssetOperationMode
  q: string
  id: string | null
  assignCustodian: boolean
  /** By id only, with detail=1: the row carries the chosen asset's detail. Absent otherwise. */
  detail?: true
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
    ...(id && params.get("detail") === "1" ? { detail: true as const } : {}),
  }
}

/** Every client search URL is built here, with the names the route's parse reads (S-R21). */
export function buildAssetOperationSearchHref(input: {
  mode: AssetOperationMode
  q?: string
  id?: string
  assignCustodian?: boolean
  detail?: boolean
}): string {
  const params = new URLSearchParams()
  params.append("mode", input.mode)
  if (input.q) params.append("q", input.q)
  if (input.id) params.append("id", input.id)
  if (input.assignCustodian) params.append("assignCustodian", "1")
  if (input.detail) params.append("detail", "1")
  return `${assetOperationSearchPath}?${params.toString()}`
}

export const openCheckoutWhere = { isReturned: false, transactionStatus: "active" } satisfies Prisma.AssetCheckoutWhereInput

/**
 * The register's 6 (asset-list-query.ts assetSearchConditions), then the asset's and the holder's department names
 * (group 3 spec §11).
 */
export function assetOperationTextConditions(word: string): Prisma.AssetWhereInput[] {
  return [
    { assetTag: { contains: word } },
    { name: { contains: word } },
    { serialNumber: { contains: word } },
    { fixedAssetCode: { contains: word } },
    { custodian: { code: { contains: word } } },
    { custodian: { fullNameTh: { contains: word } } },
    { department: { name: { contains: word } } },
    { custodian: { department: { name: { contains: word } } } },
  ]
}

/** One word's clause: any field; รับคืน adds the open handover and the current room (S-R47). */
function wordClause(mode: AssetOperationMode, word: string): Prisma.AssetWhereInput {
  const conditions = assetOperationTextConditions(word)
  if (mode !== "checkin") return { OR: conditions }
  return {
    OR: [
      ...conditions,
      {
        checkouts: {
          some: {
            ...openCheckoutWhere,
            OR: [{ documentNo: { contains: word } }, { custodian: { code: { contains: word } } }, { custodian: { fullNameTh: { contains: word } } }],
          },
        },
      },
      // S-R47: the room an asset sits in finds it too.
      { currentLocation: { code: { contains: word } } },
      { currentLocation: { name: { contains: word } } },
    ],
  }
}

export function buildAssetOperationSearchWheres(input: AssetOperationSearchInput): {
  text: Prisma.AssetWhereInput
  exact: Prisma.AssetWhereInput
  prefix: Prisma.AssetWhereInput
  /** รับคืน only: the text on assets with an open handover or a custodian (S-R45). */
  held?: Prisma.AssetWhereInput
} {
  const { q } = input
  const base = { isActive: true }
  // Every word must match a field (AND over words, OR over fields); the code tiers keep the whole text (spec §11).
  const clauses = splitAssetOperationSearchWords(q).map((word) => wordClause(input.mode, word))
  const text: Prisma.AssetWhereInput = clauses.length === 1 ? { ...base, ...clauses[0] } : { ...base, AND: clauses }
  const codes = {
    exact: { ...base, OR: [{ assetTag: q }, { serialNumber: q }, { fixedAssetCode: q }] },
    prefix: { ...base, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }, { fixedAssetCode: { startsWith: q } }] },
  }
  if (input.mode !== "checkin") return { text, ...codes }

  return {
    text,
    ...codes,
    held: { ...base, AND: [...clauses, { OR: [{ checkouts: { some: openCheckoutWhere } }, { custodianId: { not: null } }] }] },
  }
}

export function buildAssetOperationByIdWhere(input: AssetOperationSearchInput): Prisma.AssetWhereInput {
  return { isActive: true, id: input.id ?? undefined }
}

export const assetOperationSearchAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  ownershipType: true,
  modelId: true,
  custodianId: true,
  currentLocationId: true,
  conditionId: true,
  status: { select: { name: true, nameTh: true } },
  condition: { select: { name: true } },
  currentLocation: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.AssetSelect
export type AssetOperationSearchAsset = Prisma.AssetGetPayload<{ select: typeof assetOperationSearchAssetSelect }>

/**
 * The by-id read with detail=1 (group 3 spec §7.1, §9.2): the list select, plus the department, the asset's branch (its id
 * too: branch names repeat across companies) and the room's branch, and the holder's active flag and own department. The
 * holder and their department are read without isActive: a holder who left still decides a held asset's department (plan
 * 3 P3-R3, P3-R10).
 */
export const assetOperationSearchDetailAssetSelect = {
  ...assetOperationSearchAssetSelect,
  departmentId: true,
  branchId: true,
  department: { select: { code: true, name: true } },
  branch: { select: { name: true } },
  currentLocation: { select: { code: true, name: true, branch: { select: { name: true } } } },
  custodian: { select: { code: true, fullNameTh: true, isActive: true, departmentId: true, department: { select: { name: true } } } },
} satisfies Prisma.AssetSelect
export type AssetOperationSearchDetailAsset = Prisma.AssetGetPayload<{ select: typeof assetOperationSearchDetailAssetSelect }>

export const assetOperationComponentLinkSelect = {
  componentAssetId: true,
  componentAsset: { select: { assetTag: true, name: true, currentLocation: { select: { code: true, name: true } } } },
} satisfies Prisma.AssetComponentSelect
export type AssetOperationComponentLink = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationComponentLinkSelect }>

export const assetOperationParentOutstandingLinkSelect = {
  componentAssetId: true,
  referenceId: true,
  componentAsset: { select: { assetTag: true, name: true, custodian: { select: { fullNameTh: true } } } },
} satisfies Prisma.AssetComponentSelect
export type AssetOperationParentOutstandingLink = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationParentOutstandingLinkSelect }>
/** A component of the chosen asset that did not come back (group 3 spec §7.1, §8.5): listed apart, it does not travel. */
export type AssetOperationOutstandingComponent = { assetTag: string; name: string; holderName: string | null; checkinNo: string | null }

/** Each outstanding component once (the first link; callers read newest first), by tag, with its holder and its RT-. */
export function buildAssetOperationOutstandingComponents(
  links: readonly AssetOperationParentOutstandingLink[],
  checkinNoById: ReadonlyMap<string, string | null>,
): AssetOperationOutstandingComponent[] {
  const components = new Map<string, AssetOperationOutstandingComponent>()
  for (const link of links) {
    if (components.has(link.componentAssetId)) continue
    components.set(link.componentAssetId, {
      assetTag: link.componentAsset.assetTag,
      name: link.componentAsset.name,
      holderName: link.componentAsset.custodian?.fullNameTh ?? null,
      checkinNo: link.referenceId ? checkinNoById.get(link.referenceId) ?? null : null,
    })
  }
  return [...components.values()].sort((a, b) => a.assetTag.localeCompare(b.assetTag))
}

export const assetOperationLateReturnParentSelect = {
  id: true,
  currentLocationId: true,
  currentLocation: { select: { code: true, name: true } },
  departmentId: true,
  department: { select: { name: true } },
} satisfies Prisma.AssetSelect
export type AssetOperationLateReturnParentRecord = Prisma.AssetGetPayload<{ select: typeof assetOperationLateReturnParentSelect }>
/** Where a re-attached component goes (spec §8.6, P2-R7): its parent's room and department. */
export type AssetOperationLateReturnParent = { locationId: string; locationLabel: string; departmentId: string | null; departmentName: string | null }

export function buildAssetOperationLateReturnParent(parent: AssetOperationLateReturnParentRecord): AssetOperationLateReturnParent {
  return {
    locationId: parent.currentLocationId,
    locationLabel: placeCodeLabel(parent.currentLocation),
    departmentId: parent.departmentId,
    departmentName: parent.department?.name ?? null,
  }
}

/** The installed links that move with the parent: the filter of syncInstalledComponentsWithParent (asset-component-sync.ts). */
export function buildAssetOperationComponentLinkWhere(parentAssetId: string): Prisma.AssetComponentWhereInput {
  return { parentAssetId, status: "installed", removedAt: null, componentAsset: { isActive: true } }
}

/**
 * An outstanding link holding a found asset (group 3 spec §8.5, §8.6): the link, its RT- reference, and its parent's
 * IT-stock facts (getLateReturnOutcome), read with the asset's own facts.
 */
export const assetOperationOutstandingLinkSelect = {
  id: true,
  componentAssetId: true,
  referenceId: true,
  parentAsset: {
    select: {
      id: true,
      assetTag: true,
      name: true,
      isActive: true,
      custodianId: true,
      status: { select: { name: true } },
      _count: {
        select: {
          checkouts: { where: openCheckoutWhere },
          maintenanceTickets: { where: openRepairRecordWhere },
        },
      },
    },
  },
} satisfies Prisma.AssetComponentSelect
export type AssetOperationOutstandingLinkRecord = Prisma.AssetComponentGetPayload<{ select: typeof assetOperationOutstandingLinkSelect }>
/** The RT- an outstanding link names (รับคืน only). */
export const assetOperationOutstandingCheckinSelect = { id: true, documentNo: true, returnDate: true } satisfies Prisma.AssetCheckinSelect
export type AssetOperationOutstandingRead = {
  link: AssetOperationOutstandingLinkRecord
  checkin: { id: string; documentNo: string | null; returnDate: Date } | null
}

/** What the late-return panel needs (P2-R4): the link, its RT-, the parent, and whether the parent is in IT stock. */
export type AssetOperationLateReturn = {
  linkId: string
  checkinId: string
  checkinNo: string | null
  /** The RT-'s returnDate, ISO. */
  checkinDate: string | null
  parent: { id: string; assetTag: string; name: string }
  parentInStock: boolean
}
export type AssetOperationRowBadge = "handover" | "legacy" | "outstanding"

/** locationLabel: the component's own room, "code - name" (รับคืน's warning names where a missing one stays). */
export type AssetOperationChosenComponent = { id: string; assetTag: string; name: string; travels: boolean; locationLabel: string }
/** The chosen asset's detail on ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §7.1, §7.3, §9.2). Labels are null when there is none, never "-". */
export type AssetOperationChosenDetail = {
  ownership: AssetOwnershipType
  /** status.name, the English name getAssetStateTone reads. */
  statusName: string
  departmentId: string | null
  /** "code - name" */
  departmentLabel: string | null
  /** The department's name alone, for the summary card (look L1). */
  departmentName: string | null
  /** "code - fullNameTh" */
  holderLabel: string | null
  /** fullNameTh alone, for the summary card (look L1). */
  holderName: string | null
  /** The asset's custodianId: a holder equal to the current one is not a change (plan 3 P3-R4). */
  holderId: string | null
  /** The holder's Employee.isActive, null when there is no holder: false is a holder who left (P3-R10). */
  holderActive: boolean | null
  /** The holder's own department (Employee.departmentId), active or not: what a held asset's department follows (§6, P3-R3). */
  holderDepartmentId: string | null
  /** That department's name alone, active or not (look L1). */
  holderDepartmentName: string | null
  /** asset.branchId: the branch the asset tag belongs to, compared by id with a room's branch (P3-R13). */
  ownerBranchId: string
  ownerBranchLabel: string
  locationBranchLabel: string
  components: AssetOperationChosenComponent[]
  /** The asset's outstanding components (group 3 spec §7.1, §8.5): listed apart, they never travel. [] when none. */
  outstandingComponents: AssetOperationOutstandingComponent[]
  /** Only on an outstanding component's own row (รับคืน, spec §8.6): its parent's room and department. */
  lateReturnParent?: AssetOperationLateReturnParent
}

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
  /** The register's photo (group 3 spec §19.5, A1-R6), every mode; null when the asset has none. */
  photo: AssetPhotoPreview | null
  // รับคืน only (the keys are absent in the other modes):
  /** The open handover (the custody panel's fields). */
  checkout?: AssetOperationSearchCheckout
  /** A holder and no handover, and not an outstanding component: ข้อมูลเก่า. */
  legacy?: true
  /** An outstanding component whose link names its RT- (group 3 spec §8.6): the late-return panel's data. */
  lateReturn?: AssetOperationLateReturn
  /** The row's kind for the picker's badge: an open handover, ข้อมูลเก่า or an outstanding component. */
  badge?: AssetOperationRowBadge
  /** The group; who returns it (the return-by prefill). */
  holderKey?: string
  holderLabel?: string | null
  holderEmployeeId?: string | null
  /** An open repair: the return goes into ส่งซ่อม under it (S-R43). Absent when there is none. */
  openRepair?: true
  /** The open repair's number, set with openRepair when it was read (รับคืน's "ต่อใบซ่อม <no.>", group 3 spec §8.3, §8.4). */
  openRepairNo?: string
  /** By id with detail=1 only (group 3 spec §7.1). */
  detail?: AssetOperationChosenDetail
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
  facts: AssetOperationFacts,
): AssetOperationVerdict {
  const pick = (verdict: AssetOperationVerdict): AssetOperationVerdict =>
    verdict.eligible ? { eligible: true, reasonKey: null } : { eligible: false, reasonKey: verdict.reasonKey }
  switch (input.mode) {
    case "checkout":
      return pick(getCheckoutVerdict(facts))
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
    /** รับคืน: the open repair's number. */
    openRepairNo?: string | null
    labels?: AssetOperationDestinationLabels
    photo?: AssetPhotoPreview | null
    /** The outstanding link holding this asset, with its RT- on รับคืน (group 3 spec §8.5, §8.6). */
    outstanding?: AssetOperationOutstandingRead | null
  },
): AssetOperationSearchRow {
  const { openCheckout, hasOpenRepair } = context
  const outstandingRead = context.outstanding ?? null
  const outstanding: AssetOperationOutstandingFact | null = outstandingRead
    ? { linkId: outstandingRead.link.id, checkinId: outstandingRead.link.referenceId }
    : null
  const facts: AssetOperationFacts = {
    statusName: asset.status.name,
    ownership: normalizeAssetOwnershipType(asset.ownershipType),
    custodianId: asset.custodianId,
    openCheckout: openCheckout && { id: openCheckout.id, handoverMode: openCheckout.handoverMode },
    hasOpenRepair,
    conditionName: asset.condition?.name ?? null,
    outstanding,
  }
  const verdict = getAssetOperationSearchVerdict(input, facts)
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
    photo: context.photo ?? null,
  }
  if (input.mode !== "checkin") return row

  const holder = getCheckinHolder(openCheckout, asset, context.labels ?? noLabels)
  if (outstandingRead) {
    // An outstanding component is returned on its own: never a handover's row, never ข้อมูลเก่า.
    row.badge = "outstanding"
    const { link, checkin } = outstandingRead
    if (link.referenceId) {
      const parent = link.parentAsset
      row.lateReturn = {
        linkId: link.id,
        checkinId: link.referenceId,
        checkinNo: checkin?.documentNo ?? null,
        checkinDate: checkin?.returnDate.toISOString() ?? null,
        parent: { id: parent.id, assetTag: parent.assetTag, name: parent.name },
        parentInStock: getLateReturnOutcome({
          isActive: parent.isActive,
          statusName: parent.status.name,
          custodianId: parent.custodianId,
          hasOpenCheckout: parent._count.checkouts > 0,
          hasOpenRepair: parent._count.maintenanceTickets > 0,
        }) === "reattached",
      }
    }
  } else if (openCheckout) {
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
    row.badge = "handover"
  } else if (asset.custodianId) {
    row.legacy = true
    row.badge = "legacy"
  }
  row.holderKey = holder.key
  row.holderLabel = holder.label
  row.holderEmployeeId = holder.employeeId
  if (hasOpenRepair) {
    row.openRepair = true
    if (context.openRepairNo) row.openRepairNo = context.openRepairNo
  }
  return row
}

/**
 * The chosen asset's detail: each installed component once (the first link), by tag; it travels unless it has its own
 * open handover, as the sync skips it (asset-component-sync.ts); the asset's outstanding components are listed apart
 * (group 3 spec §7.1, §8.5); they never travel.
 */
export function buildAssetOperationRowDetail(
  asset: AssetOperationSearchDetailAsset,
  links: readonly AssetOperationComponentLink[],
  handedOverComponentIds: ReadonlySet<string>,
  outstandingComponents: AssetOperationOutstandingComponent[],
): AssetOperationChosenDetail {
  const components = new Map<string, AssetOperationChosenComponent>()
  for (const link of links) {
    if (components.has(link.componentAssetId)) continue
    components.set(link.componentAssetId, {
      id: link.componentAssetId,
      assetTag: link.componentAsset.assetTag,
      name: link.componentAsset.name,
      travels: !handedOverComponentIds.has(link.componentAssetId),
      locationLabel: placeCodeLabel(link.componentAsset.currentLocation),
    })
  }
  return {
    ownership: normalizeAssetOwnershipType(asset.ownershipType),
    statusName: asset.status.name,
    departmentId: asset.departmentId,
    departmentLabel: asset.department ? `${asset.department.code} - ${asset.department.name}` : null,
    departmentName: asset.department?.name ?? null,
    holderLabel: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
    holderName: asset.custodian?.fullNameTh ?? null,
    holderId: asset.custodianId,
    holderActive: asset.custodian ? asset.custodian.isActive : null,
    holderDepartmentId: asset.custodian?.departmentId ?? null,
    holderDepartmentName: asset.custodian?.department.name ?? null,
    ownerBranchId: asset.branchId,
    ownerBranchLabel: asset.branch.name,
    locationBranchLabel: asset.currentLocation.branch.name,
    components: [...components.values()].sort((a, b) => a.assetTag.localeCompare(b.assetTag)),
    outstandingComponents,
  }
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
