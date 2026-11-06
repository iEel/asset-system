export type SearchableSelectOption = {
  id: string
  label: string
  disabled?: boolean
  /** A second muted line under the label, such as a location's path (G7F-R3). Not searched, not the option's name. Null like absent:
   * the asset form's option type allows description: null; only its statuses and conditions fill it, and those never reach a SearchableSelect. */
  description?: string | null
  /** A chip at the right of the row, such as a location type (G7F-R3). Not searched, not the option's name. */
  meta?: string | null
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}

// Reads the label only: description and meta are shown, never matched.
export function filterSearchableOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options
  return options.filter((option) => normalize(option.label).includes(normalizedQuery))
}
