import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// ของใช้สิ้นเปลือง plan 3 task 2: the machine page's ของใช้สิ้นเปลือง panel and its locked issue dialog. Source pins, CRLF-safe.
const panelPath = "src/components/assets/detail/asset-consumables-panel.tsx"
const overviewPath = "src/components/assets/detail/asset-overview.tsx"
const pagePath = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

test("the page reads the issues only with consumable:view, and the kinds only when it can create for an eligible asset", () => {
  const page = read(pagePath)
  assert.match(page, /const canViewConsumables = hasPermission\(user, "consumable", "view"\)/)
  assert.match(page, /const canCreateConsumables = hasPermission\(user, "consumable", "create"\)/)
  assert.equal(page.match(/getAssetConsumableIssues\(/g)?.length, 1, "one call")
  assert.match(page, /canViewConsumables && assetDetailView === "overview"\s*\?\s*await withPerformanceTiming\("asset-detail\.consumables", \(\) => getAssetConsumableIssues\(prisma, asset\.id, 10\)/)
  assert.match(page, /const consumablesEligible = consumableIssueAssetError\(\{ isActive: asset\.isActive, statusName: asset\.status\.name \}\) === null/)
  assert.match(page, /const canRecordConsumables = canCreateConsumables && consumablesEligible/)
  const kindsRead = page.indexOf("prisma.consumableItem.findMany(")
  assert.ok(kindsRead > 0, "the kinds are read")
  assert.match(page.slice(kindsRead - 200, kindsRead), /canRecordConsumables && consumableIssues\s*\?\s*await\s*$/, "only when it can record and the panel shows")
  assert.match(page, /select: \{ id: true, name: true, unit: true, onHand: true \}/)
  assert.match(page, /consumables=\{consumablesPanel\}/)
})

test("the overview places the panel after the recent events, 8 columns wide, only when given", () => {
  const overview = read(overviewPath)
  assert.match(overview, /consumables\?: AssetConsumablesPanelProps \| null/)
  assert.match(overview, /\{consumables \? \(\s*<div className="min-w-0 lg:col-span-8">\s*<AssetConsumablesPanel \{\.\.\.consumables\} \/>/)
  assert.ok(overview.indexOf("<AssetConsumablesPanel") > overview.indexOf('t("recentTitle")'), "after the recent panel")
})

test("the panel: hidden when empty without create, the record button and the all link follow their flags", () => {
  const panel = read(panelPath)
  assert.ok(panel, "the panel exists")
  assert.match(panel, /^"use client"/)
  assert.match(panel, /if \(issues\.length === 0 && !canRecord\) return null/)
  assert.match(panel, /canRecord \? \(\s*<Button\b/)
  assert.match(panel, /total > ASSET_CONSUMABLES_LIMIT \? \(\s*<Link href=\{`\/\$\{locale\}\/consumables\?view=frequent&asset=\$\{encodeURIComponent\(assetId\)\}`\}/)
  assert.match(panel, /export const ASSET_CONSUMABLES_LIMIT = 10/)
  assert.match(panel, /t\("all", \{ count: total \}\)/)
  assert.match(panel, /<ContentPanel divided flush title=\{t\("title"\)\}/)
})

test("the panel: the often notice only when often is not empty, one line per kind", () => {
  const panel = read(panelPath)
  assert.match(panel, /\{often\.length > 0 \? \(\s*<div className="[^"]*">\s*<Notice tone="warning"/)
  assert.match(panel, /often\.map\(\(kind\) => \(\s*<li key=\{kind\.itemId\}>\{t\("often", \{ itemName: kind\.itemName, count: kind\.count \}\)\}<\/li>/)
})

test("the panel: desktop table and phone rows, the columns, the empty note", () => {
  const panel = read(panelPath)
  assert.match(panel, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("title"\)\}>/)
  assert.match(panel, /<ContentPanelRows className="md:hidden">/)
  for (const column of ["col_date", "col_item", "col_qty", "col_by"]) assert.match(panel, new RegExp(`t\\("${column}"\\)`), column)
  assert.match(panel, /<EmptyNote padded>\{t\("empty"\)\}<\/EmptyNote>/)
  assert.match(panel, /issue\.note \?/, "the note shows when present")
})

test("the panel: the dialog is locked to the machine and mounts fresh per opening", () => {
  const panel = read(panelPath)
  assert.match(panel, /<ConsumableIssueDialog\s+key=\{`issue-\$\{opening\}`\}\s+open=\{open\}\s+items=\{items\}\s+lockedAsset=\{lockedAsset\}\s+returnFocusRef=\{openerRef\}/)
  assert.match(panel, /canRecord \? \(\s*<ConsumableIssueDialog/)
  assert.match(panel, /lockedAsset: \{ id: string; label: string \}/)
  const page = read(pagePath)
  assert.match(page, /lockedAsset: \{ id: asset\.id, label: `\$\{asset\.assetTag\} · \$\{asset\.name\}` \}/)
})

test("messages: assetConsumables.* in Thai as the brief gives them, English plurals for the counts", () => {
  const th = messages("th").assetConsumables
  const en = messages("en").assetConsumables
  assert.ok(th && en, "the namespace exists")
  assert.deepEqual(
    { title: th.title, record: th.record, all: th.all, often: th.often, col_date: th.col_date, col_item: th.col_item, col_qty: th.col_qty, col_by: th.col_by, empty: th.empty },
    {
      title: "ของใช้สิ้นเปลือง",
      record: "+ บันทึกเปลี่ยนของ",
      all: "ดูทั้งหมด {count, number} รายการ",
      often: "เครื่องนี้เปลี่ยน{itemName} {count, number} ครั้งใน 90 วัน",
      col_date: "วันที่",
      col_item: "ชนิด",
      col_qty: "จำนวน",
      col_by: "โดย",
      empty: "ยังไม่มีการเปลี่ยนของให้เครื่องนี้",
    },
  )
  assert.match(en.all, /\{count, plural, /)
  assert.match(en.often, /\{count, plural, /)
  for (const key of Object.keys(th)) assert.ok(en[key], `en has ${key}`)
})
