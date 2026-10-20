import { isBlankValue } from "./display-format.ts"
import { formatDate, formatDateTime } from "./utils.ts"

export type SystemLogPresenterInput = {
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

export type SystemLogRecordLabels = Partial<Record<RecordLabelKey, Map<string, string>>>

export type SystemLogChange = {
  field: string
  before: string
  after: string
}

export type SystemLogPresentation = {
  id: string
  createdAt: Date
  userLabel: string
  moduleKey: string
  moduleLabel: string
  actionLabel: string
  recordLabel: string
  summary: string
  changes: SystemLogChange[]
  href: string | null
  remark: string | null
}

type RecordLabelKey =
  | "asset"
  | "maintenance"
  | "disposal"
  | "auditRound"
  | "auditFinding"
  | "auditItem"
  | "company"
  | "branch"
  | "department"
  | "location"
  | "category"
  | "brand"
  | "supplier"
  | "employee"
  | "user"
  | "role"
  | "model"
  | "purchaseDocument"
  | "status"
  | "condition"

type Translate = (key: string) => string

// The one stand-in for an empty value in the before/after table; a summary reads it as value.empty.
const blankValue = "-"

// Fields that hold a code: their value reads through value.<module>.<field>.<code>, then value.<field>.<code>;
// an unknown code still shows as stored (critique 2026-10-20 F2).
const CODE_FIELDS = new Set([
  "requestStatus",
  "reviewStatus",
  "findingType",
  "actionTaken",
  "actionStatus",
  "disposalType",
  "repairStatus",
  "outcome",
  "auditStatus",
  "auditResult",
  "reconcileStatus",
  "ownershipType",
  "status",
])
// A date-only value, or a timestamp at midnight UTC, is a date; any other ISO timestamp is a date and time.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0{1,3})?)?Z)?$/
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/

const FIELD_LABEL_KEYS: Record<string, string> = {
  assetTag: "field.assetTag",
  name: "field.name",
  serialNumber: "field.serialNumber",
  statusId: "field.statusId",
  nextStatusId: "field.nextStatusId",
  conditionId: "field.conditionId",
  conditionBefore: "field.conditionBefore",
  conditionAfter: "field.conditionAfter",
  currentLocationId: "field.currentLocationId",
  locationId: "field.locationId",
  nextLocationId: "field.nextLocationId",
  custodianId: "field.custodianId",
  departmentId: "field.departmentId",
  parentAssetId: "field.parentAssetId",
  checkoutType: "field.checkoutType",
  checkoutDate: "field.checkoutDate",
  expectedReturnDate: "field.expectedReturnDate",
  returnDate: "field.returnDate",
  returnBy: "field.returnBy",
  returnByEmployeeId: "field.returnByEmployeeId",
  receiveBy: "field.receiveBy",
  receiveByEmployeeId: "field.receiveByEmployeeId",
  remark: "field.remark",
  evidenceExceptionReason: "field.evidenceExceptionReason",
  useHistoricalEvidenceException: "field.useHistoricalEvidenceException",
  evidenceExceptionAcknowledged: "field.evidenceExceptionAcknowledged",
  effectiveEvidenceCount: "field.effectiveEvidenceCount",
  evidenceExceptionGrantedBy: "field.evidenceExceptionGrantedBy",
  evidenceExceptionGrantedAt: "field.evidenceExceptionGrantedAt",
  ldap_enabled: "field.ldap_enabled",
  ldap_url: "field.ldap_url",
  ldap_base_dn: "field.ldap_base_dn",
  ldap_bind_dn: "field.ldap_bind_dn",
  ldap_start_tls: "field.ldap_start_tls",
  ldap_tls_reject_unauthorized: "field.ldap_tls_reject_unauthorized",
  ldap_user_filter: "field.ldap_user_filter",
  ldap_auto_provision: "field.ldap_auto_provision",
  ldap_sync_enabled: "field.ldap_sync_enabled",
  ldap_sync_mode: "field.ldap_sync_mode",
  ldap_sync_schedule: "field.ldap_sync_schedule",
}

const SENSITIVE_FIELDS = new Set(["ldap_bind_password", "password", "newPassword", "receiverSignature"])
const IGNORED_CHANGE_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "uploadedBy",
  "referenceId",
  "attachmentId",
  "checkoutId",
  "checkinId",
  "photoBefore",
  "photoAfter",
  "receiverSignature",
])

