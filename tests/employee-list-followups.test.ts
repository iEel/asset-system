import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildEmployeeWhere,
  employeeHeldAssetsWhere,
  employeeListHasFieldFilters,
  employeeListIdChunkSize,
  employeeRecordStatusCountWheres,
  parseEmployeeListParams,
  readEmployeeDeactivateCounts,
} from "../src/lib/organization-master-query.ts"

// Group 7 follow-ups Task 2 (board MD-Employees, G7F-R1, G7F-R2): the employee list's record-status segmented control
// with counts, the merged name and department columns, the "{n} คน · ถือครองรวม {a} รายการ" line and the row ⋯ items.
const PAGE = "src/app/[locale]/(dashboard)/master-data/employees/page.tsx"
const ROW_ACTIONS = "src/components/master-data/employee-row-actions.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the record-status counts read the list's own filters with each record status (G7F-R1)", () => {
  const state = parseEmployeeListParams({ departmentId: "d-1", status: "inactive", search: "สมชาย", page: "3" })
  const wheres = employeeRecordStatusCountWheres(state)
  assert.deepEqual(wheres.active, buildEmployeeWhere({ ...state, status: "active" }))
  assert.deepEqual(wheres.inactive, buildEmployeeWhere({ ...state, status: "inactive" }))
  assert.equal((wheres.active as { isActive?: boolean }).isActive, true)
  assert.equal((wheres.inactive as { isActive?: boolean }).isActive, false)
  assert.equal((wheres.active as { departmentId?: string }).departmentId, "d-1", "the other filters stay")
})

test("the held total counts the active assets whose custodian matches the list's where", () => {
  const where = buildEmployeeWhere(parseEmployeeListParams({ departmentId: "d-1" }))
  assert.deepEqual(employeeHeldAssetsWhere(where), { isActive: true, custodian: { is: where } })
})

test("the record status left the filter form, so it no longer opens the phone filters", () => {
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({ status: "inactive" })), false)
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({ status: "all" })), false)
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({ departmentId: "d-1" })), true)
})

test("the deactivate counts are one grouped query per kind for the row ids, in chunks of 2,000 (G7F-R2)", async () => {
  const calls: { model: string; args: { where: Record<string, unknown> } }[] = []
  const db = {
    user: {
      async groupBy(args: object) {
        const typed = args as { where: { employeeId: { in: string[] } } }
        calls.push({ model: "user", args: typed as never })
        return typed.where.employeeId.in.filter((id) => id === "e-1").map((employeeId) => ({ employeeId, _count: { _all: 2 } }))
      },
    },
    assetCheckout: {
      async groupBy(args: object) {
        const typed = args as { where: { custodianId: { in: string[] } } }
        calls.push({ model: "assetCheckout", args: typed as never })
        return typed.where.custodianId.in.filter((id) => id === "e-2").map((custodianId) => ({ custodianId, _count: { _all: 1 } }))
      },
    },
  }
  assert.equal(employeeListIdChunkSize, 2000)
  const ids = Array.from({ length: 2001 }, (_, index) => `e-${index}`)
  const counts = await readEmployeeDeactivateCounts(db, ids)
  assert.equal(calls.filter((call) => call.model === "user").length, 2)
  assert.equal(calls.filter((call) => call.model === "assetCheckout").length, 2)
  const userWhere = calls.find((call) => call.model === "user")!.args.where
  assert.deepEqual(userWhere.isActive, true, "the DELETE route's user count: active accounts")
  const checkoutWhere = calls.find((call) => call.model === "assetCheckout")!.args.where
  assert.equal(checkoutWhere.isReturned, false, "the DELETE route's open handovers")
  assert.equal(checkoutWhere.transactionStatus, "active")
  assert.deepEqual(counts.get("e-1"), { userAccounts: 2, openCheckouts: 0 })
  assert.deepEqual(counts.get("e-2"), { userAccounts: 0, openCheckouts: 1 })
  assert.equal(counts.get("e-3"), undefined)

  calls.length = 0
  assert.equal((await readEmployeeDeactivateCounts(db, [])).size, 0)
  assert.equal(calls.length, 0, "no rows, no query")
})

