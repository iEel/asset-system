// A re-scan of a recorded out-of-scope find (group 2 plan 3, P3-R3): what it does to the find's field findings. The scan
// route compares the found values with the snapshot the first scan took (the item's expected*), the same way the first
// scan compared them with the master; this file decides, per differing field, whether to report it, move a pending
// finding to the new value or leave it, and which pending findings no longer hold. Decided findings are never reopened
// or closed. A value a reviewer already approved is not reported again: the master holds it by then. Pure, no imports,
// so Task 4's record sheet imports the evidence rule too (P3-R18: the form and the server ask for a photo alike).

export type AuditOutOfScopeFieldFinding = { type: string; expectedValue: string | null; actualValue: string | null }

/**
 * P3-R18: a re-scan needs evidence only for a field that differs from the snapshot (`differing`) and whose value in this
 * save is not the one recorded, so a remark-only edit needs no new photo. "" and null are both "none" (the form holds
 * "", the server null).
 */
export function auditOutOfScopeRescanEvidenceFields<Field extends string>(
  differing: readonly Field[],
  saving: Readonly<Record<NoInfer<Field>, string | null>>,
  recorded: Readonly<Record<NoInfer<Field>, string | null>>,
): Field[] {
  return differing.filter((field) => (saving[field] || null) !== (recorded[field] || null))
}

export type AuditOutOfScopeKnownFinding = { id: string; findingType: string; actualValue: string | null; reviewStatus: string }

export type AuditOutOfScopeRescanPlan = {
  create: AuditOutOfScopeFieldFinding[]
  update: Array<{ findingId: string; finding: AuditOutOfScopeFieldFinding }>
  reject: string[]
}

export function planAuditOutOfScopeRescanFindings(
  known: readonly AuditOutOfScopeKnownFinding[],
  fieldFindings: readonly AuditOutOfScopeFieldFinding[],
  // The differing types whose value this save changes from the recorded one (the route's evidenceFieldTypes). Only
  // these are filed new: a field the save leaves as recorded already has its finding, and a decided one stays decided.
  changing: readonly string[],
): AuditOutOfScopeRescanPlan {
  const differing = new Map(fieldFindings.map((finding) => [finding.type, finding]))
  const keptPendingByType = new Map<string, AuditOutOfScopeKnownFinding>()
  const reject: string[] = []
  for (const finding of known) {
    if (finding.reviewStatus !== "pending") continue
    if (differing.has(finding.findingType) && !keptPendingByType.has(finding.findingType)) keptPendingByType.set(finding.findingType, finding)
    else reject.push(finding.id)
  }

  const create: AuditOutOfScopeFieldFinding[] = []
  const update: AuditOutOfScopeRescanPlan["update"] = []
  for (const finding of differing.values()) {
    const pending = keptPendingByType.get(finding.type)
    if (pending) {
      if ((pending.actualValue ?? null) !== (finding.actualValue ?? null)) update.push({ findingId: pending.id, finding })
      continue
    }
    const approvedAlready = known.some(
      (entry) => entry.reviewStatus === "approved" && entry.findingType === finding.type && (entry.actualValue ?? null) === (finding.actualValue ?? null),
    )
    if (!approvedAlready && changing.includes(finding.type)) create.push(finding)
  }
  return { create, update, reject }
}
