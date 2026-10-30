/** Splits a value around the first case-insensitive match of the term, for a <mark> highlight. */
export function splitSearchHighlight(value: string, term: string): [string, string, string] | null {
  const needle = term.trim().toLocaleLowerCase()
  if (!needle) return null
  const index = value.toLocaleLowerCase().indexOf(needle)
  if (index < 0) return null
  return [value.slice(0, index), value.slice(index, index + needle.length), value.slice(index + needle.length)]
}

export type SearchHighlightPart = { text: string; marked: boolean }

/**
 * Splits a value into plain and marked parts: every case-insensitive occurrence of each word is marked, and overlapping
 * or touching matches make one mark. The parts rebuild the value; none is empty (group 3 spec §11).
 */
export function splitSearchHighlightWords(value: string, words: readonly string[]): SearchHighlightPart[] {
  const haystack = value.toLocaleLowerCase()
  const marked = new Array<boolean>(value.length).fill(false)
  for (const word of words) {
    const needle = word.trim().toLocaleLowerCase()
    if (!needle) continue
    for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + 1)) {
      marked.fill(true, index, index + needle.length)
    }
  }
  const parts: SearchHighlightPart[] = []
  let start = 0
  for (let index = 1; index <= value.length; index += 1) {
    if (index === value.length || marked[index] !== marked[start]) {
      parts.push({ text: value.slice(start, index), marked: marked[start] })
      start = index
    }
  }
  return parts
}
