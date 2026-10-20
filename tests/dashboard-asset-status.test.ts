import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetRegisterStatusTabs } from "../src/lib/asset-register-status-tabs.ts"
import { buildDashboardAssetStatusMetrics, dashboardAssetStatusNames } from "../src/lib/dashboard-action-cards.ts"

test("dashboard separates Pending Repair assets from Under Maintenance assets", () => {
  const metrics = buildDashboardAssetStatusMetrics("th", [
    { id: "pending/id", name: "Pending Repair", count: 8 },
    { id: "maintenance id", name: "Under Maintenance", count: 2 },
    { id: "legacy", name: "Pending Repair Legacy", count: 99 },
  ])

  assert.deepEqual(metrics, {
    ready: { count: 0, href: "/th/assets?exact=1" },
    inUse: { count: 0, href: "/th/assets?exact=1" },
    pendingRepair: { count: 8, href: "/th/assets?statusId=pending%2Fid&exact=1" },
    underMaintenance: { count: 2, href: "/th/assets?statusId=maintenance+id&exact=1" },
  })
})

test("dashboard status metrics remain safe when a configured status is missing", () => {
  assert.deepEqual(buildDashboardAssetStatusMetrics("en", []), {
    ready: { count: 0, href: "/en/assets?exact=1" },
    inUse: { count: 0, href: "/en/assets?exact=1" },
    pendingRepair: { count: 0, href: "/en/assets?exact=1" },
    underMaintenance: { count: 0, href: "/en/assets?exact=1" },
  })
})

test("the dashboard In Use count is In Use only; Ready (พร้อมใช้งาน) never leaks in", () => {
  const metrics = buildDashboardAssetStatusMetrics("th", [
    { id: "r", name: "Ready", count: 5 },
    { id: "u", name: "In Use", count: 7 },
  ])
  assert.equal(metrics.inUse.count, 7)
  assert.equal(metrics.ready.count, 5)
})

test("dashboard status names are the register's tab names", () => {
  for (const name of dashboardAssetStatusNames) {
    assert.ok(assetRegisterStatusTabs.some((tab) => tab.statusName === name), name)
  }
})

test("a missing status counts 0", () => {
  const metrics = buildDashboardAssetStatusMetrics("th", [])
  for (const metric of Object.values(metrics)) assert.equal(metric.count, 0)
})

test("the dashboard counts statuses by exact name, never contains", () => {
  const src = readFileSync("src/app/[locale]/(dashboard)/dashboard/page.tsx", "utf8").replace(/\r/g, "")
  assert.doesNotMatch(src, /contains: "(In Use|Ready|ใช้งาน|พร้อม)"/)
})
