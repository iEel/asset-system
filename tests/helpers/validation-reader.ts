// Readers for tests/validation-guards.test.ts (V track spec §8). Not a parser, like ./source-files.ts: when a guard
// misreads a file, fix the reader and add the case to the reader test; never add a row to make a guard pass.

// The source with JSX comments ({/* … */}) and block comments that start a line blanked out, line breaks kept, so a
// comment that names <form> is not read as a form. A "/*" inside a string (accept="image/*") is left alone.
export function withoutBlockComments(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ")
  return source.replace(/\{\/\*[\s\S]*?\*\/\}/g, blank).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)
}

// The index of the bracket that closes the one at `open`, skipping one-line '…' and "…" strings.
function closingIndex(source: string, open: number, openChar: string, closeChar: string): number {
  let depth = 0
  for (let index = open; index < source.length; index++) {
    const char = source[index]
    if (char === '"' || char === "'") {
      const end = source.indexOf(char, index + 1)
      if (end !== -1 && !source.slice(index, end).includes("\n")) {
        index = end
        continue
      }
    }
    if (char === openChar) depth++
    else if (char === closeChar && --depth === 0) return index
  }
  return source.length
}

// Where a catch runs: the block of `catch {` / `catch (error) {`, and the argument of `.catch(…)`.
export function catchRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  for (const match of source.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    const open = match.index + match[0].length - 1
    ranges.push([open, closingIndex(source, open, "{", "}")])
  }
  for (const match of source.matchAll(/\.catch\(/g)) {
    const open = match.index + match[0].length - 1
    ranges.push([open, closingIndex(source, open, "(", ")")])
  }
  return ranges
}

// The 1-based lines of every match of `pattern` (a global regex) outside a catch.
export function linesOutsideCatch(source: string, pattern: RegExp): number[] {
  const ranges = catchRanges(source)
  return [...source.matchAll(pattern)]
    .filter((match) => !ranges.some(([start, end]) => match.index > start && match.index < end))
    .map((match) => source.slice(0, match.index).split("\n").length)
}
