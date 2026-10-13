import { FilterChipList } from "@/components/ui/filter-chips"
import type { AssetRegisterChip } from "@/lib/asset-register-chips"

// A server wrapper of FilterChipList (spec 2B §7.5, I7). AssetRegisterChip has the fields of FilterChipItem, and
// FilterChipList hides scope chips from md (mobileOnly) and the whole group when every chip is mobileOnly.
export function AssetRegisterFilterChips({
  chips,
  clearAllHref,
  labels,
}: {
  chips: AssetRegisterChip[]
  clearAllHref: string
  labels: { activeFilters: string; remove: string; clearAll: string }
}) {
  return (
    <FilterChipList
      chips={chips}
      label={labels.activeFilters}
      removeLabel={labels.remove}
      clearAll={{ href: clearAllHref, label: labels.clearAll }}
      className="mb-3"
    />
  )
}
