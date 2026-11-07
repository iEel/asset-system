import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildReportCatalog,
  catalogExportState,
  catalogLastExportLine,
  countFilteredReports,
  groupReportCatalog,
  type CatalogPermission,
} from "../src/lib/report-catalog.ts"

// Group 10 plan 2 Task 2 (spec §6, §6.1, §8; board RP-Library): the catalog as data.

const filterQuery = "companyId=c1&page=1&pageSize=100"
const crossScopeQuery = "companyId=c1&crossScope=all&page=1"
const catalog = buildReportCatalog({
  locale: "th",
  filterQuery,
  crossScopeQuery,
  counts: { crossScope: 152, findingsByStatus: { pending: 14, approved: 25, rejected: 4 } },
})
const byKey = new Map(catalog.map((report) => [report.key, report]))

test("the catalog lists eleven reports in five audiences", () => {
  assert.equal(catalog.length, 11)
  assert.deepEqual(catalog.map((report) => report.key), [
    "assets-overview",
    "assets-register",
    "depreciation",
    "cross-scope",
    "maintenance",
    "disposal",
    "audit-findings",
    "audit-findings-pending",
    "role-audit",
    "system-logs",
    "data-quality",
  ])
  const sections = groupReportCatalog(catalog)
  assert.deepEqual(sections.map((section) => [section.audience, section.reports.length]), [
    ["accounting", 4],
    ["maintenance", 1],
    ["approver", 1],
    ["auditor", 2],
    ["admin", 3],
  ])
  // The four recurring "run now" cards are the reports with a cadence (G10P2-R1).
  assert.deepEqual(catalog.filter((report) => report.cadenceKey).map((report) => [report.key, report.cadenceKey]), [
    ["assets-overview", "monthly"],
    ["maintenance", "weekly"],
    ["disposal", "monthly"],
    ["audit-findings-pending", "weekly"],
  ])
  // Live counts in the descriptions, as the board.
  assert.deepEqual(byKey.get("cross-scope")?.descriptionValues, { count: 152 })
  assert.deepEqual(byKey.get("audit-findings")?.descriptionValues, { total: 43, pending: 14, approved: 25, rejected: 4 })
  assert.deepEqual(byKey.get("audit-findings-pending")?.descriptionValues, { count: 14 })
  // Per-round results: a note with the way to the rounds list; system logs screen only; data quality to its rules.
  assert.deepEqual(byKey.get("audit-findings-pending")?.note, { textKey: "catalogRoundsNote", linkKey: "catalogRoundsLink", href: "/th/audit/rounds" })
  assert.deepEqual(byKey.get("system-logs")?.exports, [])
  assert.equal(byKey.get("system-logs")?.openHref, "/th/admin/logs")
  assert.equal(byKey.get("data-quality")?.openHref, "/th/admin/data-quality")
  assert.equal(byKey.get("data-quality")?.openLabelKey, "openDataQualityRules")
  assert.equal(byKey.get("depreciation")?.openHref, "/th/reports?companyId=c1&page=1&pageSize=100&view=accounting")
})

test("every export of today is present with its permission", () => {
  const exports = catalog.flatMap((report) => report.exports.map((entry) => [report.key, entry.href, `${entry.permission.module}:${entry.permission.action}`, entry.format]))
  assert.deepEqual(exports, [
    ["assets-overview", `/api/reports/assets-overview/export?${filterQuery}`, "report:export", "excel"],
    ["assets-register", `/api/assets/export?${filterQuery}`, "asset:view", "excel"],
    ["depreciation", `/api/reports/assets-overview/export?${filterQuery}`, "report:export", "excel"],
    ["cross-scope", `/api/assets/export?${crossScopeQuery}`, "asset:view", "excel"],
    ["maintenance", "/api/maintenance-tickets/export", "maintenance:export", "excel"],
    ["disposal", "/api/disposal-requests/export", "disposal:export", "excel"],
    ["audit-findings", "/api/audit-findings/export-pdf?status=all&locale=th", "audit:export", "pdf"],
    ["audit-findings", "/api/audit-findings/export?status=all&locale=th", "audit:export", "excel"],
    ["audit-findings-pending", "/api/audit-findings/export?status=pending&locale=th", "audit:export", "excel"],
    ["role-audit", "/api/admin/roles/export", "role:export", "excel"],
  ])
  // Each permission is the one its route requires.
  const routeFiles: Record<string, string> = {
    "/api/reports/assets-overview/export": "src/app/api/reports/assets-overview/export/route.ts",
    "/api/assets/export": "src/app/api/assets/export/route.ts",
    "/api/maintenance-tickets/export": "src/app/api/maintenance-tickets/export/route.ts",
    "/api/disposal-requests/export": "src/app/api/disposal-requests/export/route.ts",
    "/api/audit-findings/export": "src/app/api/audit-findings/export/route.ts",
    "/api/audit-findings/export-pdf": "src/app/api/audit-findings/export-pdf/route.ts",
    "/api/admin/roles/export": "src/app/api/admin/roles/export/route.ts",
  }
  for (const report of catalog) {
    for (const entry of report.exports) {
      const route = routeFiles[entry.href.split("?")[0]]
      assert.ok(route, entry.href)
      const source = readFileSync(route, "utf8")
      assert.ok(source.includes(`requirePermission(user, "${entry.permission.module}", "${entry.permission.action}")`), `${entry.href} requires ${entry.permission.module}:${entry.permission.action}`)
    }
  }
  // Every logged export key has a card that reads it.
  const read = new Set(catalog.flatMap((report) => [report.exportKey, ...report.exports.map((entry) => entry.exportKey)]).filter(Boolean))
  for (const key of ["assets-overview", "assets-register", "cross-scope", "maintenance", "disposal", "audit-findings", "audit-findings-pending", "audit-findings-pdf", "role-audit"]) {
    assert.ok(read.has(key as never), key)
  }
})

