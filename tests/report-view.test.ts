import assert from "node:assert/strict"
import test from "node:test"
import { buildReportHref, parseReportView } from "../src/lib/report-view.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"

test("parses only supported report views", () => {
  assert.equal(parseReportView("accounting"), "accounting")
  assert.equal(parseReportView(["operations", "catalog"]), "operations")
  assert.equal(parseReportView("unknown"), "overview")
  assert.equal(parseReportView(undefined), "overview")
})

test("changes report view without losing asset filters", () => {
  const filters = parseAssetListParams({ companyId: "co-1", branchId: "br-1", statusId: "ready", activity: "idle_180d" })
  assert.equal(
    buildReportHref("th", "operations", filters),
    "/th/reports?companyId=co-1&branchId=br-1&statusId=ready&activity=idle_180d&sort=createdAt&direction=desc&page=1&pageSize=25&view=operations",
  )
})

test("rejects unknown activity filters instead of serializing them", () => {
  const filters = parseAssetListParams({ activity: "unknown" })
  assert.equal(filters.activity, "")
  assert.doesNotMatch(buildReportHref("en", "overview", filters), /activity=/)
})
