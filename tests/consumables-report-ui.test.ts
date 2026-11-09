import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// ของใช้สิ้นเปลือง plan 3 task 3: the เครื่องที่เปลี่ยนของบ่อย report on /consumables (?view=frequent). Source pins, CRLF-safe.
const pagePath = "src/app/[locale]/(dashboard)/consumables/page.tsx"
const reportPath = "src/components/consumables/consumables-frequent-report.tsx"
const workspacePath = "src/components/consumables/consumables-workspace.tsx"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

test("page: ?view=frequent renders the report and reads it with the parsed days, item and asset", () => {
  const page = read(pagePath)
  assert.match(page, /searchParams: Promise<\{ view\?: string \| string\[\]; days\?: string \| string\[\]; item\?: string \| string\[\]; asset\?: string \| string\[\] \}>/)
  assert.match(page, /const frequent = query\.view === "frequent"/)
  assert.match(page, /const days = parseConsumableReportDays\(query\.days\)/)
  assert.match(page, /getConsumableFrequentReport\(prisma, \{ days, itemId: query\.item, assetId: query\.asset, now: new Date\(\) \}\)/)
  assert.match(page, /if \(frequent\) \{[\s\S]*<ConsumablesFrequentReport\b/)
  // The kinds for ชนิด include the inactive ones.
  assert.match(page, /prisma\.consumableItem\.findMany\(\{\s*select: \{ id: true, name: true, isActive: true \}/)
  assert.doesNotMatch(page.slice(page.indexOf("prisma.consumableItem.findMany("), page.indexOf("prisma.consumableItem.findMany(") + 200), /where:/)
  // The list view's read stays as it was, only off the report view.
  assert.match(page, /const rows = await listConsumablesWithUsage\(prisma\)/)
})

test("page: the tab links keep the other params; the list tab drops view only", () => {
  const page = read(pagePath)
  assert.match(page, /^function consumablesHref\(locale: string, query: ConsumablesQuery, overrides: Partial<ConsumablesQuery> = \{\}\)/m)
  assert.match(page, /for \(const key of \["view", "days", "item", "asset"\] as const\)/)
  assert.match(page, /\{ key: "list", label: t\("tab_list"\), href: consumablesHref\(locale, query, \{ view: undefined \}\) \}/)
  assert.match(page, /\{ key: "frequent", label: t\("tab_frequent"\), href: consumablesHref\(locale, query, \{ view: "frequent" \}\) \}/)
  assert.match(page, /<TabNav aria-label=\{t\("title"\)\} items=\{tabItems\} current=\{frequent \? "frequent" : "list"\} scroll=\{false\} \/>/)
})

test("page: the asset chip removes asset only", () => {
  const page = read(pagePath)
  assert.match(page, /href: consumablesHref\(locale, query, \{ asset: undefined \}\)/)
  assert.match(page, /label: t\("asset_chip", \{ tag: chipAsset\?\.assetTag \?\? query\.asset \}\)/)
})

test("workspace: the list view takes the tabs under its header and is otherwise unchanged", () => {
  const ws = read(workspacePath)
  assert.match(ws, /tabs\?: ReactNode/)
  assert.match(ws, /<PageHeader[\s\S]*?\/>\n\n      \{tabs\}/)
})

test("report: the filters are a GET form, ช่วง four options, ชนิด all plus every kind with the inactive suffix", () => {
  const report = read(reportPath)
  assert.ok(report, "the report exists")
  assert.doesNotMatch(report, /^"use client"/m)
  assert.match(report, /<form role="search" method="get" action=\{`\/\$\{locale\}\/consumables`\}/)
  assert.match(report, /<input type="hidden" name="view" value="frequent" \/>/)
  assert.match(report, /\{assetId \? <input type="hidden" name="asset" value=\{assetId\} \/> : null\}/)
  assert.match(report, /<FilterSelect label=\{t\("filter_days"\)\} name="days" defaultValue=\{String\(days\)\}/)
  assert.match(report, /consumableReportDays\.map\(\(value\) => \(\{ value: String\(value\), label: t\("days_option", \{ days: value \}\) \}\)\)/)
  assert.match(report, /<FilterSelect label=\{t\("filter_item"\)\} name="item" defaultValue=\{itemId \?\? ""\} allLabel=\{t\("item_all"\)\}/)
  assert.match(report, /item\.isActive \? item\.name : t\("item_inactive", \{ name: item\.name \}\)/)
  assert.match(report, /<FilterChipList chips=\{chips\}/)
})

test("report: the columns, the tag links to the machine, the more note and the empty note", () => {
  const report = read(reportPath)
  assert.match(report, /<ContentPanel divided flush>/)
  assert.match(report, /<DataTable framed=\{false\} className="hidden md:block"/)
  assert.match(report, /<ContentPanelRows className="md:hidden">/)
  for (const column of ["col_asset", "col_holder", "col_count", "col_latest"]) assert.match(report, new RegExp(`t\\("${column}"\\)`), column)
  assert.match(report, /href=\{`\/\$\{locale\}\/assets\/\$\{row\.assetId\}`\}/)
  assert.match(report, /row\.holderName \?\? <Nil \/>/)
  assert.match(report, /t\("latest_value", \{ date: formatAssetDetailDate\(row\.latestAt, locale\), item: row\.latestItemName \}\)/)
  assert.match(report, /\{more \? \(\s*<p[^>]*>\{t\("report_more"\)\}<\/p>/)
  assert.match(report, /rows\.length === 0 \? \(\s*<EmptyNote padded>\{t\("report_empty"\)\}<\/EmptyNote>/)
})

test("messages: consumablesPage report keys in Thai as the brief gives them, English plural for the days", () => {
  const th = messages("th").consumablesPage
  const expected: Record<string, string> = {
    tab_list: "รายการ",
    tab_frequent: "เครื่องที่เปลี่ยนของบ่อย",
    filter_days: "ช่วง",
    days_option: "{days, number} วัน",
    filter_item: "ชนิด",
    item_all: "ทุกชนิด",
    item_inactive: "{name} (ปิดใช้งาน)",
    asset_chip: "เครื่อง {tag}",
    col_asset: "เครื่อง",
    col_holder: "ผู้ถือครอง",
    col_count: "ครั้งที่เปลี่ยน",
    col_latest: "ล่าสุด",
    latest_value: "{date} · {item}",
    report_more: "แสดง 100 เครื่องแรก",
    report_empty: "ไม่มีการเปลี่ยนของในช่วงนี้",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  const en = messages("en").consumablesPage
  for (const key of Object.keys(expected)) assert.ok(en[key], `en ${key}`)
  assert.match(en.days_option, /\{days, plural, one \{# day\} other \{# days\}\}/)
})
