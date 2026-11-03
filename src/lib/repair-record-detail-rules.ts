// The repair record page's rules (group 5 plan 3, spec §8.1-§8.3): the next-step card, the day count, the history and
// the default attachment type. Client-safe and pure: relative imports, no React, no db.
import { repairDays } from "./asset-repair-rules.ts"
import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import { getRepairCompleteOutlook, type RepairAssetFacts, type RepairCompleteRow } from "./repair-record-outlook.ts"
import { isOpenRepairStatus } from "./repair-record-policy.ts"

export type RepairDetailRecord = {
  id: string
  repairStatus: string
  outcome: string | null
  reportedDate: Date
  returnDate: Date | null
  problem: string
  vendorName: string | null
  createdBy: string
  maintenancePlanId: string | null
}

export type RepairDurationKey = "sentDays" | "repairDays" | "sentToday" | "repairToday"

/** The day count while the record is open: "sent" with a vendor, "repair" without, "Today" on day 0. */
export function repairDurationLine(record: RepairDetailRecord, now: Date): { key: RepairDurationKey; days: number } | null {
  if (!isOpenRepairStatus(record.repairStatus)) return null
  const days = repairDays(record, now)
  if (days === null) return null
  const sent = Boolean(record.vendorName?.trim())
  if (days === 0) return { key: sent ? "sentToday" : "repairToday", days }
  return { key: sent ? "sentDays" : "repairDays", days }
}

export type RepairDisposalStep = { kind: "assetDisposed" } | { kind: "openRequest"; id: string; disposalNo: string } | { kind: "canRequest" }

export type RepairNextStep =
  | { kind: "open"; vendorName: string | null; rows: RepairCompleteRow[] }
  | { kind: "closedUsable"; returnDate: Date | null; statusName: string }
  | { kind: "closedBeyond"; returnDate: Date | null; disposal: RepairDisposalStep }
  | { kind: "closedNoOutcome"; returnDate: Date | null }
  | { kind: "cancelled"; cancelledAt: Date | null; reason: string | null }

/** The next-step card: what ซ่อมเสร็จ will do while open, else what the close left (G5P3-R1, R5, R7). */
export function buildRepairNextStep(input: {
  record: RepairDetailRecord
  facts: RepairAssetFacts
  openDisposal: { id: string; disposalNo: string } | null
  cancel: { at: Date; reason: string | null } | null
}): RepairNextStep {
  const { record, facts, openDisposal, cancel } = input
  if (record.repairStatus === "cancelled") {
    return { kind: "cancelled", cancelledAt: cancel?.at ?? null, reason: cancel?.reason?.trim() || null }
  }
  if (isOpenRepairStatus(record.repairStatus)) {
    return {
      kind: "open",
      vendorName: record.vendorName,
      rows: [getRepairCompleteOutlook(facts, "usable"), getRepairCompleteOutlook(facts, "beyond_repair")],
    }
  }
  if (record.outcome === "usable") return { kind: "closedUsable", returnDate: record.returnDate, statusName: facts.statusName }
  if (record.outcome === "beyond_repair") {
    const disposal: RepairDisposalStep = normalizeAssetStateName(facts.statusName) === "disposed"
      ? { kind: "assetDisposed" }
      : openDisposal
        ? { kind: "openRequest", id: openDisposal.id, disposalNo: openDisposal.disposalNo }
        : { kind: "canRequest" }
    return { kind: "closedBeyond", returnDate: record.returnDate, disposal }
  }
  return { kind: "closedNoOutcome", returnDate: record.returnDate }
}

export type RepairHistoryLabelKey = "create" | "statusUpdate" | "close" | "cancel" | "pmCreate" | "conditionChange" | "fallback"
export type RepairHistoryValue = { kind: "status" | "condition" | "text"; value: string }

export type RepairHistoryEvent =
  | {
      kind: "movement"
      id: string
      at: Date
      labelKey: RepairHistoryLabelKey
      from: RepairHistoryValue | null
      to: RepairHistoryValue | null
      actor: string | null
      reason: string | null
    }
  | { kind: "attachments"; key: string; at: Date; type: string; count: number; actor: string | null }
  | { kind: "future" }

export type RepairHistoryMovement = {
  id: string
  movementType: string
  performedAt: Date
  performedBy: string
  fromLabel: RepairHistoryValue | null
  toLabel: RepairHistoryValue | null
  reason: string | null
}

export type RepairHistoryAttachment = { id: string; uploadedAt: Date; uploadedBy: string; type: string }

const movementLabelKeys: Record<string, RepairHistoryLabelKey> = {
  maintenance_create: "create",
  maintenance_status_update: "statusUpdate",
  maintenance_close: "close",
  maintenance_cancel: "cancel",
  maintenance_pm_create: "pmCreate",
  condition_change: "conditionChange",
}

// G5P3-R4: a run is the same type by the same uploader, each within 10 minutes of the run's first upload.
const attachmentRunMs = 10 * 60_000

/** The record's history, oldest first: movements, attachment runs, then the future step while the record is open. */
export function buildRepairHistory(input: {
  record: RepairDetailRecord
  movements: RepairHistoryMovement[]
  attachments: RepairHistoryAttachment[]
  actorById: Map<string, string>
}): RepairHistoryEvent[] {
  const { record, movements, attachments, actorById } = input
  const problem = record.problem.trim()
  const events: Array<Exclude<RepairHistoryEvent, { kind: "future" }>> = movements.map((movement) => {
    const reason = movement.reason?.trim() ?? ""
    return {
      kind: "movement",
      id: movement.id,
      at: movement.performedAt,
      labelKey: movementLabelKeys[movement.movementType] ?? "fallback",
      from: movement.fromLabel,
      to: movement.toLabel,
      actor: actorById.get(movement.performedBy) ?? null,
      // G5P3-R6: the reason shows only when it differs from the record's problem.
      reason: reason && reason !== problem ? reason : null,
    }
  })

  const sortedAttachments = [...attachments].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
  let run: { first: RepairHistoryAttachment; count: number } | null = null
  const flush = () => {
    if (!run) return
    events.push({
      kind: "attachments",
      key: run.first.id,
      at: run.first.uploadedAt,
      type: run.first.type,
      count: run.count,
      actor: actorById.get(run.first.uploadedBy) ?? null,
    })
  }
  for (const attachment of sortedAttachments) {
    if (
      run &&
      run.first.type === attachment.type &&
      run.first.uploadedBy === attachment.uploadedBy &&
      attachment.uploadedAt.getTime() - run.first.uploadedAt.getTime() <= attachmentRunMs
    ) {
      run.count += 1
      continue
    }
    flush()
    run = { first: attachment, count: 1 }
  }
  flush()

  // A stable sort keeps a movement before an attachment run at the same instant.
  const history: RepairHistoryEvent[] = events.sort((a, b) => a.at.getTime() - b.at.getTime())
  if (isOpenRepairStatus(record.repairStatus)) history.push({ kind: "future" })
  return history
}

/** The upload's preselected type: before the repair while open, after it once closed or cancelled. */
export function defaultAttachmentType(repairStatus: string): "before_repair" | "after_repair" {
  return isOpenRepairStatus(repairStatus) ? "before_repair" : "after_repair"
}