export function buildSystemLogPresentation(
  log: SystemLogPresenterInput,
  labels: SystemLogRecordLabels,
  locale: string,
  t: Translate
): SystemLogPresentation {
  const moduleKey = normalizeLogModule(log.module, log)
  const recordLabel = getRecordLabel(log, moduleKey, labels, t)
  const moduleLabel = translateWithFallback(t, `module.${log.module}`, log.module)
  const actionLabel = translateWithFallback(t, `action.${log.action}`, humanizeKey(log.action))
  const changes = getChanges(log, moduleKey, labels, t)

  return {
    id: log.id,
    createdAt: log.createdAt,
    userLabel: log.user?.displayName ?? log.user?.username ?? "-",
    moduleKey,
    moduleLabel,
    actionLabel,
    recordLabel,
    summary: buildSummary(log, moduleKey, locale, recordLabel, actionLabel, moduleLabel, changes, labels, t),
    changes,
    href: getLogHref(log, locale, moduleKey),
    remark: getLogRemark(log),
  }
}

export function normalizeLogModule(module: string, log: Pick<SystemLogPresenterInput, "oldValue" | "newValue"> & { action?: string }) {
  if (module === "audit") {
    const values = [parseLogJson(log.newValue), parseLogJson(log.oldValue)].filter(Boolean) as Record<string, unknown>[]
    if (values.some((value) => "auditRoundId" in value && "auditItemId" in value)) return "auditFinding"
    if (values.some((value) => "auditStatus" in value || "auditResult" in value)) return "auditItem"
    return "auditRound"
  }
  if (module === "brand" && isBrandModelAttachmentLog(log)) return "model"
  if (module === "purchase_document") return "purchaseDocument"
  if (module === "asset_model") return "model"
  return module
}

function isBrandModelAttachmentLog(log: Pick<SystemLogPresenterInput, "oldValue" | "newValue"> & { action?: string }) {
  if (log.action !== "upload" && log.action !== "delete_attachment") return false
  const values = [parseLogJson(log.newValue), parseLogJson(log.oldValue)].filter(Boolean) as Record<string, unknown>[]
  return values.some((value) => "attachmentId" in value || "originalName" in value || "filePath" in value)
}

export function parseLogJson(value?: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed === "string") return parseLogJson(parsed)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function isSyntheticRecordId(value: string) {
  return value === "system_settings" || value === "ldap_sync" || value === "bulk_move" || value === "bulk_update" || value === "asset_batch_create"
}

function getRecordLabel(log: SystemLogPresenterInput, moduleKey: string, labels: SystemLogRecordLabels, t: Translate) {
  if (log.recordId?.startsWith("notification-digest:")) {
    return formatNotificationDigestRecordLabel(log.recordId, t)
  }
  if (log.recordId && isSyntheticRecordId(log.recordId)) {
    return translateWithFallback(t, `record.${log.recordId}`, log.recordId)
  }
  if (log.recordId) {
    const resolved = getResolvedRecordLabel(labels, moduleKey, log.recordId)
    if (resolved) return resolved
  }
  return getLogRecordLabel(log) ?? "-"
}

function formatNotificationDigestRecordLabel(recordId: string, t: Translate) {
  const date = recordId.replace("notification-digest:", "")
  const label = translateWithFallback(t, "record.notification_digest", "Notification digest")
  return `${label} ${date}`
}

function getResolvedRecordLabel(labels: SystemLogRecordLabels, moduleKey: string, recordId: string) {
  if (moduleKey === "auditRound" || moduleKey === "auditFinding" || moduleKey === "auditItem") {
    return labels.auditFinding?.get(recordId) ?? labels.auditItem?.get(recordId) ?? labels.auditRound?.get(recordId) ?? null
  }
  return labels[moduleKey as RecordLabelKey]?.get(recordId) ?? null
}

