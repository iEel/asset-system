import type { Prisma } from "@prisma/client"

import { getAssetActivityWhere } from "./asset-activity-filter.ts"
import { installedOrOutstandingLinkWhere } from "./asset-component-outstanding.ts"
import { buildAssetDetailSectionHref } from "./asset-detail-view.ts"
import { buildAssetDataQualityWhere, type AssetWhereOptions } from "./asset-list-query.ts"
import { hasAssetResponsibility } from "./asset-ownership.ts"

// The reports operations tab's reads (group 10 plan 2 Task 1, spec §5, board RP-Ops): the register data-fix queue
// (four issue counts, the distinct assets in the queue, one page of 8 rows of the chosen issue), the idle-180-days
// count and the three top-5 lists, as the page ran them inline before. Each issue's where is the register's own
// (buildAssetDataQualityWhere), so a cell's count is the length of the register's `dataQuality=<issue>` list. The
// scope where is today's operations where: the report's filters without `dataQuality` and `activity`. The cross-scope
// summary keeps its own loader (it reads prisma itself); the page hands it in. The db is injected, as the overview's.

export const REPORT_ISSUE_KINDS = ["responsibility", "serial", "photo", "warranty"] as const
export type ReportIssueKind = (typeof REPORT_ISSUE_KINDS)[number]
export type ReportIssueChoice = ReportIssueKind | "all"

// The three kinds that are missing data; warranty is a date coming up, not a gap (the equation line splits them).
export const REPORT_INCOMPLETE_ISSUE_KINDS = ["responsibility", "serial", "photo"] as const satisfies readonly ReportIssueKind[]

export const OPERATIONS_QUEUE_PAGE_SIZE = 8
export const OPERATIONS_TOP_ROWS = 5
// The queue section's id: the cell, toggle and paging links land on it.
export const OPERATIONS_QUEUE_ANCHOR = "report-ops-queue"

export type OperationsParams = { issue: ReportIssueChoice; qpage: number; others: boolean }

export type OperationsFixField = "responsibility" | "serialNumber" | "photos" | "warranty"

export type OperationsQueueRow = {
  id: string
  name: string
  assetTag: string
  categoryName: string
  branchName: string
  // Only the chosen issue unless `others` (or the queue shows all issues).
  issues: ReportIssueKind[]
  // The first issue's place: the edit page for responsibility and serial, the asset page's photos or purchase section.
  fix: { href: string; fieldKey: OperationsFixField; place: "edit" | "detail" }
}

export type OperationsTopRow = { key: string; name: string; code: string | null; count: number; href?: string }

export type OperationsCrossScopeSummary<Row = unknown> = {
  all: number
  custodianCompany: number
  custodianBranch: number
  locationBranch: number
  rows: Row[]
}

// Method syntax, so fakes may narrow args; the page passes `prisma as unknown as ReportsOperationsDb`.
export type ReportsOperationsDb = {
  asset: {
    count(args: object): Promise<number>
    findMany(args: object): Promise<unknown[]>
    groupBy(args: object): Promise<unknown[]>
  }
  employee: { findMany(args: object): Promise<unknown[]> }
  location: { findMany(args: object): Promise<unknown[]> }
  maintenanceTicket: { groupBy(args: object): Promise<unknown[]> }
}

export type ReportsOperationsInput<CrossScopeRow = unknown> = OperationsParams & {
  locale: string
  // The report's own query (filters and view=operations, no page): the cell, toggle and paging links add to it.
  baseQuery: URLSearchParams
  // asset:edit: without it the fix button opens the asset page instead.
  canEdit: boolean
  // The register's windows (today, the notification rules): the warranty issue reads them.
  whereOptions: AssetWhereOptions
  // The report's full where (today's assetWhere): the three top-5 lists count with it, as before.
  topsWhere: Prisma.AssetWhereInput
  loadCrossScope: () => Promise<OperationsCrossScopeSummary<CrossScopeRow>>
  labels: { unassigned: string }
}

