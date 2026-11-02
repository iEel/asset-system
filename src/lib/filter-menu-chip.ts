import { filterSearchableOptions } from "./searchable-select-filter.ts"

// One option of a FilterMenuChip (src/components/ui/filter-menu-chip.tsx). label is what the menu shows ("code - name",
// spec §5); name is what the closed chip shows after "<filter>: " (the name alone). Without a name the label is used.
export type FilterMenuChipOption = { value: string; label: string; name?: string }

// The closed chip's text: "<ชื่อตัวกรอง>: <ชื่อ>".
export function filterMenuChipJoin(label: string, valueName: string) {
  return `${label}: ${valueName}`
}

// The chosen option's name after the filter's name. A value with no option (the options still loading) shows the
// filter's name alone, never "บริษัท: undefined".
export function filterMenuChipText(label: string, options: readonly FilterMenuChipOption[], value: string) {
  const chosen = options.find((option) => option.value === value)
  return chosen ? filterMenuChipJoin(label, chosen.name ?? chosen.label) : label
}

// The searchable chip's matches: SearchableSelect's rule (case and spaces ignored) on the menu label, so a room is
// found by its code or its name. Keeps the options' order.
export function filterMenuChipMatches(options: readonly FilterMenuChipOption[], query: string) {
  const matching = new Set(filterSearchableOptions(options.map((option) => ({ id: option.value, label: option.label })), query).map((option) => option.id))
  return options.filter((option) => matching.has(option.value))
}
