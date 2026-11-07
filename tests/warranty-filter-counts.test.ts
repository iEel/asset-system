import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { DEFAULT_WAITING_WORK_RULES, warrantyExpiringSoonWhere } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const dataQualityPage = () => read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
const reportsPage = () => read("src/app/[locale]/(dashboard)/reports/page.tsx")
const operationsData = () => read("src/lib/reports-operations-data.ts")
const overviewExport = () => read("src/app/api/reports/assets-overview/export/route.ts")

test("every count that opens dataQuality=warranty uses the register's warranty rule (group 1 spec §6.3)", () => {
  for (const source of [dataQualityPage(), overviewExport()]) {
    assert.match(source, /const warrantyWhere = warrantyExpiringSoonWhere\(startOfBangkokDay\(new Date\(\)\), await getWaitingWorkRules\(\)\)/)
    assert.doesNotMatch(source, /warrantyThreshold|getDate\(\) \+ 30/)
  }
  assert.match(dataQualityPage(), /prisma\.asset\.count\(\{ where: warrantyWhere \}\)/)
  // Group 10 plan 2 Task 1: the reports' operations queue reads the register's own dataQuality wheres with the
  // notification rules, so its warranty cell is the register's warranty list; its rows use the same four wheres.
  assert.match(reportsPage(), /const whereOptions = \{ today: startOfBangkokDay\(new Date\(\)\), rules: await getWaitingWorkRules\(\) \}/)
  assert.doesNotMatch(reportsPage(), /warrantyThreshold|getDate\(\) \+ 30/)
  assert.match(operationsData(), /return buildAssetDataQualityWhere\(kind, options\) \?\? \{\}/)
  assert.match(operationsData(), /db\.asset\.count\(\{ where: \{ AND: \[where, issueWheres\.warranty\] \} \}\)/)
  assert.match(operationsData(), /const anyIssueWhere: Prisma\.AssetWhereInput = \{ OR: REPORT_ISSUE_KINDS\.map\(\(kind\) => issueWheres\[kind\]\) \}/, "the queue rows use the same rule")
  assert.match(overviewExport(), /prisma\.asset\.count\(\{ where: \{ AND: \[assetWhere, warrantyWhere\] \} \}\)/)
  assert.match(overviewExport(), /\{ metric: "Warranty Expiring Soon", value: dataQuality\.warrantyExpiring \}/)
})

test("the reports read the register's where options and name the two new values", () => {
  for (const source of [reportsPage(), overviewExport()]) {
    assert.match(source, /buildAssetWhere\(filters, await getAssetWhereOptions\(filters\)\)/)
  }
  assert.match(reportsPage(), /licenseExpiry: tAsset\("dataQualityLicenseExpiry"\),\n\s+returnDue: tAsset\("dataQualityReturnDue"\),/)
})

test("a report row's warranty label reads the rule's own window, licences out", () => {
  assert.match(operationsData(), /const warrantyWindow = issueWheres\.warranty\.warrantyEndDate as \{ gte: Date; lte: Date \}/)
  assert.match(operationsData(), /const all = getAssetReportIssues\(asset, warrantyWindow\)/)
  assert.match(operationsData(), /asset\.ownershipType !== "software_license" && asset\.warrantyEndDate && asset\.warrantyEndDate >= warrantyWindow\.gte && asset\.warrantyEndDate <= warrantyWindow\.lte/)
  // The shape the reports page reads back from Task 1's rule.
  const today = new Date("2026-10-25T17:00:00.000Z")
  const window = warrantyExpiringSoonWhere(today, { ...DEFAULT_WAITING_WORK_RULES, warrantyExpiryDays: 45 }).warrantyEndDate as { gte: Date; lte: Date }
  assert.equal(window.gte.getTime(), today.getTime())
  assert.ok(window.lte instanceof Date && window.lte > window.gte)
})

test("the data-quality rule no longer promises 30 days", () => {
  const th = JSON.parse(read("messages/th.json")).dataQualityPage.rules.warrantyExpiring.description
  const en = JSON.parse(read("messages/en.json")).dataQualityPage.rules.warrantyExpiring.description
  assert.equal(th, "ตรวจทรัพย์สินที่ประกันจะหมดตามเงื่อนไขแจ้งเตือน ไม่รวม License")
  assert.equal(en, "Find assets whose warranty ends within the notification rule, licenses excluded.")
})
