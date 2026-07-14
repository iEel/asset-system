import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  getMaintenanceDateRangeError,
  parseMaintenanceListParams,
} from "../src/lib/maintenance-query.ts"

test("normalizes maintenance pagination to 25, 50, or 100", () => {
  assert.equal(parseMaintenanceListParams({ page: "3", pageSize: "50" }).page, 3)
  assert.equal(parseMaintenanceListParams({ page: "0", pageSize: "10" }).page, 1)
  assert.equal(parseMaintenanceListParams({ page: "0", pageSize: "10" }).pageSize, 25)
  assert.equal(parseMaintenanceListParams({ page: ["4"], pageSize: 100 }).page, 4)
  assert.equal(parseMaintenanceListParams({ page: ["4"], pageSize: 100 }).pageSize, 100)
})

test("reports an inverted date range without querying a misleading range", () => {
  const filters = parseMaintenanceListParams({ dateFrom: "2026-07-20", dateTo: "2026-07-14" })
  assert.equal(getMaintenanceDateRangeError(filters), "invalid_order")
  assert.deepEqual(buildMaintenanceWhere(filters), { isActive: true })
})

test("preserves normalized list state and supports explicit overrides", () => {
  const filters = parseMaintenanceListParams({
    search: " UPS ",
    status: "in_progress",
    page: "4",
    pageSize: "50",
  })

  assert.equal(
    buildMaintenanceQueryString(filters),
    "search=UPS&status=in_progress&page=4&pageSize=50",
  )
  assert.equal(
    buildMaintenanceQueryString(filters, { status: "closed", page: 1 }),
    "search=UPS&status=closed&page=1&pageSize=50",
  )
})
