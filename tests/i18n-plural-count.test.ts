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

test("the en plural messages are known: 61 keys, so a new one is checked by the rules below", () => {
  // Group 4 plan 2 Task 6a added 9: the asset form's required counter, section count, missing line and six section summaries.
  // Task 8 added the edit footer's "แก้ไข n ช่อง" (asset.changeCount).
  // Group 4 plan 3 Task 4 added 4: the purchase-document picker's footer and linked lines, and the edit badge "ผูกไว้ n ใบ".
  // Group 4 plan 4 Task 5 added 3: the scan page's heading with and without the matched field, and a card's components.
  // The final review of plan 4 added 1: the scan heading's "แสดง n รายการแรก" past 8 results.
  // Group 4 plan 5 Task 3 added 15: the import card (file line, column mapping, repeated problems, the 100-row note, the
  // hint under the table, the footer, the confirm button, the done line and its asset list) and the export and history
  // card (the count line, its capped variant, "10 รอบล่าสุด" and the skipped rows' "และอีก n แถว").
  assert.equal(pluralKeys.size, 61, [...pluralKeys.keys()].join(", "))
  assert.equal(pluralKeys.get("asset.importPage.dropzoneHint"), "count")
  assert.equal(pluralKeys.get("asset.importPage.mappingMatched"), "total")
  assert.equal(pluralKeys.get("asset.importPage.mappingMissingOptional"), "count")
  assert.equal(pluralKeys.get("asset.importPage.mappingMissingRequired"), "count")
  assert.equal(pluralKeys.get("asset.importPage.issueSummaryRows"), "count")
  assert.equal(pluralKeys.get("asset.importPage.shownFirst"), "count")
  assert.equal(pluralKeys.get("asset.importPage.tableHint"), "errors")
  assert.equal(pluralKeys.get("asset.importPage.footerSummary"), "ready")
  assert.equal(pluralKeys.get("asset.importPage.confirm"), "count")
  assert.equal(pluralKeys.get("asset.importPage.doneSummary"), "imported")
  assert.equal(pluralKeys.get("asset.importPage.doneMoreAssets"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.exportAllCount"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.exportAllCapped"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.historyRecent"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.skippedRowsMore"), "count")
  assert.equal(pluralKeys.get("assetTools.scanShownFirst"), "shown")
  assert.equal(pluralKeys.get("assetTools.scanFound"), "count")
  assert.equal(pluralKeys.get("assetTools.scanFoundMatch"), "count")
  assert.equal(pluralKeys.get("assetTools.scanComponentsValue"), "count")
  // Group 4 plan 4 Task 3: the components page's count line, photo count and the remove dialog's count.
  assert.equal(pluralKeys.get("asset.componentHistoryCount"), "total")
  assert.equal(pluralKeys.get("asset.componentPhotoCount"), "count")
  assert.equal(pluralKeys.get("asset.componentCountValue"), "count")
  assert.equal(pluralKeys.get("asset.changeCount"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentSearchFooter"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentLinkedNames"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentLinkedCount"), "count")
  assert.equal(pluralKeys.get("asset.sectionSummary.documentsLinked"), "count")
  assert.equal(pluralKeys.get("asset.requiredFilled"), "total")
  assert.equal(pluralKeys.get("asset.sectionFilled"), "total")
  assert.equal(pluralKeys.get("asset.requiredMissing"), "count")
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
