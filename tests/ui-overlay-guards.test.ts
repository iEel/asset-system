import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

export function readSourceFiles(root: string): Array<{ path: string; source: string }> {
  const files: Array<{ path: string; source: string }> = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...readSourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) {
      files.push({ path: path.replace(/\\/g, "/"), source: readFileSync(path, "utf8").replace(/\r\n/g, "\n") })
    }
  }
  return files
}

const sources = readSourceFiles("src")

function findMatches(pattern: RegExp, allow: (path: string) => boolean = () => false) {
  return sources
    .filter((file) => !allow(file.path))
    .flatMap((file) => [...file.source.matchAll(pattern)].map((match) => `${file.path}: ${match[0]}`))
}

test("status tints use soft tokens instead of opacity", () => {
  assert.deepEqual(findMatches(/\bbg-(?:success|warning|danger|info)\/\d+\b/g), [])
  assert.deepEqual(findMatches(/\bbg-primary\/(?:5|10|15|20)\b/g), [])
})

test("solid fills darken on hover instead of fading", () => {
  assert.deepEqual(findMatches(/\bbg-(?:primary|success|warning|danger|info)\/90\b/g), [])
})

test("status foreground tokens only appear inside shared ui components", () => {
  assert.deepEqual(
    findMatches(/\btext-(?:success|warning|danger|info)-foreground\b/g, (path) => path.startsWith("src/components/ui/")),
    [],
  )
})

test("primary text is never faded below AA", () => {
  assert.deepEqual(findMatches(/\btext-primary\/\d+\b/g), [])
})

test("nothing imports the removed status pill", () => {
  assert.deepEqual(findMatches(/components\/ui\/status-pill/g), [])
})

const pendingNavigationGuards = new Set([
  "src/components/disposal/disposal-bulk-approval.tsx",
  "src/components/disposal/disposal-bulk-execution.tsx",
  "src/components/master-data/supplier-form.tsx",
])

test("no browser confirm dialogs", () => {
  assert.deepEqual(findMatches(/window\.confirm\(/g, (path) => pendingNavigationGuards.has(path)), [])
})
