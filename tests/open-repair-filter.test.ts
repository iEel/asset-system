import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const users = [
  "src/app/api/assets/[id]/legacy-checkout/route.ts",
  "src/lib/asset-operation-options.ts",
  "src/app/[locale]/(dashboard)/assets/page.tsx",
  "src/lib/asset-state-review-service.ts",
]

test("open repair checks use the shared filter and ignore the old [PM] prefix", () => {
  for (const file of users) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /openRepairRecordWhere/, file)
    assert.doesNotMatch(source, /startsWith: "\[PM\] "/, file)
  }
})

test("asset pages send people to the repair form", () => {
  const detail = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  assert.doesNotMatch(detail, /const maintenanceHref\b/)
  assert.match(readFileSync("src/lib/asset-actions.ts", "utf8"), /maintenance\/new\?assetId=/)
  assert.doesNotMatch(detail, /function isPreventiveMaintenanceTicket/)
  assert.match(readFileSync("src/components/assets/detail/asset-maintenance-tab.tsx", "utf8"), /maintenancePlanId/)
})

test("search shows repair record statuses instead of raw workflow codes", () => {
  const source = readFileSync("src/app/api/search/route.ts", "utf8")
  assert.match(source, /toRepairRecordStatus\(ticket\.repairStatus\)/)
})
