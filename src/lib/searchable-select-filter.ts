export type SearchableSelectOption = {
  id: string
  label: string
  disabled?: boolean
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}

export function filterSearchableOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options
  return options.filter((option) => normalize(option.label).includes(normalizedQuery))
}
