import assert from "node:assert/strict"
import test from "node:test"

import { buildDepreciationSummary, inferUsefulLifeMonths } from "../src/lib/asset-depreciation.ts"

test("calculates straight-line depreciation and net book value", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-24-0001 - Notebook",
        categoryCode: "Computer",
        categoryName: "Computer",
        ownershipType: "personal",
        purchasePrice: 120000,
        purchaseDate: new Date("2024-05-20T00:00:00.000Z"),
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.totalAcquisitionCost, 120000)
  assert.equal(summary.totalAccumulatedDepreciation, 48000)
  assert.equal(summary.totalNetBookValue, 72000)
  assert.equal(summary.depreciableAssets[0].ageMonths, 24)
  assert.equal(summary.depreciableAssets[0].usefulLifeMonths, 60)
  assert.equal(summary.depreciableAssets[0].status, "depreciating")
})

test("caps accumulated depreciation at acquisition cost", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-20-0001 - Printer",
        categoryCode: "Printer",
        categoryName: "Printer",
        ownershipType: "shared",
        purchasePrice: 60000,
        purchaseDate: new Date("2020-05-20T00:00:00.000Z"),
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.totalAccumulatedDepreciation, 60000)
  assert.equal(summary.totalNetBookValue, 0)
  assert.equal(summary.fullyDepreciatedCount, 1)
  assert.equal(summary.depreciableAssets[0].status, "fully_depreciated")
})

test("tracks missing accounting inputs separately", () => {
  const summary = buildDepreciationSummary(
    [
      {
        id: "asset-1",
        label: "SNI-EQU-26-0001 - Unknown",
        categoryCode: null,
        categoryName: null,
        ownershipType: "stock",
        purchasePrice: null,
        purchaseDate: null,
      },
    ],
    new Date("2026-05-20T00:00:00.000Z")
  )

  assert.equal(summary.missingAccountingInfoCount, 1)
  assert.equal(summary.depreciableAssets.length, 0)
})

test("uses shorter useful life for software and computer components", () => {
  assert.equal(inferUsefulLifeMonths({ categoryCode: "License", categoryName: "ลิขสิทธิ์", ownershipType: "software_license" }), 36)
  assert.equal(inferUsefulLifeMonths({ categoryCode: "Computer Component", categoryName: "RAM", ownershipType: "component" }), 36)
  assert.equal(inferUsefulLifeMonths({ categoryCode: "CCTV", categoryName: "ระบบกล้องวงจรปิด", ownershipType: "shared" }), 60)
})
