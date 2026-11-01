import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { IntlMessageFormat } from "intl-messageformat"

// An en plural reads "NaN" when its argument is a grouped string such as formatCount(1234) = "1,234", so every call
// passes the number. Thai has no plural; its value writes the argument as {count, number} so it still groups "1,234"
// (a plain {count} prints String(1234) = "1234"). Group 3 follow-ups A3, controller ruling 2026-11-01.

type Messages = Record<string, unknown>
const load = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Messages
const flat = (value: Messages, prefix = ""): Array<[string, string]> =>
  Object.entries(value).flatMap(([key, child]) => (typeof child === "object" && child !== null ? flat(child as Messages, `${prefix}${key}.`) : [[`${prefix}${key}`, String(child)]]))
const th = new Map(flat(load("th")))
const en = new Map(flat(load("en")))

// key → the argument the en value pluralises (or selects on).
const pluralKeys = new Map<string, string>()
for (const [key, value] of en) {
  const match = value.match(/\{\s*(\w+)\s*,\s*(?:plural|select|selectordinal)\s*,/)
  if (match) pluralKeys.set(key, match[1])
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry) ? [path] : []
  })
}

test("the en plural messages are known: 21 keys, so a new one is checked by the rules below", () => {
  assert.equal(pluralKeys.size, 21, [...pluralKeys.keys()].join(", "))
  assert.equal(pluralKeys.get("common.searchSelectResultCount"), "count")
  assert.equal(pluralKeys.get("session.idleWarningSr"), "minutes")
})

test("no source call passes formatCount(…) into a message whose en value is a plural", () => {
  const offenders: string[] = []
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8")
    for (const [key, arg] of pluralKeys) {
      const last = key.slice(key.lastIndexOf(".") + 1)
      const call = new RegExp(String.raw`\(\s*"(?:[\w.]+\.)?${last}"\s*,\s*\{[^}]*\b${arg}\s*:\s*formatCount\(`, "g")
      for (const match of source.matchAll(call)) offenders.push(`${file}:${source.slice(0, match.index).split("\n").length} ${key}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test("the th value of every en plural message writes its argument as {<arg>, number}, never a plain {<arg>}", () => {
  const wrong = [...pluralKeys].filter(([key, arg]) => {
    const value = th.get(key) ?? ""
    return !value.includes(`{${arg}, number}`) || new RegExp(String.raw`\{\s*${arg}\s*\}`).test(value)
  })
  assert.deepEqual(wrong.map(([key]) => key), [])
})

test("common.searchSelectResultCount reads 1234 grouped in both languages through intl-messageformat, never NaN", () => {
  const read = (locale: "th" | "en", count: unknown) => String(new IntlMessageFormat(locale === "th" ? th.get("common.searchSelectResultCount")! : en.get("common.searchSelectResultCount")!, locale).format({ count }))
  assert.equal(read("en", 1234), "1,234 results")
  assert.equal(read("en", 1), "1 result")
  assert.equal(read("th", 1234), "พบ 1,234 รายการ")
  assert.doesNotMatch(read("en", 1234), /NaN/)
})
