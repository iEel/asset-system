import assert from "node:assert/strict"
import test from "node:test"

import {
  LABEL_PRINT_BATCH_MAX,
  buildAssetLabelPrintQueueOrderBy,
  buildAssetLabelPrintQueueWhere,
  buildLabelPrintActiveAssetsWhere,
  labelPrintQueueModes,
  labelPrintQueueSorts,
  normalizeLabelPrintQueueFilters,
  normalizeLabelPrintQueueMode,
  normalizeLabelPrintQueuePageSize,
  normalizeLabelPrintQueueSkip,
  normalizeLabelPrintQueueSort,
  normalizeLabelPrintAssetIds,
  normalizeLabelTapeSize,
} from "../src/lib/asset-label-print-tracking.ts"

test("normalizes label print asset ids by trimming, deduping, and limiting", () => {
  assert.deepEqual(
    normalizeLabelPrintAssetIds([" asset-1 ", "", "asset-2", "asset-1", "asset-3"], 2),
    ["asset-1", "asset-2"]
  )
})

test("normalizes label tape size to supported values", () => {
  assert.equal(normalizeLabelTapeSize("12"), "12")
  assert.equal(normalizeLabelTapeSize("unknown"), "18")
  assert.equal(normalizeLabelTapeSize(null, "18"), "18")
})

test("builds label print queue filters", () => {
  assert.deepEqual(buildAssetLabelPrintQueueWhere("unprinted"), {
    isActive: true,
    labelPrints: { none: {} },
  })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("printed"), {
    isActive: true,
    labelPrints: { some: {} },
  })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("recent"), { isActive: true })
  assert.deepEqual(buildAssetLabelPrintQueueWhere("unexpected"), { isActive: true })
})

test("normalizes label print queue filters for operational batching", () => {
  assert.deepEqual(
    normalizeLabelPrintQueueFilters({
      companyId: " company-1 ",
      branchId: "all",
      categoryId: "",
      locationId: "location-1",
      createdFrom: "2026-06-01",
      createdTo: "2026-06-09",
    }),
    {
      companyId: "company-1",
      locationId: "location-1",
      createdFrom: "2026-06-01",
      createdTo: "2026-06-09",
    }
  )
})

test("builds label print queue relation filters and created date range", () => {
  const where = buildAssetLabelPrintQueueWhere("printed", {
    companyId: "company-1",
    branchId: "branch-1",
    categoryId: "category-1",
    locationId: "location-1",
    createdFrom: "2026-06-01",
    createdTo: "2026-06-09",
  })

  assert.equal(where.companyId, "company-1")
  assert.equal(where.branchId, "branch-1")
  assert.equal(where.categoryId, "category-1")
  assert.equal(where.currentLocationId, "location-1")
  assert.deepEqual(where.labelPrints, { some: {} })
  assert.equal(where.createdAt?.gte?.toISOString(), "2026-06-01T00:00:00.000Z")
  assert.equal(where.createdAt?.lte?.toISOString(), "2026-06-09T23:59:59.999Z")
})

test("normalizes and builds label print queue sort order", () => {
  assert.equal(normalizeLabelPrintQueueSort("asset_tag"), "asset_tag")
  assert.equal(normalizeLabelPrintQueueSort("location"), "location")
  assert.equal(normalizeLabelPrintQueueSort("unexpected"), "created_desc")
  assert.deepEqual(buildAssetLabelPrintQueueOrderBy("asset_tag"), [{ assetTag: "asc" }])
  assert.deepEqual(buildAssetLabelPrintQueueOrderBy("location"), [
    { currentLocation: { code: "asc" } },
    { assetTag: "asc" },
  ])
  assert.deepEqual(buildAssetLabelPrintQueueOrderBy("category"), [
    { category: { code: "asc" } },
    { assetTag: "asc" },
  ])
})

test("the reprint mode keeps only printed assets and the matched ids (group 4 plan 6, P6-R6)", () => {
  assert.equal(normalizeLabelPrintQueueMode("reprint"), "reprint")
  assert.ok(labelPrintQueueModes.includes("reprint"))
  assert.deepEqual(buildAssetLabelPrintQueueWhere("reprint", { companyId: "company-1" }, ["asset-2", "asset-1"]), {
    isActive: true,
    labelPrints: { some: {} },
    id: { in: ["asset-2", "asset-1"] },
    companyId: "company-1",
  })
  // No match is an empty id list, which matches nothing, never every printed asset.
  assert.deepEqual(buildAssetLabelPrintQueueWhere("reprint"), { isActive: true, labelPrints: { some: {} }, id: { in: [] } })
  // The ids belong to the reprint mode only.
  assert.deepEqual(buildAssetLabelPrintQueueWhere("printed", {}, ["asset-1"]), { isActive: true, labelPrints: { some: {} } })
})

test("the page size is 1 to 100 with 20 when missing, and skip is a whole number from 0 (P6-R7)", () => {
  assert.equal(LABEL_PRINT_BATCH_MAX, 100)
  assert.equal(normalizeLabelPrintQueuePageSize(null), 20)
  assert.equal(normalizeLabelPrintQueuePageSize(""), 20)
  assert.equal(normalizeLabelPrintQueuePageSize("abc"), 20)
  assert.equal(normalizeLabelPrintQueuePageSize("0"), 1)
  assert.equal(normalizeLabelPrintQueuePageSize("15.7"), 15)
  assert.equal(normalizeLabelPrintQueuePageSize("250"), 100)
  assert.equal(normalizeLabelPrintQueueSkip(null), 0)
  assert.equal(normalizeLabelPrintQueueSkip("abc"), 0)
  assert.equal(normalizeLabelPrintQueueSkip("-5"), 0)
  assert.equal(normalizeLabelPrintQueueSkip("3.9"), 3)
  assert.equal(normalizeLabelPrintQueueSkip("10"), 10)
})

test("every queue sort ends on the unique asset tag, so skip pages are stable (P6-R7)", () => {
  for (const sort of labelPrintQueueSorts) {
    const orderBy = buildAssetLabelPrintQueueOrderBy(sort)
    assert.deepEqual(orderBy.at(-1), { assetTag: "asc" }, sort)
  }
})

test("the print record and the lookup read the same active-assets where", () => {
  assert.deepEqual(buildLabelPrintActiveAssetsWhere(["asset-1", "asset-2"]), { id: { in: ["asset-1", "asset-2"] }, isActive: true })
})
