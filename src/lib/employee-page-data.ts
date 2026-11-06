import type { Prisma } from "@prisma/client"

import { outstandingLinkWhere } from "./asset-component-outstanding.ts"
import type { AssetOperationOutstandingFact } from "./asset-operation-eligibility.ts"
import { openCheckoutWhere } from "./asset-operation-search-rules.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"
import { readAssetPhotoPreviews, type AssetPhotoPreview } from "./asset-photo-preview.ts"
import { auditRoundCoverageWhere } from "./audit-round-status.ts"
import { buildEmployeeFollowUpItems, isFormerEmployee, type EmployeeDetailSummaryInput, type EmployeeFollowUpKey } from "./employee-detail.ts"
import { getHeldAssetReturnBlock, type HeldAssetReturnBlock } from "./held-asset-return-block.ts"
import { startOfBangkokDay } from "./preventive-maintenance.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// The employee page's reads (/master-data/employees/[id], group 7 plan 2 Task 2, spec §5.2). The held assets page at 25
// by asset tag (G7P2-R2), each with its open handover (or ข้อมูลเก่า when it has none), the return form's own block
// (G7P2-R3, getHeldAssetReturnBlock), its photo and its latest audit item. Open handovers split into regular use and
// loans, and only a loan past its due date (a Bangkok day) is overdue (G7P2-R4). The user account line is read only for
// a viewer who may view users. The page's other sections (history, repairs, audit, disposal) moved here unchanged from
// page.tsx. Bounded: the held page's fact reads take the page's ids only, in chunks of 2,000 (SQL Server's 2,100
// parameters). The db is injected, as BulkMoveListDb, so the page passes prisma and the tests fake it.

// Method syntax, so fakes may narrow args; the page passes `prisma as unknown as EmployeePageDb`.
export type EmployeePageDb = {
  employee: { findFirst(args: object): Promise<unknown> }
  asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  assetCheckout: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  assetComponent: { findMany(args: object): Promise<unknown[]> }
  maintenanceTicket: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  auditFinding: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  auditItem: { findMany(args: object): Promise<unknown[]> }
  auditRound: { findMany(args: object): Promise<unknown[]> }
  disposalRequest: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
  user: { findFirst(args: object): Promise<unknown> }
  attachment: { findMany(args: object): Promise<unknown[]> }
}

/** Who reads the page: the user-account line needs `user:view` (Global Constraints). */
export type EmployeePageViewer = { canViewUsers: boolean }

export const employeeHeldPageSize = 25
export const employeePageIdChunkSize = 2000

/** SQL Server takes at most 2,100 parameters, so every id list goes in chunks of 2,000. */
export function chunkEmployeePageIds<T>(ids: readonly T[], size: number = employeePageIdChunkSize): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < ids.length; start += size) chunks.push(ids.slice(start, start + size))
  return chunks
}

async function findManyInChunks<T>(ids: readonly string[], read: (chunk: string[]) => Promise<unknown[]>): Promise<T[]> {
  if (ids.length === 0) return []
  const parts = await Promise.all(chunkEmployeePageIds(ids).map((chunk) => read(chunk)))
  return parts.flat() as T[]
}

/** `?heldPage=`: a positive whole number, else 1; a page past the end is clamped by the reader. */
export function parseEmployeeHeldPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

/** A loan is overdue once its due date's Bangkok day has passed (G7P2-R4); a due date today is not overdue. */
export function isEmployeeLoanOverdue(dueDate: Date | null, now: Date): boolean {
  return dueDate !== null && dueDate.getTime() < startOfBangkokDay(now).getTime()
}

// G7P2-R1 lives with the follow-up items (employee-detail.ts), which read it too.
export { isFormerEmployee }

