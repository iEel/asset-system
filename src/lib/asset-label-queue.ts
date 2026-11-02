import type { Prisma } from "@prisma/client"
import { normalizeAssetOwnershipType, type AssetOwnershipType } from "./asset-ownership.ts"
import {
  LABEL_PRINT_BATCH_MAX,
  buildAssetLabelPrintQueueOrderBy,
  buildAssetLabelPrintQueueWhere,
  buildLabelPrintActiveAssetsWhere,
  normalizeLabelPrintAssetIds,
  normalizeLabelPrintQueueFilters,
  normalizeLabelPrintQueueMode,
  normalizeLabelPrintQueuePageSize,
  normalizeLabelPrintQueueSkip,
  normalizeLabelPrintQueueSort,
  type LabelPrintQueueFilters,
  type LabelPrintQueueMode,
  type LabelPrintQueueSort,
} from "./asset-label-print-tracking.ts"

// The labels page's queue and lookup (group 4 plan 6 Task 1, spec §11, P6-R6, P6-R7, P6-R11). The queue answers one
// page of rows (skip + take ≤ 100), the total and the first 100 matching ids in queue order (add-all, P6-R3). The lookup
// answers the same row shape for ≤ 100 given ids (search adds and the incoming ids). The db is injected, as
// searchAssetScan, so the tests fake it; the route passes `prisma as unknown as LabelQueueDb`. Plain Prisma only.

// SQL Server takes 2,100 parameters; the ต้องพิมพ์ใหม่ matches go into `id: { in }` (P6-R6, as audit-pending-list-rules).
export const LABEL_REPRINT_CANDIDATE_CAP = 2000

const viewPermission = "asset:view"

// Method syntax, so fakes may narrow args.
export type LabelQueueDb = {
  asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
}

export type LabelQueueUser = { roles: readonly string[]; permissions: readonly string[] }
export type LabelQueueLocale = "th" | "en"

type CodeName = { code: string; name: string }

export type LabelQueueRow = {
  id: string
  assetTag: string
  name: string
  // The label prints it (the 18 mm template's third line), so the page's preview shows it too.
  serialNumber: string | null
  ownershipType: AssetOwnershipType
  holder: CodeName | null
  location: CodeName | null
  company: CodeName
  branch: CodeName
  category: CodeName
  // The latest print; its tag is the one on the label (ป้ายเดิม when it differs from today's).
  lastPrint: { printedAt: string; assetTag: string } | null
}

export type LabelQueueAnswer = {
  rows: LabelQueueRow[]
  total: number
  // At most 100, in queue order.
  ids: string[]
  // Only in the reprint mode: true when more than LABEL_REPRINT_CANDIDATE_CAP matched and the rest were left out.
  reprintCapped?: boolean
}

export type LabelLookupAnswer = { rows: LabelQueueRow[] }

export type LabelQueueParams = {
  mode: LabelPrintQueueMode
  filters: LabelPrintQueueFilters
  sort: LabelPrintQueueSort
  pageSize: number
  skip: number
  locale: LabelQueueLocale
}

export type LabelQueueRequest =
  | { kind: "queue"; params: LabelQueueParams }
  | { kind: "lookup"; ids: string[]; locale: LabelQueueLocale }
  | { error: string }

/** The GET's query. `ids` (even empty) switches to the lookup; more than 100 distinct ids is refused. */
export function parseLabelQueueRequest(searchParams: URLSearchParams): LabelQueueRequest {
  const locale: LabelQueueLocale = searchParams.get("locale") === "en" ? "en" : "th"
  const idsValue = searchParams.get("ids")
  if (idsValue !== null) {
    const ids = normalizeLabelPrintAssetIds(idsValue.split(","), Number.POSITIVE_INFINITY)
    if (ids.length > LABEL_PRINT_BATCH_MAX) return { error: "Invalid request data" }
    return { kind: "lookup", ids, locale }
  }
  return {
    kind: "queue",
    params: {
      mode: normalizeLabelPrintQueueMode(searchParams.get("mode")),
      filters: normalizeLabelPrintQueueFilters({
        companyId: searchParams.get("companyId"),
        branchId: searchParams.get("branchId"),
        categoryId: searchParams.get("categoryId"),
        locationId: searchParams.get("locationId"),
        createdFrom: searchParams.get("createdFrom"),
        createdTo: searchParams.get("createdTo"),
      }),
      sort: normalizeLabelPrintQueueSort(searchParams.get("sort")),
      pageSize: normalizeLabelPrintQueuePageSize(searchParams.get("pageSize")),
      skip: normalizeLabelPrintQueueSkip(searchParams.get("skip")),
      locale,
    },
  }
}

// The latest print first; the id breaks a tie of two prints in the same instant.
const latestPrintOrder: Prisma.AssetLabelPrintOrderByWithRelationInput[] = [{ printedAt: "desc" }, { id: "desc" }]

const labelQueueRowSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  ownershipType: true,
  custodian: { select: { code: true, fullNameTh: true, fullNameEn: true } },
  currentLocation: { select: { code: true, name: true } },
  company: { select: { code: true, nameTh: true, nameEn: true } },
  branch: { select: { code: true, name: true } },
  category: { select: { code: true, name: true } },
  labelPrints: { orderBy: latestPrintOrder, take: 1, select: { printedAt: true, assetTag: true } },
} satisfies Prisma.AssetSelect

