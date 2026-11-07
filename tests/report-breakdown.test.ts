import assert from "node:assert/strict"
import test from "node:test"

import {
  breakdownPercent,
  breakdownPercentLabel,
  breakdownRowHref,
  buildBreakdownTable,
  filterBreakdownGroups,
  type BreakdownGroup,
} from "../src/lib/report-breakdown.ts"

function groups(counts: number[], prefix = "G"): BreakdownGroup[] {
  return counts.map((count, index) => ({ key: `${prefix}${index + 1}`, name: `${prefix}${index + 1}`, code: null, count }))
}

test("others appears only past eight", () => {
  const eight = buildBreakdownTable("category", groups([8, 7, 6, 5, 4, 3, 2, 1]), 36)
  assert.equal(eight.rows.length, 8)
  assert.equal(eight.others, null)
  assert.equal(eight.groupCount, 8)

  const ten = buildBreakdownTable("category", groups([1, 10, 9, 8, 7, 6, 5, 4, 3, 2]), 55)
  assert.equal(ten.rows.length, 8)
  assert.deepEqual(ten.rows.map((row) => row.count), [10, 9, 8, 7, 6, 5, 4, 3])
  assert.ok(ten.others)
  assert.equal(ten.others.groups, 2)
  assert.equal(ten.others.count, 3)
  assert.deepEqual(ten.others.names, ["G10", "G1"])
  assert.equal(ten.groupCount, 10)

  const many = buildBreakdownTable("category", groups([9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1]), 48)
  assert.equal(many.others?.groups, 4)
  assert.deepEqual(many.others?.names, [])

  const limited = buildBreakdownTable("category", groups([3, 2, 1]), 6, 2)
  assert.equal(limited.rows.length, 2)
  assert.equal(limited.others?.count, 1)
})

test("department rows add up to the total", () => {
  const named = groups([40, 30, 20, 15, 12, 10, 8, 6, 5, 4], "D")
  const all: BreakdownGroup[] = [...named, { key: null, name: "ยังไม่ระบุแผนก", code: null, count: 50 }]
  const total = all.reduce((sum, group) => sum + group.count, 0)
  const table = buildBreakdownTable("department", all, total)
  assert.equal(table.rows.length, 8)
  assert.equal(table.groupCount, 10)
  assert.ok(table.others)
  assert.ok(table.unassigned)
  assert.equal(table.unassigned.count, 50)
  const shown = table.rows.reduce((sum, row) => sum + row.count, 0)
  assert.equal(shown + table.others.count + table.unassigned.count, table.total)
  assert.equal(table.total, total)
  assert.ok(table.rows.every((row) => row.key !== null))

  const noUnassigned = buildBreakdownTable("department", groups([2, 1]), 3)
  assert.equal(noUnassigned.unassigned, null)
  const zeroUnassigned = buildBreakdownTable("department", [...groups([2]), { key: null, name: "-", code: null, count: 0 }], 2)
  assert.equal(zeroUnassigned.unassigned, null)
})

test("ties sort by Thai name", () => {
  const table = buildBreakdownTable(
    "company",
    [
      { key: "c", name: "ไอที", code: "IT", count: 5 },
      { key: "a", name: "การเงิน", code: "FN", count: 5 },
      { key: "b", name: "ขาย", code: "SL", count: 5 },
      { key: "d", name: "บัญชี", code: "AC", count: 9 },
    ],
    24,
  )
  assert.deepEqual(table.rows.map((row) => row.name), ["บัญชี", "การเงิน", "ขาย", "ไอที"])
  assert.equal(table.rows[0].code, "AC")
})

test("percent rounds to one decimal and 0 for an empty total", () => {
  const table = buildBreakdownTable("status", [{ key: "1", name: "ใช้งาน", code: null, count: 1 }, { key: "2", name: "ว่าง", code: null, count: 2 }], 3)
  assert.deepEqual(table.rows.map((row) => row.percent), [66.7, 33.3])

  const empty = buildBreakdownTable("status", [{ key: "1", name: "ใช้งาน", code: null, count: 0 }], 0)
  assert.equal(empty.total, 0)
  assert.equal(empty.rows[0].percent, 0)

  const withOthers = buildBreakdownTable("status", groups([1, 1, 1]), 3, 1)
  assert.equal(withOthers.others?.percent, 66.7)
})

test("row hrefs per dimension keep base filters", () => {
  const base = new URLSearchParams({ companyId: "7", ownershipType: "OWNED" })
  const expectParams: Record<string, string> = {
    status: "statusId",
    category: "categoryId",
    company: "companyId",
    branch: "branchId",
    department: "departmentId",
    ownership: "ownershipType",
  }
  for (const [dimension, param] of Object.entries(expectParams)) {
    const href = breakdownRowHref("th", dimension as never, "42", base)
    assert.ok(href.startsWith("/th/assets?"), href)
    const query = new URLSearchParams(href.split("?")[1])
    assert.equal(query.get(param), "42", dimension)
    assert.equal(query.get("exact"), "1")
    if (param !== "companyId") assert.equal(query.get("companyId"), "7")
    if (param !== "ownershipType") assert.equal(query.get("ownershipType"), "OWNED")
    assert.equal(query.getAll(param).length, 1)
  }
  assert.equal(base.get("statusId"), null, "base query is not mutated")
})

test("unassigned department links dataQuality=department", () => {
  const base = new URLSearchParams({ branchId: "3" })
  const query = new URLSearchParams(breakdownRowHref("en", "department", null, base).split("?")[1])
  assert.equal(query.get("dataQuality"), "department")
  assert.equal(query.get("branchId"), "3")
  assert.equal(query.get("departmentId"), null)
})

test("filterBreakdownGroups matches name or code", () => {
  const list: BreakdownGroup[] = [
    { key: "1", name: "Information Technology", code: "IT", count: 3 },
    { key: "2", name: "การเงิน", code: "FIN", count: 2 },
    { key: null, name: "ยังไม่ระบุแผนก", code: null, count: 1 },
  ]
  assert.deepEqual(filterBreakdownGroups(list, "tech").map((group) => group.key), ["1"])
  assert.deepEqual(filterBreakdownGroups(list, "fin").map((group) => group.key), ["2"])
  assert.deepEqual(filterBreakdownGroups(list, "เงิน").map((group) => group.key), ["2"])
  assert.equal(filterBreakdownGroups(list, "  ").length, 3)
  assert.equal(filterBreakdownGroups(list, "zzz").length, 0)
})

// Look step (group 10 plan 1): a group with assets whose share rounds to 0.0 reads "<0.1%", never "0%"; 0% stays for
// a count of 0 (and an empty total).
test("the percent label shows <0.1% for a group that rounds to zero and 0% only for a count of zero", () => {
  assert.equal(breakdownPercentLabel(1, breakdownPercent(1, 21638)), "<0.1%")
  assert.equal(breakdownPercentLabel(4, breakdownPercent(4, 21638)), "<0.1%")
  assert.equal(breakdownPercentLabel(0, breakdownPercent(0, 21638)), "0%")
  assert.equal(breakdownPercentLabel(0, breakdownPercent(0, 0)), "0%")
  assert.equal(breakdownPercentLabel(11, breakdownPercent(11, 21638)), "0.1%")
  assert.equal(breakdownPercentLabel(12077, breakdownPercent(12077, 21638)), "55.8%")
  assert.equal(breakdownPercentLabel(3, 100), "100%")
})
