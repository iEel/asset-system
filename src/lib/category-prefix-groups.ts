export type CategoryPrefixRow = {
  categoryId: string
  prefix: string
}

export type CategoryPrefixGroup = {
  prefix: string
  categoryIds: string[]
}

export function normalizeCategoryPrefix(prefix: string) {
  return prefix.trim().toUpperCase()
}

export function parsePrefixRows(value?: string | null): CategoryPrefixRow[] {
  try {
    const parsed = JSON.parse(value || "{}") as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return []
    return Object.entries(parsed)
      .map(([categoryId, prefix]) => ({
        categoryId,
        prefix: typeof prefix === "string" ? normalizeCategoryPrefix(prefix) : "",
      }))
      .filter((row) => row.categoryId && row.prefix)
  } catch {
    return []
  }
}

export function serializePrefixRows(rows: CategoryPrefixRow[]) {
  return JSON.stringify(
    Object.fromEntries(
      rows
        .map((row) => [row.categoryId, normalizeCategoryPrefix(row.prefix)])
        .filter(([categoryId, prefix]) => categoryId && prefix)
    )
  )
}

export function buildCategoryPrefixGroups(rows: CategoryPrefixRow[]): CategoryPrefixGroup[] {
  const groups = new Map<string, string[]>()

  for (const row of rows) {
    const categoryId = row.categoryId.trim()
    const prefix = normalizeCategoryPrefix(row.prefix)
    if (!categoryId || !prefix) continue

    const categoryIds = groups.get(prefix) ?? []
    if (!categoryIds.includes(categoryId)) {
      categoryIds.push(categoryId)
    }
    groups.set(prefix, categoryIds)
  }

  return Array.from(groups, ([prefix, categoryIds]) => ({ prefix, categoryIds }))
}

export function filterPrefixRowsByCategoryIds(rows: CategoryPrefixRow[], categoryIds: string[]) {
  const knownCategoryIds = new Set(categoryIds)
  return rows.filter((row) => knownCategoryIds.has(row.categoryId))
}

export function applyCategoryPrefixGroupEdit(
  rows: CategoryPrefixRow[],
  {
    previousPrefix,
    prefix,
    categoryIds,
  }: {
    previousPrefix?: string | null
    prefix: string
    categoryIds: string[]
  }
): CategoryPrefixRow[] {
  const previous = normalizeCategoryPrefix(previousPrefix ?? "")
  const next = normalizeCategoryPrefix(prefix)
  const selectedIds = unique(categoryIds.map((categoryId) => categoryId.trim()).filter(Boolean))
  const selectedIdSet = new Set(selectedIds)

  const retainedRows = rows.filter((row) => {
    const rowPrefix = normalizeCategoryPrefix(row.prefix)
    return rowPrefix !== previous && !selectedIdSet.has(row.categoryId)
  })

  return [...retainedRows, ...selectedIds.map((categoryId) => ({ categoryId, prefix: next }))]
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

// The read-only prefix box of the category form (board MD-Category-Edit): the category's prefix from the settings, or
// null when none is set (the asset tag then uses the category code), and the other categories of its prefix group.
export function categoryPrefixFor(rows: CategoryPrefixRow[], categoryId: string | null | undefined): { prefix: string | null; sharedWithIds: string[] } {
  if (!categoryId) return { prefix: null, sharedWithIds: [] }
  const group = buildCategoryPrefixGroups(rows).find((candidate) => candidate.categoryIds.includes(categoryId))
  if (!group) return { prefix: null, sharedWithIds: [] }
  return { prefix: group.prefix, sharedWithIds: group.categoryIds.filter((id) => id !== categoryId) }
}

// What "ตัวอย่างรหัส" needs from the settings (asset_tag_format_template, _separator, _prefix, _running_digits) and one
// company and branch to fill their tokens; the server page reads them.
export type AssetTagExampleParts = {
  template: string
  separator: string
  globalPrefix: string
  companyCode: string
  branchCode: string
  runningDigits: number
  year: number
}

// defaultAssetTagFormatTemplate (system-setting-defaults.ts), restated: this file is imported by tests without the @ alias.
const fallbackAssetTagTemplate = "{assetCompanyCode}{separator}{branchCode}{separator}{assetPrefix}{separator}{running}"

// An example tag as generateAssetTags (asset-tag.ts) would render it, with the first running number. The category segment
// is the prefix, else the category code as typed; "CAT" while the code is still empty.
export function renderAssetTagExample(parts: AssetTagExampleParts, prefix: string | null, categoryCode: string): string {
  const template = parts.template.trim() && parts.template.includes("{running}") ? parts.template.trim() : fallbackAssetTagTemplate
  const year = String(parts.year)
  const tokens: Record<string, string> = {
    companyCode: parts.companyCode,
    assetCompanyCode: parts.companyCode,
    branchCode: parts.branchCode,
    categoryCode: categoryCode.trim() || "CAT",
    assetPrefix: prefix || categoryCode.trim() || "CAT",
    globalPrefix: parts.globalPrefix.trim() || "AST",
    separator: parts.separator.trim() || "-",
    year,
    year2: year.slice(-2),
    month: "01",
    day: "01",
    running: "1".padStart(Math.max(1, parts.runningDigits), "0"),
  }
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (_match, token: string) => tokens[token] ?? "")
}
