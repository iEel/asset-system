import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export type SourceFile = { path: string; source: string }

// Reads every .ts/.tsx file under root with "/" paths and LF line endings.
export function readSourceFiles(root: string): SourceFile[] {
  const files: SourceFile[] = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...readSourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) {
      files.push({ path: path.replace(/\\/g, "/"), source: readFileSync(path, "utf8").replace(/\r\n/g, "\n") })
    }
  }
  return files
}

export function findMatches(files: SourceFile[], pattern: RegExp, allow: (path: string) => boolean = () => false): string[] {
  return files
    .filter((file) => !allow(file.path))
    .flatMap((file) => [...file.source.matchAll(pattern)].map((match) => `${file.path}: ${match[0]}`))
}

// Matches per file, for the guards that hold each file to its EXEMPT row (tests/helpers/guard-exempt.ts). Files with no
// match are left out.
export function countMatchesByFile(files: SourceFile[], pattern: RegExp, allow: (path: string) => boolean = () => false): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const file of files) {
    if (allow(file.path)) continue
    const count = [...file.source.matchAll(pattern)].length
    if (count > 0) counts[file.path] = count
  }
  return counts
}

// JSX reader for the phase 2C guards (tests/form-migration-guards.test.ts). It is not a parser: it skips {…},
// quoted values and comments inside braces, so `=>` in an onChange and `[&>svg]` in a class never end a tag.
// When a guard misreads a file, fix the reader and add the case to the reader test in that file; never add an EXEMPT row.
export type JsxTag = { name: string; start: number; end: number; line: number; text: string; selfClosing: boolean }
export type JsxElement = JsxTag & { children: string | null; closeEnd: number }

// Index just past the ">" that closes an opening tag, scanning from `from` (just after the tag name). -1 if the source ends first.
export function endOfOpeningTag(source: string, from: number): number {
  let depth = 0
  let quote: string | null = null
  for (let index = from; index < source.length; index++) {
    const char = source[index]
    if (quote) {
      if (char === "\\") index++
      else if (char === quote) quote = null
      continue
    }
    if (depth > 0 && char === "/" && source[index + 1] === "/") {
      const lineEnd = source.indexOf("\n", index)
      if (lineEnd === -1) return -1
      index = lineEnd
      continue
    }
    if (depth > 0 && char === "/" && source[index + 1] === "*") {
      const commentEnd = source.indexOf("*/", index + 2)
      if (commentEnd === -1) return -1
      index = commentEnd + 1
      continue
    }
    if (char === '"' || char === "'" || char === "`") quote = char
    else if (char === "{") depth++
    else if (char === "}") depth--
    else if (char === ">" && depth === 0) return index + 1
  }
  return -1
}

// Every opening tag whose name matches one of `names` (each a regex source, such as "input" or "[A-Z][\\w.]*").
// A match on a line that starts with //, /* or * is a comment and is skipped.
export function findJsxTags(source: string, names: readonly string[]): JsxTag[] {
  const pattern = new RegExp(`<(${names.join("|")})(?=[\\s/>])`, "g")
  const tags: JsxTag[] = []
  let line = 1
  let counted = 0
  for (const match of source.matchAll(pattern)) {
    const start = match.index
    for (; counted < start; counted++) if (source.charCodeAt(counted) === 10) line++
    const lineStart = source.lastIndexOf("\n", start) + 1
    const before = source.slice(lineStart, start).trimStart()
    if (before.startsWith("//") || before.startsWith("/*") || before.startsWith("*")) continue
    const end = endOfOpeningTag(source, start + match[0].length)
    if (end === -1) continue
    const text = source.slice(start, end)
    tags.push({ name: match[1], start, end, line, text, selfClosing: text.endsWith("/>") })
  }
  return tags
}

// Each element of one name with the text between its opening and closing tag. Same-name nesting is counted.
// children is "" for a self-closing tag and null when no closing tag is found.
export function findJsxElements(source: string, name: string): JsxElement[] {
  return findJsxTags(source, [name]).map((tag) => {
    if (tag.selfClosing) return { ...tag, children: "", closeEnd: tag.end }
    const pattern = new RegExp(`<(/?)${name}(?=[\\s/>])`, "g")
    pattern.lastIndex = tag.end
    let depth = 1
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
      if (match[1] === "/") {
        depth--
        if (depth === 0) return { ...tag, children: source.slice(tag.end, match.index), closeEnd: source.indexOf(">", match.index) + 1 }
        continue
      }
      const end = endOfOpeningTag(source, match.index + match[0].length)
      if (end === -1) break
      if (!source.slice(match.index, end).endsWith("/>")) depth++
      pattern.lastIndex = end
    }
    return { ...tag, children: null, closeEnd: tag.end }
  })
}

// The tag text with every {…} emptied to {} and every quoted value emptied to "", so attribute checks
// never look inside expressions or class strings.
function attributeSkeleton(tagText: string): string {
  let out = ""
  let depth = 0
  let quote: string | null = null
  for (let index = 0; index < tagText.length; index++) {
    const char = tagText[index]
    if (quote) {
      if (char === "\\") index++
      else if (char === quote) {
        quote = null
        if (depth === 0) out += char
      }
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      if (depth === 0) out += char
    } else if (char === "{") {
      if (depth === 0) out += char
      depth++
    } else if (char === "}") {
      depth--
      if (depth === 0) out += char
    } else if (depth === 0) out += char
  }
  return out
}

export function hasJsxAttr(tagText: string, attr: string): boolean {
  return new RegExp(`\\s${attr}(?=[\\s=/>])`).test(attributeSkeleton(tagText))
}

// The raw value of an attribute: what is inside {…} or the quotes, "" for a bare flag, null when the attribute is missing.
export function jsxAttrValue(tagText: string, attr: string): string | null {
  let depth = 0
  let quote: string | null = null
  for (let index = 0; index < tagText.length; index++) {
    const char = tagText[index]
    if (quote) {
      if (char === "\\") index++
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") quote = char
    else if (char === "{") depth++
    else if (char === "}") depth--
    if (quote || depth !== 0 || !/\s/.test(char)) continue
    const nameEnd = index + 1 + attr.length
    if (!tagText.startsWith(attr, index + 1) || !/[\s=/>]/.test(tagText[nameEnd] ?? "")) continue
    if (tagText[nameEnd] !== "=") return ""
    const open = tagText[nameEnd + 1]
    if (open === '"' || open === "'") return tagText.slice(nameEnd + 2, tagText.indexOf(open, nameEnd + 2))
    if (open !== "{") return ""
    const close = closingBrace(tagText, nameEnd + 1)
    return close === -1 ? null : tagText.slice(nameEnd + 2, close)
  }
  return null
}

// Index of the "}" that closes the "{" at `open`, skipping quoted text. -1 if there is none.
function closingBrace(text: string, open: number): number {
  let depth = 0
  let quote: string | null = null
  for (let index = open; index < text.length; index++) {
    const char = text[index]
    if (quote) {
      if (char === "\\") index++
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'" || char === "`") quote = char
    else if (char === "{") depth++
    else if (char === "}" && --depth === 0) return index
  }
  return -1
}

// Counts per file from a counting function, for the EXEMPT checks. Files counted as 0 are left out.
export function countByFile(files: SourceFile[], count: (file: SourceFile) => number, allow: (path: string) => boolean = () => false): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const file of files) {
    if (allow(file.path)) continue
    const value = count(file)
    if (value > 0) counts[file.path] = value
  }
  return counts
}