test("scope per report", () => {
  assert.deepEqual(catalog.map((report) => [report.key, report.scope]), [
    ["assets-overview", "filters"],
    ["assets-register", "filters"],
    ["depreciation", "filters"],
    ["cross-scope", "filtersNoStatus"],
    ["maintenance", "system"],
    ["disposal", "system"],
    ["audit-findings", "system"],
    ["audit-findings-pending", "system"],
    ["role-audit", "system"],
    ["system-logs", "system"],
    ["data-quality", "system"],
  ])
  // "{k} จาก {n} รายงาน": 4 of 11 follow the current filters.
  assert.equal(countFilteredReports(catalog), 4)
})

test("a card without a log says never exported", () => {
  const register = byKey.get("assets-register")!
  assert.deepEqual(catalogLastExportLine(register, {}, "th"), { key: "catalogNeverExported" })
  // Bangkok time, Buddhist year in Thai: 2026-10-18 09:40 UTC is 16:40 in Bangkok.
  assert.deepEqual(catalogLastExportLine(register, { "assets-register": new Date("2026-10-18T09:40:00Z") }, "th"), { key: "catalogLastExport", at: "18 ต.ค. 2569 16:40" })
  // The findings card reads its PDF's key too: the later of the two.
  const findings = byKey.get("audit-findings")!
  assert.deepEqual(
    catalogLastExportLine(findings, { "audit-findings": new Date("2026-10-12T10:02:00Z"), "audit-findings-pdf": new Date("2026-10-13T01:00:00Z") }, "th"),
    { key: "catalogLastExport", at: "13 ต.ค. 2569 08:00" },
  )
  // Another report's log does not count.
  assert.deepEqual(catalogLastExportLine(register, { "cross-scope": new Date("2026-10-18T09:40:00Z") }, "th"), { key: "catalogNeverExported" })
  // A screen-only report has no line.
  assert.equal(catalogLastExportLine(byKey.get("system-logs")!, {}, "th"), null)
})

test("cards without permission name what is missing", () => {
  const holds = (granted: string[]) => (permission: CatalogPermission) => granted.includes(`${permission.module}:${permission.action}`)
  // Without report:export the overview offers no button and names report:export.
  assert.deepEqual(catalogExportState(byKey.get("assets-overview")!, holds(["asset:view"])), { allowed: [], missing: [{ module: "report", action: "export" }] })
  // Without maintenance:export.
  assert.deepEqual(catalogExportState(byKey.get("maintenance")!, holds([])), { allowed: [], missing: [{ module: "maintenance", action: "export" }] })
  // The findings card's two files need one permission: named once.
  assert.deepEqual(catalogExportState(byKey.get("audit-findings")!, holds([])).missing, [{ module: "audit", action: "export" }])
  // With it both buttons, PDF first as the board.
  assert.deepEqual(catalogExportState(byKey.get("audit-findings")!, holds(["audit:export"])).allowed.map((entry) => entry.format), ["pdf", "excel"])
  assert.deepEqual(catalogExportState(byKey.get("audit-findings")!, holds(["audit:export"])).missing, [])
  // Screen-only: nothing to offer and nothing missing.
  assert.deepEqual(catalogExportState(byKey.get("system-logs")!, holds([])), { allowed: [], missing: [] })
})
