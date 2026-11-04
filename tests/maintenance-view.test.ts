import assert from "node:assert/strict"
import test from "node:test"

import { buildMaintenancePageHref } from "../src/lib/maintenance-view.ts"

test("builds paginated workspace links while preserving compatible query state", () => {
  assert.equal(
    buildMaintenancePageHref("th", "search=UPS&view=tickets&page=4&pageSize=50", { page: 2 }),
    "/th/maintenance?search=UPS&view=tickets&page=2&pageSize=50",
  )
  assert.equal(
    buildMaintenancePageHref("th", "view=pm&page=4&pageSize=100", { pageSize: 25, page: 1 }),
    "/th/maintenance?view=pm&page=1&pageSize=25",
  )
})

// Group 5 plan 5 Task 3: the status tabs keep the other filters, set or drop the status, and go back to page 1.
test("a status tab link sets the status, or drops it for ทั้งหมด, and keeps the other filters", () => {
  assert.equal(
    buildMaintenancePageHref("th", "search=UPS&status=closed&stuck=all&page=3&pageSize=50", { status: "cancelled", page: 1 }),
    "/th/maintenance?search=UPS&status=cancelled&stuck=all&page=1&pageSize=50",
  )
  assert.equal(
    buildMaintenancePageHref("th", "search=UPS&status=closed&page=3&pageSize=50", { status: "", page: 1 }),
    "/th/maintenance?search=UPS&page=1&pageSize=50",
  )
  assert.equal(
    buildMaintenancePageHref("th", "assetId=a-1&page=2&pageSize=25", { status: "in_progress", page: 1 }),
    "/th/maintenance?assetId=a-1&page=1&pageSize=25&status=in_progress",
  )
})
