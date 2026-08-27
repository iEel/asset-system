import assert from "node:assert/strict"
import test from "node:test"

import { buildDashboardAssetStatusMetrics } from "../src/lib/dashboard-action-cards.ts"

test("dashboard separates Pending Repair assets from Under Maintenance assets", () => {
  const metrics = buildDashboardAssetStatusMetrics("th", [
    { id: "pending/id", name: "Pending Repair", count: 8 },
    { id: "maintenance id", name: "Under Maintenance", count: 2 },
    { id: "legacy", name: "Pending Repair Legacy", count: 99 },
  ])

  assert.deepEqual(metrics, {
    pendingRepair: { count: 8, href: "/th/assets?statusId=pending%2Fid" },
    underMaintenance: { count: 2, href: "/th/assets?statusId=maintenance+id" },
  })
})

test("dashboard status metrics remain safe when a configured status is missing", () => {
  assert.deepEqual(buildDashboardAssetStatusMetrics("en", []), {
    pendingRepair: { count: 0, href: "/en/assets" },
    underMaintenance: { count: 0, href: "/en/assets" },
  })
})
