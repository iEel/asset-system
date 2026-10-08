// Lists message keys that never appear as a string literal in src/.
// A hint, not a verdict: keys built at runtime (t(`actions.${action}`)) look unused here — check them by hand.
// Usage: node scripts/find-unused-messages.mjs [namespace]
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(path)
  }
  return out
}
const source = walk(join(root, "src")).map((file) => readFileSync(file, "utf8")).join("\n")
const literals = new Set([...source.matchAll(/["'`]([A-Za-z0-9_.-]+)["'`]/g)].map((match) => match[1]))
const dynamicPrefixes = [...source.matchAll(/`([A-Za-z0-9_.]+)\$\{/g)].map((match) => match[1])
const messages = JSON.parse(readFileSync(join(root, "messages", "th.json"), "utf8"))
const only = process.argv[2]

function keysOf(value, prefix = "") {
  if (typeof value === "string") return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key))
}

const counts = {}
for (const [namespace, value] of Object.entries(messages)) {
  if (only && namespace !== only) continue
  for (const key of keysOf(value)) {
    const leaf = key.split(".").at(-1)
    const full = `${namespace}.${key}`
    const used = literals.has(key) || literals.has(leaf) || literals.has(full)
      || dynamicPrefixes.some((prefix) => key.startsWith(prefix) || full.startsWith(prefix))
    if (used) continue
    counts[namespace] = (counts[namespace] ?? 0) + 1
    console.log(full)
  }
}
console.error(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([namespace, count]) => `${namespace}: ${count}`).join("\n"))