export type ReportsOperationsQueue = {
  issue: ReportIssueChoice
  others: boolean
  distinct: number
  incompleteDistinct: number
  warrantyOnly: number
  counts: Record<ReportIssueKind, number>
  // responsibility + serial + photo: issues, not assets (one asset may have several).
  issueTotal: number
  rows: OperationsQueueRow[]
  total: number
  page: number
  pageCount: number
  from: number
  to: number
  // The issue an export would hold: one issue chosen and at least one asset, else null.
  exportIssue: ReportIssueKind | null
  links: {
    cells: Record<ReportIssueChoice, string>
    toggleOthers: string
    previous: string
    next: string
  }
}

export type ReportsOperationsData<CrossScopeRow = unknown> = {
  queue: ReportsOperationsQueue
  crossScope: OperationsCrossScopeSummary<CrossScopeRow>
  idle: { count: number }
  tops: { custodians: OperationsTopRow[]; locations: OperationsTopRow[]; repairs: OperationsTopRow[] }
  warrantyDays: number
}

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)

export function parseOperationsParams(input: { issue?: unknown; qpage?: unknown; others?: unknown }): OperationsParams {
  const issue = first(input.issue)
  const qpage = Number(first(input.qpage))
  const others = first(input.others)
  return {
    issue: (REPORT_ISSUE_KINDS as readonly string[]).includes(issue as string) ? (issue as ReportIssueKind) : "all",
    qpage: Number.isInteger(qpage) && qpage >= 1 ? qpage : 1,
    others: others === "1" || others === "true",
  }
}

export function reportIssueWhere(kind: ReportIssueKind, options: AssetWhereOptions): Prisma.AssetWhereInput {
  // Never null for the four kinds; the fallback only satisfies the type.
  return buildAssetDataQualityWhere(kind, options) ?? {}
}

type QueueAsset = {
  id: string
  assetTag: string
  name: string
  ownershipType: string | null
  serialNumber: string | null
  warrantyEndDate: Date | null
  custodianId?: string | null
  departmentId?: string | null
  category: { name: string }
  branch: { name: string }
  installedInLinks: Array<{ id: string }>
  attachments: Array<{ id: string }>
}

// The issues one asset has, in the cells' order: the same tests as the four wheres.
export function getAssetReportIssues(asset: QueueAsset, warrantyWindow: { gte: Date; lte: Date }): ReportIssueKind[] {
  const issues: ReportIssueKind[] = []
  if (!hasAssetResponsibility(asset)) issues.push("responsibility")
  if (!asset.serialNumber) issues.push("serial")
  if (asset.ownershipType !== "software_license" && asset.attachments.length === 0) issues.push("photo")
  if (asset.ownershipType !== "software_license" && asset.warrantyEndDate && asset.warrantyEndDate >= warrantyWindow.gte && asset.warrantyEndDate <= warrantyWindow.lte) {
    issues.push("warranty")
  }
  return issues
}

export function getReportIssueFix(locale: string, assetId: string, issue: ReportIssueKind | undefined): OperationsQueueRow["fix"] {
  const editHref = `/${locale}/assets/${assetId}/edit`
  if (issue === "serial") return { href: editHref, fieldKey: "serialNumber", place: "edit" }
  if (issue === "photo") return { href: buildAssetDetailSectionHref(locale, assetId, null, "photos"), fieldKey: "photos", place: "detail" }
  if (issue === "warranty") return { href: buildAssetDetailSectionHref(locale, assetId, null, "purchase"), fieldKey: "warranty", place: "detail" }
  return { href: editHref, fieldKey: "responsibility", place: "edit" }
}

