// The "what will happen" helper of MT-New (group 5 spec §7.2, §7.3): one pure reading of the asset facts that the page
// load and the picker's by-id read share (G5P2-R1). Client-safe: relative imports, types only from Prisma, no db.
import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import type { AssetPhotoPreview } from "./asset-photo-preview.ts"
import {
  getRepairRecordCreateEffect,
  type RepairAssetContext,
  type RepairOutcome,
  type RepairRecordErrorCode,
} from "./repair-record-policy.ts"

export type RepairAssetFacts = {
  id: string
  assetTag: string
  name: string
  statusName: string
  statusLabel: string
  conditionId: string
  conditionLabel: string
  ownershipType: string | null
  custodianId: string | null
  holderName: string | null
  departmentName: string | null
  roomName: string | null
  branchName: string | null
  photo: AssetPhotoPreview | null
  openRecord: { id: string; repairNo: string } | null
  activeCheckout: { id: string; documentNo: string | null; holderName: string | null } | null
}

export type RepairCreateAnswer = { done: boolean | null; outcome: RepairOutcome | null }
export type RepairHeld = { checkoutId: string; documentNo: string | null; holderName: string | null }
export type RepairCreateOutlook =
  | { kind: "unanswered" }
  | { kind: "dependsOnOutcome" }
  | { kind: "refused"; error: RepairRecordErrorCode; held: RepairHeld | null }
  | { kind: "status"; nextStatusName: string; changes: boolean }

const writtenOffStatuses = new Set(["disposed", "retired"])

export function toRepairAssetContext(facts: RepairAssetFacts): RepairAssetContext {
  return {
    statusName: facts.statusName,
    ownershipType: facts.ownershipType,
    custodianId: facts.custodianId,
    hasActiveCheckout: facts.activeCheckout !== null,
    hasOpenRecord: facts.openRecord !== null,
  }
}

/** The eligibility line (§7.2): an unfinished record first, then a written-off asset (Disposed or Retired). */
export function getRepairEligibility(facts: RepairAssetFacts): "ok" | "openRecord" | "writtenOff" {
  if (facts.openRecord) return "openRecord"
  if (writtenOffStatuses.has(normalizeAssetStateName(facts.statusName))) return "writtenOff"
  return "ok"
}

/** What the save will do with these answers; an ON_LOAN refusal names the open handover (§5 early refusal). */
export function getRepairCreateOutlook(facts: RepairAssetFacts, answer: RepairCreateAnswer): RepairCreateOutlook {
  if (answer.done === null) return { kind: "unanswered" }
  if (answer.done && answer.outcome === null) return { kind: "dependsOnOutcome" }
  const effect = getRepairRecordCreateEffect(toRepairAssetContext(facts), { done: answer.done, outcome: answer.outcome })
  if (effect.error !== null) {
    const checkout = facts.activeCheckout
    const held = effect.error === "MAINTENANCE_ASSET_ON_LOAN" && checkout
      ? { checkoutId: checkout.id, documentNo: checkout.documentNo, holderName: checkout.holderName }
      : null
    return { kind: "refused", error: effect.error, held }
  }
  const nextStatusName = effect.nextStatusName ?? facts.statusName
  return { kind: "status", nextStatusName, changes: normalizeAssetStateName(nextStatusName) !== normalizeAssetStateName(facts.statusName) }
}
