// What a review answer means for the client (group 2 plan 4, P4-R4): the panel's 409 and the selection bar's batch
// read one classifier, keyed by status and the api-error catalog key or code, never by English text in a component.
// Pure and client-safe: relative .ts imports only, and both modules import nothing.
import { getApiErrorKey } from "./api-error-catalog.ts"
import { AUDIT_FINDING_CONFLICT_CODE } from "./audit-finding-conflict.ts"

export const auditFindingReviewFailureReasons = ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"] as const

export type AuditFindingReviewFailureReason = (typeof auditFindingReviewFailureReasons)[number]

export type AuditFindingReviewOutcome = { ok: true } | { ok: false; reason: AuditFindingReviewFailureReason }

export type AuditFindingBatchResult = { succeeded: string[]; failed: { id: string; reason: AuditFindingReviewFailureReason }[] }

// The review route's refusals (route.ts:48-52, :114-119; the catalog keys of their words). A key counts only with its
// own status.
const failureByStatusAndKey: ReadonlyArray<readonly [number, string, AuditFindingReviewFailureReason]> = [
  [400, "findingAlreadyDecided", "alreadyDecided"],
  [403, "findingReviewerIsReporter", "ownFinding"],
  [400, "auditRoundClosed", "roundReadOnly"],
  [400, "auditRoundCancelled", "roundReadOnly"],
  [404, "findingNotFound", "notFound"],
]

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

export function classifyAuditFindingReviewResponse(status: number, body: unknown): AuditFindingReviewOutcome {
  if (status >= 200 && status < 300) return { ok: true }
  const payload = asRecord(body)
  // The asset changed after the report (route.ts:121-144): the panel asks for a second press; a batch skips it.
  if (status === 409 && payload.code === AUDIT_FINDING_CONFLICT_CODE) return { ok: false, reason: "assetChanged" }
  if (status === 400 && payload.code === "VALIDATION_FAILED") {
    return { ok: false, reason: asRecord(payload.fieldErrors).reviewRemark === "required" ? "reasonRequired" : "failed" }
  }
  const key = typeof payload.error === "string" ? getApiErrorKey(payload.error) : null
  const match = failureByStatusAndKey.find(([knownStatus, knownKey]) => knownStatus === status && knownKey === key)
  return { ok: false, reason: match ? match[2] : "failed" }
}

/** A batch's results, in the order sent: the ids that took effect, and each failure with its reason (bugs 17-18). */
export function foldAuditFindingBatchResults(results: readonly { id: string; outcome: AuditFindingReviewOutcome }[]): AuditFindingBatchResult {
  const folded: AuditFindingBatchResult = { succeeded: [], failed: [] }
  for (const { id, outcome } of results) {
    if (outcome.ok) folded.succeeded.push(id)
    else folded.failed.push({ id, reason: outcome.reason })
  }
  return folded
}
