// The "what will happen" helper of MT-New (group 5 spec §7.2, §7.3): one pure reading of the asset facts that the page
// load and the picker's by-id read share (G5P2-R1). Client-safe: relative imports, types only from Prisma, no db.
import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import type { AssetPhotoPreview } from "./asset-photo-preview.ts"
import {
  getRepairRecordCompleteEffect,
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
export type RepairCompleteNote =
  | { key: "backTo"; holder: string; documentNo: string | null }
  | { key: "holderStays"; holder: string }
  | { key: "noHolder" }
  | { key: "thenDisposal"; holderStays: string | null }
export type RepairCompleteRow = {
  outcome: RepairOutcome
  outlook: { kind: "refused"; held: RepairHeld | null } | { kind: "status"; nextStatusName: string; note: RepairCompleteNote }
}

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

/**
 * What ซ่อมเสร็จ will do with this outcome on the record page (group 5 plan 3, G5P3-R1). The record's own open record
 * does not count, as the server's ignoreRecordId does. ซ่อมไม่ได้ on an asset with an open handover is refused and names it.
 */
export function getRepairCompleteOutlook(facts: RepairAssetFacts, outcome: RepairOutcome): RepairCompleteRow {
  const effect = getRepairRecordCompleteEffect({ ...toRepairAssetContext(facts), hasOpenRecord: false }, outcome)
  const checkout = facts.activeCheckout
  if (effect.error !== null) {
    const held = checkout ? { checkoutId: checkout.id, documentNo: checkout.documentNo, holderName: checkout.holderName } : null
    return { outcome, outlook: { kind: "refused", held } }
  }
  const nextStatusName = effect.nextStatusName ?? facts.statusName
  const keptHolder = facts.custodianId ? facts.holderName : null
  if (outcome === "beyond_repair") {
    return { outcome, outlook: { kind: "status", nextStatusName, note: { key: "thenDisposal", holderStays: keptHolder } } }
  }
  const handoverHolder = checkout ? checkout.holderName ?? facts.holderName : null
  const note: RepairCompleteNote = checkout && handoverHolder
    ? { key: "backTo", holder: handoverHolder, documentNo: checkout.documentNo }
    : keptHolder && normalizeAssetStateName(facts.ownershipType) === "personal"
      ? { key: "holderStays", holder: keptHolder }
      : { key: "noHolder" }
  return { outcome, outlook: { kind: "status", nextStatusName, note } }
}
