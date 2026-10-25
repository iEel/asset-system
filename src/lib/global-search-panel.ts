import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"
import { globalSearchMinChars, groupGlobalSearchResults, type GlobalSearchResultType } from "./global-search.ts"
import type { RecentSearchItem } from "./global-search-recent.ts"

// What the global search panel shows, as plain data, so the bar and the phone sheet render the same thing (spec §6.5).

export type GlobalSearchPanelState = "hint" | "minChars" | "loading" | "error" | "notFound" | "results"

export function getGlobalSearchPanelState(input: {
  query: string
  settledQuery: string | null
  resultCount: number
  failed: boolean
}): GlobalSearchPanelState {
  const q = input.query.trim()
  if (!q) return "hint"
  if (q.length < globalSearchMinChars) return "minChars"
  // The last answer stays on screen while the next one loads.
  if (input.resultCount > 0) return "results"
  if (input.settledQuery !== q) return "loading"
  if (input.failed) return "error"
  return "notFound"
}

export type GlobalSearchOption<T> =
  | { kind: "result"; key: string; result: T }
  | { kind: "registerAll"; key: "registerAll"; href: string; count: number }
  | { kind: "recent"; key: string; item: RecentSearchItem }
  | { kind: "clearRecent"; key: "clearRecent" }
  | { kind: "action"; key: "scan" | "registerFilters" | "createAsset"; href: string }

export type GlobalSearchSection<T> = {
  id: "recent" | "notFound" | GlobalSearchResultType
  options: GlobalSearchOption<T>[]
}

/** The ways forward when nothing is found; none for someone who cannot see assets. */
export function getGlobalSearchNotFoundActions(
  locale: string,
  access: { canViewAssets: boolean; canCreateAssets: boolean }
): GlobalSearchOption<never>[] {
  if (!access.canViewAssets) return []
  const actions: GlobalSearchOption<never>[] = [
    { kind: "action", key: "scan", href: `/${locale}/asset-management/scan` },
    { kind: "action", key: "registerFilters", href: `/${locale}/assets` },
  ]
  if (access.canCreateAssets) actions.push({ kind: "action", key: "createAsset", href: `/${locale}/assets/new` })
  return actions
}

export function buildGlobalSearchSections<T extends { id: string; type: GlobalSearchResultType }>(input: {
  state: GlobalSearchPanelState
  query: string
  locale: string
  results: T[]
  assetTotal: number | null
  recent: RecentSearchItem[]
  canViewAssets: boolean
  canCreateAssets: boolean
}): GlobalSearchSection<T>[] {
  if (input.state === "results") {
    const sections: GlobalSearchSection<T>[] = groupGlobalSearchResults(input.results).map((group) => ({
      id: group.type,
      options: group.results.map((result): GlobalSearchOption<T> => ({ kind: "result", key: `${result.type}:${result.id}`, result })),
    }))
    if (input.assetTotal !== null && input.assetTotal > 0) {
      const registerAll: GlobalSearchOption<T> = {
        kind: "registerAll",
        key: "registerAll",
        href: buildExactAssetRegisterHref(input.locale, { search: input.query.trim() }),
        count: input.assetTotal,
      }
      const assetSection = sections.find((section) => section.id === "asset")
      if (assetSection) assetSection.options.push(registerAll)
      else sections.unshift({ id: "asset", options: [registerAll] })
    }
    return sections
  }

  if (input.state === "hint" && input.recent.length > 0) {
    return [
      {
        id: "recent",
        options: [
          ...input.recent.map((item): GlobalSearchOption<T> => ({ kind: "recent", key: `recent:${item.href}`, item })),
          { kind: "clearRecent", key: "clearRecent" },
        ],
      },
    ]
  }

  if (input.state === "notFound") {
    const actions = getGlobalSearchNotFoundActions(input.locale, input)
    if (actions.length > 0) return [{ id: "notFound", options: actions }]
  }

  return []
}

export function flattenGlobalSearchOptions<T>(sections: GlobalSearchSection<T>[]): GlobalSearchOption<T>[] {
  return sections.flatMap((section) => section.options)
}

const editableTags = new Set(["INPUT", "TEXTAREA", "SELECT"])

/**
 * "/" focuses the search from anywhere except a field or an open dialog (Review Focus 3). On the Thai layout the
 * same key types "ฝ", so the physical key (code "Slash") counts too, but never with Shift or another modifier.
 */
export function isGlobalSearchShortcut(
  event: {
    key: string
    code?: string
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    isComposing?: boolean
    defaultPrevented?: boolean
  },
  target: { tagName?: string; isContentEditable?: boolean; closest?: (selectors: string) => unknown } | null
): boolean {
  if (event.defaultPrevented || event.isComposing) return false
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
  if (event.key !== "/" && event.code !== "Slash") return false
  if (!target) return true
  if (target.tagName && editableTags.has(target.tagName.toUpperCase())) return false
  if (target.isContentEditable) return false
  if (target.closest?.('[role="dialog"], [role="alertdialog"]')) return false
  return true
}
