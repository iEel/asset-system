// Deciding several findings at once (group 2 spec §10 "Several at once", bugs 17-18, P4-R4): a client loop over the one
// review route, one request at a time, past every failure, never confirming a conflict; and the header tick's rules.
// Which rows take a tick is Task 2's row.reviewable (P4-R20). Pure and client-safe: relative .ts imports only, so
// node --test imports it.
import { classifyAuditFindingReviewResponse, foldAuditFindingBatchResults, type AuditFindingBatchResult, type AuditFindingReviewOutcome } from "./audit-finding-review-results.ts"

/** One review of the batch. Never `confirmConflict`: a 409 is decided in the panel (spec §10). */
export type AuditFindingBatchReviewBody = { action: "approve" | "reject"; reviewRemark: string }

export type AuditFindingReviewSend = (findingId: string, body: AuditFindingBatchReviewBody) => Promise<{ status: number; body: unknown }>

/**
 * Sends one review per finding, in the order given and one at a time, and reports each through Task 1's classifier.
 * A failure never stops the rest (bug 17), a 409 is one more failure (bug 18), and a network error fails that finding
 * only. onProgress gets the number answered so far.
 */
export async function runAuditFindingBatchReview(
  findingIds: readonly string[],
  body: AuditFindingBatchReviewBody,
  send: AuditFindingReviewSend,
  onProgress?: (done: number) => void,
): Promise<AuditFindingBatchResult> {
  const results: Array<{ id: string; outcome: AuditFindingReviewOutcome }> = []
  for (const id of findingIds) {
    let outcome: AuditFindingReviewOutcome
    try {
      const response = await send(id, { action: body.action, reviewRemark: body.reviewRemark })
      outcome = classifyAuditFindingReviewResponse(response.status, response.body)
    } catch {
      outcome = { ok: false, reason: "failed" }
    }
    results.push({ id, outcome })
    onProgress?.(results.length)
  }
  return foldAuditFindingBatchResults(results)
}

export type AuditFindingSelectAllState = "none" | "some" | "all"

/** The header tick: every tickable row of the page, some of them, or none. */
export function auditFindingSelectAllState(selectedIds: readonly string[], tickableIds: readonly string[]): AuditFindingSelectAllState {
  if (selectedIds.length === 0 || tickableIds.length === 0) return "none"
  const selected = new Set(selectedIds)
  return tickableIds.every((id) => selected.has(id)) ? "all" : "some"
}

export function toggleAuditFindingSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** The header tick's press: all tickable rows, or none once they all are. */
export function toggleAllAuditFindings(selected: ReadonlySet<string>, tickableIds: readonly string[]): Set<string> {
  return tickableIds.length > 0 && tickableIds.every((id) => selected.has(id)) ? new Set() : new Set(tickableIds)
}
