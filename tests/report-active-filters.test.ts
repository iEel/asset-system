import assert from "node:assert/strict"
import test from "node:test"
import { buildReportActiveFilters } from "../src/lib/report-active-filters.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"

test("builds readable report filter chips and keeps the active view", () => {
  const filters = parseAssetListParams({ search: "UPS", companyId: "co-1", branchId: "br-1" })
  const chips = buildReportActiveFilters({
    locale: "th",
    view: "operations",
    filters,
    names: { search: "ค้นหา", companyId: "บริษัท", branchId: "สาขา" },
    values: { companyId: "GRL - บริษัท", branchId: "GRL / BKK - กรุงเทพ" },
  })

  assert.deepEqual(chips.map((chip) => chip.label), ["ค้นหา: UPS", "บริษัท: GRL - บริษัท", "สาขา: GRL / BKK - กรุงเทพ"])
  assert.match(chips[0].href, /view=operations/)
})

test("removing company also removes its dependent branch", () => {
  const filters = parseAssetListParams({ companyId: "co-1", branchId: "br-1" })
  const [company] = buildReportActiveFilters({
    locale: "en",
    view: "overview",
    filters,
    names: { companyId: "Company", branchId: "Branch" },
    values: { companyId: "Company 1", branchId: "Branch 1" },
  })
  assert.doesNotMatch(company.href, /companyId|branchId/)
})

test("clearing another filter preserves the activity scope", () => {
  const filters = parseAssetListParams({ statusId: "ready", activity: "idle_180d" })
  const chips = buildReportActiveFilters({
    locale: "en",
    view: "operations",
    filters,
    names: { statusId: "Status", activity: "Activity" },
    values: { statusId: "Ready", activity: "Idle for 180 days" },
  })

  const status = chips.find((chip) => chip.key === "statusId")
  assert.ok(status)
  assert.match(status.href, /activity=idle_180d/)
  assert.match(status.href, /view=operations/)
})
