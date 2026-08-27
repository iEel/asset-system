export const assetStateReviewIssueTypes = [
  "repair_status_without_active_ticket",
  "active_repair_ticket_status_mismatch",
  "checked_out_without_open_checkout",
  "open_checkout_status_mismatch",
  "personal_in_use_without_custodian",
  "personal_ready_with_custodian",
  "incompatible_status_condition",
  "legacy_condition_value",
  "controlled_legacy_status",
  "legacy_disposal_missing_previous_status",
] as const

export const assetStateReviewStatuses = ["pending", "resolved", "dismissed"] as const
export const assetStateReviewSeverities = ["critical", "warning", "info"] as const

export type AssetStateReviewIssueType = (typeof assetStateReviewIssueTypes)[number]
export type AssetStateReviewStatus = (typeof assetStateReviewStatuses)[number]
export type AssetStateReviewSeverity = (typeof assetStateReviewSeverities)[number]

export type AssetStateReviewErrorCode =
  | "ASSET_STATE_REVIEW_NOT_FOUND"
  | "ASSET_STATE_REVIEW_NOT_PENDING"
  | "ASSET_STATE_REVIEW_STALE"
  | "ASSET_STATE_REVIEW_REASON_REQUIRED"
  | "ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED"
  | "ASSET_STATE_REVIEW_MASTER_NOT_FOUND"

export type AssetStateObservedSnapshot = {
  assetId: string
  assetTag: string
  assetName: string
  companyId: string
  branchId: string
  ownershipType: string
  statusId: string
  statusName: string
  conditionId: string
  conditionName: string
  custodianId: string | null
  assetUpdatedAt: Date
  openCheckouts: number
  activeCorrectiveTickets: number
  activeCorrectiveStatusNames: string[]
  openDisposalsMissingPreviousStatus: number
}

export type AssetStateReviewCandidate = {
  issueType: AssetStateReviewIssueType
  severity: AssetStateReviewSeverity
  suggestedStatusName?: string | null
  suggestedConditionName?: string | null
  metadata: Record<string, string | number | boolean | null | string[]>
}

export type AssetStateReviewListFilters = {
  page: number
  pageSize: number
  reviewStatus?: AssetStateReviewStatus
  severity?: AssetStateReviewSeverity
  issueType?: AssetStateReviewIssueType
  statusId?: string
  conditionId?: string
  companyId?: string
  branchId?: string
}

export function isAssetStateReviewIssueType(value: unknown): value is AssetStateReviewIssueType {
  return typeof value === "string" && assetStateReviewIssueTypes.includes(value as AssetStateReviewIssueType)
}