const employeeSelect = {
  id: true,
  code: true,
  fullNameTh: true,
  fullNameEn: true,
  email: true,
  position: true,
  employmentStatus: true,
  isActive: true,
  companyId: true,
  branchId: true,
  departmentId: true,
  managerId: true,
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true } },
  department: { select: { code: true, name: true } },
  manager: { select: { id: true, code: true, fullNameTh: true } },
  subordinates: {
    where: { isActive: true },
    select: { id: true, code: true, fullNameTh: true, position: true },
    orderBy: { code: "asc" },
    take: 8,
  },
} satisfies Prisma.EmployeeSelect
export type EmployeePageEmployee = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>

const heldAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  modelId: true,
  ownershipType: true,
  custodianId: true,
  category: { select: { code: true, name: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
} satisfies Prisma.AssetSelect
type HeldAssetRecord = Prisma.AssetGetPayload<{ select: typeof heldAssetSelect }>

const heldCheckoutSelect = {
  id: true,
  assetId: true,
  documentNo: true,
  handoverMode: true,
  checkoutDate: true,
  expectedReturnDate: true,
} satisfies Prisma.AssetCheckoutSelect
type HeldCheckoutRecord = Prisma.AssetCheckoutGetPayload<{ select: typeof heldCheckoutSelect }>

const heldAuditItemSelect = {
  assetId: true,
  auditStatus: true,
  auditResult: true,
  lastScanAt: true,
  auditRound: { select: { id: true, auditNo: true } },
} satisfies Prisma.AuditItemSelect
type HeldAuditItemRecord = Prisma.AuditItemGetPayload<{ select: typeof heldAuditItemSelect }>

const handoverHistorySelect = {
  id: true,
  documentNo: true,
  handoverMode: true,
  checkoutDate: true,
  expectedReturnDate: true,
  checkedOutBy: true,
  isReturned: true,
  asset: { select: { id: true, assetTag: true, name: true } },
  checkins: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { documentNo: true, returnDate: true, returnBy: true, receiveBy: true, conditionAfter: true, nextStatus: true },
  },
} satisfies Prisma.AssetCheckoutSelect
export type EmployeePageHandoverHistoryRow = Prisma.AssetCheckoutGetPayload<{ select: typeof handoverHistorySelect }>

const repairSelect = {
  id: true,
  repairNo: true,
  repairStatus: true,
  reportedDate: true,
  problem: true,
  reportedById: true,
  assignedToId: true,
  inspectedById: true,
  asset: { select: { id: true, assetTag: true, name: true } },
} satisfies Prisma.MaintenanceTicketSelect
export type EmployeePageRepairRow = Prisma.MaintenanceTicketGetPayload<{ select: typeof repairSelect }>

const auditFindingSelect = {
  id: true,
  findingType: true,
  reviewStatus: true,
  actionStatus: true,
  actionDueDate: true,
  reportedAt: true,
  asset: { select: { id: true, assetTag: true, name: true } },
  auditRound: { select: { id: true, auditNo: true, name: true } },
} satisfies Prisma.AuditFindingSelect
export type EmployeePageAuditFindingRow = Prisma.AuditFindingGetPayload<{ select: typeof auditFindingSelect }>

const auditItemSelect = {
  id: true,
  auditStatus: true,
  auditResult: true,
  lastScanAt: true,
  findingRequired: true,
  asset: { select: { id: true, assetTag: true, name: true } },
  auditRound: { select: { id: true, auditNo: true, name: true } },
} satisfies Prisma.AuditItemSelect
export type EmployeePageAuditItemRow = Prisma.AuditItemGetPayload<{ select: typeof auditItemSelect }>

const auditRoundSelect = { id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true } satisfies Prisma.AuditRoundSelect
export type EmployeePageAuditRoundRow = Prisma.AuditRoundGetPayload<{ select: typeof auditRoundSelect }>

const disposalSelect = {
  id: true,
  disposalNo: true,
  requestStatus: true,
  requestDate: true,
  requestedById: true,
  approverId: true,
  executedById: true,
  asset: { select: { id: true, assetTag: true, name: true } },
} satisfies Prisma.DisposalRequestSelect
export type EmployeePageDisposalRow = Prisma.DisposalRequestGetPayload<{ select: typeof disposalSelect }>

