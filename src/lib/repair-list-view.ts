// The repair list's views (group 5 plan 5, spec §11): the status tab counts, the row, the PM card row and its foot link,
// and the strip's shape. Client-safe and pure: relative imports, no React, no db.
import type { PmDueCount } from "./pm-due-counts.ts"
import { bangkokDayDiff } from "./preventive-maintenance.ts"
import { repairDurationLine, type RepairDurationKey } from "./repair-record-detail-rules.ts"
import { toRepairRecordStatus, type RepairRecordStatus } from "./repair-record-policy.ts"

export type RepairStatusCounts = { all: number; in_progress: number; closed: number; cancelled: number }

/** One groupBy on repairStatus, folded: old workflow statuses count as in_progress; all is the sum (G5P5-R4). */
export function foldRepairStatusCounts(groups: { repairStatus: string; _count: { _all: number } }[]): RepairStatusCounts {
  const counts: RepairStatusCounts = { all: 0, in_progress: 0, closed: 0, cancelled: 0 }
  for (const group of groups) {
    counts[toRepairRecordStatus(group.repairStatus)] += group._count._all
    counts.all += group._count._all
  }
  return counts
}

// A Prisma Decimal, or a plain number; Number() reads either.
type CostValue = number | { toString(): string }

/** The list's record as the reader includes it. */
export type RepairListRecord = {
  id: string
  repairNo: string
  reportedDate: Date
  returnDate: Date | null
  repairStatus: string
  outcome: string | null
  problem: string
  resolution: string | null
  repairCost: CostValue | null
  createdBy: string
  maintenancePlanId: string | null
  asset: { name: string; assetTag: string }
  reportedBy: { fullNameTh: string }
  vendor: { name: string } | null
}

export type RepairListLine =
  | { kind: "outcome"; key: "usable" | "beyond_repair" | "unknown" }
  | { kind: "duration"; key: RepairDurationKey; days: number }
  | { kind: "cancelReason"; text: string }
  | null

export type RepairListRowView = {
  id: string
  repairNo: string
  reportedDate: Date
  asset: { name: string; assetTag: string }
  problem: string
  resolution: string | null
  status: RepairRecordStatus
  vendorName: string | null
  reporterName: string
  cost: number | null
  line: RepairListLine
}

/** The status cell's secondary line (G5P5-R6): the outcome when closed, the day count when open, the reason when cancelled. */
export function toRepairListRowView(record: RepairListRecord, cancelReason: string | null, now: Date): RepairListRowView {
  const status = toRepairRecordStatus(record.repairStatus)
  const vendorName = record.vendor?.name ?? null
  let line: RepairListLine = null
  if (status === "closed") {
    line = {
      kind: "outcome",
      key: record.outcome === "usable" || record.outcome === "beyond_repair" ? record.outcome : "unknown",
    }
  } else if (status === "in_progress") {
    const duration = repairDurationLine(
      {
        id: record.id,
        repairStatus: record.repairStatus,
        outcome: record.outcome,
        reportedDate: record.reportedDate,
        returnDate: record.returnDate,
        problem: record.problem,
        vendorName,
        createdBy: record.createdBy,
        maintenancePlanId: record.maintenancePlanId,
      },
      now,
    )
    line = duration ? { kind: "duration", key: duration.key, days: duration.days } : null
  } else {
    const text = cancelReason?.trim()
    line = text ? { kind: "cancelReason", text } : null
  }
  return {
    id: record.id,
    repairNo: record.repairNo,
    reportedDate: record.reportedDate,
    asset: { name: record.asset.name, assetTag: record.asset.assetTag },
    problem: record.problem,
    resolution: record.resolution,
    status,
    vendorName,
    reporterName: record.reportedBy.fullNameTh,
    cost: record.repairCost == null ? null : Number(record.repairCost),
    line,
  }
}

/** A due plan as the reader selects it: the asset's open record, newest, at most one. */
export type PmCardPlan = {
  id: string
  title: string
  nextDueDate: Date
  asset: { name: string; assetTag: string; maintenanceTickets: { id: string; repairNo: string }[] }
}

export type PmCardRowView = {
  id: string
  title: string
  assetName: string
  assetTag: string
  badge: { kind: "overdue"; days: number } | { kind: "due"; date: Date }
  openRecord: { id: string; repairNo: string } | null
}

/** The PM card row (G5P5-R7): overdue by Bangkok days, else its due date; an open record replaces บันทึกว่าทำแล้ว. */
export function toPmCardRowView(plan: PmCardPlan, now: Date): PmCardRowView {
  const daysLate = bangkokDayDiff(plan.nextDueDate, now)
  const open = plan.asset.maintenanceTickets[0]
  return {
    id: plan.id,
    title: plan.title,
    assetName: plan.asset.name,
    assetTag: plan.asset.assetTag,
    badge: daysLate > 0 ? { kind: "overdue", days: daysLate } : { kind: "due", date: plan.nextDueDate },
    openRecord: open ? { id: open.id, repairNo: open.repairNo } : null,
  }
}

/** The PM card's foot link (decision 6, G5P5-R7): the overdue plans first, else the week's; hidden at 0. */
export function pmCardFootLink(overdue: number, week: number): { due: "overdue" | "week"; count: number } | null {
  if (overdue > 0) return { due: "overdue", count: overdue }
  if (week > 0) return { due: "week", count: week }
  return null
}

/** The "ต้องจัดการ" strip (G5P5-R1, R2): global counts; total is the four cells' sum. */
export type RepairStrip = {
  open: { count: number; earliest: Date | null }
  stuck: number
  pmOverdue: PmDueCount
  pmWeek: PmDueCount
  total: number
}

export function buildRepairStrip(input: Omit<RepairStrip, "total">): RepairStrip {
  return { ...input, total: input.open.count + input.stuck + input.pmOverdue.count + input.pmWeek.count }
}
