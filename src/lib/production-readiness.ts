import { summarizeRetentionPolicy } from "./retention-policy.ts"
import type { SettingsTabId } from "./settings-information-architecture.ts"
import { buildSystemSettingsTabHref } from "./system-settings-tabs.ts"
import { getUploadScanReadiness } from "./upload-virus-scan.ts"
import { formatDateTime } from "./utils.ts"

export type ProductionReadinessStatus = "pass" | "warning" | "fail"
export type ProductionReadinessCheckKey =
  | "publicQrBaseUrl"
  | "workflowApprovers"
  | "notificationRules"
  | "adminCoverage"
  | "masterData"
  | "appBaseUrl"
  | "authSecret"
  | "uploadDir"
  | "databaseConfig"
  | "schedulerTokens"
  | "uploadScanner"
  | "schedulerRuns"
  | "backupStatus"
  | "backupRestoreDrill"
  | "retentionPolicy"
  | "pwaAssets"

export type ProductionReadinessApproverSummary = {
  key: string
  status: "ready" | "thin" | "missing"
  approverCount: number
}

export type ProductionReadinessMasterDataCounts = {
  companies: number
  branches: number
  departments: number
  locations: number
  categories: number
  statuses: number
  conditions: number
}

export type SchedulerRunReadinessInput = {
  name: string
  status?: string | null
}

export type ProductionReadinessInput = {
  settings: Map<string, string>
  approverMatrix: readonly ProductionReadinessApproverSummary[]
  activeAdminUsers: number
  activeUserCount: number
  deployment?: ProductionReadinessDeploymentInput
  masterDataCounts: ProductionReadinessMasterDataCounts
}

export type ProductionReadinessDeploymentInput = {
  nodeEnv?: string
  authUrl?: string
  nextAuthUrl?: string
  authSecret?: string
  nextAuthSecret?: string
  uploadDir?: string
  databaseUrl?: string
  dbServer?: string
  dbUser?: string
  dbPassword?: string
  ldapSyncToken?: string
  notificationDigestToken?: string
  uploadScanCommand?: string
  uploadScanArgs?: string
  uploadScanTimeoutMs?: string
  schedulerRunStatuses?: SchedulerRunReadinessInput[]
  backupStatus?: string
  backupLastRunAt?: string
  backupLastRestoreTestAt?: string
  pwaAssets?: {
    available: number
    total: number
  }
}

// The fixed words a display argument can take, read from productionReadinessPage.words.<word>. They stand in for ICU
// select, which the message rules only allow on counts (tests/i18n-plural-count.test.ts).
export type ProductionReadinessWord = "notSet" | "success" | "failed" | "neverRun" | "missing" | "noRecord"

// A detected value as a message key under productionReadinessPage.values plus its arguments (group 12 spec §6): raw
// values, and words the page translates into more arguments. Secrets (AUTH_SECRET, the DB password and URL, the
// scheduler tokens) never go into either: only whether they are set.
export type ProductionReadinessDisplay = {
  key: string
  values?: Record<string, string | number>
  words?: Record<string, ProductionReadinessWord>
}

export type ProductionReadinessCheck = {
  key: ProductionReadinessCheckKey
  status: ProductionReadinessStatus
  // The English value, kept for compatibility; the page shows display.
  value: string
  display: ProductionReadinessDisplay
  // The env var names to set on the server: [] when the check is fixed in the app (href) or by a new deploy.
  fixEnv: string[]
  // null: the value is set on the server (env file or the deployed files), outside the app, so the card says how to fix it instead of linking.
  href: string | null
}

const notificationKeys = [
  "notification_return_due_soon_days",
  "notification_audit_action_due_soon_days",
  "notification_warranty_expiry_days",
  "notification_license_expiry_days",
] as const

const masterDataKeys: Array<keyof ProductionReadinessMasterDataCounts> = [
  "companies",
  "branches",
  "departments",
  "locations",
  "categories",
  "statuses",
  "conditions",
]

const settingsTab = (tab: SettingsTabId) => buildSystemSettingsTabHref("/admin/settings", "", tab)