export type EmployeeHeldHandover = {
  id: string
  documentNo: string | null
  kind: "regular" | "loan"
  checkoutDate: Date
  dueDate: Date | null
}

export type EmployeeHeldLastAudit = {
  roundId: string
  roundNo: string
  /** The item's auditResult; null while it waits (its status says so). */
  result: string | null
  status: string
  checkedAt: Date | null
}

export type EmployeeHeldAssetRow = {
  assetId: string
  assetTag: string
  name: string
  status: { name: string; nameTh: string; colorCode: string | null }
  condition: { name: string; nameTh: string; colorCode: string | null } | null
  category: { code: string; name: string }
  location: { code: string; name: string }
  photo: AssetPhotoPreview | null
  handover: EmployeeHeldHandover | null
  /** No open handover and not an outstanding component: ข้อมูลเก่า ("สร้างใบส่งมอบย้อนหลัง"; รับคืน by assetId). */
  legacy: boolean
  returnBlock: HeldAssetReturnBlock | null
  lastAudit: EmployeeHeldLastAudit | null
}

export type EmployeePageData = {
  employee: EmployeePageEmployee
  /** "พ้นสภาพแล้ว ยังถือครอง {n} รายการ": a former employee (G7P2-R1) holding at least one active asset. */
  warning: { former: boolean; heldCount: number } | null
  held: { rows: EmployeeHeldAssetRow[]; total: number; page: number; pageSize: number }
  /** Open handovers to this person: regular = not a temporary loan; overdueLoans ⊆ loans (G7P2-R4). */
  openHandovers: { regular: number; loans: number; overdueLoans: number }
  /** The user linked to the employee; null when none, or when the viewer may not view users. */
  account: { username: string; isActive: boolean } | null
  counts: EmployeeDetailSummaryInput
  followUpItems: EmployeeFollowUpKey[]
  handoverHistory: EmployeePageHandoverHistoryRow[]
  repairs: EmployeePageRepairRow[]
  auditFindings: EmployeePageAuditFindingRow[]
  auditItems: EmployeePageAuditItemRow[]
  auditRounds: EmployeePageAuditRoundRow[]
  disposalRequests: EmployeePageDisposalRow[]
}

function firstByKey<T>(rows: readonly T[], key: (row: T) => string): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) if (!map.has(key(row))) map.set(key(row), row)
  return map
}

async function readHeldPage(db: EmployeePageDb, employeeId: string, requestedPage: number) {
  const where = { custodianId: employeeId, isActive: true }
  // The count first, so a stale or crafted page never sends a skip past the end (the bulk-move list's rule).
  const total = await db.asset.count({ where })
  const lastPage = Math.max(1, Math.ceil(total / employeeHeldPageSize))
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), lastPage)
  if (total === 0) return { total, page, assets: [] as HeldAssetRecord[] }
  const assets = (await db.asset.findMany({
    where,
    select: heldAssetSelect,
    orderBy: [{ assetTag: "asc" }, { id: "asc" }],
    skip: (page - 1) * employeeHeldPageSize,
    take: employeeHeldPageSize,
  })) as HeldAssetRecord[]
  return { total, page, assets }
}

