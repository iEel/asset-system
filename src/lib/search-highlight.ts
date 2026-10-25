/** Splits a value around the first case-insensitive match of the term, for a <mark> highlight. */
export function splitSearchHighlight(value: string, term: string): [string, string, string] | null {
  const needle = term.trim().toLocaleLowerCase()
  if (!needle) return null
  const index = value.toLocaleLowerCase().indexOf(needle)
  if (index < 0) return null
  return [value.slice(0, index), value.slice(index, index + needle.length), value.slice(index + needle.length)]
}
