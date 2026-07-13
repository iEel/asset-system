import {
  getDisposalApprovalAssetStatusError,
  getDisposalSegregationError,
  type DisposalLifecycleStatus,
} from "./disposal-policy.ts"

export const disposalBulkApprovalCodes = [
  "DISPOSAL_REQUEST_NOT_FOUND",
  "DISPOSAL_INVALID_STAGE",
  "DISPOSAL_SOD_CONFLICT",
  "DISPOSAL_ASSET_INELIGIBLE",
  "DISPOSAL_CONCURRENT_UPDATE",
  "DISPOSAL_FORBIDDEN",
  "DISPOSAL_APPROVAL_FAILED",
] as const

export type DisposalBulkApprovalCode = (typeof disposalBulkApprovalCodes)[number]
export type DisposalBulkApprovalOutcome = "eligible" | "blocked" | "approved" | "failed"
export type DisposalBulkApprovalActor = { userId: string; employeeId?: string | null }
export type DisposalBulkApprovalCandidate = {
  id: string
  disposalNo: string
  isActive: boolean
  requestStatus: string
  requestedById: string
  createdBy: string
  asset: { assetTag: string; status: DisposalLifecycleStatus | null }
}
export type DisposalBulkApprovalItem = {
  requestId: string
  disposalNo: string
  assetTag: string
  outcome: DisposalBulkApprovalOutcome
  code: DisposalBulkApprovalCode | null
}
export type DisposalBulkApprovalSummary = {
  selected: number
  eligible: number
  blocked: number
  approved: number
  failed: number
}

export function getDisposalBulkApprovalBlockCode(
  candidate: DisposalBulkApprovalCandidate,
  actor: DisposalBulkApprovalActor,
  segregationRequired: boolean,
): DisposalBulkApprovalCode | null {
  if (!candidate.isActive) return "DISPOSAL_REQUEST_NOT_FOUND"
  if (candidate.requestStatus !== "pending") return "DISPOSAL_INVALID_STAGE"
  if (getDisposalSegregationError({
    action: "approve",
    segregationRequired,
    actorEmployeeId: actor.employeeId,
    actorUserId: actor.userId,
    requestedById: candidate.requestedById,
    createdByUserId: candidate.createdBy,
  })) return "DISPOSAL_SOD_CONFLICT"
  if (getDisposalApprovalAssetStatusError(candidate.asset.status)) return "DISPOSAL_ASSET_INELIGIBLE"
  return null
}

export function summarizeDisposalBulkApproval(items: DisposalBulkApprovalItem[]): DisposalBulkApprovalSummary {
  return items.reduce((summary, item) => {
    summary.selected += 1
    summary[item.outcome] += 1
    return summary
  }, { selected: 0, eligible: 0, blocked: 0, approved: 0, failed: 0 })
}