export function buildProductionReadinessChecks(input: ProductionReadinessInput): ProductionReadinessCheck[] {
  const publicQrBaseUrl = input.settings.get("asset_qr_public_base_url")?.trim() ?? ""
  const notificationReadyCount = notificationKeys.filter((key) => isValidNotificationRule(input.settings.get(key))).length
  const missingApprovers = input.approverMatrix.filter((item) => item.status === "missing").length
  const thinApprovers = input.approverMatrix.filter((item) => item.status === "thin").length
  const readyMasterDataCount = masterDataKeys.filter((key) => input.masterDataCounts[key] > 0).length
  const retentionPolicy = summarizeRetentionPolicy(input.settings)
  const uploadScanner = getUploadScanReadiness({
    command: input.deployment?.uploadScanCommand,
    args: input.deployment?.uploadScanArgs,
    timeoutMs: input.deployment?.uploadScanTimeoutMs,
  })

  const deployment = input.deployment
  const authSecretStatus = getAuthSecretStatus(deployment)
  const uploadDir = deployment?.uploadDir?.trim() ?? ""
  const missingTokens = getMissingSchedulerTokens(deployment)

  return [
    {
      key: "publicQrBaseUrl",
      status: getPublicQrStatus(publicQrBaseUrl),
      value: publicQrBaseUrl || "-",
      display: publicQrBaseUrl ? { key: "text", values: { text: publicQrBaseUrl } } : { key: "notConfigured" },
      fixEnv: [],
      href: settingsTab("label-template"),
    },
    {
      key: "workflowApprovers",
      status: missingApprovers > 0 ? "fail" : thinApprovers > 0 ? "warning" : "pass",
      value: `${input.approverMatrix.length - missingApprovers}/${input.approverMatrix.length}`,
      display: { key: "approversOf", values: { have: input.approverMatrix.length - missingApprovers, total: input.approverMatrix.length } },
      fixEnv: [],
      href: "/admin/approvals",
    },
    {
      key: "notificationRules",
      status: notificationReadyCount === notificationKeys.length ? "pass" : "fail",
      value: `${notificationReadyCount}/${notificationKeys.length}`,
      display: { key: "rulesOf", values: { have: notificationReadyCount, total: notificationKeys.length } },
      fixEnv: [],
      href: settingsTab("notifications"),
    },
    {
      key: "adminCoverage",
      status: input.activeAdminUsers === 0 ? "fail" : input.activeAdminUsers === 1 ? "warning" : "pass",
      value: `${input.activeAdminUsers}/${input.activeUserCount}`,
      display: { key: "adminsOf", values: { have: input.activeAdminUsers, total: input.activeUserCount } },
      fixEnv: [],
      href: "/admin/users",
    },
    {
      key: "masterData",
      status: readyMasterDataCount === masterDataKeys.length ? "pass" : "warning",
      value: `${readyMasterDataCount}/${masterDataKeys.length}`,
      display: { key: "masterDataOf", values: { have: readyMasterDataCount, total: masterDataKeys.length } },
      fixEnv: [],
      // Board AD-Readiness: master data, not data quality. There is no /master-data index page; companies is the first.
      href: "/master-data/companies",
    },
    {
      key: "appBaseUrl",
      status: getAppBaseUrlStatus(deployment),
      value: getAppBaseUrlValue(deployment),
      display: getAppBaseUrlDisplay(deployment),
      fixEnv: ["AUTH_URL", "NEXTAUTH_URL"],
      href: null,
    },
    {
      key: "authSecret",
      status: authSecretStatus,
      value: getSecretValue(deployment),
      display: { key: authSecretStatus === "pass" ? "secretHidden" : authSecretStatus === "warning" ? "secretShort" : "secretNotReady" },
      fixEnv: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
      href: null,
    },
    {
      key: "uploadDir",
      status: getUploadDirStatus(deployment?.uploadDir),
      value: uploadDir || "-",
      display: uploadDir ? { key: "text", values: { text: uploadDir } } : { key: "notConfigured" },
      fixEnv: ["UPLOAD_DIR"],
      href: null,
    },
    {
      key: "databaseConfig",
      status: getDatabaseConfigStatus(deployment),
      value: getDatabaseConfigValue(deployment),
      display: { key: "configuredOf", values: { have: countConfiguredDatabaseValues(deployment), total: 4 } },
      fixEnv: ["DB_SERVER", "DB_USER", "DB_PASSWORD", "DATABASE_URL"],
      href: null,
    },
    {
      key: "schedulerTokens",
      status: getSchedulerTokensStatus(deployment),
      value: getSchedulerTokensValue(deployment),
      display: missingTokens.length > 0
        ? { key: "tokensMissing", values: { names: missingTokens.join(" · ") } }
        : { key: "configuredOf", values: { have: schedulerTokenEnv.length, total: schedulerTokenEnv.length } },
      fixEnv: missingTokens.length > 0 ? missingTokens : [...schedulerTokenEnv],
      href: null,
    },
    {
      key: "uploadScanner",
      status: uploadScanner.status,
      value: uploadScanner.value,
      display: getUploadScannerDisplay(uploadScanner, deployment),
      fixEnv: ["UPLOAD_SCAN_COMMAND", "UPLOAD_SCAN_ARGS", "UPLOAD_SCAN_TIMEOUT_MS"],
      href: null,
    },
    {
      key: "schedulerRuns",
      status: getSchedulerRunsStatus(deployment),
      value: getSchedulerRunsValue(deployment),
      display: getSchedulerRunsDisplay(deployment),
      fixEnv: [],
      href: settingsTab("automation"),
    },
    {
      key: "backupStatus",
      status: getBackupStatus(deployment),
      value: getBackupValue(deployment),
      display: getBackupDisplay(deployment),
      fixEnv: ["BACKUP_STATUS", "BACKUP_LAST_RUN_AT"],
      href: null,
    },
    {
      key: "backupRestoreDrill",
      status: getBackupRestoreDrillStatus(deployment),
      value: getBackupRestoreDrillValue(deployment),
      display: getBackupRestoreDrillDisplay(deployment),
      fixEnv: ["BACKUP_LAST_RESTORE_TEST_AT"],
      href: null,
    },
    {
      key: "retentionPolicy",
      status: retentionPolicy.invalidKeys.length > 0 ? "fail" : "pass",
      value: `${retentionPolicy.configured}/${retentionPolicy.total} configured`,
      display: { key: "configuredOf", values: { have: retentionPolicy.configured, total: retentionPolicy.total } },
      fixEnv: [],
      href: settingsTab("governance"),
    },
    {
      key: "pwaAssets",
      status: getPwaAssetsStatus(deployment),
      value: getPwaAssetsValue(deployment),
      display: { key: "filesOf", values: { have: deployment?.pwaAssets?.available ?? 0, total: deployment?.pwaAssets?.total ?? 0 } },
      // The files ship with the app: a new build and deploy fixes them, not an env var.
      fixEnv: [],
      href: null,
    },
  ]
}

