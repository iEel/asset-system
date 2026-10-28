import type { Prisma } from "@prisma/client"

export type AuditItemReviewFinding = { findingType: string; reviewStatus: string }
export type AuditItemReviewStateData = { auditStatus?: string; reconcileStatus: string }

/**
 * An audit item's review state from its findings, as a reviewer's decision leaves it: a pending finding keeps it
 * pending, then an exception, an approved not-found, an approval, and otherwise rejected. `pendingAuditStatus` sets
 * the status of an item that still waits for review (a re-scanned out-of-scope find goes back to "reviewed" from
 * "reconciled" when the re-scan files a new finding); without it the status is left as it is.
 */
export function auditItemReviewState(
  findings: readonly AuditItemReviewFinding[],
  options: { pendingAuditStatus?: string } = {}
): AuditItemReviewStateData {
  if (findings.some((finding) => finding.reviewStatus === "pending")) {
    return options.pendingAuditStatus ? { auditStatus: options.pendingAuditStatus, reconcileStatus: "pending" } : { reconcileStatus: "pending" }
  }
  if (findings.some((finding) => finding.reviewStatus === "exception")) return { auditStatus: "reviewed", reconcileStatus: "exception" }
  if (findings.some((finding) => finding.findingType === "not_found" && finding.reviewStatus === "approved")) {
    return { auditStatus: "reviewed", reconcileStatus: "pending_investigation" }
  }
  if (findings.some((finding) => finding.reviewStatus === "approved")) return { auditStatus: "reconciled", reconcileStatus: "approved" }
  return { auditStatus: "reviewed", reconcileStatus: "rejected" }
}

/**
 * Reads the item's findings and writes its review state (the review route, after each decision). `audit_findings` has
 * no index on `auditItemId`, so the read also names the asset: every creator copies the item's asset onto the finding
 * (final review I-1b), so the set is the same, and the read seeks `IX_audit_findings_assetId` instead of scanning the
 * table under the review's claim lock. A finding without an asset reads by its item alone.
 */
export async function updateAuditItemReviewState(
  tx: Prisma.TransactionClient,
  finding: { auditItemId: string; assetId: string | null }
) {
  const findings = await tx.auditFinding.findMany({
    where: finding.assetId ? { auditItemId: finding.auditItemId, assetId: finding.assetId } : { auditItemId: finding.auditItemId },
    select: { findingType: true, reviewStatus: true },
  })
  await tx.auditItem.update({
    where: { id: finding.auditItemId },
    data: auditItemReviewState(findings),
  })
}
