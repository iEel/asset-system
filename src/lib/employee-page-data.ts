import type { Prisma } from "@prisma/client"

import { outstandingLinkWhere } from "./asset-component-outstanding.ts"
import { getTransferVerdict, type AssetOperationFacts, type AssetOperationOutstandingFact } from "./asset-operation-eligibility.ts"
import { openCheckoutWhere } from "./asset-operation-search-rules.ts"
import { normalizeAssetOwnershipType } from "./asset-ownership.ts"
import { readAssetPhotoPreviews, type AssetPhotoPreview } from "./asset-photo-preview.ts"
import { foldAuditRoundResultCounts, type AuditRoundResultCountRow } from "./audit-round-result-filters.ts"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "./audit-round-status.ts"
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
  auditItem: { findMany(args: object): Promise<unknown[]>; groupBy(args: object): Promise<unknown[]> }
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
  /** Held as an outstanding component (ส่วนควบค้างคืน): returned through the single form's late return (G7P4-R2). */
  outstandingComponent: boolean
  /** An open repair record on the asset (G7P4-R2). */
  openRepair: boolean
  /** That open repair, the latest reported, for its MT- link (G7F-R4); null when none is open. */
  openRepairRecord: { id: string; repairNo: string } | null
  /** Why the transfer form refuses the asset (getTransferVerdict, as the asset page's โอนย้าย), a full message key; null when it takes it. */
  transferBlockReasonKey: string | null
  lastAudit: EmployeeHeldLastAudit | null
}

/** A round still open (not closed or cancelled) holding some of the person's held assets, and how its items stand (G7F-R4). */
export type EmployeeCurrentAudit = {
  roundId: string
  auditNo: string
  name: string
  endDate: Date
  /** The round's own items among the held assets; total = found + mismatch + notFound + pending. */
  total: number
  found: number
  mismatch: number
  notFound: number
  pending: number
}

