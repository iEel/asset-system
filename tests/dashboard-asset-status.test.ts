import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildDashboardStatusTable } from "../src/lib/dashboard-page.ts"

// The shape of Task 8's overview.statusRows (buildDashboardStatusRows): one row per status, in sortOrder.
const rows = [
  { statusId: "ready", name: "Ready", nameTh: "พร้อมใช้งาน", count: 120 },
  { statusId: "in-use", name: "In Use", nameTh: "ใช้งานอยู่", count: 760 },
  { statusId: "draft", name: "Draft", nameTh: "ร่าง", count: 0 },
  { statusId: "maint id", name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม", count: 80 },
  { statusId: "pending/repair", name: "Pending Repair", nameTh: "รอซ่อม", count: 40 },
]

test("ตามสถานะ: every status with a count, in the overview's order, Pending Repair apart from Under Maintenance, each opening its own status exactly (spec §6.6)", () => {
  assert.deepEqual(buildDashboardStatusTable(rows, "th", null).map((row) => [row.key, row.name, row.count, row.share, row.href, row.tone]), [
    ["ready", "พร้อมใช้งาน", 120, 0.12, "/th/assets?statusId=ready&exact=1", "success"],
    ["in-use", "ใช้งานอยู่", 760, 0.76, "/th/assets?statusId=in-use&exact=1", "success"],
    ["maint id", "อยู่ระหว่างซ่อม", 80, 0.08, "/th/assets?statusId=maint+id&exact=1", "warning"],
    ["pending/repair", "รอซ่อม", 40, 0.04, "/th/assets?statusId=pending%2Frepair&exact=1", "warning"],
  ])
})

test("In Use is In Use only: Ready never leaks in, and a company rides on every link", () => {
  const [inUse] = buildDashboardStatusTable([{ statusId: "in-use", name: "In Use", nameTh: "ใช้งานอยู่", count: 5 }], "en", "c1")
  assert.deepEqual([inUse.name, inUse.count, inUse.share, inUse.href], ["In Use", 5, 1, "/en/assets?companyId=c1&statusId=in-use&exact=1"])
  assert.deepEqual(buildDashboardStatusTable([], "th", null), [])
})

test("the dashboard counts statuses by id from the overview, never by a name that contains", () => {
  const src = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
  assert.doesNotMatch(src, /contains: "(In Use|Ready|ใช้งาน|พร้อม)"/)
  assert.match(src, /buildDashboardStatusTable\(overview\.statusRows, locale, companyId\)/)
})

test("the status table's count and share sit on the status name's line: the phone's 44px link is centred, so they are too (look step fix 1)", () => {
  const src = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
  assert.match(src, /<DataTableCell numeric className="align-middle">\{formatCount\(row\.count\)\}<\/DataTableCell>/)
  assert.match(src, /<DataTableCell numeric className="hidden align-middle text-muted-foreground md:table-cell">\{formatPercent\(row\.share, 1\)\}<\/DataTableCell>/)
  // The status name's cell stays as it is; the shared DataTableCell keeps align-top for every other table.
  assert.match(readFileSync("src/components/ui/data-table.tsx", "utf8"), /align-top/)
})
