export type ProductionReadinessStatus = "pass" | "warning" | "fail"
export type ProductionReadinessCheckKey =
  | "publicQrBaseUrl"
  | "workflowApprovers"
  | "notificationRules"
  | "adminCoverage"
  | "masterData"

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
  masterDataCounts: ProductionReadinessMasterDataCounts
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
