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

// Matches per file, for ratchet guards whose budget is "at most N in this file". Files with no match are left out.
export function countMatchesByFile(files: SourceFile[], pattern: RegExp, allow: (path: string) => boolean = () => false): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const file of files) {
    if (allow(file.path)) continue
    const count = [...file.source.matchAll(pattern)].length
    if (count > 0) counts[file.path] = count
  }
  return counts
}
