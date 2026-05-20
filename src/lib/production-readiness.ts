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
  | "schedulerRuns"
  | "backupStatus"

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
  maintenancePmGenerationToken?: string
  ldapSyncToken?: string
  notificationDigestToken?: string
  schedulerLastRunStatuses?: string[]
  backupStatus?: string
  backupLastRunAt?: string
}

export type ProductionReadinessCheck = {
  key: ProductionReadinessCheckKey
  status: ProductionReadinessStatus
  value: string
  href: string
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

export function buildProductionReadinessChecks(input: ProductionReadinessInput): ProductionReadinessCheck[] {
  const publicQrBaseUrl = input.settings.get("asset_qr_public_base_url")?.trim() ?? ""
  const notificationReadyCount = notificationKeys.filter((key) => isValidNotificationRule(input.settings.get(key))).length
  const missingApprovers = input.approverMatrix.filter((item) => item.status === "missing").length
  const thinApprovers = input.approverMatrix.filter((item) => item.status === "thin").length
  const readyMasterDataCount = masterDataKeys.filter((key) => input.masterDataCounts[key] > 0).length

  return [
    {
      key: "publicQrBaseUrl",
      status: getPublicQrStatus(publicQrBaseUrl),
      value: publicQrBaseUrl || "-",
      href: "/admin/settings",
    },
    {
      key: "workflowApprovers",
      status: missingApprovers > 0 ? "fail" : thinApprovers > 0 ? "warning" : "pass",
      value: `${input.approverMatrix.length - missingApprovers}/${input.approverMatrix.length}`,
      href: "/admin/approvals",
    },
    {
      key: "notificationRules",
      status: notificationReadyCount === notificationKeys.length ? "pass" : "fail",
      value: `${notificationReadyCount}/${notificationKeys.length}`,
      href: "/admin/settings",
    },
    {
      key: "adminCoverage",
      status: input.activeAdminUsers === 0 ? "fail" : input.activeAdminUsers === 1 ? "warning" : "pass",
      value: `${input.activeAdminUsers}/${input.activeUserCount}`,
      href: "/admin/users",
    },
    {
      key: "masterData",
      status: readyMasterDataCount === masterDataKeys.length ? "pass" : "warning",
      value: `${readyMasterDataCount}/${masterDataKeys.length}`,
      href: "/admin/data-quality",
    },
    {
      key: "appBaseUrl",
      status: getAppBaseUrlStatus(input.deployment),
      value: getAppBaseUrlValue(input.deployment),
      href: "/admin/readiness",
    },
    {
      key: "authSecret",
      status: getAuthSecretStatus(input.deployment),
      value: getSecretValue(input.deployment),
      href: "/admin/readiness",
    },
    {
      key: "uploadDir",
      status: getUploadDirStatus(input.deployment?.uploadDir),
      value: input.deployment?.uploadDir?.trim() || "-",
      href: "/admin/readiness",
    },
    {
      key: "databaseConfig",
      status: getDatabaseConfigStatus(input.deployment),
      value: getDatabaseConfigValue(input.deployment),
      href: "/admin/readiness",
    },
    {
      key: "schedulerTokens",
      status: getSchedulerTokensStatus(input.deployment),
      value: getSchedulerTokensValue(input.deployment),
      href: "/admin/readiness",
    },
    {
      key: "schedulerRuns",
      status: getSchedulerRunsStatus(input.deployment),
      value: getSchedulerRunsValue(input.deployment),
      href: "/admin/settings",
    },
    {
      key: "backupStatus",
      status: getBackupStatus(input.deployment),
      value: getBackupValue(input.deployment),
      href: "/admin/readiness",
    },
  ]
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
    deployment?.maintenancePmGenerationToken,
    deployment?.ldapSyncToken,
    deployment?.notificationDigestToken,
  ]
  const configured = tokens.filter((token) => isConfiguredSecret(token)).length
  if (configured === tokens.length) return "pass"
  if (configured > 0) return "warning"
  return "fail"
}

function getSchedulerTokensValue(deployment?: ProductionReadinessDeploymentInput) {
  const configured = [
    deployment?.maintenancePmGenerationToken,
    deployment?.ldapSyncToken,
    deployment?.notificationDigestToken,
  ].filter((token) => isConfiguredSecret(token)).length
  return `${configured}/3 configured`
}

function getSchedulerRunsStatus(deployment?: ProductionReadinessDeploymentInput): ProductionReadinessStatus {
  const statuses = deployment?.schedulerLastRunStatuses ?? []
  if (statuses.some((status) => status === "failed")) return "fail"
  if (statuses.some((status) => status === "success")) return "pass"
  return "warning"
}

function getSchedulerRunsValue(deployment?: ProductionReadinessDeploymentInput) {
  const statuses = deployment?.schedulerLastRunStatuses ?? []
  if (statuses.length === 0) return "no runs yet"
  return statuses.join(", ")
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
