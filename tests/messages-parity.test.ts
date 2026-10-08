import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function flatEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatEntries(child, prefix ? `${prefix}.${key}` : key))
}
const load = (locale: "th" | "en") => new Map(flatEntries(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))))
// Simple ICU arguments only: {name}, {count, plural, …} → "name", "count". Words inside plural branches are not arguments.
const placeholders = (text: string) => new Set([...text.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[,}])/g)].map((match) => match[1]))

test("Thai and English messages have exactly the same keys", () => {
  const th = load("th")
  const en = load("en")
  assert.deepEqual([...th.keys()].filter((key) => !en.has(key)), [], "keys only in th.json")
  assert.deepEqual([...en.keys()].filter((key) => !th.has(key)), [], "keys only in en.json")
})

test("every message has the same placeholders in Thai and English", () => {
  const th = load("th")
  const en = load("en")
  const mismatched = [...th.entries()].filter(([key, text]) => {
    const other = en.get(key)
    if (other === undefined) return false
    const a = [...placeholders(text)].sort().join(",")
    const b = [...placeholders(other)].sort().join(",")
    return a !== b
  }).map(([key]) => key)
  assert.deepEqual(mismatched, [])
})

test("message files are two-space JSON so scripted edits stay byte-stable", () => {
  for (const locale of ["th", "en"] as const) {
    const raw = readFileSync(`messages/${locale}.json`, "utf8").replace(/\r\n/g, "\n")
    assert.equal(raw, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`, locale)
  }
})
