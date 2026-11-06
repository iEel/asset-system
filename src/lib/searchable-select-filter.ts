export type SearchableSelectOption = {
  id: string
  label: string
  disabled?: boolean
  /** A second muted line under the label, such as a location's path (G7F-R3). Not searched, not the option's name. Null like absent:
   * the asset form's option type allows description: null; only its statuses and conditions fill it, and those never reach a SearchableSelect. */
  description?: string | null
  /** A chip at the right of the row, such as a location type (G7F-R3). Not searched, not the option's name. */
  meta?: string | null
  /** A muted text at the right after the chip, such as a location's active child count (group 7 follow-ups Task 4). Describes, never names. */
  aside?: string | null
  /** Text searched with the label but never shown, such as a location's path when the label is its name (Task 4). */
  keywords?: string | null
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}

// Reads the label and the keywords: description, meta and aside are shown, never matched.
export function filterSearchableOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options
  return options.filter(
    (option) => normalize(option.label).includes(normalizedQuery) || (option.keywords ? normalize(option.keywords).includes(normalizedQuery) : false),
  )
}
