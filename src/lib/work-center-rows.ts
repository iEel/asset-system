// The work center's rows: urgency, order, next step and the "แสดงเพิ่ม" paging (group 9 spec §4.2).
// Client-safe and pure: relative imports only, no database, so node --test imports it.
import { approvalInboxItemHref } from "./approval-inbox.ts"
import { appendOperationalReturnTo } from "./operational-return-navigation.ts"
import { bangkokDayDiff } from "./preventive-maintenance.ts"
import type { WorkQueue } from "./work-queues.ts"

export type WorkRowKind =
  | "disposalApproval"
  | "findingApproval"
  | "roundClose"
  | "approvedDisposal"
  | "duePm"
  | "openRepair"
  | "stuckRepair"
  | "auditAction"
  | "pendingFinding"
  | "pendingDisposal"

const workRowQueues: Record<WorkRowKind, WorkQueue> = {
  disposalApproval: "approvals",
  findingApproval: "approvals",
  roundClose: "approvals",
  approvedDisposal: "disposal",
  pendingDisposal: "disposal",
  duePm: "maintenance",
  openRepair: "maintenance",
  stuckRepair: "maintenance",
  auditAction: "audit",
  pendingFinding: "audit",
}

export function workRowQueue(kind: WorkRowKind): WorkQueue {
  return workRowQueues[kind]
}

/** A light record: enough to rank every source's rows in memory before loading the ones on screen. */
export type WorkRowLite = { kind: WorkRowKind; id: string; since: Date; deadline: Date | null; number: string }

export type WorkRowUrgency = "overdue" | "todo" | "ready"

export const WORK_ROW_SOON_DAYS = 7

// Bangkok days from today to the deadline: negative is overdue.
function deadlineDays(row: WorkRowLite, today: Date): number | null {
  return row.deadline ? bangkokDayDiff(today, row.deadline) : null
}

/** เกินกำหนด: a deadline before today · ต้องทำ: today..today+7 or no deadline · พร้อมดำเนินการ: later. */
export function workRowUrgency(row: WorkRowLite, today: Date): WorkRowUrgency {
  const days = deadlineDays(row, today)
  if (days === null) return "todo"
  if (days < 0) return "overdue"
  return days <= WORK_ROW_SOON_DAYS ? "todo" : "ready"
}

/** Overdue rows by days overdue (most first), then the rest by since (oldest first); ties by number. A new array. */
export function rankWorkRows(rows: readonly WorkRowLite[], today: Date): WorkRowLite[] {
  const keyed = rows.map((row) => {
    const days = deadlineDays(row, today)
    return { row, overdueDays: days !== null && days < 0 ? -days : 0 }
  })
  keyed.sort((a, b) => {
    const aOverdue = a.overdueDays > 0
    const bOverdue = b.overdueDays > 0
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    if (aOverdue) {
      if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays
    } else {
      const since = a.row.since.getTime() - b.row.since.getTime()
      if (since !== 0) return since
    }
    return a.row.number < b.row.number ? -1 : a.row.number > b.row.number ? 1 : 0
  })
  return keyed.map((entry) => entry.row)
}

export type WorkRowIds = { id: string; assetId: string | null; planId?: string | null; findingId?: string }

const workRowLabelKeys: Record<WorkRowKind, string> = {
  disposalApproval: "workCenter.nextStep.reviewRequest",
  findingApproval: "workCenter.nextStep.reviewFinding",
  roundClose: "workCenter.nextStep.approveClose",
  approvedDisposal: "workCenter.nextStep.recordDisposal",
  duePm: "workCenter.nextStep.recordPmDone",
  openRepair: "workCenter.nextStep.recordRepairDone",
  stuckRepair: "workCenter.nextStep.openRepair",
  auditAction: "workCenter.nextStep.updateAction",
  pendingFinding: "workCenter.nextStep.openFinding",
  pendingDisposal: "workCenter.nextStep.openRequest",
}

function workRowHref(kind: WorkRowKind, ids: WorkRowIds, locale: string): string {
  switch (kind) {
    case "disposalApproval":
      return approvalInboxItemHref(locale, "disposal", ids.id)
    case "findingApproval":
      return approvalInboxItemHref(locale, "finding", ids.id)
    case "roundClose":
      return approvalInboxItemHref(locale, "round", ids.id)
    case "approvedDisposal":
      return `/${locale}/disposal/rounds/new`
    case "duePm":
      return `/${locale}/maintenance/new?planId=${ids.planId}`
    case "openRepair":
      return `/${locale}/maintenance/${ids.id}`
    case "stuckRepair":
      return `/${locale}/maintenance/new?assetId=${ids.assetId}`
    case "auditAction":
    case "pendingFinding":
      return `/${locale}/audit/findings?finding=${ids.id}`
    case "pendingDisposal":
      return `/${locale}/disposal/${ids.id}`
  }
}

/** The one button per row (ขั้นถัดไป): the page where the step is done, with the work center as its way back. */
export function workRowNextStep(
  kind: WorkRowKind,
  ids: WorkRowIds,
  locale: string,
  returnTo?: string,
): { labelKey: string; href: string } {
  const href = workRowHref(kind, ids, locale)
  return { labelKey: workRowLabelKeys[kind], href: returnTo ? appendOperationalReturnTo(href, returnTo) : href }
}

export const WORK_SHOW_STEP = 8
export const WORK_SHOW_MAX = 200

/** `show=`: the smallest multiple of 8 at or above the number, from 8 to 200; junk or ≤ 0 is 8. */
export function parseWorkShow(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value <= 0) return WORK_SHOW_STEP
  return Math.min(WORK_SHOW_MAX, Math.max(WORK_SHOW_STEP, Math.ceil(value / WORK_SHOW_STEP) * WORK_SHOW_STEP))
}