export async function getReportsOperationsData<CrossScopeRow = unknown>(
  where: Prisma.AssetWhereInput,
  input: ReportsOperationsInput<CrossScopeRow>,
  db: ReportsOperationsDb,
): Promise<ReportsOperationsData<CrossScopeRow>> {
  const issueWheres = Object.fromEntries(
    REPORT_ISSUE_KINDS.map((kind) => [kind, reportIssueWhere(kind, input.whereOptions)]),
  ) as Record<ReportIssueKind, Prisma.AssetWhereInput>
  const anyIssueWhere: Prisma.AssetWhereInput = { OR: REPORT_ISSUE_KINDS.map((kind) => issueWheres[kind]) }
  const incompleteWhere: Prisma.AssetWhereInput = { OR: REPORT_INCOMPLETE_ISSUE_KINDS.map((kind) => issueWheres[kind]) }
  const warrantyWindow = issueWheres.warranty.warrantyEndDate as { gte: Date; lte: Date }
  const idleAssetWhere = getAssetActivityWhere("idle_180d")
  const topsWhere = input.topsWhere

  const [responsibility, serial, photo, warranty, distinct, incompleteDistinct, idleCount, byCustodian, byLocation, repairGroups, crossScope] = await Promise.all([
    db.asset.count({ where: { AND: [where, issueWheres.responsibility] } }),
    db.asset.count({ where: { AND: [where, issueWheres.serial] } }),
    db.asset.count({ where: { AND: [where, issueWheres.photo] } }),
    db.asset.count({ where: { AND: [where, issueWheres.warranty] } }),
    db.asset.count({ where: { AND: [where, anyIssueWhere] } }),
    db.asset.count({ where: { AND: [where, incompleteWhere] } }),
    db.asset.count({ where: { AND: [where, ...(idleAssetWhere ? [idleAssetWhere] : [])] } }),
    db.asset.groupBy({ by: ["custodianId"], where: { ...topsWhere, custodianId: { not: null } }, _count: { _all: true }, orderBy: { _count: { custodianId: "desc" } }, take: OPERATIONS_TOP_ROWS }) as Promise<Array<{ custodianId: string | null; _count: { _all: number } }>>,
    db.asset.groupBy({ by: ["currentLocationId"], where: topsWhere, _count: { _all: true }, orderBy: { _count: { currentLocationId: "desc" } }, take: OPERATIONS_TOP_ROWS }) as Promise<Array<{ currentLocationId: string; _count: { _all: number } }>>,
    db.maintenanceTicket.groupBy({
      by: ["assetId"],
      where: { isActive: true, asset: topsWhere },
      _count: { _all: true },
      _sum: { repairCost: true },
      orderBy: { _count: { assetId: "desc" } },
      take: OPERATIONS_TOP_ROWS,
    }) as Promise<Array<{ assetId: string; _count: { _all: number } }>>,
    input.loadCrossScope(),
  ])

  const counts: Record<ReportIssueKind, number> = { responsibility, serial, photo, warranty }
  const total = input.issue === "all" ? distinct : counts[input.issue]
  const pageCount = Math.max(1, Math.ceil(total / OPERATIONS_QUEUE_PAGE_SIZE))
  const page = Math.min(Math.max(1, input.qpage), pageCount)
  const rowsWhere = input.issue === "all" ? anyIssueWhere : issueWheres[input.issue]

  const [queueAssets, custodians, locations, repairAssets] = await Promise.all([
    total > 0
      ? (db.asset.findMany({
          where: { AND: [where, rowsWhere] },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * OPERATIONS_QUEUE_PAGE_SIZE,
          take: OPERATIONS_QUEUE_PAGE_SIZE,
          select: {
            id: true,
            assetTag: true,
            name: true,
            ownershipType: true,
            serialNumber: true,
            warrantyEndDate: true,
            custodianId: true,
            departmentId: true,
            category: { select: { name: true } },
            branch: { select: { name: true } },
            installedInLinks: { where: installedOrOutstandingLinkWhere, select: { id: true }, take: 1 },
            attachments: { where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true }, select: { id: true }, take: 1 },
          },
        }) as Promise<QueueAsset[]>)
      : Promise.resolve([] as QueueAsset[]),
    db.employee.findMany({
      where: { id: { in: byCustodian.map((item) => item.custodianId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, code: true, fullNameTh: true },
    }) as Promise<Array<{ id: string; code: string; fullNameTh: string }>>,
    db.location.findMany({ where: { id: { in: byLocation.map((item) => item.currentLocationId) } }, select: { id: true, code: true, name: true } }) as Promise<Array<{ id: string; code: string; name: string }>>,
    db.asset.findMany({ where: { id: { in: repairGroups.map((item) => item.assetId) } }, select: { id: true, assetTag: true, name: true } }) as Promise<Array<{ id: string; assetTag: string; name: string }>>,
  ])

  const rows: OperationsQueueRow[] = queueAssets.map((asset) => {
    const all = getAssetReportIssues(asset, warrantyWindow)
    const issues = input.issue === "all" || input.others ? all : [input.issue]
    return {
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      categoryName: asset.category.name,
      branchName: asset.branch.name,
      issues,
      fix: getReportIssueFix(input.locale, asset.id, issues[0]),
    }
  })

  const queueHref = (issue: ReportIssueChoice, others: boolean, qpage = 1) => {
    const query = new URLSearchParams(input.baseQuery)
    query.set("view", "operations")
    if (issue !== "all") query.set("issue", issue)
    if (others) query.set("others", "1")
    if (qpage > 1) query.set("qpage", String(qpage))
    return `/${input.locale}/reports?${query.toString()}#${OPERATIONS_QUEUE_ANCHOR}`
  }

  const custodianMap = new Map(custodians.map((employee) => [employee.id, employee]))
  const locationMap = new Map(locations.map((location) => [location.id, location]))
  const repairAssetMap = new Map(repairAssets.map((asset) => [asset.id, asset]))

  return {
    queue: {
      issue: input.issue,
      others: input.others,
      distinct,
      incompleteDistinct,
      warrantyOnly: Math.max(0, distinct - incompleteDistinct),
      counts,
      issueTotal: responsibility + serial + photo,
      rows,
      total,
      page,
      pageCount,
      from: total === 0 ? 0 : (page - 1) * OPERATIONS_QUEUE_PAGE_SIZE + 1,
      to: Math.min(total, page * OPERATIONS_QUEUE_PAGE_SIZE),
      exportIssue: input.issue !== "all" && total > 0 ? input.issue : null,
      links: {
        cells: Object.fromEntries(
          (["all", ...REPORT_ISSUE_KINDS] as const).map((issue) => [issue, queueHref(issue, input.others)]),
        ) as Record<ReportIssueChoice, string>,
        toggleOthers: queueHref(input.issue, !input.others, page),
        previous: queueHref(input.issue, input.others, page - 1),
        next: queueHref(input.issue, input.others, page + 1),
      },
    },
    crossScope,
    idle: { count: idleCount },
    tops: {
      // Names first, the code as meta (board RP-Ops).
      custodians: byCustodian.map((item) => {
        const employee = custodianMap.get(item.custodianId ?? "")
        return { key: item.custodianId ?? "unassigned", name: employee?.fullNameTh ?? input.labels.unassigned, code: employee?.code ?? null, count: item._count._all }
      }),
      locations: byLocation.map((item) => {
        const location = locationMap.get(item.currentLocationId)
        return { key: item.currentLocationId, name: location?.name ?? item.currentLocationId, code: location?.code ?? null, count: item._count._all }
      }),
      repairs: repairGroups.map((item) => {
        const asset = repairAssetMap.get(item.assetId)
        return {
          key: item.assetId,
          name: asset?.name ?? item.assetId,
          code: asset?.assetTag ?? null,
          count: item._count._all,
          href: `/${input.locale}/assets/${item.assetId}`,
        }
      }),
    },
    warrantyDays: input.whereOptions.rules.warrantyExpiryDays,
  }
}