const schedulerTokenEnv = ["LDAP_SYNC_TOKEN", "NOTIFICATION_DIGEST_TOKEN"] as const

// Per token, by env name: the row names the missing one (board AD-Readiness). Only set or not set, never the token.
function getMissingSchedulerTokens(deployment?: ProductionReadinessDeploymentInput): string[] {
  const configured: Record<(typeof schedulerTokenEnv)[number], boolean> = {
    LDAP_SYNC_TOKEN: isConfiguredSecret(deployment?.ldapSyncToken),
    NOTIFICATION_DIGEST_TOKEN: isConfiguredSecret(deployment?.notificationDigestToken),
  }
  return schedulerTokenEnv.filter((name) => !configured[name])
}

// Splits the arguments of a display into raw values and fixed words: an argument whose text is one of the known words
// goes to words (the page reads productionReadinessPage.words.<word>), any other text stays a raw value.
function withWords(key: string, args: Record<string, string>, known: readonly ProductionReadinessWord[]): ProductionReadinessDisplay {
  const values: Record<string, string> = {}
  const words: Record<string, ProductionReadinessWord> = {}
  for (const [name, text] of Object.entries(args)) {
    const word = known.find((candidate) => candidate === text)
    if (word) words[name] = word
    else values[name] = text
  }
  return { key, ...(Object.keys(values).length > 0 ? { values } : {}), ...(Object.keys(words).length > 0 ? { words } : {}) }
}