export type EmployeePageData = {
  employee: EmployeePageEmployee
  /** "พ้นสภาพแล้ว ยังถือครอง {n} รายการ": a former employee (G7P2-R1) holding at least one active asset. */
  warning: { former: boolean; heldCount: number } | null
  held: { rows: EmployeeHeldAssetRow[]; total: number; page: number; pageSize: number }
  /** Every held asset (not the page) with an open handover, and without one (G7F-R4): the two add up to held.total. */
  heldHandoverSplit: { withHandover: number; withoutHandover: number }
  /** ตรวจนับรอบปัจจุบัน (G7F-R4), the latest round first; empty when no open round holds a held asset. */
  currentAudits: EmployeeCurrentAudit[]
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

/** What the page calls held: the person is the custodian of an active asset. */
function heldAssetWhere(employeeId: string) {
  return { custodianId: employeeId, isActive: true }
}

async function readHeldPage(db: EmployeePageDb, employeeId: string, requestedPage: number) {
  const where = heldAssetWhere(employeeId)
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
    findManyInChunks<{ id: string; repairNo: string; assetId: string; reportedDate: Date }>(ids, (chunk) => db.maintenanceTicket.findMany({
      where: { ...openRepairRecordWhere, assetId: { in: chunk } },
      select: { id: true, repairNo: true, assetId: true, reportedDate: true },
      orderBy: [{ reportedDate: "desc" }, { id: "asc" }],
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
  // Chunks may come back in any order: the latest reported open repair per asset is chosen here.
  const repairByAssetId = new Map<string, (typeof repairs)[number]>()
  for (const repair of repairs) {
    const known = repairByAssetId.get(repair.assetId)
    if (!known || repair.reportedDate.getTime() > known.reportedDate.getTime()) repairByAssetId.set(repair.assetId, repair)
  }
  const outstandingByAssetId = firstByKey(outstanding, (link) => link.componentAssetId)
  // Chunks may come back in any order, so the latest audit item is chosen here, not by the read's order alone.
  const auditByAssetId = new Map<string, HeldAuditItemRecord>()
  for (const item of auditItems) if (!auditByAssetId.has(item.assetId)) auditByAssetId.set(item.assetId, item)

  return assets.map((asset) => {
    const checkout = checkoutByAssetId.get(asset.id) ?? null
    const link = outstandingByAssetId.get(asset.id) ?? null
    const outstandingFact: AssetOperationOutstandingFact | null = link ? { linkId: link.id, checkinId: link.referenceId } : null
    const ownership = normalizeAssetOwnershipType(asset.ownershipType)
    const facts: AssetOperationFacts = {
      statusName: asset.status.name,
      ownership,
      custodianId: asset.custodianId,
      openCheckout: checkout && { id: checkout.id, handoverMode: checkout.handoverMode },
      hasOpenRepair: repairAssetIds.has(asset.id),
      conditionName: asset.condition?.name ?? null,
      outstanding: outstandingFact,
    }
    const returnBlock = getHeldAssetReturnBlock(facts)
    // The asset page's โอนย้าย (asset-actions.ts): a personal asset gets a new holder, anything else is a move.
    const transferVerdict = getTransferVerdict(facts, { assignCustodian: ownership === "personal" })
    const repair = repairByAssetId.get(asset.id) ?? null
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
      outstandingComponent: link !== null,
      openRepair: repairAssetIds.has(asset.id),
      openRepairRecord: repair && { id: repair.id, repairNo: repair.repairNo },
      transferBlockReasonKey: transferVerdict.eligible ? null : transferVerdict.reasonKey,
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

// ตรวจนับรอบปัจจุบัน (G7F-R4): the person's held assets (custodian now, active) in rounds still open, the audit pages'
// operational rounds (not closed or cancelled; an old draft is open). One grouped count by round, status and result, so
// no item row is loaded; foldAuditRoundResultCounts sorts them as the round page does (out of scope apart, a checked item
// with no result is ไม่ตรง). The rounds are few: their names in one read by id, in chunks of 2,000 all the same.
async function readCurrentAudits(db: EmployeePageDb, employeeId: string): Promise<EmployeeCurrentAudit[]> {
  const grouped = (await db.auditItem.groupBy({
    by: ["auditRoundId", "auditStatus", "auditResult"],
    where: {
      asset: { custodianId: employeeId, isActive: true },
      auditRound: { isActive: true, status: auditRoundOperationalWhere },
    },
    _count: { _all: true },
  })) as Array<{ auditRoundId: string; auditStatus: string; auditResult: string | null; _count: { _all: number } }>
  const rowsByRound = new Map<string, AuditRoundResultCountRow[]>()
  for (const group of grouped) {
    const rows = rowsByRound.get(group.auditRoundId) ?? []
    rows.push({ auditStatus: group.auditStatus, auditResult: group.auditResult, count: group._count._all })
    rowsByRound.set(group.auditRoundId, rows)
  }
  if (rowsByRound.size === 0) return []
  const rounds = await findManyInChunks<{ id: string; auditNo: string; name: string; startDate: Date; endDate: Date }>([...rowsByRound.keys()], (chunk) => db.auditRound.findMany({
    where: { id: { in: chunk } },
    select: { id: true, auditNo: true, name: true, startDate: true, endDate: true },
  }))
  return rounds
    .map((round) => ({ round, counts: foldAuditRoundResultCounts(rowsByRound.get(round.id) ?? []) }))
    // Only out-of-scope finds: not one of the round's own items.
    .filter(({ counts }) => counts.all > 0)
    .sort((left, right) => right.round.startDate.getTime() - left.round.startDate.getTime() || left.round.auditNo.localeCompare(right.round.auditNo))
    .map(({ round, counts }) => ({
      roundId: round.id,
      auditNo: round.auditNo,
      name: round.name,
      endDate: round.endDate,
      total: counts.all,
      found: counts.found,
      mismatch: counts.mismatch,
      notFound: counts.notFound,
      pending: counts.pending,
    }))
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
    heldWithHandoverCount,
    heldWithoutHandoverCount,
    currentAudits,
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
    // G7F-R4: over every held asset, one count each; an open handover is the held rows' own (openCheckoutWhere).
    db.asset.count({ where: { ...heldAssetWhere(id), checkouts: { some: openCheckoutWhere } } }),
    db.asset.count({ where: { ...heldAssetWhere(id), checkouts: { none: openCheckoutWhere } } }),
    readCurrentAudits(db, id),
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
    heldHandoverSplit: { withHandover: heldWithHandoverCount, withoutHandover: heldWithoutHandoverCount },
    currentAudits,
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

// รับคืนหลายรายการ (group 7 plan 4 Task 4, spec §5.3): every asset the person holds, by asset tag, read as the employee
// page reads its held rows (the same return block, handover and photo), not paged. Bounded at employeeReturnBatchReadLimit
// rows; `total` says how many the person holds, so the form can say when some are not listed.
export const employeeReturnBatchReadLimit = 200

export type EmployeeReturnBatchEmployee = { id: string; code: string; fullNameTh: string; isActive: boolean; employmentStatus: string }
export type EmployeeReturnBatchData = { employee: EmployeeReturnBatchEmployee; rows: EmployeeHeldAssetRow[]; total: number }

export async function readEmployeeReturnBatch(db: EmployeePageDb, employeeId: string): Promise<EmployeeReturnBatchData | null> {
  const employee = (await db.employee.findFirst({
    where: { id: employeeId },
    select: { id: true, code: true, fullNameTh: true, isActive: true, employmentStatus: true },
  })) as EmployeeReturnBatchEmployee | null
  if (!employee) return null
  const where = { custodianId: employeeId, isActive: true }
  const [total, assets] = await Promise.all([
    db.asset.count({ where }),
    db.asset.findMany({
      where,
      select: heldAssetSelect,
      orderBy: [{ assetTag: "asc" }, { id: "asc" }],
      take: employeeReturnBatchReadLimit,
    }) as Promise<HeldAssetRecord[]>,
  ])
  return { employee, rows: await readHeldRows(db, assets), total }
}
