// The access-denied page's link and words (page group 12 spec §9, §15 items 7–8). Tests import this file directly, so
// it has no imports.

// A module value meaning "disposal:approve OR audit:approve": the approvals inbox and history need either.
export const APPROVAL_PERMISSION = "approval"

// `from` is display only (it names the blocked page) and never a redirect or link target: the request path without
// its query or hash, under /<locale>/, with no "//", "\" or ":". Anything else is dropped.
export function sanitizeDeniedFrom(locale: string, rawPath: string | null | undefined): string | null {
  if (typeof rawPath !== "string") return null
  const path = rawPath.split(/[?#]/, 1)[0]
  if (path.length > 512) return null
  if (!path.startsWith(`/${locale}/`)) return null
  if (path.includes("//") || path.includes("\\") || path.includes(":")) return null
  if (/[\s\u0000-\u001f\u007f]/.test(path)) return null
  return path
}

export function buildAccessDeniedHref({
  locale,
  module,
  action,
  from,
}: {
  locale: string
  module: string
  action: string
  from?: string | null
}) {
  const params = new URLSearchParams({ module, action })
  const safeFrom = sanitizeDeniedFrom(locale, from)
  if (safeFrom) params.set("from", safeFrom)
  return `/${encodeURIComponent(locale)}/access-denied?${params.toString()}`
}

// The words under adminRolesPage.actions and adminRolesPage.modules (messages/*.json).
const permissionActions = new Set(["view", "create", "edit", "delete", "export", "approve"])
const permissionModules = new Set([
  "dashboard", "asset", "checkout", "checkin", "transfer", "audit", "maintenance", "disposal", "report", "company",
  "branch", "department", "employee", "location", "category", "brand", "supplier", "status", "condition", "user",
  "role", "setting", "import", "export", "log",
])

// Gate modules with no word of their own: the system log asks for system:view and reads as the log module (ประวัติระบบ).
const moduleWordAliases: Record<string, string> = { system: "log" }

// Message keys under adminRolesPage, or null for a word the app does not know (an old link): the page then shows the code.
export function permissionWordKeys(module: string, action: string): { action: string | null; module: string | null } {
  const word = moduleWordAliases[module] ?? module
  return {
    action: permissionActions.has(action) ? `actions.${action}` : null,
    module: permissionModules.has(word) ? `modules.${word}` : null,
  }
}

export type DeniedRole = { displayName: string; displayNameTh: string | null; isActive: boolean }

// The viewer's active roles joined by " · ", null when there are none. Thai uses the Thai name (or the display name),
// English the display name, as the shell foot does (getUserRoleLabel in src/lib/user-display.ts).
export function formatDeniedRoleNames(roles: readonly DeniedRole[], locale: string): string | null {
  const names = roles
    .filter((role) => role.isActive)
    .map((role) => (locale === "th" ? role.displayNameTh?.trim() || role.displayName : role.displayName))
  return names.length > 0 ? names.join(" · ") : null
}