// The URLs are not secret; an empty one reads ยังไม่ได้ตั้ง.
function getAppBaseUrlDisplay(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessDisplay {
  const authUrl = deployment?.authUrl?.trim() ?? ""
  const nextAuthUrl = deployment?.nextAuthUrl?.trim() ?? ""
  if (!authUrl && !nextAuthUrl) return { key: "notConfigured" }
  return withWords("authUrls", { authUrl: authUrl || "notSet", nextAuthUrl: nextAuthUrl || "notSet" }, ["notSet"])
}

function countConfiguredDatabaseValues(deployment?: ProductionReadinessDeploymentInput) {
  return [deployment?.databaseUrl, deployment?.dbServer, deployment?.dbUser, deployment?.dbPassword].filter((value) => Boolean(value?.trim())).length
}

// The scanner command is a server path, not shown: the board says only set, and the timeout in seconds.
function getUploadScannerDisplay(
  scanner: { status: ProductionReadinessStatus; value: string },
  deployment?: ProductionReadinessDeploymentInput,
): ProductionReadinessDisplay {
  if (scanner.value === "disabled") return { key: "notConfigured" }
  if (scanner.value === "invalid timeout") return { key: "scannerBadTimeout" }
  if (scanner.status === "warning") return { key: "scannerArgsNoFile" }
  const timeoutMs = Number(deployment?.uploadScanTimeoutMs?.trim() || "30000")
  return { key: "scannerOn", values: { seconds: Math.round(timeoutMs / 100) / 10 } }
}

// Group 12 plan 1 Task 3: the two scheduled jobs the page reports, each as success / failed / neverRun or its raw
// status. Any other job name is left out of the Thai line.
function getSchedulerRunsDisplay(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessDisplay {
  const runs = deployment?.schedulerRunStatuses ?? []
  if (runs.length === 0) return { key: "noRunsYet" }
  const statusOf = (name: string) => runs.find((run) => run.name === name)?.status?.trim() || "neverRun"
  return withWords("runs", { ldapSync: statusOf("ldap_sync"), notificationDigest: statusOf("notification_digest") }, ["success", "failed", "neverRun"])
}

function getBackupDisplay(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessDisplay {
  const status = deployment?.backupStatus?.trim().toLowerCase() || "notSet"
  const lastRunAt = deployment?.backupLastRunAt?.trim() ?? ""
  return withWords("backup", { status, lastRunAt: lastRunAt ? formatEnvDate(lastRunAt) : "noRecord" }, ["success", "failed", "missing", "notSet", "noRecord"])
}

function getBackupRestoreDrillDisplay(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessDisplay {
  const lastRestoreTestAt = deployment?.backupLastRestoreTestAt?.trim() ?? ""
  if (!lastRestoreTestAt) return { key: "restoreNever" }
  if (Number.isNaN(Date.parse(lastRestoreTestAt))) return { key: "dateInvalid", values: { text: lastRestoreTestAt } }
  return { key: "restoreAt", values: { date: formatEnvDate(lastRestoreTestAt) } }
}

// A date from the env reads in the app's date format; text that is not a date stays as written.
function formatEnvDate(value: string) {
  return Number.isNaN(Date.parse(value)) ? value : formatDateTime(value)
}

export function summarizeProductionReadiness(checks: ProductionReadinessCheck[]) {
  return {
    total: checks.length,
    pass: checks.filter((check) => check.status === "pass").length,
    warning: checks.filter((check) => check.status === "warning").length,
    fail: checks.filter((check) => check.status === "fail").length,
  }
}

function isValidNotificationRule(value: string | undefined) {
  const days = Number(value)
  return Number.isInteger(days) && days >= 0 && days <= 365
}

function getPublicQrStatus(value: string): ProductionReadinessStatus {
  if (!value) return "fail"

  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return "fail"
    if (url.protocol !== "https:") return "warning"
    return isPrivateOrLocalHost(url.hostname) ? "warning" : "pass"
  } catch {
    return "fail"
  }
}

function getAppBaseUrlStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const authUrl = parseUrl(deployment?.authUrl)
  const nextAuthUrl = parseUrl(deployment?.nextAuthUrl)
  if (!authUrl && !nextAuthUrl) return "fail"
  if ((deployment?.authUrl && !authUrl) || (deployment?.nextAuthUrl && !nextAuthUrl)) return "fail"

  const urls = [authUrl, nextAuthUrl].filter((url): url is URL => Boolean(url))
  if (urls.some((url) => url.protocol !== "https:")) return "warning"
  if (urls.some((url) => url.port && url.port !== "443")) return "warning"
  if (urls.some((url) => isPrivateOrLocalHost(url.hostname))) return "warning"
  if (authUrl && nextAuthUrl && authUrl.origin !== nextAuthUrl.origin) return "warning"
  if (deployment?.nodeEnv !== "production") return "warning"
  return "pass"
}

function getAuthSecretStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const authSecret = deployment?.authSecret?.trim() ?? ""
  const nextAuthSecret = deployment?.nextAuthSecret?.trim() ?? ""
  if (!authSecret || !nextAuthSecret) return "fail"
  if (isPlaceholderSecret(authSecret) || isPlaceholderSecret(nextAuthSecret)) return "fail"
  if (authSecret !== nextAuthSecret) return "fail"
  if (authSecret.length < 32) return "warning"
  return "pass"
}

function getUploadDirStatus(value: string | undefined): ProductionReadinessStatus {
  const uploadDir = value?.trim() ?? ""
  if (!uploadDir) return "fail"
  return isAbsolutePath(uploadDir) ? "pass" : "warning"
}

function getDatabaseConfigStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const databaseUrl = deployment?.databaseUrl?.trim() ?? ""
  const required = [deployment?.dbServer, deployment?.dbUser, deployment?.dbPassword].every((value) => Boolean(value?.trim()))
  if (!databaseUrl || !required) return "fail"
  if (/replace-with|changeme/i.test(databaseUrl) || /replace-with|changeme/i.test(deployment?.dbPassword ?? "")) return "fail"
  return "pass"
}