function getChanges(log: SystemLogPresenterInput, moduleKey: string, labels: SystemLogRecordLabels, t: Translate): SystemLogChange[] {
  if (isNotificationDigestLog(log)) return []

  const oldValue = parseLogJson(log.oldValue)
  const newValue = parseLogJson(log.newValue)
  if (!oldValue && !newValue) return []

  if (log.action === "checkin") {
    return buildSelectedChanges(oldValue, newValue, ["returnBy", "returnByEmployeeId", "receiveBy", "receiveByEmployeeId", "nextLocationId", "nextStatusId", "conditionAfter", "remark"], moduleKey, labels, t)
  }
  if (log.action === "checkout") {
    return buildSelectedChanges(oldValue, newValue, ["checkoutType", "custodianId", "departmentId", "locationId", "parentAssetId", "checkoutDate", "expectedReturnDate", "conditionBefore", "remark"], moduleKey, labels, t)
  }
  if (log.action === "transfer") {
    return buildSelectedChanges(oldValue, newValue, ["currentLocationId", "locationId", "custodianId", "departmentId", "remark"], moduleKey, labels, t)
  }

  // Only the keys the new value carries: a field logged in the old value alone is context (e.g. a finding's type), not a change.
  const keys = newValue ? Object.keys(newValue) : Object.keys(oldValue ?? {})
  return keys
    .filter(
      (key) =>
        !SENSITIVE_FIELDS.has(key) &&
        !IGNORED_CHANGE_FIELDS.has(key) &&
        !valuesEqual(oldValue?.[key], newValue?.[key]) &&
        !(isBlankValue(oldValue?.[key]) && isBlankValue(newValue?.[key]))
    )
    .map((key) => ({
      field: getFieldLabel(key, moduleKey, t),
      before: formatValue(oldValue?.[key], key, moduleKey, labels, t),
      after: formatValue(newValue?.[key], key, moduleKey, labels, t),
    }))
}

function buildSelectedChanges(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  keys: string[],
  moduleKey: string,
  labels: SystemLogRecordLabels,
  t: Translate
) {
  return keys
    .filter((key) => !SENSITIVE_FIELDS.has(key) && (newValue?.[key] !== undefined || oldValue?.[key] !== undefined))
    .map((key) => ({
      field: getFieldLabel(key, moduleKey, t),
      before: formatValue(oldValue?.[key], key, moduleKey, labels, t),
      after: formatValue(newValue?.[key], key, moduleKey, labels, t),
    }))
}

function buildSummary(
  log: SystemLogPresenterInput,
  moduleKey: string,
  locale: string,
  recordLabel: string,
  actionLabel: string,
  moduleLabel: string,
  changes: SystemLogChange[],
  labels: SystemLogRecordLabels,
  t: Translate
) {
  if (isNotificationDigestLog(log)) return formatNotificationDigestSummary(log, t)

  const newValue = parseLogJson(log.newValue)
  // Thai reads the action and the module as one word ("รับคืนทรัพย์สิน"); English needs the space ("Return Asset").
  const actionModule = locale === "th" ? `${actionLabel}${moduleLabel}` : `${actionLabel} ${moduleLabel}`
  if (log.action === "checkin") {
    const returnBy = formatValue(newValue?.returnByEmployeeId ?? newValue?.returnBy, "returnByEmployeeId", moduleKey, labels, t)
    const destination = formatValue(newValue?.nextLocationId, "nextLocationId", moduleKey, labels, t)
    return `${actionModule} ${recordLabel} ${translateWithFallback(t, "summary.from", "from")} ${returnBy} ${translateWithFallback(t, "summary.to", "to")} ${destination}`
  }
  if (log.action === "checkout") {
    const destination = formatCheckoutDestination(newValue, moduleKey, labels, t)
    return `${actionModule} ${recordLabel} ${translateWithFallback(t, "summary.to", "to")} ${destination}`
  }
  if (changes.length > 0) {
    return `${actionLabel} ${recordLabel}: ${changes.map((change) => formatSummaryChange(change, t)).join(", ")}`
  }
  return `${actionModule} ${recordLabel}`
}

