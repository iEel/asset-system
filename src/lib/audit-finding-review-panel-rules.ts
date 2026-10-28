// The findings review panel's rules (group 2 spec §10, plan 4 Task 4): what approve does to the register and the word of
// its sentence, the four-field comparison, who may decide, plan and close, and which findings "อนุมัติทุกช่องของทรัพย์สินนี้"
// sends. The next finding after a decision is Task 2's (P4-R18). Pure, no imports: node --test and client code import it.

export const AUDIT_FINDING_COMPARISON_FIELDS = ["custodian", "department", "location", "condition"] as const
export type AuditFindingComparisonField = (typeof AUDIT_FINDING_COMPARISON_FIELDS)[number]

// The finding types the review route applies to the register, by the field each changes (its fieldByFindingType).
export const AUDIT_FINDING_FIELD_BY_TYPE: Readonly<Record<string, AuditFindingComparisonField>> = {
  wrong_location: "location",
  wrong_custodian: "custodian",
  wrong_department: "department",
  wrong_condition: "condition",
}

export type AuditFindingApprovalEffect =
  | { kind: "change"; field: AuditFindingComparisonField; from: string | null; to: string | null }
  | { kind: "noChange"; reason: "not_found" | "out_of_scope" }
  | { kind: "manualReview" }

// The review route's own branches, in its order: นอกขอบเขต and ไม่พบ confirm without touching the register; a field
// finding applies the found value, which may clear a custodian or a department; anything else (no field, no asset, a
// location or condition with nothing found) becomes ต้องตรวจสอบพิเศษ. A source test keeps the two in step.
export function auditFindingApprovalEffect(finding: { findingType: string; assetId: string | null; expectedValue: string | null; actualValue: string | null }): AuditFindingApprovalEffect {
  if (finding.findingType === "out_of_scope") return { kind: "noChange", reason: "out_of_scope" }
  if (finding.findingType === "not_found") return { kind: "noChange", reason: "not_found" }
  const field = AUDIT_FINDING_FIELD_BY_TYPE[finding.findingType]
  const nullable = field === "custodian" || field === "department"
  if (!field || !finding.assetId || (finding.actualValue === null && !nullable)) return { kind: "manualReview" }
  return { kind: "change", field, from: finding.expectedValue, to: finding.actualValue }
}

export type AuditFindingApprovalEffectKey = "effectChange" | "effectNoChangeNotFound" | "effectNoChangeOutOfScope" | "effectManualReview"

// The consequence sentence's word (P4-R24): นอกขอบเขต says how to move the asset; ไม่พบ only that the register stays, since
// moving an asset nobody found reads oddly.
export function auditFindingApprovalEffectKey(effect: AuditFindingApprovalEffect): AuditFindingApprovalEffectKey {
  if (effect.kind === "change") return "effectChange"
  if (effect.kind === "manualReview") return "effectManualReview"
  return effect.reason === "not_found" ? "effectNoChangeNotFound" : "effectNoChangeOutOfScope"
}

export type AuditFindingComparisonItem = {
  expectedLocationId: string | null
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
}
export type AuditFindingComparisonRow = { field: AuditFindingComparisonField; expectedId: string | null; foundId: string | null; mismatch: boolean; thisFinding: boolean }

const COMPARISON_KEYS: Readonly<Record<AuditFindingComparisonField, readonly [keyof AuditFindingComparisonItem, keyof AuditFindingComparisonItem]>> = {
  custodian: ["expectedCustodianId", "actualCustodianId"],
  department: ["expectedDepartmentId", "actualDepartmentId"],
  location: ["expectedLocationId", "actualLocationId"],
  condition: ["expectedConditionId", "actualConditionId"],
}

// A blank id is no value, as the conflict check reads it.
const idOrNull = (value: string | null) => (value && value.trim() !== "" ? value : null)

// ผู้ถือครอง / แผนก / ที่ตั้ง / สภาพ as the item recorded them (spec §10). The scan fills every found field (the expected
// value where nothing differs), so a difference here is one the checker saw. ไม่พบ was never seen: nothing to compare.
export function auditFindingComparisonRows(findingType: string, item: AuditFindingComparisonItem): AuditFindingComparisonRow[] {
  if (findingType === "not_found") return []
  return AUDIT_FINDING_COMPARISON_FIELDS.map((field) => {
    const [expectedKey, foundKey] = COMPARISON_KEYS[field]
    const expectedId = idOrNull(item[expectedKey])
    const foundId = idOrNull(item[foundKey])
    return { field, expectedId, foundId, mismatch: expectedId !== foundId, thisFinding: AUDIT_FINDING_FIELD_BY_TYPE[findingType] === field }
  })
}

export type AuditFindingDecideState = "open" | "ownFinding" | "decided" | "roundReadOnly" | "noPermission"
export type AuditFindingPanelGate = { decide: AuditFindingDecideState; followUp: boolean }

// Who may do what in the panel, in the review route's order: audit:approve for every action (roles M4), a round that is
// neither closed nor cancelled (Task 2's readOnly, P4-R10), then a pending finding someone else reported (Task 2's
// reportedByViewer, Appendix A §10).
export function auditFindingPanelGate(input: { canApprove: boolean; reviewStatus: string; reportedByViewer: boolean; readOnly: boolean }): AuditFindingPanelGate {
  if (!input.canApprove) return { decide: "noPermission", followUp: false }
  if (input.readOnly) return { decide: "roundReadOnly", followUp: false }
  if (input.reviewStatus !== "pending") return { decide: "decided", followUp: true }
  if (input.reportedByViewer) return { decide: "ownFinding", followUp: true }
  return { decide: "open", followUp: true }
}

// The asset's other findings that "อนุมัติทุกช่องของทรัพย์สินนี้" sends with this one: still pending and not the viewer's
// own (the route refuses those with 403). The same set Task 2's nextHrefAfterSiblings steps over.
export function auditFindingApproveAllSiblings<T extends { reviewStatus: string; reportedByViewer: boolean }>(siblings: readonly T[]): T[] {
  return siblings.filter((sibling) => sibling.reviewStatus === "pending" && !sibling.reportedByViewer)
}
