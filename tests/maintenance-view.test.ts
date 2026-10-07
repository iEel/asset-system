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
