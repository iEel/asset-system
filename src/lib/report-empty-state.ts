export function selectReportEmptyCopy({
  hasActiveFilters,
  hasMatchingAssets,
  filtered,
  dataset,
}: {
  hasActiveFilters: boolean
  hasMatchingAssets: boolean
  filtered: string
  dataset: string
}) {
  return hasActiveFilters && !hasMatchingAssets ? filtered : dataset
}