test("employees list: RecordStatusSegmented with counts replaces the status select; the status column only under ทั้งหมด (G7F-R1)", () => {
  const source = read(PAGE)
  assert.match(source, /<RecordStatusSegmented\n\s+value=\{listState\.status\}\n\s+counts=\{recordStatusCounts\}\n\s+hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\}/)
  assert.doesNotMatch(source, /name="status"\n\s+defaultValue=\{listState\.status\}/, "no status select left in the filter form")
  assert.match(source, /\{listState\.status !== "active" \? <input type="hidden" name="status" value=\{listState\.status\} \/> : null\}/, "the filter form keeps the status")
  assert.match(source, /prisma\.employee\.count\(\{ where: statusCountWheres\.active \}\)/)
  assert.match(source, /prisma\.employee\.count\(\{ where: statusCountWheres\.inactive \}\)/)
  assert.match(source, /const showRecordStatus = formerList \|\| listState\.status === "all"/)
})

test("employees list: the merged name and department columns, every sort kept through the header or the sort select", () => {
  const source = read(PAGE)
  assert.match(source, /<DataTableHead sort=\{sortBy\("fullNameTh"\)\}>\{t\("fullNameTh"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead sort=\{sortBy\("department"\)\}>\{t\("departmentBranch"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /<DataTableHead sort=\{sortBy\("code"\)\}>/, "the code sits under the name")
  assert.match(source, /<FilterSelect label=\{t\("sortLabel"\)\} name="sort" defaultValue=\{listState\.sort\}>/)
  assert.match(source, /\{employeeSorts\.map\(\(sort\) => \(\n\s+<option key=\{sort\} value=\{sort\}>\n\s+\{sortLabel\(sort\)\}/, "the sort select offers every sort")
  assert.match(source, /const sortLabel = \(sort: EmployeeSort\) => \(sort === "createdAt" \? t\("sortCreatedAt"\) : t\(sort\)\)/)
  assert.doesNotMatch(source, /<input type="hidden" name="sort"/)
})

test("employees list: the totals line over the filtered set, '{n} คน · ถือครองรวม {a} รายการ'", () => {
  const source = read(PAGE)
  assert.match(source, /prisma\.asset\.count\(\{ where: employeeHeldAssetsWhere\(where\) \}\)/)
  assert.match(source, /t\("listTotals", \{ people: total, assets: heldTotal \}\)/, "numbers, so English plurals read 1 person (final review fix 4)")
})

test("employees list: row ⋯ through EmployeeRowActions: held assets link, ปิดใช้งาน with the delete-block reason (G7F-R2)", () => {
  const source = read(PAGE)
  assert.match(source, /hasPermission\(user, "employee", "delete"\)/)
  assert.match(source, /readEmployeeDeactivateCounts\(prisma, activeIds\)/)
  assert.match(source, /getEmployeeDeleteBlockReason\(\{\n\s+custodianAssets: employee\._count\.custodianAssets,\n\s+subordinates: employee\._count\.subordinates,\n\s+userAccounts: [^\n]+,\n\s+openCheckouts: [^\n]+,\n\s+auditRounds: employee\._count\.auditRounds,\n\s+\}\)/)
  assert.equal(source.match(/<EmployeeRowActions\n/g)?.length, 2, "the table row and the phone card")
  assert.doesNotMatch(source, /deleteAction=/, "ลบ became ปิดใช้งาน")
  assert.match(source, /t\("viewHeldAssets", \{ n: formatCount\(employee\._count\.custodianAssets\) \}\)/)

  const actions = read(ROW_ACTIONS)
  assert.match(actions, /^"use client"/)
  assert.match(actions, /deactivateMenuItem\(\{/)
  assert.match(actions, /canDeactivate: Boolean\(deactivate\)/)
  assert.match(actions, /blocked: deactivate\?\.blocked \?\? null/)
  assert.match(actions, /fetch\(deactivate\.endpoint, \{ method: "DELETE" \}\)/)
  assert.match(actions, /tone: "destructive"/)
  assert.match(actions, /returnFocusRef: openerRef/)
})

test("employee list messages exist in Thai and English", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  for (const messages of [th, en]) {
    for (const key of ["listTotals", "viewHeldAssets", "departmentBranch", "sortLabel", "sortCreatedAt"]) {
      assert.equal(typeof messages.employee[key], "string", key)
    }
    for (const key of ["action", "confirmTitle", "confirmBody", "success"]) {
      assert.equal(typeof messages.employee.deactivate[key], "string", key)
    }
  }
  assert.equal(th.employee.listTotals, "{people, number} คน · ถือครองรวม {assets, number} รายการ")
  assert.equal(en.employee.listTotals, "{people, plural, one {# person} other {# people}} · {assets, plural, one {# asset} other {# assets}} held")
  assert.equal(th.employee.viewHeldAssets, "ดูทรัพย์สินที่ถือครอง ({n})")
  assert.equal(th.employee.deactivate.action, "ปิดใช้งาน")
})

// Final whole-branch review fixes (group 7 follow-ups). Sources are read with LF endings.
test("employees list: while LDAP sync owns ใช้งาน, ปิดใช้งาน is the unavailable item with the AD hint (final review fix 1)", () => {
  const source = read(PAGE)
  assert.match(source, /import \{ isLdapSyncEnabled \} from "@\/lib\/ldap-sync-enabled"/)
  assert.match(source, /const activeLockedBySync = canDeactivate \? await isLdapSyncEnabled\(\) : false/)
  assert.match(source, /blocked: activeLockedBySync\n\s+\? t\("activeLockedBySyncHint"\)\n\s+: getEmployeeDeleteBlockReason\(\{/)
})

test("employees list: ดูทรัพย์สินที่ถือครอง only with asset:view (final review fix 2)", () => {
  const source = read(PAGE)
  assert.match(source, /const canViewAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(source, /heldAssets:\n\s+canViewAssets && employee\._count\.custodianAssets > 0\n\s+\? \{ label: t\("viewHeldAssets"/)
})

test("employees list: the sort select has a direction select beside it, the header links keep theirs (final review fix 3)", () => {
  const source = read(PAGE)
  assert.doesNotMatch(source, /<input type="hidden" name="direction"/, "the direction is a visible choice now")
  assert.match(source, /<FilterSelect label=\{t\("sortDirection"\)\} name="direction" defaultValue=\{listState\.direction\}>\n\s+<option value="asc">\{t\("sortAsc"\)\}<\/option>\n\s+<option value="desc">\{t\("sortDesc"\)\}<\/option>/)
  assert.match(source, /direction: listState\.sort === field && listState\.direction === "asc" \? "desc" : "asc"/, "a header click still flips")
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  for (const messages of [th, en]) for (const key of ["sortDirection", "sortAsc", "sortDesc"]) assert.equal(typeof messages.employee[key], "string", key)
})

test("the employee ⋯ ปิดใช้งาน calls DELETE /api/employees/${id} (final review fix 5)", () => {
  const source = read(PAGE)
  assert.ok(source.includes("endpoint: `/api/employees/${employee.id}`,"), "the row's endpoint")
  assert.match(read(ROW_ACTIONS), /fetch\(deactivate\.endpoint, \{ method: "DELETE" \}\)/)
})

test("English counts on this branch use plurals (final review fix 4)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  assert.equal(en.employee.detail.currentAuditMeta, "{count, plural, one {# item} other {# items}} · ends {date}")
  assert.equal(th.employee.detail.currentAuditMeta, "{count, number} รายการ · สิ้นสุด {date}")
  assert.match(read("src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx"), /tDetail\("currentAuditMeta", \{ count: audit\.total, date: formatDate\(audit\.endDate\) \}\)/)
})
