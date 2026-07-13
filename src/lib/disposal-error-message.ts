const localizedDisposalErrorCodes = new Set([
  "DISPOSAL_ASSET_NOT_FOUND",
  "DISPOSAL_EMPLOYEE_NOT_FOUND",
  "DISPOSAL_OPEN_REQUEST",
  "DISPOSAL_ASSET_INELIGIBLE",
  "DISPOSAL_ASSET_BLOCKED",
  "DISPOSAL_PENDING_STATUS_MISSING",
  "DISPOSAL_REQUEST_NOT_FOUND",
  "DISPOSAL_INVALID_STAGE",
  "DISPOSAL_SOD_CONFLICT",
  "DISPOSAL_CONCURRENT_UPDATE",
  "DISPOSAL_APPROVAL_FAILED",
  "DISPOSAL_STATUS_NOT_FOUND",
  "DISPOSAL_INVALID_STATUS_TARGET",
  "DISPOSAL_EVIDENCE_REQUIRED",
  "DISPOSAL_BATCH_ASSET_NOT_FOUND",
  "DISPOSAL_BATCH_EMPLOYEE_NOT_FOUND",
  "DISPOSAL_BATCH_ASSET_INELIGIBLE",
  "DISPOSAL_BATCH_ASSET_BLOCKED",
  "DISPOSAL_BATCH_OPEN_REQUEST",
  "DISPOSAL_BATCH_SOD_CONFLICT",
  "DISPOSAL_BATCH_SCHEMA_REQUIRED",
])

export function getDisposalApiErrorMessage(
  payload: { code?: string; error?: string } | null,
  translate: (key: string) => string,
  fallback: string
) {
  if (payload?.code && localizedDisposalErrorCodes.has(payload.code)) return translate(`errors.${payload.code}`)
  return payload?.error ?? fallback
}