type LabelQueueAsset = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  ownershipType: string
  custodian: { code: string; fullNameTh: string; fullNameEn: string | null } | null
  currentLocation: CodeName | null
  company: { code: string; nameTh: string; nameEn: string | null }
  branch: CodeName
  category: CodeName
  labelPrints: Array<{ printedAt: Date; assetTag: string }>
}

type ReprintCandidate = { id: string; assetTag: string; labelPrints: Array<{ assetTag: string }> }

function toLabelQueueRow(asset: LabelQueueAsset, locale: LabelQueueLocale): LabelQueueRow {
  const lastPrint = asset.labelPrints[0] ?? null
  const english = locale === "en"
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber,
    ownershipType: normalizeAssetOwnershipType(asset.ownershipType),
    holder: asset.custodian
      ? { code: asset.custodian.code, name: (english ? asset.custodian.fullNameEn : null) || asset.custodian.fullNameTh }
      : null,
    location: asset.currentLocation ? { code: asset.currentLocation.code, name: asset.currentLocation.name } : null,
    company: { code: asset.company.code, name: (english ? asset.company.nameEn : null) || asset.company.nameTh },
    branch: { code: asset.branch.code, name: asset.branch.name },
    category: { code: asset.category.code, name: asset.category.name },
    lastPrint: lastPrint ? { printedAt: lastPrint.printedAt.toISOString(), assetTag: lastPrint.assetTag } : null,
  }
}

// The route gates with requirePermission first; this is the same rule (auth-utils hasPermission), kept here so the lib
// never reads for a caller without asset:view.
function assertCanViewLabelQueue(user: LabelQueueUser) {
  if (user.roles.includes("system_admin") || user.permissions.includes(viewPermission)) return
  throw new Error("Forbidden: insufficient permissions")
}

// ต้องพิมพ์ใหม่ (P6-R6): the active, printed assets inside the filters that have an asset_tag_change movement, then the
// latest print's tag compared with today's in code with !==, so a change of case counts too. One asset is one row
// however many times it was re-tagged. Tag changes from before plan 2 have no movement and are not found.
async function findReprintIds(db: LabelQueueDb, filters: LabelPrintQueueFilters) {
  const where = {
    ...buildAssetLabelPrintQueueWhere("printed", filters),
    movements: { some: { movementType: "asset_tag_change" } },
  } satisfies Prisma.AssetWhereInput
  const candidates = await db.asset.findMany({
    where,
    select: {
      id: true,
      assetTag: true,
      labelPrints: { orderBy: latestPrintOrder, take: 1, select: { assetTag: true } },
    } satisfies Prisma.AssetSelect,
    orderBy: [{ assetTag: "asc" }] satisfies Prisma.AssetOrderByWithRelationInput[],
  }) as ReprintCandidate[]
  const matched = candidates
    .filter((asset) => {
      const lastPrint = asset.labelPrints[0]
      return lastPrint !== undefined && lastPrint.assetTag !== asset.assetTag
    })
    .map((asset) => asset.id)
  return {
    ids: matched.slice(0, LABEL_REPRINT_CANDIDATE_CAP),
    capped: matched.length > LABEL_REPRINT_CANDIDATE_CAP,
  }
}

export async function listLabelPrintQueue(db: LabelQueueDb, user: LabelQueueUser, params: LabelQueueParams): Promise<LabelQueueAnswer> {
  assertCanViewLabelQueue(user)

  let reprint: { ids: string[]; capped: boolean } | null = null
  if (params.mode === "reprint") {
    reprint = await findReprintIds(db, params.filters)
    if (reprint.ids.length === 0) return { rows: [], total: 0, ids: [], reprintCapped: reprint.capped }
  }

  const where = buildAssetLabelPrintQueueWhere(params.mode, params.filters, reprint?.ids) satisfies Prisma.AssetWhereInput
  const orderBy = buildAssetLabelPrintQueueOrderBy(params.sort)
  const [assets, total, idRows] = await Promise.all([
    db.asset.findMany({
      where,
      select: labelQueueRowSelect,
      orderBy,
      skip: params.skip,
      take: Math.min(Math.max(params.pageSize, 1), LABEL_PRINT_BATCH_MAX),
    }) as Promise<LabelQueueAsset[]>,
    db.asset.count({ where }),
    db.asset.findMany({ where, select: { id: true }, orderBy, take: LABEL_PRINT_BATCH_MAX }) as Promise<Array<{ id: string }>>,
  ])

  const answer: LabelQueueAnswer = {
    rows: assets.map((asset) => toLabelQueueRow(asset, params.locale)),
    total,
    ids: idRows.map((row) => row.id),
  }
  if (reprint) answer.reprintCapped = reprint.capped
  return answer
}

/** Queue-shaped rows for given ids, in the given order; unknown and inactive ids are dropped. */
export async function lookupLabelPrintRows(db: LabelQueueDb, ids: readonly string[], locale: LabelQueueLocale = "th"): Promise<LabelLookupAnswer> {
  if (ids.length === 0) return { rows: [] }
  if (ids.length > LABEL_PRINT_BATCH_MAX) throw new Error("Invalid request data")
  const assets = await db.asset.findMany({
    where: buildLabelPrintActiveAssetsWhere(ids) satisfies Prisma.AssetWhereInput,
    select: labelQueueRowSelect,
  }) as LabelQueueAsset[]
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  return {
    rows: ids.flatMap((id) => {
      const asset = byId.get(id)
      return asset ? [toLabelQueueRow(asset, locale)] : []
    }),
  }
}
