type AuditCorrectionLogInput = {
  id: string
  action: string
  module: string
  recordId: string | null
  oldValue: string | null
  newValue: string | null
  remark: string | null
  createdAt: Date
  user: { username: string; displayName: string | null } | null
}

export type AuditCorrectionHistoryItem = {
  id: string
  auditItemId: string
  assetId: string | null
  createdAt: Date
  userLabel: string
  remark: string | null
  beforeResult: string | null
  afterResult: string | null
  changedFields: string[]
}

const correctionFieldKeys = [
  "auditResult",
  "actualDepartmentId",
  "actualLocationId",
  "actualCustodianId",
  "actualConditionId",
  "remark",
]

export function summarizeAuditCorrectionLog(log: AuditCorrectionLogInput): AuditCorrectionHistoryItem | null {
  if (log.action !== "scan_result_corrected" || log.module !== "audit" || !log.recordId) return null

  const oldValue = parseLogJson(log.oldValue)
  const newValue = parseLogJson(log.newValue)
  const changedFields = correctionFieldKeys.filter((key) => !valuesEqual(oldValue?.[key], newValue?.[key]))

  return {
    id: log.id,
    auditItemId: log.recordId,
    assetId: getStringValue(newValue?.assetId),
    createdAt: log.createdAt,
    userLabel: log.user?.displayName ?? log.user?.username ?? "-",
    remark: log.remark,
    beforeResult: getStringValue(oldValue?.auditResult),
    afterResult: getStringValue(newValue?.auditResult),
    changedFields,
  }
}

export function buildAuditCorrectionHistoryByItemId(logs: AuditCorrectionLogInput[]) {
  const grouped = new Map<string, AuditCorrectionHistoryItem[]>()

  for (const log of logs) {
    const history = summarizeAuditCorrectionLog(log)
    if (!history) continue
    const items = grouped.get(history.auditItemId) ?? []
    items.push(history)
    grouped.set(history.auditItemId, items)
  }

  for (const items of grouped.values()) {
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  return grouped
}

function parseLogJson(value?: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null
}

function valuesEqual(before: unknown, after: unknown) {
  return JSON.stringify(before ?? null) === JSON.stringify(after ?? null)
}
