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
  const filters = parseAssetListParams({ companyId: "co-1", branchId: "br-1", statusId: "ready" })
  assert.equal(
    buildReportHref("th", "operations", filters),
    "/th/reports?companyId=co-1&branchId=br-1&statusId=ready&sort=createdAt&direction=desc&page=1&pageSize=25&view=operations",
  )
})