// A value set from nothing reads "field set to X"; a value cleared reads "from X to none", never "from - to -".
function formatSummaryChange(change: SystemLogChange, t: Translate) {
  if (change.before === blankValue) return `${change.field} ${translateWithFallback(t, "summary.setTo", "set to")} ${change.after}`
  const after = change.after === blankValue ? translateWithFallback(t, "value.empty", "none") : change.after
  return `${change.field} ${translateWithFallback(t, "summary.from", "from")} ${change.before} ${translateWithFallback(t, "summary.changedTo", "to")} ${after}`
}

function isNotificationDigestLog(log: Pick<SystemLogPresenterInput, "action" | "module" | "recordId">) {
  return log.module === "notification" && (log.recordId?.startsWith("notification-digest:") || log.action.endsWith("notification_digest"))
}

function getLogRemark(log: SystemLogPresenterInput) {
  if (isNotificationDigestLog(log) && (log.remark === "scheduler" || log.remark === "manual")) return null
  return log.remark
}

function formatNotificationDigestSummary(log: Pick<SystemLogPresenterInput, "newValue">, t: Translate) {
  const newValue = parseLogJson(log.newValue)
  const delivered = getNumberValue(newValue?.delivered)
  const skipped = getNumberValue(newValue?.skippedEmpty) + getNumberValue(newValue?.skippedDuplicate)
  const failedExternal = getNumberValue(newValue?.failedExternal)
  const itemLabel = translateWithFallback(t, "value.items", "items")
  const parts = [
    `${translateWithFallback(t, "field.delivered", "Delivered")} ${delivered} ${itemLabel}`,
    `${translateWithFallback(t, "summary.skipped", "Skipped")} ${skipped} ${itemLabel}`,
  ]
  if (failedExternal > 0) {
    parts.push(`${translateWithFallback(t, "field.failedExternal", "External delivery failed")} ${failedExternal} ${itemLabel}`)
  }
  return parts.join(", ")
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function formatCheckoutDestination(newValue: Record<string, unknown> | null, moduleKey: string, labels: SystemLogRecordLabels, t: Translate) {
  if (!newValue) return blankValue
  if (newValue.checkoutType === "user") return formatValue(newValue.custodianId, "custodianId", moduleKey, labels, t)
  if (newValue.checkoutType === "department") return formatValue(newValue.departmentId, "departmentId", moduleKey, labels, t)
  if (newValue.checkoutType === "location") return formatValue(newValue.locationId, "locationId", moduleKey, labels, t)
  if (newValue.checkoutType === "asset") return formatValue(newValue.parentAssetId, "parentAssetId", moduleKey, labels, t)
  return formatValue(newValue.checkoutType, "checkoutType", moduleKey, labels, t)
}

function getLogRecordLabel(log: SystemLogPresenterInput) {
  const values = [parseLogJson(log.newValue), parseLogJson(log.oldValue)].filter((value): value is Record<string, unknown> => Boolean(value))
  for (const value of values) {
    const label = getFirstString(value, ["assetTag", "repairNo", "disposalNo", "auditNo", "documentNo", "code", "nameTh", "name", "displayName", "username", "email", "key"])
    if (label) return label
  }
  if (log.recordId && !isUuid(log.recordId)) return log.recordId
  return null
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim() && !isUuid(value)) return value
  }
  return null
}

function formatValue(value: unknown, key: string, moduleKey: string, labels: SystemLogRecordLabels, t: Translate): string {
  if (value === null || value === undefined || value === "") return blankValue
  if (typeof value === "boolean") return value ? translateWithFallback(t, "value.true", "true") : translateWithFallback(t, "value.false", "false")
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return `${value.length} ${translateWithFallback(t, "value.items", "items")}`
  if (typeof value === "object") return translateWithFallback(t, "value.complex", "Complex data")
  if (typeof value !== "string") return String(value)
  if (value === "true") return translateWithFallback(t, "value.true", "true")
  if (value === "false") return translateWithFallback(t, "value.false", "false")
  const structuredValue = parseStructuredString(value)
  if (Array.isArray(structuredValue)) return `${structuredValue.length} ${translateWithFallback(t, "value.items", "items")}`
  if (structuredValue && typeof structuredValue === "object") return translateWithFallback(t, "value.complex", "Complex data")
  if (CODE_FIELDS.has(key)) return translateWithFallback(t, `value.${moduleKey}.${key}.${value}`, translateWithFallback(t, `value.${key}.${value}`, value))
  if (ISO_DATE.test(value)) return formatDate(value)
  if (ISO_DATE_TIME.test(value)) return formatDateTime(value)
  const labelKey = getLabelKeyForField(key)
  if (labelKey) return labels[labelKey]?.get(value) ?? (isUuid(value) ? translateWithFallback(t, "value.unresolvedReference", "Referenced record") : value)
  if (isUuid(value)) return translateWithFallback(t, "value.unresolvedReference", "Referenced record")
  return value
}

