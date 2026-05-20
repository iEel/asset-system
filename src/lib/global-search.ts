export const globalSearchScopes = ["all", "asset"] as const
export type GlobalSearchScope = (typeof globalSearchScopes)[number]

export type GlobalSearchResultType =
  | "asset"
  | "employee"
  | "supplier"
  | "company"
  | "branch"
  | "location"
  | "maintenance"
  | "audit"
  | "disposal"

export type GlobalSearchMetadata = {
  label: string
  value: string
}

export type GlobalSearchResultLike = {
  id: string
  type: string
  title: string
  subtitle: string
  href: string
  metadata?: GlobalSearchMetadata[]
  keywords?: string[]
}

const typePriority: Record<string, number> = {
  asset: 18,
  employee: 16,
  maintenance: 14,
  audit: 13,
  disposal: 12,
  supplier: 10,
  location: 9,
  branch: 8,
  company: 7,
}

export function normalizeGlobalSearchScope(value: unknown): GlobalSearchScope {
  return value === "asset" ? "asset" : "all"
}

export function scoreGlobalSearchResult(result: GlobalSearchResultLike, query: string) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return 0

  const title = normalizeText(result.title)
  const subtitle = normalizeText(result.subtitle)
  const metadata = (result.metadata ?? []).map((item) => normalizeText(item.value))
  const keywords = (result.keywords ?? []).map(normalizeText)
  const searchable = [title, subtitle, ...metadata, ...keywords].filter(Boolean)

  let score = typePriority[result.type] ?? 0
  if (title === normalizedQuery) score += 1000
  else if (title.startsWith(normalizedQuery)) score += 800
  else if (subtitle === normalizedQuery) score += 700
  else if (subtitle.startsWith(normalizedQuery)) score += 600
  else if (metadata.some((value) => value === normalizedQuery)) score += 500
  else if (metadata.some((value) => value.startsWith(normalizedQuery))) score += 400
  else if (keywords.some((value) => value === normalizedQuery)) score += 350
  else if (keywords.some((value) => value.startsWith(normalizedQuery))) score += 300
  else if (searchable.some((value) => value.includes(normalizedQuery))) score += 100

  return score
}

export function sortGlobalSearchResults<T extends GlobalSearchResultLike>(
  results: T[],
  query: string,
  limit = 12
) {
  return [...results]
    .map((result, index) => ({ result, index, score: scoreGlobalSearchResult(result, query) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .slice(0, limit)
    .map((item) => item.result)
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}
