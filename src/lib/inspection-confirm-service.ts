// ยืนยันผลตรวจ (inspection-confirm spec §4): releases a round's assets stuck "Under Inspection" to the status their audit
// result gives, all or nothing. The route (src/app/api/audit-rounds/[id]/confirm-results/route.ts) checks the permission
// and the round and maps the errors; this module re-reads the rows inside one serializable transaction, refuses the
// whole request when any asset changed, and writes each asset's history as a status correction would
// (src/app/api/assets/[id]/status-correction/route.ts).
import type { Prisma } from "@prisma/client"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { loadRoundInspectionRows, type InspectionRow } from "./inspection-confirm-data.ts"
import {
  INSPECTION_STATUS_NAME,
  inspectionOutcomeTab,
  inspectionTargetStatusName,
  type InspectionConfirmOutcome,
  type InspectionTargetStatusName,
} from "./inspection-confirm-rules.ts"
import type { InspectionConfirmInput } from "./validations/inspection-confirm.ts"

// Up to 500 assets over the VPN: the multi-return's options (batch-checkin-service.ts).
export const inspectionConfirmTransactionOptions = {
  isolationLevel: "Serializable",
  maxWait: 10_000,
  timeout: 120_000,
} as const satisfies { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number }

export const INSPECTION_CONFIRM_CHANGED_MESSAGE = "Some assets changed before the audit results were confirmed"

export type InspectionConfirmBlockedCode = "notInRound" | "notUnderInspection" | "notScanned" | "awaitingReview" | "wrongTab" | "handoverUnclear"
export type InspectionConfirmBlocked = { assetId: string; assetTag: string | null; code: InspectionConfirmBlockedCode }

// One answer naming every refused asset: the bulk-move 409 shape { code, error, blocked: [{ assetId, assetTag, code }] }.
export class InspectionConfirmChangedError extends Error {
  readonly blocked: InspectionConfirmBlocked[]

  constructor(blocked: InspectionConfirmBlocked[]) {
    super(INSPECTION_CONFIRM_CHANGED_MESSAGE)
    this.name = "InspectionConfirmChangedError"
    this.blocked = blocked
  }
}

export type InspectionConfirmResult = { confirmed: number; byStatus: Partial<Record<InspectionTargetStatusName, number>> }

/**
 * Per requested id, in request order, its first refusal. An id with no row reads notInRound here; the service upgrades it
 * to notUnderInspection when the round has an item for that asset.
 */
export function findInspectionConfirmRefusals(
  rows: readonly InspectionRow[],
  assetIds: readonly string[],
  outcome: InspectionConfirmOutcome,
): InspectionConfirmBlocked[] {
  const rowsById = new Map(rows.map((row) => [row.assetId, row]))
  const blocked: InspectionConfirmBlocked[] = []
  for (const assetId of assetIds) {
    const row = rowsById.get(assetId)
    if (!row) {
      blocked.push({ assetId, assetTag: null, code: "notInRound" })
      continue
    }
    const refuse = (code: InspectionConfirmBlockedCode) => blocked.push({ assetId, assetTag: row.assetTag, code })
    if (row.tab === "notScanned") refuse("notScanned")
    else if (row.tab === "awaitingReview") refuse("awaitingReview")
    else if (row.tab !== inspectionOutcomeTab[outcome]) refuse("wrongTab")
    else if (inspectionTargetStatusName(row, outcome) === null) refuse("handoverUnclear")
  }
  return blocked
}

type ConfirmedAsset = { assetId: string; fromStatusId: string | null; statusId: string; statusName: InspectionTargetStatusName }