function getLabelKeyForField(key: string): RecordLabelKey | null {
  if (key === "currentLocationId" || key === "locationId" || key === "nextLocationId") return "location"
  if (key === "custodianId" || key === "returnByEmployeeId" || key === "receiveByEmployeeId") return "employee"
  if (key === "executedById" || key === "actionOwnerId" || key === "actualCustodianId") return "employee"
  if (key === "actualLocationId") return "location"
  if (key === "departmentId" || key === "actualDepartmentId") return "department"
  if (key === "parentAssetId" || key === "assetId") return "asset"
  if (key === "companyId") return "company"
  if (key === "branchId") return "branch"
  if (key === "categoryId") return "category"
  if (key === "brandId") return "brand"
  if (key === "modelId") return "model"
  if (key === "supplierId" || key === "vendorId") return "supplier"
  if (key === "homeLocationId") return "location"
  if (key === "statusId" || key === "nextStatusId" || key === "assetStatusId") return "status"
  if (key === "conditionId" || key === "conditionBefore" || key === "conditionAfter") return "condition"
  if (key === "roleId" || key === "ldap_default_role") return "role"
  return null
}

// A module's own name for a field wins (an audit round's "status" is not the integration log's HTTP status).
function getFieldLabel(key: string, moduleKey: string, t: Translate) {
  return translateWithFallback(t, `field.${moduleKey}.${key}`, translateWithFallback(t, FIELD_LABEL_KEYS[key] ?? `field.${key}`, humanizeKey(key)))
}

function getLogHref(log: SystemLogPresenterInput, locale: string, moduleKey: string) {
  if (!log.recordId || isSyntheticRecordId(log.recordId)) return null
  if (moduleKey === "asset") return `/${locale}/assets/${log.recordId}`
  if (moduleKey === "maintenance") return `/${locale}/maintenance/${log.recordId}`
  if (moduleKey === "disposal") return `/${locale}/disposal/${log.recordId}`
  if (moduleKey === "auditRound") return `/${locale}/audit/rounds/${log.recordId}`
  if (moduleKey === "auditFinding" || moduleKey === "auditItem") return `/${locale}/audit/findings`
  if (moduleKey === "employee") return `/${locale}/master-data/employees`
  if (moduleKey === "role") return `/${locale}/admin/roles`
  if (moduleKey === "user") return `/${locale}/admin/users`
  if (moduleKey === "setting") return `/${locale}/admin/settings`
  if (moduleKey === "company") return `/${locale}/master-data/companies`
  if (moduleKey === "branch") return `/${locale}/master-data/branches`
  if (moduleKey === "department") return `/${locale}/master-data/departments`
  if (moduleKey === "location") return `/${locale}/master-data/locations`
  if (moduleKey === "category") return `/${locale}/master-data/categories`
  if (moduleKey === "brand" || moduleKey === "model") return `/${locale}/master-data/brands`
  if (moduleKey === "supplier") return `/${locale}/master-data/suppliers`
  return null
}

function translateWithFallback(t: Translate, key: string, fallback: string) {
  const translated = t(key)
  return translated === key ? fallback : translated
}

function humanizeKey(key: string) {
  return key.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2")
}

function valuesEqual(before: unknown, after: unknown) {
  return JSON.stringify(before ?? null) === JSON.stringify(after ?? null)
}

function parseStructuredString(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}
