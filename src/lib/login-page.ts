// Helpers for the login page. Tests import this file directly, so imports stay relative .ts files.
import { switchLocalePath } from "./locale-path.ts"
import { buildLoginHref } from "./login-redirect.ts"
import { seedCompanyName } from "./seed-company-name.ts"

export const LOGIN_LANGUAGES: readonly { locale: "th" | "en"; label: string }[] = [
  { locale: "th", label: "ภาษาไทย" },
  { locale: "en", label: "English" },
]

// Path segments after /<locale>, longest prefix first. "*" matches any one segment. The access-denied page names the
// blocked page from this table too (src/app/[locale]/(dashboard)/access-denied/page.tsx).
const destinationRoutes: readonly { segments: readonly string[]; exact?: boolean; key: string }[] = [
  { segments: ["asset-management", "scan"], key: "nav.scanSearchAsset" },
  { segments: ["asset-management", "checkout"], key: "nav.checkout" },
  { segments: ["asset-management", "checkin"], key: "nav.checkin" },
  { segments: ["asset-management", "transfer"], key: "nav.transfer" },
  { segments: ["asset-management", "bulk-move"], key: "nav.bulkMove" },
  { segments: ["asset-management", "labels"], key: "nav.printLabels" },
  { segments: ["asset-management", "import-export"], key: "nav.importExport" },
  { segments: ["assets", "new"], key: "nav.addAsset" },
  { segments: ["assets", "*"], key: "asset.detailTitle" },
  { segments: ["audit", "rounds"], key: "nav.auditRound" },
  { segments: ["audit", "findings"], key: "nav.auditFinding" },
  { segments: ["admin", "approvals", "history"], key: "approvalHistoryPage.title" },
  { segments: ["admin", "approvals"], key: "nav.approvalInbox" },
  { segments: ["admin", "users"], key: "nav.userManagement" },
  { segments: ["admin", "roles"], key: "nav.rolePermission" },
  { segments: ["admin", "settings"], key: "nav.systemSetting" },
  { segments: ["admin", "logs"], key: "nav.systemLog" },
  { segments: ["admin", "data-quality"], key: "nav.dataQuality" },
  { segments: ["admin", "integrations"], key: "nav.integrationApi" },
  { segments: ["admin", "storage"], key: "nav.fileStorage" },
  { segments: ["admin", "readiness"], key: "nav.productionReadiness" },
  { segments: ["master-data", "companies"], key: "nav.company" },
  { segments: ["master-data", "branches"], key: "nav.branch" },
  { segments: ["master-data", "departments"], key: "nav.department" },
  { segments: ["master-data", "employees"], key: "nav.employee" },
  { segments: ["master-data", "locations"], key: "nav.location" },
  { segments: ["master-data", "categories"], key: "nav.category" },
  { segments: ["master-data", "brands"], key: "nav.brandModel" },
  { segments: ["master-data", "suppliers"], key: "nav.supplier" },
  { segments: ["assets"], exact: true, key: "nav.assetRegister" },
  { segments: ["dashboard"], key: "nav.dashboard" },
  { segments: ["work-center"], key: "nav.workCenter" },
  { segments: ["my-assets"], key: "nav.myAssets" },
  { segments: ["maintenance"], key: "nav.maintenance" },
  { segments: ["disposal"], key: "nav.disposal" },
  { segments: ["reports"], key: "nav.reports" },
  { segments: ["consumables"], key: "nav.consumables" },
  { segments: ["audit"], key: "nav.audit" },
  { segments: ["notifications"], key: "notifications.title" },
  { segments: ["admin"], key: "nav.administration" },
  { segments: ["master-data"], key: "nav.masterData" },
]

const destinationFallbackKey = "auth.destinationFallback"

function splitCallback(callbackUrl: string): { path: string; rest: string } {
  const cut = callbackUrl.search(/[?#]/)
  return cut === -1 ? { path: callbackUrl, rest: "" } : { path: callbackUrl.slice(0, cut), rest: callbackUrl.slice(cut) }
}

// Names the kind of page the callback leads to, from a fixed table, never from the callback's own text.
export function getLoginDestinationKey(locale: string, callbackUrl: string): string | null {
  const { path } = splitCallback(callbackUrl)
  const home = `/${locale}`
  if (path === home) return null
  if (!path.startsWith(`${home}/`)) return destinationFallbackKey

  const segments = path.slice(home.length + 1).split("/")
  for (const route of destinationRoutes) {
    if (segments.length < route.segments.length) continue
    if (route.exact && segments.length !== route.segments.length) continue
    const matches = route.segments.every((segment, index) =>
      segment === "*" ? segments[index] !== "" : segments[index] === segment
    )
    if (matches) return route.key
  }
  return destinationFallbackKey
}

// The language link keeps the callback: only its path changes locale, its query and hash survive byte for byte.
export function buildLoginLocaleHref(from: string, to: string, callbackUrl: string, sessionExpired: boolean): string {
  const { path, rest } = splitCallback(callbackUrl)
  const switched = `${switchLocalePath(path, from, to)}${rest}`
  return buildLoginHref(to, switched, sessionExpired ? { reason: "session-expired" } : {})
}

// Only a boolean leaves here: true for every database but Production's asset_management.
export function isTestSystem(databaseUrl: string | undefined = process.env.DATABASE_URL): boolean {
  const value = databaseUrl?.trim().replace(/^"|"$/g, "")
  if (!value) return false
  const database = value.match(/(?:^|;)database=([^;]+)/i)?.[1]
  if (!database) return false
  let decoded: string
  try {
    decoded = decodeURIComponent(database)
  } catch {
    decoded = database
  }
  return decoded.trim().toLowerCase() !== "asset_management"
}

export function normalizeLoginCompanyName(value: string | null | undefined): string | null {
  const name = value?.trim() ?? ""
  if (!name || name === seedCompanyName) return null
  return name
}

// The year in Bangkok: Buddhist era digits for Thai, Gregorian otherwise.
export function formatLoginYear(locale: string, date: Date = new Date()): string {
  const tag = locale === "th" ? "th-TH-u-ca-buddhist-nu-latn" : "en-US-u-ca-gregory-nu-latn"
  const parts = new Intl.DateTimeFormat(tag, { timeZone: "Asia/Bangkok", year: "numeric" }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? ""
  return year.replace(/\D/g, "")
}
