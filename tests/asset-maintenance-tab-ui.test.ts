import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 12 (spec 2026-10-25 §7.7): the repair / PM tab. The strip sits at the top level, never in a
// panel; a repair links only for a person who may open it; บันทึกซ่อม is the action rule's (Task 1, R4: shown only when it
// can run now) and ตั้งรอบ PM needs maintenance:create, so the viewer finds no write link (spec §10). Sources are read with
// LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const TAB = "src/components/assets/detail/asset-maintenance-tab.tsx"

test("the repair tab: three numbers, the replacement notice, the repairs and the PM plans (spec §7.7)", () => {
  const source = read(TAB)
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<div id="maintenance" className="scroll-mt-24 space-y-6">\n\s+<StatStrip\b/)
  assert.match(source, /const summary = summarizeAssetRepairs\(repairs, purchasePrice, now\)/)
  for (const key of ["repairs", "downtime", "cost"]) assert.ok(source.includes(`key: "${key}"`), key)
  assert.match(source, /value: formatCount\(summary\.repairCount\), unit: t\("repairTab\.timesUnit"\)/)
  assert.match(source, /value: formatCount\(summary\.downtimeDays\), unit: t\("repairTab\.daysUnit"\)/)
  assert.match(source, /value: formatMoney\(summary\.totalCost\), unit: tCommon\("baht"\)/)
  assert.match(source, /\{summary\.replacementWarning \? <Notice tone="warning">\{t\("maintenanceReplacementWarning"\)\}<\/Notice> : null\}/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("repairTab\.repairsTitle"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("repairTab\.repairsTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /maintenancePlanId/)
  assert.match(source, /tone=\{getRepairRecordStatusTone\(repair\.repairStatus\)\}/)
  assert.match(source, /formatRepairPeriod\(repair\.reportedDate, repair\.returnDate, locale\)/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("repairTab\.pmTitle"\)\}/)
  assert.match(source, /<EmptyNote padded>\{t\("repairTab\.pmEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<EmptyNote padded>\{t\("noMaintenanceTitle"\)\}<\/EmptyNote>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/, "the phone gets one row per repair")
})

test("the repair tab: links and write controls follow their permission (spec §7.1, §10 viewer)", () => {
  const source = read(TAB)
  assert.match(source, /canViewRepairs \?\s*\(?\s*<ClickableTableRow/)
  assert.match(source, /<DataTableRow key=\{repair\.id\}>/)
  // The rule's answer is an action that can run now or nothing (R3, R4); its words are full keys read at the root (R2).
  assert.match(source, /actions=\{\s*recordRepair \? \(?\s*<Link href=\{recordRepair\.href\}/)
  assert.match(source, /\{tAll\(recordRepair\.labelKey\)\}/)
  assert.match(source, /const tAll = await getTranslations\(\)/)
  assert.doesNotMatch(source, /reasonKey|recordRepair\?\.enabled/)
  assert.match(source, /canCreatePlan \?/)
  assert.match(source, /href=\{`\/\$\{locale\}\/maintenance\/pm\/new\?assetId=\$\{encodeURIComponent\(assetId\)\}`\}/)
  assert.equal(source.match(/\/maintenance\/new\b/g), null, "the record-repair href is the action rule's, never written here")
})

test("the loader reads every active repair, newest first, and every PM plan of the asset", () => {
  const loader = read("src/lib/asset-maintenance-data.ts")
  // The repairs count's where (Task 7): the table lists exactly the rows the tab count says (R24).
  assert.match(loader, /prisma\.maintenanceTicket\.findMany\(\{\n\s+where: assetRepairRecordWhere\(assetId\),/)
  assert.match(loader, /orderBy: \[\{ reportedDate: "desc" \}, \{ createdAt: "desc" \}\]/)
  assert.match(loader, /prisma\.maintenancePlan\.findMany\(\{\n\s+where: \{ assetId \},/)
  assert.match(loader, /orderAssetPmPlans\(/)
  assert.doesNotMatch(loader, /\btake:/)
})

test("the page loads the repair tab's data only on that tab", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /assetDetailView === "maintenance"\s*\?\s*await withPerformanceTiming\(\s*"asset-detail\.maintenance-tab",\s*\(\) =>\s*getAssetMaintenanceTabData\(asset\.id\)/)
  assert.match(page, /<AssetMaintenanceTab\b/)
  assert.match(page, /recordRepair=\{getAssetRecordRepairAction\(actionInput\)\}/, "the rule's own answer, not the header's pin")
  assert.match(page, /canCreatePlan=\{canSetUpPm\(asset\.status\.name, canCreateMaintenance\)\}/)
  assert.match(page, /canViewRepairs=\{canViewMaintenance\}/)
  assert.doesNotMatch(page, /<section id="maintenance"|maintenanceReplacementWarning|totalMaintenanceCost/)
})

test("the repair tab's words, in Thai and English (group 1 spec §7.7)", () => {
  const repairTab = (locale: string) => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: { repairTab: Record<string, string> } }).asset.repairTab
  assert.equal(repairTab("th").repairCount, "ซ่อมมาแล้ว")
  assert.equal(repairTab("th").downtime, "เวลาที่ไม่ได้ใช้งานเพราะซ่อม")
  assert.equal(repairTab("th").cost, "ค่าใช้จ่ายซ่อมรวม")
  assert.equal(repairTab("th").pmTitle, "บำรุงรักษาตามรอบ (PM)")
  assert.equal(repairTab("th").pmSetup, "ตั้งรอบ PM")
  assert.equal(repairTab("en").pmSetup, "Set up PM")
})
