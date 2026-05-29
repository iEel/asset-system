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