async function readHeldRows(db: EmployeePageDb, assets: HeldAssetRecord[]): Promise<EmployeeHeldAssetRow[]> {
  if (assets.length === 0) return []
  const ids = assets.map((asset) => asset.id)
  const [checkouts, repairs, outstanding, auditItems, photos] = await Promise.all([
    findManyInChunks<HeldCheckoutRecord>(ids, (chunk) => db.assetCheckout.findMany({
      where: { assetId: { in: chunk }, ...openCheckoutWhere },
      select: heldCheckoutSelect,
      orderBy: { checkoutDate: "desc" },
    })),
    findManyInChunks<{ assetId: string }>(ids, (chunk) => db.maintenanceTicket.findMany({
      where: { ...openRepairRecordWhere, assetId: { in: chunk } },
      select: { assetId: true },
    })),
    findManyInChunks<{ id: string; componentAssetId: string; referenceId: string | null }>(ids, (chunk) => db.assetComponent.findMany({
      where: { componentAssetId: { in: chunk }, ...outstandingLinkWhere },
      select: { id: true, componentAssetId: true, referenceId: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    })),
    // The latest round first; a cancelled or deactivated round is no audit of the asset.
    findManyInChunks<HeldAuditItemRecord>(ids, (chunk) => db.auditItem.findMany({
      where: { assetId: { in: chunk }, auditRound: { isActive: true, status: auditRoundCoverageWhere } },
      select: heldAuditItemSelect,
      orderBy: [{ auditRound: { startDate: "desc" } }, { createdAt: "desc" }],
    })),
    readAssetPhotoPreviews(db, assets),
  ])
  // The latest open handover per asset wins, as the return search (asset-operation-search.ts).
  const checkoutByAssetId = firstByKey(checkouts, (checkout) => checkout.assetId)
  const repairAssetIds = new Set(repairs.map((repair) => repair.assetId))
  const outstandingByAssetId = firstByKey(outstanding, (link) => link.componentAssetId)
  // Chunks may come back in any order, so the latest audit item is chosen here, not by the read's order alone.
  const auditByAssetId = new Map<string, HeldAuditItemRecord>()
  for (const item of auditItems) if (!auditByAssetId.has(item.assetId)) auditByAssetId.set(item.assetId, item)

  return assets.map((asset) => {
    const checkout = checkoutByAssetId.get(asset.id) ?? null
    const link = outstandingByAssetId.get(asset.id) ?? null
    const outstandingFact: AssetOperationOutstandingFact | null = link ? { linkId: link.id, checkinId: link.referenceId } : null
    const returnBlock = getHeldAssetReturnBlock({
      statusName: asset.status.name,
      ownership: normalizeAssetOwnershipType(asset.ownershipType),
      custodianId: asset.custodianId,
      openCheckout: checkout && { id: checkout.id, handoverMode: checkout.handoverMode },
      hasOpenRepair: repairAssetIds.has(asset.id),
      conditionName: asset.condition?.name ?? null,
      outstanding: outstandingFact,
    })
    const audit = auditByAssetId.get(asset.id) ?? null
    return {
      assetId: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      status: asset.status,
      condition: asset.condition,
      category: asset.category,
      location: asset.currentLocation,
      photo: photos.get(asset.id) ?? null,
      handover: checkout && {
        id: checkout.id,
        documentNo: checkout.documentNo,
        kind: checkout.handoverMode === "temporary_loan" ? "loan" : "regular",
        checkoutDate: checkout.checkoutDate,
        dueDate: checkout.expectedReturnDate,
      },
      legacy: !checkout && !link,
      returnBlock,
      lastAudit: audit && {
        roundId: audit.auditRound.id,
        roundNo: audit.auditRound.auditNo,
        result: audit.auditResult,
        status: audit.auditStatus,
        checkedAt: audit.lastScanAt,
      },
    }
  })
}

export async function readEmployeePage(
  db: EmployeePageDb,
  id: string,
  viewer: EmployeePageViewer,
  options: { heldPage?: number; now?: Date } = {},
): Promise<EmployeePageData | null> {
  const employee = (await db.employee.findFirst({ where: { id }, select: employeeSelect })) as EmployeePageEmployee | null
  if (!employee) return null
  const now = options.now ?? new Date()

  const openHandoverWhere = { custodianId: id, ...openCheckoutWhere }
  const openLoanWhere = { ...openHandoverWhere, handoverMode: "temporary_loan" }
  const relatedEmployeeWhere = { isActive: true, OR: [{ reportedById: id }, { assignedToId: id }, { inspectedById: id }] }
  const pendingAuditFindingWhere = {
    actionOwnerId: id,
    OR: [{ reviewStatus: "pending" }, { actionStatus: { in: ["planned", "in_progress"] } }],
  }
  const relatedDisposalWhere = { isActive: true, OR: [{ requestedById: id }, { approverId: id }, { executedById: id }] }

  const [
    heldPage,
    openCheckoutCount,
    loanCount,
    overdueLoanCount,
    account,
    handoverHistory,
    openMaintenanceCount,
    repairs,
    pendingAuditFindingCount,
    auditFindings,
    auditItems,
    auditRounds,
    pendingDisposalCount,
    disposalRequests,
  ] = await Promise.all([
    readHeldPage(db, id, options.heldPage ?? 1),
    db.assetCheckout.count({ where: openHandoverWhere }),
    db.assetCheckout.count({ where: openLoanWhere }),
    db.assetCheckout.count({ where: { ...openLoanWhere, expectedReturnDate: { lt: startOfBangkokDay(now) } } }),
    viewer.canViewUsers
      ? db.user.findFirst({ where: { employeeId: id }, select: { username: true, isActive: true } }) as Promise<{ username: string; isActive: boolean } | null>
      : Promise.resolve(null),
    db.assetCheckout.findMany({
      where: { custodianId: id },
      select: handoverHistorySelect,
      orderBy: { checkoutDate: "desc" },
      take: 10,
    }) as Promise<EmployeePageHandoverHistoryRow[]>,
    db.maintenanceTicket.count({ where: { ...relatedEmployeeWhere, ...openRepairRecordWhere } }),
    db.maintenanceTicket.findMany({
      where: relatedEmployeeWhere,
      select: repairSelect,
      orderBy: { reportedDate: "desc" },
      take: 10,
    }) as Promise<EmployeePageRepairRow[]>,
    db.auditFinding.count({ where: pendingAuditFindingWhere }),
    db.auditFinding.findMany({
      where: { actionOwnerId: id },
      select: auditFindingSelect,
      orderBy: { reportedAt: "desc" },
      take: 10,
    }) as Promise<EmployeePageAuditFindingRow[]>,
    db.auditItem.findMany({
      where: { OR: [{ expectedCustodianId: id }, { actualCustodianId: id }] },
      select: auditItemSelect,
      orderBy: [{ lastScanAt: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }) as Promise<EmployeePageAuditItemRow[]>,
    db.auditRound.findMany({
      where: { scopeCustodianId: id, isActive: true },
      select: auditRoundSelect,
      orderBy: { startDate: "desc" },
      take: 5,
    }) as Promise<EmployeePageAuditRoundRow[]>,
    db.disposalRequest.count({ where: { ...relatedDisposalWhere, requestStatus: { in: ["pending", "approved"] } } }),
    db.disposalRequest.findMany({
      where: relatedDisposalWhere,
      select: disposalSelect,
      orderBy: { requestDate: "desc" },
      take: 10,
    }) as Promise<EmployeePageDisposalRow[]>,
  ])

  const rows = await readHeldRows(db, heldPage.assets)
  const heldCount = heldPage.total
  const counts: EmployeeDetailSummaryInput = {
    currentAssetCount: heldCount,
    openCheckoutCount,
    openMaintenanceCount,
    pendingAuditFindingCount,
    pendingDisposalCount,
  }

  return {
    employee,
    warning: isFormerEmployee(employee) && heldCount > 0 ? { former: true, heldCount } : null,
    held: { rows, total: heldCount, page: heldPage.page, pageSize: employeeHeldPageSize },
    openHandovers: { regular: openCheckoutCount - loanCount, loans: loanCount, overdueLoans: overdueLoanCount },
    account: account ? { username: account.username, isActive: account.isActive } : null,
    counts,
    followUpItems: buildEmployeeFollowUpItems({
      employmentStatus: employee.employmentStatus,
      isActive: employee.isActive,
      ...counts,
      overdueLoanCount,
    }),
    handoverHistory,
    repairs,
    auditFindings,
    auditItems,
    auditRounds,
    disposalRequests,
  }
}
