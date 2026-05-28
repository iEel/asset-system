export type SystemLogQuickFilterKey =
  | "all"
  | "ldap_sync"
  | "settings"
  | "asset_import"
  | "asset_batch"
  | "notification_digest"

export type ResolvedSystemLogQuickFilterKey = SystemLogQuickFilterKey | "custom"

export type SystemLogQuickFilter = {
  key: Exclude<SystemLogQuickFilterKey, "all">
  module: string
  action?: string
  labelKey: string
}

export const systemLogQuickFilters: SystemLogQuickFilter[] = [
  {
    key: "ldap_sync",
    module: "employee",
    action: "ldap_sync",
    labelKey: "quickFilterLdapSync",
  },
  {
    key: "settings",
    module: "setting",
    labelKey: "quickFilterSettings",
  },
  {
    key: "asset_import",
    module: "asset",
    action: "import_batch",
    labelKey: "quickFilterAssetImport",
  },
  {
    key: "asset_batch",
    module: "asset",
    action: "batch_create",
    labelKey: "quickFilterAssetBatch",
  },
  {
    key: "notification_digest",
    module: "notification",
    action: "deliver_notification_digest",
    labelKey: "quickFilterNotificationDigest",
  },
]

export type LdapSyncHistoryLogInput = {
  id: string
  action: string
  module: string
  recordId: string | null
  newValue: string | null
  createdAt: Date | string
  user: { username: string; displayName: string | null } | null
}

export type LdapSyncHistoryItem = {
  id: string
  createdAt: string
  actorLabel: string
  total: number
  created: number
  updated: number
  deactivated: number
  deactivatedUsers: number
  blockerCount: number
}

export function buildSystemLogFilterHref(locale: string, key: SystemLogQuickFilterKey) {
  if (key === "all") return `/${locale}/admin/logs`

  const filter = systemLogQuickFilters.find((item) => item.key === key)
  if (!filter) return `/${locale}/admin/logs`

  const query = new URLSearchParams()
  query.set("module", filter.module)
  if (filter.action) query.set("action", filter.action)
  return `/${locale}/admin/logs?${query.toString()}`
}

export function resolveSystemLogQuickFilter(filters: { module?: string | null; action?: string | null }): ResolvedSystemLogQuickFilterKey {
  const moduleFilter = filters.module?.trim() ?? ""
  const action = filters.action?.trim() ?? ""
  if (!moduleFilter && !action) return "all"

  return systemLogQuickFilters.find((filter) =>
    filter.module === moduleFilter &&
    (filter.action ?? "") === action
  )?.key ?? "custom"
}

export function buildLdapSyncHistoryItems(logs: LdapSyncHistoryLogInput[]): LdapSyncHistoryItem[] {
  return logs
    .filter((log) => log.module === "employee" && log.action === "ldap_sync" && log.recordId === "ldap_sync")
    .map((log) => {
      const value = parseLogJson(log.newValue)
      const applied = getRecord(value?.applied)
      const blockers = Array.isArray(value?.blockers) ? value.blockers : []

      return {
        id: log.id,
        createdAt: normalizeCreatedAt(log.createdAt),
        actorLabel: log.user?.displayName ?? log.user?.username ?? "System",
        total: getNumberValue(value?.total),
        created: getNumberValue(applied?.created),
        updated: getNumberValue(applied?.updated),
        deactivated: getNumberValue(applied?.deactivated),
        deactivatedUsers: getNumberValue(applied?.deactivatedUsers),
        blockerCount: blockers.length,
      }
    })
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function parseLogJson(value?: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (typeof parsed === "string") return parseLogJson(parsed)
    return getRecord(parsed)
  } catch {
    return null
  }
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeCreatedAt(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