export async function confirmInspectionResults(
  input: InspectionConfirmInput & { auditRoundId: string; userId: string },
): Promise<InspectionConfirmResult> {
  const { assetIds, reason, outcome, auditRoundId, userId } = input

  const round = await prisma.auditRound.findFirst({
    where: { id: auditRoundId, isActive: true },
    select: { id: true, auditNo: true, status: true },
  })
  if (!round) throw new Error("Audit round not found")
  if (round.status === "cancelled") throw new Error("Audit round is cancelled")

  // The target statuses, by English name, read once.
  const targetNames: InspectionTargetStatusName[] = outcome === "missing" ? ["Missing"] : ["In Use", "Ready", "Checked Out"]
  const statuses = await prisma.assetStatus.findMany({
    where: { name: { in: targetNames }, isActive: true },
    select: { id: true, name: true },
  })
  const statusIdByName = new Map(statuses.map((status) => [status.name, status.id]))

  const confirmed = await prisma.$transaction(async (tx) => {
    const rows = await loadRoundInspectionRows(tx, round.id, assetIds)
    const blocked = findInspectionConfirmRefusals(rows, assetIds, outcome)
    if (blocked.length > 0) {
      const missingIds = blocked.filter((entry) => entry.code === "notInRound").map((entry) => entry.assetId)
      if (missingIds.length > 0) {
        // An asset with an item in the round is no longer Under Inspection (or no longer active).
        const items = await tx.auditItem.findMany({
          where: { auditRoundId: round.id, assetId: { in: missingIds } },
          select: { assetId: true, asset: { select: { assetTag: true } } },
        })
        const tagByAsset = new Map(items.map((item) => [item.assetId, item.asset.assetTag]))
        for (const entry of blocked) {
          if (entry.code !== "notInRound" || !tagByAsset.has(entry.assetId)) continue
          entry.code = "notUnderInspection"
          entry.assetTag = tagByAsset.get(entry.assetId) ?? null
        }
      }
      throw new InspectionConfirmChangedError(blocked)
    }

    const rowsById = new Map(rows.map((row) => [row.assetId, row]))
    const current = await tx.asset.findMany({ where: { id: { in: [...assetIds] } }, select: { id: true, statusId: true } })
    const fromStatusById = new Map(current.map((asset) => [asset.id, asset.statusId]))

    const writes: ConfirmedAsset[] = assetIds.map((assetId) => {
      const row = rowsById.get(assetId) as InspectionRow
      const statusName = inspectionTargetStatusName(row, outcome) as InspectionTargetStatusName
      const statusId = statusIdByName.get(statusName)
      if (!statusId) throw new Error("Asset status not found")
      return { assetId, fromStatusId: fromStatusById.get(assetId) ?? null, statusId, statusName }
    })

    // One update per target status; the where keeps each asset Under Inspection, so a count short of the ids is a change.
    const idsByStatus = new Map<string, string[]>()
    for (const write of writes) idsByStatus.set(write.statusId, [...(idsByStatus.get(write.statusId) ?? []), write.assetId])
    for (const [statusId, ids] of idsByStatus) {
      const updated = await tx.asset.updateMany({
        where: { id: { in: ids }, isActive: true, status: { name: INSPECTION_STATUS_NAME } },
        data: { statusId, updatedBy: userId },
      })
      if (updated.count !== ids.length) {
        throw new InspectionConfirmChangedError(ids.map((assetId) => ({ assetId, assetTag: rowsById.get(assetId)?.assetTag ?? null, code: "notUnderInspection" })))
      }
    }

    await tx.assetMovement.createMany({
      data: writes.map((write) => ({
        assetId: write.assetId,
        movementType: "status_correction",
        fromValue: write.fromStatusId,
        toValue: write.statusId,
        reason,
        referenceType: "audit_round",
        referenceId: round.id,
        performedBy: userId,
        remark: `Audit result confirmed (${round.auditNo})`,
      })),
    })

    return writes
  }, inspectionConfirmTransactionOptions)

  for (const write of confirmed) {
    await logAudit({
      userId,
      action: "correct_status",
      module: "asset",
      recordId: write.assetId,
      oldValue: { statusId: write.fromStatusId, statusName: INSPECTION_STATUS_NAME },
      newValue: { statusId: write.statusId, statusName: write.statusName, reason, outcome, auditRoundId: round.id, auditNo: round.auditNo },
    })
  }

  const byStatus: Partial<Record<InspectionTargetStatusName, number>> = {}
  for (const write of confirmed) byStatus[write.statusName] = (byStatus[write.statusName] ?? 0) + 1
  return { confirmed: confirmed.length, byStatus }
}
