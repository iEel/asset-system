// The work center's queues and their totals, shared by the work center, the dashboard and the bell (group 9 spec §3).
// Client-safe and pure: relative imports only, no database, so node --test imports it.
import type { WaitingWorkCounts, WaitingWorkKey } from "./waiting-work-rules.ts"

export const WORK_QUEUES = ["approvals", "maintenance", "audit", "disposal"] as const
export type WorkQueue = (typeof WORK_QUEUES)[number]

// Expiries and returns coming up: listed apart, never part of งานค้างทั้งหมด.
export const ADVANCE_WARNING_KEYS = ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"] as const

// pendingAuditFindings and pendingDisposals are only visible when the inbox does not hold them (waitingWorkVisibleKeys),
// so a pending item is never counted in both the approvals queue and its own.
const workQueueKeys: Record<WorkQueue, readonly WaitingWorkKey[]> = {
  approvals: ["approvalInbox"],
  maintenance: ["openRepairs", "stuckRepairs", "duePm"],
  audit: ["openAuditActions", "auditActionsDueSoon", "pendingAuditFindings"],
  disposal: ["approvedDisposals", "pendingDisposals"],
}

export function queueKeysFor(queue: WorkQueue): readonly WaitingWorkKey[] {
  return workQueueKeys[queue]
}

export type WorkQueueInput = {
  counts: WaitingWorkCounts
  visibleKeys: readonly WaitingWorkKey[]
  approvalInbox: { total: number; disposal: number; audit: number; findings: number; rounds: number }
}

export type WorkQueueSummary = {
  /** Only the queues with a visible key, in WORK_QUEUES order. */
  queues: { queue: WorkQueue; count: number; keys: WaitingWorkKey[] }[]
  /** งานค้างทั้งหมด: รออนุมัติ + ซ่อมบำรุง + ตรวจนับ + ตัดจำหน่าย. */
  backlogTotal: number
  /** ต้องทำวันนี้: รออนุมัติ + อนุมัติแล้วรอบันทึกตัดจำหน่าย. */
  today: { total: number; approvals: number; approvedDisposals: number }
  /** The inbox's parts (ตัดจำหน่าย · รายการไม่ตรง · ปิดรอบตรวจนับ), null without the approvals queue. */
  approvalParts: { disposal: number; audit: number; round: number } | null
  /** เตือนล่วงหน้า: the visible advance keys and their sum. */
  advance: { total: number; keys: WaitingWorkKey[] }
}

export function buildWorkQueueSummary(work: WorkQueueInput): WorkQueueSummary {
  const visible = new Set(work.visibleKeys)
  const countOf = (key: WaitingWorkKey) => (visible.has(key) ? work.counts[key] ?? 0 : 0)
  const sum = (keys: readonly WaitingWorkKey[]) => keys.reduce((total, key) => total + countOf(key), 0)

  const queues = WORK_QUEUES.flatMap((queue) => {
    const keys = workQueueKeys[queue].filter((key) => visible.has(key))
    return keys.length > 0 ? [{ queue, count: sum(keys), keys }] : []
  })
  const backlogTotal = queues.reduce((total, queue) => total + queue.count, 0)

  const approvalsQueue = queues.find((queue) => queue.queue === "approvals")
  const approvals = approvalsQueue?.count ?? 0
  const approvedDisposals = countOf("approvedDisposals")
  const { disposal, findings, rounds } = work.approvalInbox

  const advanceKeys = ADVANCE_WARNING_KEYS.filter((key) => visible.has(key))

  return {
    queues,
    backlogTotal,
    today: { total: approvals + approvedDisposals, approvals, approvedDisposals },
    approvalParts: approvalsQueue ? { disposal, audit: findings, round: rounds } : null,
    advance: { total: sum(advanceKeys), keys: advanceKeys },
  }
}

export function isAdvanceWarningKey(key: WaitingWorkKey): boolean {
  return (ADVANCE_WARNING_KEYS as readonly WaitingWorkKey[]).includes(key)
}
