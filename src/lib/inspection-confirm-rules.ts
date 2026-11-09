// ยืนยันผลตรวจ (inspection-confirm spec §4): which tab a round's stuck "Under Inspection" asset sits in, and which status
// confirming it gives. Pure and client-safe: no Prisma import, so node --test and the round page import it.
import { getCheckoutConditionBlock, getMaintenanceOperationalTarget } from "./asset-lifecycle-policy.ts"

export const INSPECTION_STATUS_NAME = "Under Inspection"
export const INSPECTION_CONFIRM_MAX_ASSETS = 500

export const inspectionConfirmTabs = ["ready", "awaitingReview", "damaged", "notFound", "notScanned"] as const
export type InspectionConfirmTab = (typeof inspectionConfirmTabs)[number]

export const inspectionConfirmOutcomes = ["confirm", "damaged", "missing"] as const
export type InspectionConfirmOutcome = (typeof inspectionConfirmOutcomes)[number]

export const inspectionOutcomeTab: Readonly<Record<InspectionConfirmOutcome, InspectionConfirmTab>> = Object.freeze({
  confirm: "ready",
  damaged: "damaged",
  missing: "notFound",
})

export type InspectionTargetStatusName = "In Use" | "Ready" | "Checked Out" | "Missing"

/** Open handovers (isReturned false, transactionStatus active), counted by handoverMode. */
export type InspectionHandoverCounts = { permanent: number; temporary: number; unknown: number }

/** Any open handover, whatever its mode. */
export function inspectionHandoverOpen(handovers: InspectionHandoverCounts): boolean {
  return handovers.permanent + handovers.temporary + handovers.unknown > 0
}

export type InspectionItemInput = {
  auditStatus: string
  auditResult: string | null
  findings: ReadonlyArray<{ findingType: string; reviewStatus: string }>
  conditionName: string | null
}

/** One tab per row, rules checked in order. A rejected or exception not-found lands in ready. */
export function classifyInspectionItem(item: InspectionItemInput): InspectionConfirmTab {
  if (item.auditStatus === "pending") return "notScanned"
  if (item.findings.some((finding) => finding.reviewStatus === "pending")) return "awaitingReview"
  if (
    item.auditResult === "not_found" &&
    item.findings.some((finding) => finding.findingType === "not_found" && finding.reviewStatus === "approved")
  ) {
    return "notFound"
  }
  if (getCheckoutConditionBlock(item.conditionName) !== null) return "damaged"
  return "ready"
}

/** null = handoverUnclear (an unknown-mode handover, or both modes open). Never null for "missing". */
export function inspectionTargetStatusName(
  input: { ownershipType: string | null; custodianId: string | null; handovers: InspectionHandoverCounts },
  outcome: InspectionConfirmOutcome,
): InspectionTargetStatusName | null {
  if (outcome === "missing") return "Missing"
  const { permanent, temporary, unknown } = input.handovers
  if (unknown > 0 || (permanent > 0 && temporary > 0)) return null
  if (permanent > 0) return "In Use"
  if (temporary > 0) return "Checked Out"
  return getMaintenanceOperationalTarget({ ownershipType: input.ownershipType, custodianId: input.custodianId })
}
