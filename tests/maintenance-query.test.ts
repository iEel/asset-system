import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  parseMaintenanceListParams,
} from "../src/lib/maintenance-query.ts"

test("the unfinished filter includes tickets from the old workflow", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ status: "in_progress" }))
  assert.deepEqual(where.repairStatus, { notIn: ["closed", "cancelled"] })
})

test("finished and cancelled filters match exactly", () => {
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ status: "closed" })).repairStatus, "closed")
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ status: "cancelled" })).repairStatus, "cancelled")
})

test("old workflow statuses in a bookmarked URL are ignored", () => {
  assert.equal(parseMaintenanceListParams({ status: "waiting_parts" }).status, "")
})

test("the asset filter from the asset page narrows the list", () => {
  assert.equal(buildMaintenanceWhere(parseMaintenanceListParams({ assetId: "asset-1" })).assetId, "asset-1")
})

test("query strings keep the asset filter and drop empty values", () => {
  const filters = parseMaintenanceListParams({ assetId: "asset-1", status: "closed" })
  assert.equal(buildMaintenanceQueryString(filters), "status=closed&assetId=asset-1&page=1&pageSize=25")
})

test("an inverted date range is not applied", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ dateFrom: "2026-10-08", dateTo: "2026-10-01" }))
  assert.equal(where.reportedDate, undefined)
})

test("search covers record number, asset, problem, remark, invoice, reporter and vendor", () => {
  const where = buildMaintenanceWhere(parseMaintenanceListParams({ search: "UPS" }))
  assert.equal(Array.isArray(where.OR), true)
  assert.deepEqual(where.OR?.slice(0, 2), [{ repairNo: { contains: "UPS" } }, { problem: { contains: "UPS" } }])
  assert.equal(where.OR?.length, 9)
})
