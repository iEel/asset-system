export const AUDIT_FINDING_CONFLICT_CODE = "asset_updated_after_finding" as const

export type AuditFindingConflictPayload = {
  code: typeof AUDIT_FINDING_CONFLICT_CODE
  error: string
  assetUpdatedAt: string
  findingReportedAt: string
  currentValue: string | null
  expectedValue: string | null
  actualValue: string | null
}

type ConflictInput = {
  assetUpdatedAt: Date | string | null | undefined
  findingReportedAt: Date | string | null | undefined
  currentValue: string | null | undefined
  expectedValue: string | null | undefined
  actualValue: string | null | undefined
}

export function hasAuditFindingConflict(input: ConflictInput) {
  if (!isAfter(input.assetUpdatedAt, input.findingReportedAt)) return false
  return normalizeValue(input.currentValue) !== normalizeValue(input.expectedValue)
}

export function buildAuditFindingConflictPayload(input: ConflictInput): AuditFindingConflictPayload {
  return {
    code: AUDIT_FINDING_CONFLICT_CODE,
    error: "Asset data changed after this audit finding was reported",
    assetUpdatedAt: toIsoString(input.assetUpdatedAt),
    findingReportedAt: toIsoString(input.findingReportedAt),
    currentValue: normalizeValue(input.currentValue),
    expectedValue: normalizeValue(input.expectedValue),
    actualValue: normalizeValue(input.actualValue),
  }
}

function normalizeValue(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : value
  return trimmed ? trimmed : null
}

function isAfter(left: Date | string | null | undefined, right: Date | string | null | undefined) {
  const leftTime = toTime(left)
  const rightTime = toTime(right)
  if (leftTime == null || rightTime == null) return false
  return leftTime > rightTime
}

function toTime(value: Date | string | null | undefined) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function toIsoString(value: Date | string | null | undefined) {
  const time = toTime(value)
  return time == null ? "" : new Date(time).toISOString()
}