function getAppBaseUrlValue(deployment?: ProductionReadinessDeploymentInput) {
  const authUrl = deployment?.authUrl?.trim() || "-"
  const nextAuthUrl = deployment?.nextAuthUrl?.trim() || "-"
  return `AUTH_URL=${authUrl} / NEXTAUTH_URL=${nextAuthUrl}`
}

function getSecretValue(deployment?: ProductionReadinessDeploymentInput) {
  const authSecretReady = getAuthSecretStatus(deployment) === "pass"
  return authSecretReady ? "configured" : "needs review"
}

function getDatabaseConfigValue(deployment?: ProductionReadinessDeploymentInput) {
  const configured = [deployment?.databaseUrl, deployment?.dbServer, deployment?.dbUser, deployment?.dbPassword].filter((value) => Boolean(value?.trim())).length
  return `${configured}/4 configured`
}

function getSchedulerTokensStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const tokens = [
    deployment?.ldapSyncToken,
    deployment?.notificationDigestToken,
  ]
  const configured = tokens.filter((token) => isConfiguredSecret(token)).length
  if (configured === tokens.length) return "pass"
  if (configured > 0) return "warning"
  return "fail"
}

function getSchedulerTokensValue(deployment?: ProductionReadinessDeploymentInput) {
  const tokens = [deployment?.ldapSyncToken, deployment?.notificationDigestToken]
  const configured = tokens.filter((token) => isConfiguredSecret(token)).length
  return `${configured}/${tokens.length} configured`
}

function getSchedulerRunsStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const runs = deployment?.schedulerRunStatuses ?? []
  if (runs.length === 0) return "warning"
  if (runs.some((run) => run.status === "failed")) return "fail"
  if (runs.every((run) => run.status === "success")) return "pass"
  return "warning"
}

function getSchedulerRunsValue(deployment?: ProductionReadinessDeploymentInput) {
  const runs = deployment?.schedulerRunStatuses ?? []
  if (runs.length === 0) return "no runs yet"
  return runs
    .map((run) => `${run.name}: ${run.status?.trim() || "no runs yet"}`)
    .join(" / ")
}

function getBackupStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const status = deployment?.backupStatus?.trim().toLowerCase() ?? ""
  if (status === "success" && deployment?.backupLastRunAt?.trim()) return "pass"
  if (status === "missing" || status === "failed") return "fail"
  return "warning"
}

function getBackupValue(deployment?: ProductionReadinessDeploymentInput) {
  const status = deployment?.backupStatus?.trim() || "unknown"
  const lastRunAt = deployment?.backupLastRunAt?.trim() || "-"
  return `${status} / ${lastRunAt}`
}

function getBackupRestoreDrillStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const lastRestoreTestAt = deployment?.backupLastRestoreTestAt?.trim() ?? ""
  if (!lastRestoreTestAt) return "warning"
  return Number.isNaN(Date.parse(lastRestoreTestAt)) ? "fail" : "pass"
}

function getBackupRestoreDrillValue(deployment?: ProductionReadinessDeploymentInput) {
  return deployment?.backupLastRestoreTestAt?.trim() || "-"
}

function getPwaAssetsStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const total = deployment?.pwaAssets?.total ?? 0
  const available = deployment?.pwaAssets?.available ?? 0
  if (total <= 0 || available <= 0) return "fail"
  if (available < total) return "warning"
  return "pass"
}

function getPwaAssetsValue(deployment?: ProductionReadinessDeploymentInput) {
  const total = deployment?.pwaAssets?.total ?? 0
  const available = deployment?.pwaAssets?.available ?? 0
  return `${available}/${total} assets`
}

function parseUrl(value: string | undefined) {
  const raw = value?.trim()
  if (!raw) return null
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function isPlaceholderSecret(value: string) {
  return /replace-with|same-value|changeme|secret/i.test(value)
}

function isConfiguredSecret(value: string | undefined) {
  const secret = value?.trim() ?? ""
  return Boolean(secret) && !isPlaceholderSecret(secret)
}

function isAbsolutePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/")
}

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.toLowerCase()
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true
  if (host.startsWith("127.")) return true
  if (host.startsWith("10.")) return true
  if (host.startsWith("192.168.")) return true
  const match = /^172\.(\d{1,2})\./.exec(host)
  if (match) {
    const secondOctet = Number(match[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }
  return !host.includes(".")
}
