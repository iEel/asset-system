import { globalSearchGroupOrder, type GlobalSearchResultType } from "./global-search.ts"

// The search box remembers the results a person opened, per locale, in this browser only (spec §6.5).
export const RECENT_SEARCH_LIMIT = 5

export type RecentSearchItem = { type: GlobalSearchResultType; title: string; href: string }

export function recentSearchStorageKey(locale: string): string {
  return `asset-system:recent-search:v1:${locale}`
}

function isRecentSearchItem(value: unknown, locale: string): value is RecentSearchItem {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.type === "string" &&
    (globalSearchGroupOrder as readonly string[]).includes(candidate.type) &&
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.href === "string" &&
    // Only a path inside this app and this locale: never another origin, never a protocol-relative URL.
    candidate.href.startsWith(`/${locale}/`)
  )
}

/** A stored list read defensively: anything malformed, foreign or for another locale is dropped. */
export function parseRecentSearches(raw: string | null, locale: string): RecentSearchItem[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((value) => isRecentSearchItem(value, locale))
    .map(({ type, title, href }) => ({ type, title, href }))
    .slice(0, RECENT_SEARCH_LIMIT)
}

/** Newest first, once per href, at most RECENT_SEARCH_LIMIT. */
export function addRecentSearch(list: RecentSearchItem[], item: RecentSearchItem): RecentSearchItem[] {
  return [item, ...list.filter((existing) => existing.href !== item.href)].slice(0, RECENT_SEARCH_LIMIT)
}

export function readRecentSearches(getStorage: () => Pick<Storage, "getItem">, locale: string): RecentSearchItem[] {
  try {
    return parseRecentSearches(getStorage().getItem(recentSearchStorageKey(locale)), locale)
  } catch {
    return []
  }
}

/** Saves the list, or removes the key when it is empty. False when storage is blocked or full. */
export function writeRecentSearches(
  getStorage: () => Pick<Storage, "setItem" | "removeItem">,
  locale: string,
  items: RecentSearchItem[]
): boolean {
  try {
    const storage = getStorage()
    const key = recentSearchStorageKey(locale)
    if (items.length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(items.slice(0, RECENT_SEARCH_LIMIT)))
    return true
  } catch {
    return false
  }
}
