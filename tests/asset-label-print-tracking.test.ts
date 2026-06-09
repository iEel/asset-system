import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetLabelPrintQueueOrderBy,
  buildAssetLabelPrintQueueWhere,
  normalizeLabelPrintQueueFilters,
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
